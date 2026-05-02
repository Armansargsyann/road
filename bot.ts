import "dotenv/config";
import { Telegraf } from "telegraf";

import { addSubscriber, removeSubscriber } from "./subscribers.js";
import { start, stop } from "./checker.js";
import { checks } from "./data/checks.js";

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is required in .env file");
}

const bot = new Telegraf(BOT_TOKEN);

bot.command("start", async (ctx) => {
  if (ctx.from?.id) {
    addSubscriber(ctx.from.id);
  }
  await ctx.reply(
    "🚗 <b>SlotSeeker Bot</b>\n\n" +
    "✅ Դուք բաժանորդագրվել եք ծանուցումներին։\n" +
    "Սեղմիր /status տեսնելու համար բոտի վիճակը\n" +
    "Սեղմիր /stop ծանուցումները անջատելու համար",
    { parse_mode: "HTML" }
  );
});

// ՆՈՐ ՀՐԱՄԱՆ՝ ապաբաժանորդագրվելու համար
bot.command("stop", async (ctx) => {
  if (ctx.from?.id) {
    removeSubscriber(ctx.from.id);
  }
  await ctx.reply(
    "❌ <b>Դուք ապաբաժանորդագրվեցիք։</b>\n\n" +
    "Այլևս չեք ստանա ազատ տեղերի մասին ծանուցումներ։ Նորից միանալու համար սեղմեք /start",
    { parse_mode: "HTML" }
  );
});

bot.command("status", async (ctx) => {
  await ctx.reply(
    "✅ <b>Bot-ը աշխատում է</b>\n\n" +
    "🔍 Ստուգում է ժամկետները...\n" +
    `⏰ Սպասման ժամանակ: 30 վրկ\n` +
    `📍 Ստուգվող վայրեր: ${checks.length}`,
    { parse_mode: "HTML" }
  );
});

bot.command("ping", async (ctx) => {
  const uptime = process.uptime();
  const h = Math.floor(uptime / 3600);
  const m = Math.floor((uptime % 3600) / 60);
  const s = Math.floor(uptime % 60);
  await ctx.reply(
    `🏓 <b>Pong!</b>\n\n⏱ Uptime: ${h}h ${m}m ${s}s\n📍 Ստուգվող վայրեր: ${checks.length}`,
    { parse_mode: "HTML" }
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "<b>Հրամաններ</b>\n\n" +
    "/start - Ստանալ ծանուցումներ\n" +
    "/stop - Անջատել ծանուցումները\n" +
    "/ping - Ստուգել բոտը\n" +
    "/status - Բոտի վիճակը\n" +
    "/help - Օգնություն",
    { parse_mode: "HTML" }
  );
});

async function launch() {
  console.log("🤖 Starting Telegram Bot...");

  try {
    const chatId = process.env.CHAT_ID;
    if (chatId) {
      addSubscriber(Number(chatId));
    }

    bot.launch();
    console.log("✅ Bot launched successfully");

    start(bot);
    console.log("🔍 Slot checker started");
  } catch (error) {
    console.error("❌ Failed to launch bot:", error);
    process.exit(1);
  }
}

const shutdown = (signal: string) => {
  console.log(`\n📞 Received ${signal}, shutting down...`);
  bot.stop(signal);
  stop(); 
  process.exit(0);
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

launch();