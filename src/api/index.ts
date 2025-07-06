const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const { BOT_USERNAME } = process.env;

app.use(express.json());

// World ID OAuth callback endpoint
app.get('/auth/worldid/callback', (req: any, res: any) => {
  const { code, state } = req.query;
  
  if (!code) {
    return res.status(400).send('Authorization code not provided');
  }

  // Extract user ID from state parameter
  const userId = state as string;
  
  // Redirect to Telegram with the user ID
  const telegramUrl = `https://t.me/${BOT_USERNAME}?start=${userId}`;
  res.redirect(telegramUrl);
});

// Health check endpoint
app.get('/health', (req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export const startServer = () => {
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
};

export default app;