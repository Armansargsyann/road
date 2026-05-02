import { setTimeout as wait } from "timers/promises";
import { createHmac } from "crypto";
import { Telegraf } from "telegraf";
import fs from "fs";
import path from "path";
import { checks } from "./data/check_Array";

const EARLYONE_TOKEN = process.env.EARLYONE_TOKEN?.trim();
const HMAC_SECRET = process.env.HMAC_SECRET?.trim();

if (!EARLYONE_TOKEN || !HMAC_SECRET) {
  const missing = [
    !EARLYONE_TOKEN ? "EARLYONE_TOKEN" : null,
    !HMAC_SECRET ? "HMAC_SECRET" : null,
  ]
    .filter(Boolean)
    .join(", ");

  throw new Error(`CRITICAL: Missing environment variable(s): ${missing}. Please add them to .env`);
}


function decodeJwtExpiry(token: string): Date | undefined {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return undefined;

    const payload = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const decoded = JSON.parse(payload);
    return decoded.exp ? new Date(decoded.exp * 1000) : undefined;
  } catch {
    return undefined;
  }
}

const tokenExpiry = decodeJwtExpiry(EARLYONE_TOKEN);
if (tokenExpiry) {
  console.log(`EARLYONE_TOKEN expires at ${tokenExpiry.toISOString()}`);
  if (tokenExpiry.getTime() < Date.now()) {
    console.warn("⚠️ EARLYONE_TOKEN is already expired. Please refresh the token in .env");
  }
}

const DB_FILE = path.join(process.cwd(), "subscribers.json");

let subscribers = new Set<number>();
const sent = new Map<number, Set<string>>(); 
let isRunning = true;

try {
  if (fs.existsSync(DB_FILE)) {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    subscribers = new Set(JSON.parse(data));
    console.log(`Loaded ${subscribers.size} subscribers from DB.`);
  }
} catch (err) {
  console.error("Failed to load subscribers DB:", err);
}


function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(Array.from(subscribers)));
  } catch (err) {
    console.error("Failed to save subscribers to DB:", err);
  }
}

export function addSubscriber(chatId: number) {
  if (!subscribers.has(chatId)) {
    subscribers.add(chatId);
    saveDB();
    console.log(`Subscriber added: ${chatId}. Total: ${subscribers.size}`);
  }
}

export function removeSubscriber(chatId: number) {
  if (subscribers.has(chatId)) {
    subscribers.delete(chatId);
    saveDB();
    console.log(`Subscriber removed: ${chatId}. Total: ${subscribers.size}`);
  }
}

export function stop() {
  console.log("🛑 Stopping slot checker...");
  isRunning = false;
}





async function sendTelegram(
  bot: Telegraf | undefined,
  title: string,
  message: string,
  sentKey: string,
) {
  if (!bot || subscribers.size === 0) return;

  for (const chatId of subscribers) {
    if (!sent.has(chatId)) {
      sent.set(chatId, new Set());
    }
    
    const userSent = sent.get(chatId)!;
    if (userSent.has(sentKey)) continue;

    try {
      await bot.telegram.sendMessage(chatId, `🔔 **${title}**\n${message}`, { parse_mode: 'Markdown' });
      userSent.add(sentKey);
    } catch (err) {
      console.error(`Failed to send telegram to ${chatId}:`, err);
    }
  }
}

function signRequest(
  method: string,
  path: string,
  timestamp: string,
  params: Record<string, string>,
): string {
  const sorted = Object.entries(params)
    .sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const message = method + path + timestamp + sorted;
  return createHmac("sha256", HMAC_SECRET).update(message).digest("base64");
}

interface TimeSlot {
  value: string;
  label: string;
}

interface DaySlots {
  [key: string]: TimeSlot[];
}

const NETWORK_TIMEOUT_MS = 10000;
const NETWORK_RETRIES = 2;

