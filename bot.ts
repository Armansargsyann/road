import "dotenv/config";
import { Telegraf, Markup } from "telegraf";
import { addSubscriber, removeSubscriber, setUserChecks, getUserChecks } from "./subscribers.js";
import { start, stop } from "./checker.js";
import { regions } from "./data/checks.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is required in .env");

const bot = new Telegraf(BOT_TOKEN);

bot.command("start", async (ctx) => {
  if (ctx.from?.id) addSubscriber(ctx.from.id);
  const buttons = regions.map((r) => [Markup.button.callback(r.label, "region:" + r.name)]);
  await ctx.reply(
    "\u{1F697} <b>SlotSeeker Bot</b>\n\nԸնտրեք ձեզ հետաքրքրող տարածաշրջանը:",
    { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) },
  );
});

bot.action(/^region:(.+)$/, async (ctx) => {
  const regionName = ctx.match[1];
  const region = regions.find((r) => r.name === regionName);
  const label = region?.label ?? regionName;
  await ctx.answerCbQuery();
  const buttons = [
    [Markup.button.callback("\u{1F4D8} Տեսական", "pick:" + regionName + ":Tesakan")],
    [Markup.button.callback("\u{1F4D5} Գործնական", "pick:" + regionName + ":Gorcnakan")],
    [Markup.button.callback("\u2705 Երկուսն էլ", "pick:" + regionName + ":both")],
  ];
  await ctx.editMessageText(
    "\u{1F4CD} <b>" + label + "</b>\n\nԻնչ է պետք?",
    { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) },
  );
});

bot.action(/^pick:(.+):(.+)$/, async (ctx) => {
  const regionName = ctx.match[1];
  const choice = ctx.match[2];
  const chatId = ctx.from?.id;
  if (!chatId) return;
  await ctx.answerCbQuery();
  const region = regions.find((r) => r.name === regionName);
  const regionLabel = region?.label ?? regionName;
  const current = getUserChecks(chatId);
  const toAdd: string[] = [];
  if (choice === "Tesakan" || choice === "both") toAdd.push(regionName + " - Tesakan");
  if (choice === "Gorcnakan" || choice === "both") toAdd.push(regionName + " - Gorcnakan");
  const updated = [...new Set([...current, ...toAdd])];
  setUserChecks(chatId, updated);
  const choiceLabel = choice === "both" ? "Տեսական + Գործնական" : choice === "Tesakan" ? "Տեսական" : "Գործնական";
  const buttons = [
    [Markup.button.callback("\u2795 Ավելացնել այլ տարածաշրջան", "addmore")],
    [Markup.button.callback("\u2705 Պատրաստ է", "done")],
  ];
  await ctx.editMessageText(
    "\u2705 <b>" + regionLabel + " - " + choiceLabel + "</b> ավելացվեց\n\nՁեր ընտրությունները:\n" + updated.map((c) => "\u2022 " + c).join("\n"),
    { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) },
  );
});

bot.action("addmore", async (ctx) => {
  await ctx.answerCbQuery();
  const buttons = regions.map((r) => [Markup.button.callback(r.label, "region:" + r.name)]);
  await ctx.editMessageText(
    "\u{1F4CD} Ընտրեք տարածաշրջան:",
    { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) },
  );
});

bot.action("done", async (ctx) => {
  const chatId = ctx.from?.id;
  if (!chatId) return;
  await ctx.answerCbQuery();
  const userChecks = getUserChecks(chatId);
  await ctx.editMessageText(
    "\u{1F389} <b>Պատրաստ եք!</b>\n\nԴուք ծանուցում կստանաք երբ:\n" + userChecks.map((c) => "\u2022 " + c).join("\n") + "\n\n/settings - փոխել ընտրությունները",
    { parse_mode: "HTML" },
  );
});

