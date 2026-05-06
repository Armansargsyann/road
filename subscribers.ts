import fs from "fs";
import path from "path";

export interface UserPrefs {
  checks: string[]; // e.g. ["Yerevan - Tesakan", "Yerevan - Gorcnakan"]
}

const DB_FILE = path.join(process.cwd(), "subscribers.json");

const subscribers = new Map<number, UserPrefs>();

try {
  if (fs.existsSync(DB_FILE)) {
    const raw = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));

    if (Array.isArray(raw)) {
      // migrate old format: [chatId, chatId, ...]
      for (const id of raw) subscribers.set(id, { checks: [] });
    } else {
      // new format: { "chatId": { checks: [...] } }
      for (const [id, prefs] of Object.entries(raw)) {
        subscribers.set(Number(id), prefs as UserPrefs);
      }
    }
    console.log(`Loaded ${subscribers.size} subscriber(s).`);
  }
} catch (err) {
  console.error("Failed to load subscribers:", err);
}

function save() {
  try {
    const obj: Record<string, UserPrefs> = {};
    for (const [id, prefs] of subscribers) {
      obj[id] = prefs;
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.error("Failed to save subscribers:", err);
  }
}

export function addSubscriber(chatId: number) {
  if (!subscribers.has(chatId)) {
    subscribers.set(chatId, { checks: [] });
    save();
  }
}

export function removeSubscriber(chatId: number) {
  if (subscribers.delete(chatId)) save();
}

export function setUserChecks(chatId: number, checkNames: string[]) {
  const prefs = subscribers.get(chatId);
  if (prefs) {
    prefs.checks = checkNames;
    save();
  }
}

export function getUserChecks(chatId: number): string[] {
  return subscribers.get(chatId)?.checks ?? [];
}

export function getSubscribers(): Map<number, UserPrefs> {
  return subscribers;
}
