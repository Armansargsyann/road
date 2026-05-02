import "dotenv/config";
import { Telegraf } from "telegraf";

// Ավելացրել ենք removeSubscriber-ը import-ի մեջ
import { start, stop, addSubscriber, removeSubscriber } from "./search.js";

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is required in .env file");
}

const bot = new Telegraf(BOT_TOKEN);

bot.use(async (ctx, next) => {
  const startTime = Date.now();
  await next();
  const ms = Date.now() - startTime;
  console.log(`[${ctx.from?.id}] response time: ${ms}ms`);
});

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
    `📍 Ստուգվող վայրեր: 4`,
    { parse_mode: "HTML" }
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "<b>Հրամաններ</b>\n\n" +
    "/start - Ստանալ ծանուցումներ\n" +
    "/stop - Անջատել ծանուցումները\n" +
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