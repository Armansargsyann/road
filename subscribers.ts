import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "subscribers.json");

let subscribers = new Set<number>();

try {
  if (fs.existsSync(DB_FILE)) {
    subscribers = new Set(JSON.parse(fs.readFileSync(DB_FILE, "utf-8")));
    console.log(`Loaded ${subscribers.size} subscriber(s) from DB.`);
  }
} catch (err) {
  console.error("Failed to load subscribers DB:", err);
}

function save() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify([...subscribers]));
  } catch (err) {
    console.error("Failed to save subscribers DB:", err);
  }
}

export function addSubscriber(chatId: number) {
  if (subscribers.has(chatId)) return;
  subscribers.add(chatId);
  save();
  console.log(`Subscriber added: ${chatId}. Total: ${subscribers.size}`);
}

export function removeSubscriber(chatId: number) {
  if (!subscribers.delete(chatId)) return;
  save();
  console.log(`Subscriber removed: ${chatId}. Total: ${subscribers.size}`);
}

export function getSubscribers(): ReadonlySet<number> {
  return subscribers;
}
