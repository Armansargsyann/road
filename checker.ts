import { setTimeout as wait } from "timers/promises";
import { Telegraf } from "telegraf";
import fs from "fs";
import path from "path";
import { fetchNearestDay, DaySlots } from "./api.js";
import { getSubscribers } from "./subscribers.js";
import { checks } from "./data/checks.js";

const CYCLE_INTERVAL_MS = 40_000;
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

async function notify(
  bot: Telegraf,
  checkName: string,
  message: string,
  key: string,
) {
  const subs = getSubscribers();

  for (const [chatId, prefs] of subs) {
    // only notify if user subscribed to this check (or has no prefs = legacy user, notify all)
    if (prefs.checks.length > 0 && !prefs.checks.includes(checkName)) continue;

    if (!notified.has(chatId)) notified.set(chatId, new Set());
    const seen = notified.get(chatId)!;
    if (seen.has(key)) continue;

    try {
      await bot.telegram.sendMessage(
        chatId,
        `\uD83D\uDD14 <b>${checkName}</b>\n${message}`,
        {
          parse_mode: "HTML",
        },
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

export function getActiveChecks() {
  // collect unique check names that at least one user wants
  const wanted = new Set<string>();
  for (const [, prefs] of getSubscribers()) {
    if (prefs.checks.length === 0) {
      // legacy user with no prefs - check everything
      return checks;
    }
    for (const c of prefs.checks) wanted.add(c);
  }
  return checks.filter((c) => wanted.has(c.name));
}

export async function start(bot: Telegraf) {
  let cycle = 0;

  while (isRunning) {
    cycle++;
    const active = getActiveChecks();
    if (active.length === 0) {
      console.log(`\n[Cycle ${cycle}] No checks to run, waiting...`);
      await wait(CYCLE_INTERVAL_MS);
      continue;
    }

    const now = Date.now();
    console.log(
      `\n[Cycle ${cycle}] Checking ${active.length} locations in parallel...`,
    );

    const results = await Promise.allSettled(
      active.map((check) =>
        fetchNearestDay(new Date(now), check.branchId, check.serviceId).then(
          (slots) => ({ check, slots }),
        ),
      ),
    );

    for (const result of results) {
      if (!isRunning) break;

      if (result.status === "rejected") {
        console.error(`  x ${result.reason?.message || result.reason}`);
        continue;
      }

      const { check, slots } = result.value;
      const nearestTime = getNearestTime(slots);

      if (nearestTime && nearestTime > now && nearestTime < check.maxDate) {
        const dateStr = new Date(nearestTime).toLocaleString("hy-AM");
        console.log(`  => ${check.name}: ${dateStr}`);
        await notify(
          bot,
          check.name,
          `\u0531\u0566\u0561\u057F \u057F\u0565\u0572 \u056F\u0561:\n\uD83D\uDCC5 ${dateStr}`,
          `${check.name}-${nearestTime}`,
        );
      }
    }

    if (isRunning) {
      console.log(`Next cycle in ${CYCLE_INTERVAL_MS / 1000}s...`);
      await wait(CYCLE_INTERVAL_MS);
    }
  }
}
