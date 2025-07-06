import { Telegraf, Context, session, Scenes } from "telegraf";
import { message } from "telegraf/filters";
import dotenv from "dotenv";
import { URLSearchParams } from "url";
import { startServer } from "./api";

const db = require("./database");
import { BusinessCard } from "./types";

dotenv.config();

const { BOT_TOKEN, WORLD_ID_APP_ID, BOT_USERNAME, API_BASE_URL } = process.env;
if (!BOT_TOKEN || !BOT_USERNAME) {
  throw new Error("Missing required environment variables: BOT_TOKEN, BOT_USERNAME");
}

const REDIRECT_URI = API_BASE_URL ? `${API_BASE_URL}/auth/worldid/callback` : `http://localhost:3000/auth/worldid/callback`;

const createCardScene = new Scenes.WizardScene<any>(
  "create-card-wizard",
  async (ctx) => {
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.name = ctx.message.text;
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.title = ctx.message.text;
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.bio = ctx.message.text.substring(0, 200);
    return ctx.wizard.next();
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
  // Create unverified user if they don't exist
  const user = await db.findUserByTelegramId(ctx.from!.id);
  if (!user) {
    await db.createUnverifiedUser(
      ctx.from!.id,
      ctx.from!.username || `user${ctx.from!.id}`
    );
  }
  return next();
});

const formatCard = (card: BusinessCard): string => {
  let message = `👤 *${card.name}*`;
  if (card.is_verified) {
    message += ` ✅`;
  }
  message += `\n*Title:* ${card.title}\n\n`;
  message += `*Bio:* ${card.bio}\n\n`;
  if (card.linkedin_url) {
    message += `[LinkedIn Profile](${card.linkedin_url})\n`;
  }
  message += `*Telegram:* @${card.telegram_username}`;
  if (card.is_verified) {
    message += `\n\n✅ *Verified Human*`;
  }
  return message;
};

bot.start(async (ctx) => {
  const deepLinkPayload = (ctx as any).startPayload;
  if (deepLinkPayload) {
    const world_id_hash = `wid_${deepLinkPayload.slice(0, 16)}`;
    await db.createVerifiedUser(
      ctx.from!.id,
      ctx.from!.username || `user${ctx.from!.id}`,
      world_id_hash,
    );
    await ctx.reply(
      "✅ Verification successful! You are now a verified human.\n\nUse /createcard to set up your professional profile.",
    );
  } else {
    const user = await db.findUserByTelegramId(ctx.from!.id);
    if (user) {
      const welcomeMessage = user.is_verified
        ? "Welcome back! You are verified. Use /mycard to see your card or /search to find others."
        : "Welcome back! Use /mycard to see your card or /search to find others.";
      await ctx.reply(welcomeMessage);
    } else {
      const buttons = [];
      if (WORLD_ID_APP_ID) {
        buttons.push([{ text: "Verify with World ID", callback_data: "verify" }]);
      }
      buttons.push([{ text: "Continue without verification", callback_data: "continue" }]);
      
      await ctx.reply(
        "Welcome to the Virtual Business Card Bot!\n\n" +
        "You can use this bot to create and share professional business cards. " +
        (WORLD_ID_APP_ID ? "For enhanced trust, you can verify your humanity with World ID." : ""),
        {
          reply_markup: {
            inline_keyboard: buttons,
          },
        },
      );
    }
  }
});

const sendVerificationLink = (ctx: Context) => {
  if (!WORLD_ID_APP_ID) {
    return ctx.reply("World ID verification is not configured on this bot.");
  }
  
  const params = new URLSearchParams({
    app_id: WORLD_ID_APP_ID,
    action_id: "my-action",
    signal: ctx.from!.id.toString(),
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid",
    client_id: WORLD_ID_APP_ID,
    state: ctx.from!.id.toString(),
  });
  const verificationUrl = `https://id.worldcoin.org/authorize?${params.toString()}`;
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

bot.action("continue", async (ctx) => {
  ctx.answerCbQuery();
  await ctx.reply(
    "Great! You can now use the bot. Use /createcard to set up your professional profile.\n\n" +
    "Note: You can verify with World ID later using /verify for enhanced trust."
  );
});

bot.command("createcard", (ctx) => ctx.scene.enter("create-card-wizard"));

bot.command("mycard", async (ctx) => {
  const user = await db.findUserByTelegramId(ctx.from!.id);
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
    .map((r: BusinessCard) => `👤 *${r.name}*${r.is_verified ? ' ✅' : ''} (@${r.telegram_username}) - ${r.title}`)
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
  await db.deleteUser(ctx.from!.id);
  await ctx.reply(
    "Your business card and all associated data have been deleted.",
  );
});

async function startApp() {
  await db.initDb();
  startServer();
  bot.launch();
  console.log("Bot is running...");
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

startApp();
