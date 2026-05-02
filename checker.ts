import { setTimeout as wait } from "timers/promises";
import { Telegraf } from "telegraf";
import fs from "fs";
import path from "path";
import { fetchNearestDay, DaySlots } from "./api.js";
import { getSubscribers } from "./subscribers.js";
import { checks } from "./data/checks.js";

const DELAY_BETWEEN_CHECKS_MS = 5_000;
const CYCLE_INTERVAL_MS = 30_000;
const NOTIFIED_FILE = path.join(process.cwd(), "notified.json");

let isRunning = true;
const notified = new Map<number, Set<string>>();

function loadNotified() {
  try {
    if (fs.existsSync(NOTIFIED_FILE)) {
      const data = JSON.parse(fs.readFileSync(NOTIFIED_FILE, "utf-8"));
      for (const [chatId, keys] of Object.entries(data)) {
        notified.set(Number(chatId), new Set(keys as string[]));
      }
      console.log(`Loaded notified history for ${notified.size} user(s).`);
    }
  } catch {}
}

function saveNotified() {
  try {
    const obj: Record<string, string[]> = {};
    for (const [chatId, keys] of notified) {
      obj[chatId] = [...keys];
    }
    fs.writeFileSync(NOTIFIED_FILE, JSON.stringify(obj));
  } catch {}
}

loadNotified();

export function getNearestTime(daySlots: DaySlots): number | undefined {
  const dates = Object.keys(daySlots)
    .map((d) => ({ date: new Date(d), key: d }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const nearest = dates[0];
  if (!nearest) return undefined;

  const slots = daySlots[nearest.key];
  if (!slots?.length) return undefined;

  return slots
    .map((slot) => {
      const [h, m] = slot.value.split(":").map(Number);
      const dt = new Date(nearest.date);
      dt.setHours(h, m, 0, 0);
      return dt.getTime();
    })
    .sort((a, b) => a - b)[0];
}

async function notify(bot: Telegraf, title: string, message: string, key: string) {
  for (const chatId of getSubscribers()) {
    if (!notified.has(chatId)) notified.set(chatId, new Set());
    const seen = notified.get(chatId)!;
    if (seen.has(key)) continue;

    try {
      await bot.telegram.sendMessage(
        chatId,
        `🔔 <b>${title}</b>\n${message}`,
        { parse_mode: "HTML" },
      );
      seen.add(key);
      saveNotified();
    } catch (err) {
      console.error(`Failed to notify ${chatId}:`, err);
    }
  }
}

export function stop() {
  console.log("Stopping slot checker...");
  isRunning = false;
}

export async function start(bot: Telegraf) {
  let attempt = 0;

  while (isRunning) {
    for (const check of checks) {
      if (!isRunning) break;

      try {
        attempt++;
        process.stdout.write(
          `\r[${attempt}] Checking ${check.name}...${" ".repeat(20)}`,
        );

        const now = Date.now();
        const slots = await fetchNearestDay(new Date(now), check.branchId, check.serviceId);
        const nearestTime = getNearestTime(slots);

        if (nearestTime && nearestTime > now && nearestTime < check.maxDate) {
          const dateStr = new Date(nearestTime).toLocaleString("hy-AM");
          console.log(`\n=> ${check.name}: ${dateStr}`);
          await notify(bot, check.name, `\u0531\u0566\u0561\u057F \u057F\u0565\u0572 \u056F\u0561:\n\u{1F4C5} ${dateStr}`, `${check.name}-${nearestTime}`);
        }
      } catch (err: any) {
        console.error(`\nError [${check.name}]: ${err.message}`);
      }

      await wait(DELAY_BETWEEN_CHECKS_MS);
    }

    if (isRunning) {
      process.stdout.write(`\rNext cycle in ${CYCLE_INTERVAL_MS / 1000}s...${" ".repeat(30)}`);
      await wait(CYCLE_INTERVAL_MS);
    }
  }
}
