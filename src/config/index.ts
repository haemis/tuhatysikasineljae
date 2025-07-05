import dotenv from 'dotenv';
import { DatabaseConfig, BotConfig, AppConfig } from '../types';

// Load environment variables
dotenv.config();

// Database configuration
export const databaseConfig: DatabaseConfig = {
  host: process.env['DATABASE_HOST'] || 'localhost',
  port: parseInt(process.env['DATABASE_PORT'] || '5432'),
  database: process.env['DATABASE_NAME'] || 'business_card_bot',
  user: process.env['DATABASE_USER'] || 'postgres',
  password: process.env['DATABASE_PASSWORD'] || '',
  ssl: process.env['NODE_ENV'] === 'production'
};

// Bot configuration
export const botConfig: BotConfig = {
  token: process.env['TELEGRAM_BOT_TOKEN'] || '',
  username: process.env['TELEGRAM_BOT_USERNAME'] || '',
  webhook_url: process.env['WEBHOOK_URL'] || undefined
};

// Application configuration
export const appConfig: AppConfig = {
  port: parseInt(process.env['PORT'] || '3000'),
  environment: process.env['NODE_ENV'] || 'development',
  log_level: process.env['LOG_LEVEL'] || 'info',
  rate_limit_window_ms: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'),
  rate_limit_max_requests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100')
};

// Security configuration
export const securityConfig = {
  jwt_secret: process.env['JWT_SECRET'] || 'default-secret-change-in-production',
  encryption_key: process.env['ENCRYPTION_KEY'] || 'default-key-change-in-production'
};

// External API configuration
export const apiConfig = {
  github_api_url: process.env['GITHUB_API_URL'] || 'https://api.github.com',
  linkedin_api_url: process.env['LINKEDIN_API_URL'] || 'https://api.linkedin.com'
};

// Monitoring configuration
export const monitoringConfig = {
  sentry_dsn: process.env['SENTRY_DSN'],
  new_relic_license_key: process.env['NEW_RELIC_LICENSE_KEY']
};

// Backup configuration
export const backupConfig = {
  enabled: process.env['BACKUP_ENABLED'] === 'true',
  schedule: process.env['BACKUP_SCHEDULE'] || '0 2 * * *',
  retention_days: parseInt(process.env['BACKUP_RETENTION_DAYS'] || '30')
};

// Validation functions
export const validateConfig = (): void => {
  const requiredEnvVars = [
    'TELEGRAM_BOT_TOKEN',
    'DATABASE_NAME',
    'DATABASE_USER',
    'DATABASE_PASSWORD'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

// Export all configurations
export default {
  database: databaseConfig,
  bot: botConfig,
  app: appConfig,
  security: securityConfig,
  api: apiConfig,
  monitoring: monitoringConfig,
  backup: backupConfig
}; 