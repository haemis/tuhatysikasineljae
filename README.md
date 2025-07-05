# Telegram Business Card Bot

A professional networking bot for Telegram that allows users to create digital business cards, connect with other professionals, and manage their professional network directly within Telegram.

## 🚀 Features

### Core Features (Phase 1 - MVP)
- ✅ **Profile Management**: Create and edit professional profiles
- ✅ **Connection System**: Send and manage connection requests
- ✅ **Search & Discovery**: Find other professionals
- ✅ **Privacy Controls**: Manage profile visibility and settings
- ✅ **Analytics Tracking**: Monitor user engagement and system performance

### Advanced Features (Weeks 8-14)
- ✅ **Core bot functionality**: Comprehensive bot functionality and integration
- ✅ **Profile management**: Manage user profiles effectively
- ✅ **Search and discovery**: Efficiently find and connect with professionals
- ✅ **Connection system**: Manage connection requests and network
- ✅ **Privacy controls**: Control profile visibility and settings
- ✅ **Analytics tracking**: Monitor user engagement and system performance
- ✅ **Admin commands**: System monitoring and user management
- ✅ **Health monitoring**: Comprehensive system health checks
- ✅ **Feedback system**: User feedback collection and processing
- ✅ **Deployment automation**: Docker, PM2, and automated scripts
- ✅ **Docker support**: Containerized deployment and management
- ✅ **Testing utilities**: Comprehensive test utilities and automation
- ✅ **Advanced search with filters**: Filter by industry, skills, location, experience, availability
- ✅ **AI-powered recommendations**: AI-powered connection suggestions
- ✅ **Notification system**: Automated user notifications and digests
- ✅ **Multi-level caching**: Multi-level caching for improved performance
- ✅ **Performance optimization**: Database connection pooling and query optimization
- ✅ **Database connection pooling**: Efficient database query execution
- ✅ **Memory management**: Efficient memory usage and garbage collection
- ✅ **Security system with threat detection**: Input validation, threat detection, and user blocking
- ✅ **GDPR compliance and data protection**: GDPR compliance, data retention, and privacy controls
- ✅ **REST API for external integrations**: Full-featured API for external integrations
- ✅ **Mobile app foundation with React Native**: React Native app with profile management

### Advanced Features (Weeks 15-16)
- ✅ **Advanced Search Filters**: Comprehensive search with industry, skills, location, experience, availability, company, education, languages, certifications, remote work, and salary range filters
- ✅ **Bulk Operations**: Profile export/import, network insights, and bulk connection management
- ✅ **Integration Features**: LinkedIn and GitHub profile verification, integration status tracking
- ✅ **System Optimization**: Database query optimization, cache performance tuning, memory management
- ✅ **Performance Analytics**: Real-time performance monitoring, optimization scoring, trend analysis
- ✅ **Network Insights**: Industry breakdown, skill analysis, mutual connections, connection growth tracking
- ✅ **Advanced Sorting**: Sort by name, title, creation date, connections, and relevance
- ✅ **Optimization Recommendations**: Automated system recommendations for performance improvements

### Planned Features (Future Phases)
- 🔍 **Advanced Search**: Filter by industry, location, skills
- 🔗 **Integrations**: LinkedIn, GitHub, calendar integration
- 📱 **Mobile App**: Companion mobile application
- 🌐 **Web Dashboard**: Admin dashboard for analytics

## 🛠️ Technology Stack

- **Backend**: TypeScript, Node.js
- **Framework**: Telegraf (Telegram Bot API)
- **Database**: PostgreSQL
- **ORM**: Native PostgreSQL with connection pooling
- **Logging**: Winston
- **Validation**: Custom validators with sanitization
- **Process Management**: PM2 (production)
- **Containerization**: Docker & Docker Compose
- **Testing**: Jest with custom test utilities
- **Monitoring**: Custom health checks and analytics
- **Hosting**: Cloud-based (AWS/GCP/Azure)

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Telegram Bot Token (from @BotFather)
- Docker (optional, for containerized deployment)
- PM2 (optional, for production process management)

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

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)
```bash
# Build and run with PostgreSQL
docker-compose up -d

# View logs
docker-compose logs -f bot

# Stop services
docker-compose down
```

### Manual Docker Build
```bash
# Build image
npm run docker:build

# Run container
docker run -d \
  --name telegram-bot \
  --env-file .env \
  telegram-business-card-bot
```

## 📊 Admin Commands

The bot includes comprehensive admin functionality for monitoring and management:

### System Statistics
```
/adminstats - View system statistics and analytics
```

### User Management
```
/adminuser <user_id> - View detailed user information
```

### System Maintenance
```
/adminmaintenance - Run system cleanup and maintenance
```

### Rate Limit Management
```
/adminratelimit <user_id> - Reset rate limits for a user
```

