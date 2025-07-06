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
    await ctx.reply("Let's create your business card! What's your full name?");
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.name = ctx.message.text;
    await ctx.reply("What's your professional title or job position?");
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.title = ctx.message.text;
    await ctx.reply("Tell us about yourself! Write a short bio (max 200 characters):");
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.bio = ctx.message.text.substring(0, 200);
    await ctx.reply("What's your LinkedIn profile URL? (Type 'skip' if you don't have one)");
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

const editCardScene = new Scenes.WizardScene<any>(
  "edit-card-wizard",
  async (ctx) => {
    const user = await db.findUserByTelegramId(ctx.from!.id);
    if (!user) {
      await ctx.reply("You don't have a card yet! Use /createcard to make one.");
      return await ctx.scene.leave();
    }
    
    ctx.wizard.state.currentCard = user;
    await ctx.reply(
      "What would you like to edit?",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Name", callback_data: "edit_name" }],
            [{ text: "Title", callback_data: "edit_title" }],
            [{ text: "Bio", callback_data: "edit_bio" }],
            [{ text: "LinkedIn URL", callback_data: "edit_linkedin" }],
            [{ text: "Cancel", callback_data: "edit_cancel" }],
          ],
        },
      },
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.callbackQuery) {
      const action = (ctx.callbackQuery as any).data;
      await ctx.answerCbQuery();
      
      switch (action) {
        case "edit_name":
          ctx.wizard.state.editField = "name";
          await ctx.reply(`Current name: ${ctx.wizard.state.currentCard.name}\n\nEnter your new name:`);
          return ctx.wizard.next();
        case "edit_title":
          ctx.wizard.state.editField = "title";
          await ctx.reply(`Current title: ${ctx.wizard.state.currentCard.title}\n\nEnter your new title:`);
          return ctx.wizard.next();
        case "edit_bio":
          ctx.wizard.state.editField = "bio";
          await ctx.reply(`Current bio: ${ctx.wizard.state.currentCard.bio}\n\nEnter your new bio (max 200 characters):`);
          return ctx.wizard.next();
        case "edit_linkedin":
          ctx.wizard.state.editField = "linkedin_url";
          const currentLinkedIn = ctx.wizard.state.currentCard.linkedin_url || "Not set";
          await ctx.reply(`Current LinkedIn: ${currentLinkedIn}\n\nEnter your new LinkedIn URL (or 'skip' to remove):`);
          return ctx.wizard.next();
        case "edit_cancel":
          await ctx.reply("Edit cancelled.");
          return await ctx.scene.leave();
        default:
          await ctx.reply("Invalid option. Please try again.");
          return;
      }
    }
    return;
  },
  async (ctx) => {
    const field = ctx.wizard.state.editField;
    let newValue = ctx.message.text;
    
    if (field === "bio") {
      newValue = newValue.substring(0, 200);
    } else if (field === "linkedin_url" && newValue.toLowerCase() === "skip") {
      newValue = undefined;
    }
    
    const updates = { [field]: newValue };
    await db.updateUserCard(ctx.from.id, updates);
    
    await ctx.reply(`Your ${field.replace('_', ' ')} has been updated!`);
    return await ctx.scene.leave();
  },
);

const bot = new Telegraf<Scenes.WizardContext>(BOT_TOKEN);
const stage = new Scenes.Stage<Scenes.WizardContext>([createCardScene, editCardScene]);

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

const escapeMarkdown = (text: string): string => {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
};