bot.command("settings", async (ctx) => {
  const chatId = ctx.from?.id;
  if (!chatId) return;
  const userChecks = getUserChecks(chatId);
  if (userChecks.length === 0) {
    await ctx.reply("Դուք դեռ ոչ մի ընտրել եք։ Սեղմեք /start");
    return;
  }
  const buttons = [
    ...userChecks.map((c) => [Markup.button.callback("\u274C " + c, "rm:" + c)]),
    [Markup.button.callback("\u2795 Ավելացնել տարածաշրջան", "addmore")],
    [Markup.button.callback("\u{1F5D1} Ջնջել բոլորը", "clearall")],
  ];
  await ctx.reply(
    "\u2699\uFE0F <b>Ձեր ընտրությունները</b>\n\nՍեղմեք հեռացնելու համար:",
    { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) },
  );
});

bot.action(/^rm:(.+)$/, async (ctx) => {
  const chatId = ctx.from?.id;
  if (!chatId) return;
  const checkToRemove = ctx.match[1];
  await ctx.answerCbQuery();
  const current = getUserChecks(chatId);
  const updated = current.filter((c) => c !== checkToRemove);
  setUserChecks(chatId, updated);
  if (updated.length === 0) {
    await ctx.editMessageText("\u{1F5D1} Բոլոր ընտրությունները ջնջվեցին։ Սեղմեք /start", { parse_mode: "HTML" });
    return;
  }
  const buttons = [
    ...updated.map((c) => [Markup.button.callback("\u274C " + c, "rm:" + c)]),
    [Markup.button.callback("\u2795 Ավելացնել տարածաշրջան", "addmore")],
    [Markup.button.callback("\u2705 Պատրաստ է", "done")],
  ];
  await ctx.editMessageText(
    "\u2699\uFE0F <b>Ձեր ընտրությունները</b>\n\nՍեղմեք հեռացնելու համար:",
    { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) },
  );
});

bot.action("clearall", async (ctx) => {
  const chatId = ctx.from?.id;
  if (!chatId) return;
  await ctx.answerCbQuery();
  setUserChecks(chatId, []);
  await ctx.editMessageText("\u{1F5D1} Բոլոր ընտրությունները ջնջվեցին։ Սեղմեք /start", { parse_mode: "HTML" });
});

bot.command("stop", async (ctx) => {
  if (ctx.from?.id) removeSubscriber(ctx.from.id);
  await ctx.reply("\u274C <b>Դուք ապաբաժանորդագրվեցիք։</b>\n\nՆորից միանալու համար սեղմեք /start", { parse_mode: "HTML" });
});

bot.command("status", async (ctx) => {
  const chatId = ctx.from?.id;
  const userChecks = chatId ? getUserChecks(chatId) : [];
  const list = userChecks.length ? "\n" + userChecks.map((c) => "\u2022 " + c).join("\n") : "";
  await ctx.reply("\u2705 <b>Bot-ը աշխատում է</b>\n\n\u{1F4CD} Ձեր ընտրությունները: " + (userChecks.length || "դատարկ") + list, { parse_mode: "HTML" });
});

bot.command("ping", async (ctx) => {
  const u = process.uptime();
  const h = Math.floor(u / 3600), m = Math.floor((u % 3600) / 60), s = Math.floor(u % 60);
  await ctx.reply(`\u{1F3D3} <b>Pong!</b>\\n\\n\u23F1 Uptime: \${h}h \${m}m \${s}s`, { parse_mode: "HTML" });
});

bot.command("help", async (ctx) => {
  await ctx.reply("<b>Հրամաններ</b>\n\n/start - Ընտրել տարածաշրջան\n/settings - Փոխել ընտրությունները\n/stop - Անջատել ծանուցումները\n/ping - Ստուգել բոտը\n/status - Վիճակ\n/help - Օգնություն", { parse_mode: "HTML" });
});

async function launch() {
  console.log("Starting bot...");
  const chatId = process.env.CHAT_ID;
  if (chatId) addSubscriber(Number(chatId));
  bot.launch();
  console.log("Bot launched");
  start(bot);
}

const shutdown = (signal: string) => {
  console.log(`\nReceived \${signal}, shutting down...`);
  bot.stop(signal);
  stop();
  process.exit(0);
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

launch();
