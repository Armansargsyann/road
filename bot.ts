


import "dotenv/config";
import { Telegraf, Context } from "telegraf";

// Import search module
import { start, stop, addSubscriber } from "./search.js";

// ============================================
// Configuration
// ============================================
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is required in .env file");
}

// ============================================
// Bot Initialization
// ============================================
const bot = new Telegraf(BOT_TOKEN);

// ============================================
// Middleware
// ============================================
bot.use(async (ctx, next) => {
  const startTime = Date.now();
  await next();
  const ms = Date.now() - startTime;
  console.log(`[${ctx.from?.id}] response time: ${ms}ms`);
});

// ============================================
// Command Handlers
// ============================================

// /start command
bot.command("start", async (ctx) => {
  if (ctx.from?.id) {
    addSubscriber(ctx.from.id);
    console.log(`Subscriber added: ${ctx.from.id}`);
  }
  await ctx.reply(
    "🚗 <b>SlotSeeker Bot</b>\n\n" +
    "Սեղմիր /status տեսնելու համար բոտի վիճակը\n" +
    "Սեղմիր /stop կանգնեցնելու համար",
    { parse_mode: "HTML" }
  );
});

// /status command
bot.command("status", async (ctx) => {
  await ctx.reply(
    "✅ <b>Bot-ը աշխատում է</b>\n\n" +
    "🔍 Ստուգում է ժամկետները...\n" +
    `⏰ Սպասման ժամանակ: 30 վրկ\n` +
    `📍 Ստուգվող վայրեր: 4`,
    { parse_mode: "HTML" }
  );
});

// /help command
bot.command("help", async (ctx) => {
  await ctx.reply(
    "<b>Հրամաններ</b>\n\n" +
    "/start - Սկսել\n" +
    "/status - Վիճակ\n" +
    "/help - Օգնություն",
    { parse_mode: "HTML" }
  );
});

// ============================================
// Launch Bot
// ============================================
async function launch() {
  console.log("🤖 Starting Telegram Bot...");

  try {
    // Add initial subscriber from .env
    const chatId = process.env.CHAT_ID;
    if (chatId) {
      addSubscriber(Number(chatId));
    }

    // Start the slot checker immediately (don't wait for launch to resolve,
    // since bot.launch() blocks while long-polling is active)
    bot.launch();
    console.log("✅ Bot launched successfully");

    start(bot);
    console.log("🔍 Slot checker started");
  } catch (error) {
    console.error("❌ Failed to launch bot:", error);
    process.exit(1);
  }
}

// ============================================
// Graceful Shutdown
// ============================================
const shutdown = (signal: string) => {
  console.log(`\n📞 Received ${signal}, shutting down...`);
  bot.stop(signal);
  stop();
  process.exit(0);
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

// ============================================
// Start
// ============================================
launch();