# Telegram Business Card Bot

A professional networking bot for Telegram that allows users to create digital business cards, connect with other professionals, and manage their professional network directly within Telegram.

## 🚀 Features

### Core Features (Phase 1 - MVP)
- ✅ **Profile Management**: Create and edit professional profiles
- ✅ **Connection System**: Send and manage connection requests
- ✅ **Search & Discovery**: Find other professionals
- ✅ **Privacy Controls**: Manage profile visibility and settings

### Planned Features (Future Phases)
- 🔍 **Advanced Search**: Filter by industry, location, skills
- 📊 **Analytics**: Profile views, connection insights
- 🔗 **Integrations**: LinkedIn, GitHub, calendar integration
- 📱 **Mobile App**: Companion mobile application

## 🛠️ Technology Stack

- **Backend**: TypeScript, Node.js
- **Framework**: Telegraf (Telegram Bot API)
- **Database**: PostgreSQL
- **ORM**: Native PostgreSQL with connection pooling
- **Logging**: Winston
- **Validation**: Joi
- **Hosting**: Cloud-based (AWS/GCP/Azure)

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Telegram Bot Token (from @BotFather)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd telegram-business-card-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
# Copy environment template
cp env.example .env

# Edit .env with your configuration
nano .env
```

Required environment variables:
```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/business_card_bot
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=business_card_bot
DATABASE_USER=username
DATABASE_PASSWORD=password

# Application Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

### 4. Database Setup
```bash
# Create database
createdb business_card_bot

# Run migrations
npm run migrate
```

### 5. Start the Bot
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## 📁 Project Structure

```
src/
├── bot/                    # Telegram bot logic
│   ├── commands/          # Bot command handlers
│   │   ├── start.ts       # Welcome command
│   │   ├── help.ts        # Help command
│   │   ├── profile.ts     # Profile management
│   │   ├── search.ts      # User search
│   │   ├── connect.ts     # Connection requests
│   │   └── ...           # Other commands
│   └── index.ts           # Bot setup and configuration
├── database/              # Database layer
│   ├── connection.ts      # Database connection
│   ├── migrations/        # Database migrations
│   └── seeds/            # Database seeds
├── models/               # Data models
│   ├── UserModel.ts      # User profile operations
│   └── ConnectionModel.ts # Connection operations
├── types/                # TypeScript type definitions
│   └── index.ts
├── utils/                # Utility functions
│   └── logger.ts         # Logging configuration
├── config/               # Configuration management
│   └── index.ts
└── index.ts              # Application entry point
```

## 🤖 Bot Commands

### Profile Management
- `/start` - Welcome message and bot introduction
- `/help` - Show all available commands
- `/profile` - Create or edit your professional profile
- `/myprofile` - View your own profile
- `/settings` - Manage privacy settings

### Networking
- `/search [query]` - Search for professionals
- `/connect @username` - Send connection request
- `/requests` - View pending connection requests
- `/accept @username` - Accept connection request
- `/decline @username` - Decline connection request
- `/connections` - View your connections
- `/view @username` - View someone's profile

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    telegram_id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    name VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    github_username VARCHAR(39),
    linkedin_url TEXT,
    website_url TEXT,
    world_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    privacy_settings JSONB
);
```

### Connections Table
```sql
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id BIGINT NOT NULL REFERENCES users(telegram_id),
    receiver_id BIGINT NOT NULL REFERENCES users(telegram_id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requester_id, receiver_id)
);
```

## 🧪 Development

### Available Scripts
```bash
# Development
npm run dev          # Start in development mode
npm run watch        # Start with auto-reload

# Building
npm run build        # Build for production
npm start           # Start production server

# Database
npm run migrate      # Run database migrations
npm run seed         # Seed database with test data

# Testing
npm test            # Run tests
npm run test:watch  # Run tests in watch mode

# Linting
npm run lint        # Check code style
npm run lint:fix    # Fix code style issues
```

### Code Style
- TypeScript strict mode enabled
- ESLint configuration included
- Prettier formatting (recommended)

## 📊 Monitoring & Analytics

The bot includes built-in monitoring:
- Request/response logging
- Error tracking
- Performance metrics
- User analytics

## 🔒 Security & Privacy

- GDPR compliant data handling
- Privacy controls for user profiles
- Rate limiting to prevent abuse
- Secure database connections
- Input validation and sanitization

## 🚀 Deployment

### Docker Deployment
```bash
# Build image
docker build -t telegram-business-card-bot .

# Run container
docker run -d \
  --name business-card-bot \
  --env-file .env \
  telegram-business-card-bot
```

### Cloud Deployment
The bot is designed to be deployed on:
- AWS (EC2, Lambda)
- Google Cloud Platform
- Azure
- Heroku
- Railway

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the [ROADMAP.md](ROADMAP.md) for development progress
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Join the community discussions

## 🗺️ Roadmap

See [ROADMAP.md](ROADMAP.md) for detailed development phases and timeline.

### Phase 1 (Weeks 1-4): Foundation & Core Infrastructure ✅
- [x] Project setup and architecture
- [x] Database design and models
- [x] Basic profile management
- [x] Connection management foundation

### Phase 2 (Weeks 5-8): Search & Discovery 🔄
- [ ] Search implementation
- [ ] Profile discovery and viewing
- [ ] Help system and navigation
- [ ] Comprehensive testing

### Phase 3 (Weeks 9-12): Advanced Features & Polish 📋
- [ ] Performance optimization
- [ ] Security and privacy implementation
- [ ] Analytics and monitoring
- [ ] Final testing and launch preparation

### Phase 4 (Weeks 13-16): Post-Launch & Enhancement 📋
- [ ] Launch execution and monitoring
- [ ] User feedback implementation
- [ ] Advanced features
- [ ] Future planning

---

**Built with ❤️ for the Telegram community** 