"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConfig = exports.backupConfig = exports.monitoringConfig = exports.apiConfig = exports.securityConfig = exports.appConfig = exports.botConfig = exports.databaseConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.databaseConfig = {
    host: process.env['DATABASE_HOST'] || 'localhost',
    port: parseInt(process.env['DATABASE_PORT'] || '5432'),
    database: process.env['DATABASE_NAME'] || 'business_card_bot',
    user: process.env['DATABASE_USER'] || 'postgres',
    password: process.env['DATABASE_PASSWORD'] || '',
    ssl: process.env['NODE_ENV'] === 'production'
};
exports.botConfig = {
    token: process.env['TELEGRAM_BOT_TOKEN'] || '',
    username: process.env['TELEGRAM_BOT_USERNAME'] || '',
    webhook_url: process.env['WEBHOOK_URL'] || undefined
};
exports.appConfig = {
    port: parseInt(process.env['PORT'] || '3000'),
    environment: process.env['NODE_ENV'] || 'development',
    log_level: process.env['LOG_LEVEL'] || 'info',
    rate_limit_window_ms: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'),
    rate_limit_max_requests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100')
};
exports.securityConfig = {
    jwt_secret: process.env['JWT_SECRET'] || 'default-secret-change-in-production',
    encryption_key: process.env['ENCRYPTION_KEY'] || 'default-key-change-in-production'
};
exports.apiConfig = {
    github_api_url: process.env['GITHUB_API_URL'] || 'https://api.github.com',
    linkedin_api_url: process.env['LINKEDIN_API_URL'] || 'https://api.linkedin.com'
};
exports.monitoringConfig = {
    sentry_dsn: process.env['SENTRY_DSN'],
    new_relic_license_key: process.env['NEW_RELIC_LICENSE_KEY']
};
exports.backupConfig = {
    enabled: process.env['BACKUP_ENABLED'] === 'true',
    schedule: process.env['BACKUP_SCHEDULE'] || '0 2 * * *',
    retention_days: parseInt(process.env['BACKUP_RETENTION_DAYS'] || '30')
};
const validateConfig = () => {
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
exports.validateConfig = validateConfig;
exports.default = {
    database: exports.databaseConfig,
    bot: exports.botConfig,
    app: exports.appConfig,
    security: exports.securityConfig,
    api: exports.apiConfig,
    monitoring: exports.monitoringConfig,
    backup: exports.backupConfig
};
//# sourceMappingURL=index.js.map