### Admin Commands (Admin Only)
- `/adminstats` - View system statistics
- `/adminuser <user_id>` - View user details
- `/adminmaintenance` - Run system maintenance
- `/adminratelimit <user_id>` - Reset user rate limits
- `/adminperformance` - View performance metrics and monitoring
- `/admincache [clear|stats]` - Manage cache system
- `/adminsecurity` - View security and compliance information
- `/adminsecurityevents` - View recent security events
- `/adminblockuser <user_id>` - Block user for security violations
- `/adminunblockuser <user_id>` - Unblock user
- `/admincompliance` - Detailed compliance report
- `/adminretention` - Run data retention cleanup
- `/adminprivacyrequests [user_id]` - View privacy requests

## 🔧 Monitoring & Health Checks

### Automated Monitoring
```bash
# Run monitoring script
npm run monitor

# Check system health
npm run health-check
```

### Manual Health Checks
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs telegram-business-card-bot

# Monitor system resources
htop
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Utilities
The project includes comprehensive testing utilities:
- Mock Telegram contexts
- Database mocking
- Rate limiting tests
- Command response validation

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
│   │   ├── admin.ts       # Admin commands
│   │   ├── feedback.ts    # Feedback system
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
│   ├── logger.ts         # Logging configuration
│   ├── analytics.ts      # Analytics tracking
│   ├── rateLimiter.ts    # Rate limiting
│   ├── healthCheck.ts    # Health monitoring
│   ├── testUtils.ts      # Testing utilities
│   └── validators.ts     # Input validation
├── config/               # Configuration management
│   └── index.ts
└── index.ts              # Application entry point

scripts/
├── deploy.sh             # Production deployment script
└── monitor.sh            # System monitoring script

docker-compose.yml        # Docker Compose configuration
Dockerfile               # Docker container definition
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

### Feedback
- `/feedback [message]` - Submit feedback or suggestions

### Admin Commands (Admin Only)
- `/adminstats` - View system statistics
- `/adminuser <user_id>` - View user details
- `/adminmaintenance` - Run system maintenance
- `/adminratelimit <user_id>` - Reset user rate limits
- `/adminperformance` - View performance metrics and monitoring
- `/admincache [clear|stats]` - Manage cache system
- `/adminsecurity` - View security and compliance information
- `/adminsecurityevents` - View recent security events
- `/adminblockuser <user_id>` - Block user for security violations
- `/adminunblockuser <user_id>` - Unblock user
- `/admincompliance` - Detailed compliance report
- `/adminretention` - Run data retention cleanup
- `/adminprivacyrequests [user_id]` - View privacy requests

### Search & Discovery
- `/search [query]` - Basic search for professionals
- `/advancedsearch` - Advanced search with filters
  - Use filters: industry, skills, location, experience, availability
  - Example: /advancedsearch industry:Technology skills:JavaScript,React
- `/recommendations` - Get personalized connection suggestions
- `/next` - Next page of search results
- `/prev` - Previous page of search results
- `/nextadvanced` - Next page of advanced search
- `/prevadvanced` - Previous page of advanced search

### Advanced Features (Week 15)
- `/advancedfilters` - Help for advanced search filters
- `/advancedfilters query:JavaScript industry:Technology` - Advanced search with comprehensive filters
- `/bulkoperations` - Help for bulk operations
- `/bulkexport` - Export your connections' profiles
- `/bulkinsights` - Get network insights and analytics
- `/integrations` - Help for integration management
- `/verifylinkedin <url>` - Verify LinkedIn profile
- `/verifygithub <username>` - Verify GitHub profile
- `/integrationstatus` - View integration status

### System Optimization (Week 16 - Admin Only)
- `/adminoptimization` - Run comprehensive system optimization analysis
- `/adminoptimizedb` - Optimize database queries
- `/adminoptimizecache` - Optimize cache performance
- `/adminoptimizememory` - Optimize memory usage
- `/adminoptimizationtrends` - View optimization trends

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
npm run test:coverage # Run tests with coverage

# Linting
npm run lint        # Check code style
npm run lint:fix    # Fix code style issues
npm run type-check  # TypeScript type checking

# Deployment
npm run deploy      # Automated deployment
npm run monitor     # System monitoring
npm run health-check # Health check

# Docker
npm run docker:build # Build Docker image
npm run docker:run   # Run with Docker Compose
npm run docker:stop  # Stop Docker services
npm run docker:logs  # View Docker logs

# Performance & Cache
npm run performance:check # Check performance metrics
npm run cache:stats       # View cache statistics
npm run cache:clear       # Clear all caches

# Security & Compliance
npm run security:check    # Check security status
npm run compliance:report # Generate compliance report

# API Management
npm run api:start         # Start API server
npm run api:dev           # Start API in development mode

# Mobile App
npm run mobile:setup      # Setup mobile app dependencies
npm run mobile:android    # Run mobile app on Android
npm run mobile:ios        # Run mobile app on iOS

# System Optimization (Week 16)
npm run optimization:analyze    # Run system optimization analysis
npm run optimization:database   # Optimize database queries
npm run optimization:cache      # Optimize cache performance
npm run optimization:memory     # Optimize memory usage
npm run optimization:trends     # View optimization trends

# Advanced Features (Week 15)
npm run advanced:search         # Check advanced search features
npm run advanced:bulk           # Check bulk operations
npm run advanced:integrations   # Check integration features

