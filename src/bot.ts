// src/bot.ts

import { Telegraf, Context, session, Scenes } from "telegraf";
import { message } from "telegraf/filters";
import dotenv from "dotenv";
// --- THIS IS THE CORRECTED IMPORT ---
const db = require("./database");
import { BusinessCard } from "./types";

dotenv.config();

const { BOT_TOKEN, WORLD_ID_APP_ID, BOT_USERNAME } = process.env;
if (!BOT_TOKEN || !WORLD_ID_APP_ID || !BOT_USERNAME) {
  throw new Error("Missing environment variables!");
}

// --- The rest of the file is the same as the previous correct version ---
const createCardScene = new Scenes.WizardScene<any>(
  "create-card-wizard",
  // ... wizard steps
  async (ctx) => {
    /* ... */ return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.name = ctx.message.text;
    /* ... */ return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.title = ctx.message.text;
    /* ... */ return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.bio = ctx.message.text.substring(0, 200);
    /* ... */ return ctx.wizard.next();
  },
  async (ctx) => {
    const linkedin_url =
      ctx.message.text.toLowerCase() === "skip" ? undefined : ctx.message.text;
    const cardData = { ...ctx.wizard.state, linkedin_url };
    await db.updateUserCard(ctx.from.id, cardData);
    await ctx.reply(
      "Your business card has been created! You can view it with /mycard.",
    );
    return await ctx.scene.leave();
  },
);

const bot = new Telegraf<Scenes.WizardContext>(BOT_TOKEN);
const stage = new Scenes.Stage<Scenes.WizardContext>([createCardScene]);

bot.use(session());
bot.use(stage.middleware());

bot.use(async (ctx, next) => {
  const allowedCommands = ["/start", "/verify"];
  const messageText = (ctx.message as any)?.text || "";
  if (allowedCommands.includes(messageText.split(" ")[0])) {
    return next();
  }
  const user = await db.findUserByTelegramId(ctx.from.id);
  if (!user) {
    return ctx.reply(
      "You must be a verified human to use this bot. Please use /verify first.",
    );
  }
  return next();
});

const formatCard = (card: BusinessCard): string => {
  let message = `👤 *${card.name}*\n`;
  message += `*Title:* ${card.title}\n\n`;
  message += `*Bio:* ${card.bio}\n\n`;
  if (card.linkedin_url) {
    message += `[LinkedIn Profile](${card.linkedin_url})\n`;
  }
  message += `*Telegram:* @${card.telegram_username}`;
  return message;
};

bot.start(async (ctx) => {
  const deepLinkPayload = (ctx as any).startPayload;
  if (deepLinkPayload) {
    const world_id_hash = `wid_${deepLinkPayload.slice(0, 16)}`;
    await db.createVerifiedUser(
      ctx.from.id,
      ctx.from.username || `user${ctx.from.id}`,
      world_id_hash,
    );
    await ctx.reply(
      "✅ Verification successful! You are now a verified human.\n\nUse /createcard to set up your professional profile.",
    );
  } else {
    const user = await db.findUserByTelegramId(ctx.from.id);
    if (user) {
      await ctx.reply(
        "Welcome back! You are already verified. Use /mycard to see your card or /search to find others.",
      );
    } else {
      await ctx.reply(
        "Welcome to the Virtual Business Card Bot! To get started, you must prove you are a unique human with World ID.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Verify with World ID", callback_data: "verify" }],
            ],
          },
        },
      );
    }
  }
});

const sendVerificationLink = (ctx: Context) => {
  const verificationUrl = `https://id.worldcoin.org/authorize?app_id=${WORLD_ID_APP_ID}&action_id=my-action&signal=${ctx.from.id}&return_to=https://t.me/${BOT_USERNAME}`;
  ctx.reply(
    "Click the button below to verify with World ID. You will be redirected back to this chat after completion.",
    {
      reply_markup: {
        inline_keyboard: [[{ text: "Verify Now", url: verificationUrl }]],
      },
    },
  );
};

bot.command("verify", sendVerificationLink);
bot.action("verify", (ctx) => {
  ctx.answerCbQuery();
  sendVerificationLink(ctx);
});

bot.command("createcard", (ctx) => ctx.scene.enter("create-card-wizard"));

bot.command("mycard", async (ctx) => {
  const user = await db.findUserByTelegramId(ctx.from.id);
  if (user) {
    await ctx.replyWithMarkdown(formatCard(user));
  } else {
    await ctx.reply("You don't have a card yet! Use /createcard to make one.");
  }
});

bot.command("search", async (ctx) => {
  const query = ctx.message.text.split(" ").slice(1).join(" ");
  if (!query) return ctx.reply("Usage: /search <name>");
  const results = await db.searchUsersByName(query);
  if (results.length === 0)
    return ctx.reply(`No users found with the name "${query}".`);
  const response = results
    .map((r) => `👤 *${r.name}* (@${r.telegram_username}) - ${r.title}`)
    .join("\n");
  await ctx.replyWithMarkdown(
    "Found users:\n\n" +
      response +
      "\n\nUse `/view @username` to see their full card.",
  );
});

bot.command("view", async (ctx) => {
  const username = ctx.message.text.split(" ")[1];
  if (!username) return ctx.reply("Usage: /view @username");
  const user = await db.findUserByUsername(username);
  if (user) {
    await ctx.replyWithMarkdown(formatCard(user));
  } else {
    return ctx.reply(`User ${username} not found or has no card.`);
  }
});

bot.command("deletecard", async (ctx) => {
  await db.deleteUser(ctx.from.id);
  await ctx.reply(
    "Your business card and all associated data have been deleted.",
  );
});

async function startApp() {
  await db.initDb();
  bot.launch();
  console.log("Bot is running...");
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

startApp();
