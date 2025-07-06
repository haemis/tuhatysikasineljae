# Virtual Business Card Bot

A Telegram bot for creating and sharing professional business cards with optional World ID verification for enhanced trust.

## Features

- Create professional business cards with name, title, bio, and LinkedIn profile
- Search for other users by name
- View detailed business cards
- Optional World ID verification for enhanced trust and authenticity
- Works with or without World ID verification

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment file and configure it:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`:
   - `BOT_TOKEN`: Get this from @BotFather on Telegram (required)
   - `BOT_USERNAME`: Your bot's username without the @ (required)
   - `WORLD_ID_APP_ID`: Get from Worldcoin Developer Portal (optional)
   - `API_BASE_URL`: Your API server URL (optional, defaults to localhost:3000)
   - `PORT`: API server port (optional, defaults to 3000)

5. Build and start the bot:
   ```bash
   npm run build
   npm start
   ```

   Or for development:
   ```bash
   npm run dev
   ```

## World ID Integration (Optional)

The bot supports optional World ID verification:

- **With World ID**: Users can verify their humanity for enhanced trust. Verified users get a ✅ badge on their profiles.
- **Without World ID**: Users can still use all bot features without verification. Simply leave `WORLD_ID_APP_ID` empty or remove it from your `.env` file.

To enable World ID verification:
1. Create an app at [Worldcoin Developer Portal](https://developer.worldcoin.org)
2. Set your `WORLD_ID_APP_ID` in the `.env` file
3. Configure your redirect URI to `{YOUR_API_BASE_URL}/auth/worldid/callback`

## Bot Commands

- `/start` - Start the bot and get welcome message
- `/help` - Show help message with all available commands
- `/createcard` - Create your business card
- `/editcard` - Edit individual fields of your existing business card
- `/mycard` - View your current business card
- `/search <name>` - Search for users by name
- `/view @username` - View a specific user's business card
- `/connect @username` - Send connection request to another user
- `/requests` - View and respond to pending connection requests
- `/connections` - View your network of connected users
- `/verify` - Verify with World ID (if configured)
- `/deletecard` - Delete your business card and data

## Networking Features

The bot includes a comprehensive networking system that allows users to connect with each other:

### Connection Workflow
1. **Discovery**: Use `/search <name>` to find users by name
2. **View Profiles**: Use `/view @username` to see detailed business cards
3. **Connect**: Click the "🤝 Connect" button or use `/connect @username` to send connection requests
4. **Manage Requests**: Recipients use `/requests` to view and respond to pending requests
5. **Network**: Use `/connections` to view your professional network

### Connection Features
- **Real-time Notifications**: Users receive instant notifications when they receive connection requests
- **Status Indicators**: Clear visual indicators show connection status (pending, connected)
- **Interactive Buttons**: Easy-to-use inline buttons for connecting and managing requests
- **Network Overview**: View all your connections in one place

## Database Schema

The bot uses SQLite with the following schema:

```sql
CREATE TABLE BusinessCards (
  telegram_id INTEGER PRIMARY KEY,
  world_id_hash TEXT UNIQUE,
  telegram_username TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  bio TEXT NOT NULL,
  linkedin_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE Connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id INTEGER NOT NULL,
  recipient_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES BusinessCards (telegram_id),
  FOREIGN KEY (recipient_id) REFERENCES BusinessCards (telegram_id),
  UNIQUE(requester_id, recipient_id)
);
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /auth/worldid/callback` - World ID OAuth callback (if World ID is configured)

## Development

The project is built with:
- TypeScript
- Telegraf (Telegram Bot Framework)
- SQLite database
- Express.js for API endpoints
- World ID for optional verification

## License

ISC