# Testing
npm run test:advanced     # Test advanced features
npm run test:performance  # Test performance utilities
npm run test:cache        # Test caching system
```

## 📈 Analytics & Monitoring

### Built-in Analytics
- User engagement tracking
- Command usage statistics
- Error rate monitoring
- Performance metrics

### Health Monitoring
- Database connectivity checks
- System resource monitoring
- Process status verification
- Automated alerting

## 🔒 Security & Compliance

### Security Features
- **Input Validation**: Comprehensive sanitization and validation
- **Threat Detection**: Suspicious activity monitoring and user blocking
- **Rate Limiting**: IP-based and user-based rate limiting
- **Encryption**: Secure data encryption and hashing
- **Access Control**: API key authentication and admin privileges

### GDPR Compliance
- **Data Export**: Users can request their data export
- **Data Deletion**: Complete data deletion and anonymization
- **Data Rectification**: Profile correction capabilities
- **Consent Management**: User consent tracking and updates
- **Data Retention**: Automated cleanup of old data

### Privacy Controls
- **Granular Settings**: Control profile visibility and searchability
- **Connection Management**: Accept/decline connection requests
- **Audit Logging**: Complete activity tracking for compliance

## 🌐 REST API

### API Endpoints
- **Users**: Profile management and retrieval
- **Connections**: Connection requests and management
- **Search**: Basic and advanced search functionality
- **Admin**: System monitoring and management
- **Health**: System health checks and metrics

### Authentication
- API key-based authentication
- Bearer token support
- Rate limiting per IP

### Documentation
- Auto-generated API documentation
- Interactive endpoint testing
- Response examples and error codes

## 📱 Mobile App

### React Native App
- **Profile Management**: View and edit profiles
- **Search & Discovery**: Find and connect with professionals
- **Connection Management**: Handle connection requests
- **Real-time Updates**: Live notifications and updates

### Features
- Cross-platform (iOS/Android)
- Offline capability
- Push notifications
- QR code scanning
- Social sharing

### Development
```bash
# Setup mobile app
npm run mobile:setup

# Run on Android
npm run mobile:android

# Run on iOS
npm run mobile:ios
```

## 🚀 Production Deployment

### Automated Deployment
```bash
# Run deployment script
npm run deploy
```

### Manual Deployment with PM2
```bash
# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit
```

### Environment Variables (Production)
```bash
# Required
TELEGRAM_BOT_TOKEN=your_bot_token
DB_HOST=localhost
DB_PORT=5432
DB_NAME=telegram_bot
DB_USER=bot_user
DB_PASSWORD=secure_password

# Optional
LOG_LEVEL=info
NODE_ENV=production
```

## 📊 Performance

### Optimizations
- Connection pooling
- Rate limiting
- Efficient database queries
- Memory management
- Automated cleanup

### Monitoring
- Real-time health checks
- Performance metrics
- Error tracking
- Resource usage monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the `/help` command in the bot
- **Issues**: Report bugs via GitHub issues
- **Feedback**: Use `/feedback` command in the bot
- **Admin Support**: Contact administrators for urgent issues

## 🔄 Roadmap

### Completed (Weeks 1-7)
- ✅ Core bot functionality
- ✅ Profile management
- ✅ Search and discovery
- ✅ Connection system
- ✅ Privacy controls
- ✅ Analytics tracking

### Completed (Weeks 8-14)
- ✅ Core bot functionality
- ✅ Profile management
- ✅ Search and discovery
- ✅ Connection system
- ✅ Privacy controls
- ✅ Analytics tracking
- ✅ Admin commands
- ✅ Health monitoring
- ✅ Feedback system
- ✅ Deployment automation
- ✅ Docker support
- ✅ Testing utilities
- ✅ Advanced search with filters
- ✅ AI-powered recommendations
- ✅ Notification system
- ✅ Multi-level caching
- ✅ Performance optimization
- ✅ Database connection pooling
- ✅ Memory management
- ✅ Security system with threat detection
- ✅ GDPR compliance and data protection
- ✅ REST API for external integrations
- ✅ Mobile app foundation with React Native

### Completed (Weeks 15-16)
- ✅ **Advanced Search Filters**: Comprehensive search with industry, skills, location, experience, availability, company, education, languages, certifications, remote work, and salary range filters
- ✅ **Bulk Operations**: Profile export/import, network insights, and bulk connection management
- ✅ **Integration Features**: LinkedIn and GitHub profile verification, integration status tracking
- ✅ **System Optimization**: Database query optimization, cache performance tuning, memory management
- ✅ **Performance Analytics**: Real-time performance monitoring, optimization scoring, trend analysis
- ✅ **Network Insights**: Industry breakdown, skill analysis, mutual connections, connection growth tracking
- ✅ **Advanced Sorting**: Sort by name, title, creation date, connections, and relevance
- ✅ **Optimization Recommendations**: Automated system recommendations for performance improvements

### Future Enhancements
- 🔄 Web dashboard
- 🔄 Advanced analytics
- 🔄 Integration APIs
- 🔄 Mobile app
- �� Premium features 