function isRecoverableNetworkError(error: any) {
  if (!error) return false;
  const recoverableCodes = ["ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN"];
  return recoverableCodes.includes(error.code) || error.name === "AbortError";
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = NETWORK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function get(time: number, branchId: string, serviceId: string) {
  const path = "/earlyone/api/AppointmentTimeSlot/GetNearestDay";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params: Record<string, string> = {
    Date: new Date(time).toISOString().split("T")[0] + "T00:00:00",
    AccountId: "0",
    BranchId: branchId,
    CompanyId: "379",
    ServiceId: serviceId,
  };
  const signature = signRequest("GET", path, timestamp, params);

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Cache-Control", "no-cache");
  myHeaders.append("User-Agent", "earlyone/4 CFNetwork/3860.500.112 Darwin/25.4.0");
  myHeaders.append("Accept", "*/*");
  myHeaders.append("Accept-Language", "en-GB,en-US;q=0.9,en;q=0.8");
  myHeaders.append("Accept-Encoding", "gzip, deflate");
  myHeaders.append("X-Culture", "en");
  myHeaders.append("X-Timestamp", timestamp);
  myHeaders.append("X-Signature", signature);
  myHeaders.append("Authorization", `Bearer ${EARLYONE_TOKEN}`);
  myHeaders.append("AppVersion", "5.0.0(4)");

  const endpoint = "https://e1-api.earlyone.com" + path;
  const url = new URL(endpoint);
  url.search = new URLSearchParams(params).toString();

  let lastError: any;
  for (let attempt = 0; attempt <= NETWORK_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => null);
        const expiryInfo = tokenExpiry ? ` Token expiry: ${tokenExpiry.toISOString()}.` : "";
        throw new Error(`HTTP error! status: ${res.status}, message: ${msg || "<empty>"}.${expiryInfo}`);
      }

      const data = await res.json();
      if (!data || typeof data !== "object") throw new Error("Invalid JSON response");
      return data as DaySlots;
    } catch (error: any) {
      lastError = error;
      if (attempt < NETWORK_RETRIES && isRecoverableNetworkError(error)) {
        console.warn(`Network issue detected for ${branchId}/${serviceId}, retrying (${attempt + 1}/${NETWORK_RETRIES})...`, error.code || error.name || error.message);
        await wait(2000);
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

function getNearestTime(daySlots: DaySlots): number | undefined {
  const nearestDay = Object.keys(daySlots)
    .map((dateStr) => ({ date: new Date(dateStr), dateStr }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .shift();

  if (!nearestDay) return undefined;

  const timeSlots = daySlots[nearestDay.dateStr];
  if (!timeSlots || timeSlots.length === 0) return undefined;

  const nearestTimeSlot = timeSlots
    .map((slot) => {
      const [hours, minutes] = slot.value.split(":").map(Number);
      const dateTime = new Date(nearestDay.date);
      dateTime.setHours(hours, minutes, 0, 0);
      return dateTime.getTime();
    })
    .sort((a, b) => a - b)
    .shift();

  return nearestTimeSlot;
}

export async function start(bot?: Telegraf) {
  let attempt = 0;
  
  while (isRunning) {
    for (const check of checks) {
      if (!isRunning) break; 
      
      try {
        attempt++;
        process.stdout.write(`\r- Attempt ${attempt}: Checking ${check.name}... ${" ".repeat(20)}`);
        
        const now = Date.now();
        const slots = await get(now, check.branchId, check.serviceId);
        const nearestTime = getNearestTime(slots);
        
        if (nearestTime && nearestTime > now && nearestTime < check.maxDate) {
          const sentKey = `${check.name}-${nearestTime}`;
          const dateStr = new Date(nearestTime).toLocaleString("hy-AM");
          
          console.log(`\n✅ Found ${check.name}: ${dateStr}`);
          await sendTelegram(bot, check.name, `Ազատ տեղ կա:\n📅 ${dateStr}`, sentKey);
        }
      } catch (err: any) {
        const code = err?.code ? ` code=${err.code}` : "";
        const name = err?.name ? ` (${err.name})` : "";
        console.error(`\n❌ Error checking ${check.name}:${name}${code}`, err.message || err);
      }

      await wait(5000); 
    }

    if (isRunning) {
      process.stdout.write(`\r⏳ Waiting 30s before next cycle... ${" ".repeat(30)}`);
      await wait(50000);
    }
  }
}