const formatCard = (card: BusinessCard): string => {
  let message = `👤 *${escapeMarkdown(card.name)}*`;
  if (card.is_verified) {
    message += ` ✅`;
  }
  message += `\n*Title:* ${escapeMarkdown(card.title)}\n\n`;
  message += `*Bio:* ${escapeMarkdown(card.bio)}\n\n`;
  if (card.linkedin_url) {
    message += `[LinkedIn Profile](${card.linkedin_url})\n`;
  }
  message += `*Telegram:* @${escapeMarkdown(card.telegram_username)}`;
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

// Connection request handlers
bot.action(/^connect_(\d+)$/, async (ctx) => {
  const recipientId = parseInt(ctx.match![1]);
  await ctx.answerCbQuery();
  
  const recipient = await db.findUserByTelegramId(recipientId);
  if (!recipient) {
    return ctx.reply("User not found.");
  }
  
  const connectionStatus = await db.getConnectionStatus(ctx.from!.id, recipientId);
  if (connectionStatus === 'accepted') {
    return ctx.reply("You are already connected with this user!");
  } else if (connectionStatus === 'pending') {
    return ctx.reply("Connection request already sent!");
  }
  
  await db.sendConnectionRequest(ctx.from!.id, recipientId);
  await ctx.reply(`Connection request sent to ${recipient.name}!`);
  
  // Notify the recipient
  try {
    const requester = await db.findUserByTelegramId(ctx.from!.id);
    await ctx.telegram.sendMessage(
      recipientId,
      `🤝 New connection request from *${escapeMarkdown(requester!.name)}* (@${escapeMarkdown(requester!.telegram_username)})\n\nUse /requests to view and respond to connection requests.`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    // User might have blocked the bot, ignore
  }
});

bot.action(/^accept_(\d+)$/, async (ctx) => {
  const requesterId = parseInt(ctx.match![1]);
  await ctx.answerCbQuery();
  
  await db.respondToConnectionRequest(requesterId, ctx.from!.id, 'accepted');
  
  const requester = await db.findUserByTelegramId(requesterId);
  await ctx.reply(`✅ You are now connected with ${requester?.name}!`);
  
  // Notify the requester
  try {
    const recipient = await db.findUserByTelegramId(ctx.from!.id);
    await ctx.telegram.sendMessage(
      requesterId,
      `✅ *${escapeMarkdown(recipient!.name)}* accepted your connection request!\n\nYou can now view their full profile and they're in your connections.`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    // User might have blocked the bot, ignore
  }
});

bot.action(/^decline_(\d+)$/, async (ctx) => {
  const requesterId = parseInt(ctx.match![1]);
  await ctx.answerCbQuery();
  
  await db.respondToConnectionRequest(requesterId, ctx.from!.id, 'declined');
  
  const requester = await db.findUserByTelegramId(requesterId);
  await ctx.reply(`❌ Connection request from ${requester?.name} declined.`);
});

bot.action("noop", async (ctx) => {
  await ctx.answerCbQuery();
});

bot.command("help", async (ctx) => {
  const helpMessage = `
🤖 *Virtual Business Card Bot Help*

*Available Commands:*

📝 *Card Management:*
• \`/createcard\` - Create your business card
• \`/editcard\` - Edit individual fields of your card
• \`/mycard\` - View your current business card
• \`/deletecard\` - Delete your card and data

🔍 *Discovery:*
• \`/search <name>\` - Search for users by name
• \`/view @username\` - View someone's business card

🤝 *Networking:*
• \`/connect @username\` - Send connection request
• \`/requests\` - View pending connection requests
• \`/connections\` - View your network connections

${WORLD_ID_APP_ID ? '🔐 *Verification:*\n• `/verify` - Verify with World ID for enhanced trust\n' : ''}
ℹ️ *Other:*
• \`/help\` - Show this help message
• \`/start\` - Start/restart the bot

*About Verification:*
${WORLD_ID_APP_ID ?
  '✅ Users with World ID verification get a verified badge for enhanced trust.' :
  'World ID verification is not configured on this bot instance.'
}

*About Connections:*
Connect with other users to build your professional network. Connected users can easily find and contact each other.

*Need help?* Just type any command to get started!
  `;
  
  await ctx.replyWithMarkdown(helpMessage);
});

bot.command("createcard", (ctx) => ctx.scene.enter("create-card-wizard"));

bot.command("editcard", (ctx) => ctx.scene.enter("edit-card-wizard"));

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
    .map((r: BusinessCard) => `👤 *${escapeMarkdown(r.name)}*${r.is_verified ? ' ✅' : ''} (@${escapeMarkdown(r.telegram_username)}) - ${escapeMarkdown(r.title)}`)
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
    const connectionStatus = await db.getConnectionStatus(ctx.from!.id, user.telegram_id);
    let buttons = [];
    
    if (user.telegram_id !== ctx.from!.id) {
      if (!connectionStatus) {
        buttons.push([{ text: "🤝 Connect", callback_data: `connect_${user.telegram_id}` }]);
      } else if (connectionStatus === 'pending') {
        buttons.push([{ text: "⏳ Request Pending", callback_data: "noop" }]);
      } else if (connectionStatus === 'accepted') {
        buttons.push([{ text: "✅ Connected", callback_data: "noop" }]);
      }
    }
    
    await ctx.replyWithMarkdown(formatCard(user), {
      reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
    });
  } else {
    return ctx.reply(`User ${username} not found or has no card.`);
  }
});

