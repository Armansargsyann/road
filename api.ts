import { createHmac } from "crypto";

const EARLYONE_TOKEN = process.env.EARLYONE_TOKEN?.trim();
const HMAC_SECRET = process.env.HMAC_SECRET?.trim();

if (!EARLYONE_TOKEN || !HMAC_SECRET) {
  const missing = [
    !EARLYONE_TOKEN && "EARLYONE_TOKEN",
    !HMAC_SECRET && "HMAC_SECRET",
  ].filter(Boolean).join(", ");
  throw new Error(`Missing environment variable(s): ${missing}`);
}

export interface TimeSlot {
  value: string;
  label: string;
}

export interface DaySlots {
  [date: string]: TimeSlot[];
}

const API_BASE = "https://e1-api.earlyone.com";
const API_PATH = "/earlyone/api/AppointmentTimeSlot/GetNearestDay";
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RECOVERABLE_CODES = ["ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN"];

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

function buildHeaders(timestamp: string, signature: string): Headers {
  const h = new Headers();
  h.set("Content-Type", "application/json");
  h.set("Cache-Control", "no-cache");
  h.set("User-Agent", "earlyone/4 CFNetwork/3860.500.112 Darwin/25.4.0");
  h.set("Accept", "*/*");
  h.set("Accept-Language", "en-GB,en-US;q=0.9,en;q=0.8");
  h.set("Accept-Encoding", "gzip, deflate");
  h.set("X-Culture", "en");
  h.set("X-Timestamp", timestamp);
  h.set("X-Signature", signature);
  h.set("Authorization", `Bearer ${EARLYONE_TOKEN}`);
  h.set("AppVersion", "5.0.0(4)");
  return h;
}

function isRecoverable(err: any): boolean {
  return RECOVERABLE_CODES.includes(err?.code) || err?.name === "AbortError";
}

export async function fetchNearestDay(
  date: Date,
  branchId: string,
  serviceId: string,
): Promise<DaySlots> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params: Record<string, string> = {
    Date: date.toISOString().split("T")[0] + "T00:00:00",
    AccountId: "0",
    BranchId: branchId,
    CompanyId: "379",
    ServiceId: serviceId,
  };

  const signature = signRequest("GET", API_PATH, timestamp, params);
  const headers = buildHeaders(timestamp, signature);

  const url = new URL(API_BASE + API_PATH);
  url.search = new URLSearchParams(params).toString();

  let lastError: any;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timer);

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${body || "<empty>"}`);
      }

      return (await res.json()) as DaySlots;
    } catch (error: any) {
      lastError = error;
      if (attempt < MAX_RETRIES && isRecoverable(error)) {
        console.warn(
          `  retry ${attempt + 1}/${MAX_RETRIES} for ${branchId}/${serviceId}: ${error.code || error.name}`,
        );
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}