bot.command("connect", async (ctx) => {
  const username = ctx.message.text.split(" ")[1];
  if (!username) return ctx.reply("Usage: /connect @username");
  
  const user = await db.findUserByUsername(username);
  if (!user) {
    return ctx.reply(`User ${username} not found.`);
  }
  
  if (user.telegram_id === ctx.from!.id) {
    return ctx.reply("You can't connect with yourself!");
  }
  
  const connectionStatus = await db.getConnectionStatus(ctx.from!.id, user.telegram_id);
  if (connectionStatus === 'accepted') {
    return ctx.reply("You are already connected with this user!");
  } else if (connectionStatus === 'pending') {
    return ctx.reply("Connection request already sent!");
  }
  
  await db.sendConnectionRequest(ctx.from!.id, user.telegram_id);
  await ctx.reply(`Connection request sent to ${user.name}!`);
  
  // Notify the recipient
  try {
    const requester = await db.findUserByTelegramId(ctx.from!.id);
    await ctx.telegram.sendMessage(
      user.telegram_id,
      `🤝 New connection request from *${escapeMarkdown(requester!.name)}* (@${escapeMarkdown(requester!.telegram_username)})\n\nUse /requests to view and respond to connection requests.`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    // User might have blocked the bot, ignore
  }
});

bot.command("requests", async (ctx) => {
  const requests = await db.getPendingConnectionRequests(ctx.from!.id);
  
  if (requests.length === 0) {
    return ctx.reply("You have no pending connection requests.");
  }
  
  let message = "🤝 *Pending Connection Requests:*\n\n";
  const buttons = [];
  
  for (const request of requests) {
    message += `👤 *${escapeMarkdown(request.name)}*${request.is_verified ? ' ✅' : ''} (@${escapeMarkdown(request.telegram_username)})\n`;
    message += `*Title:* ${escapeMarkdown(request.title)}\n\n`;
    
    buttons.push([
      { text: `✅ Accept ${request.name}`, callback_data: `accept_${request.requester_id}` },
      { text: `❌ Decline ${request.name}`, callback_data: `decline_${request.requester_id}` },
    ]);
  }
  
  await ctx.replyWithMarkdown(message, {
    reply_markup: { inline_keyboard: buttons },
  });
});

bot.command("connections", async (ctx) => {
  const connections = await db.getConnections(ctx.from!.id);
  
  if (connections.length === 0) {
    return ctx.reply("You don't have any connections yet. Use /search to find people and /connect to connect with them!");
  }
  
  let message = `🌐 *Your Connections (${connections.length}):*\n\n`;
  
  for (const connection of connections) {
    message += `👤 *${escapeMarkdown(connection.name)}*${connection.is_verified ? ' ✅' : ''} (@${escapeMarkdown(connection.telegram_username)})\n`;
    message += `*Title:* ${escapeMarkdown(connection.title)}\n\n`;
  }
  
  message += "\nUse `/view @username` to see full profiles.";
  
  await ctx.replyWithMarkdown(message);
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
