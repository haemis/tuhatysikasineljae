"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const config_1 = require("../config");
const logger_1 = __importDefault(require("../utils/logger"));
class DatabaseConnection {
    constructor() {
        this.pool = new pg_1.Pool({
            host: config_1.databaseConfig.host,
            port: config_1.databaseConfig.port,
            database: config_1.databaseConfig.database,
            user: config_1.databaseConfig.user,
            password: config_1.databaseConfig.password,
            ssl: config_1.databaseConfig.ssl ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        this.pool.on('error', (err) => {
            logger_1.default.error('Unexpected error on idle client', err);
        });
    }
    static getInstance() {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }
    async getClient() {
        try {
            const client = await this.pool.connect();
            return client;
        }
        catch (error) {
            logger_1.default.error('Error getting database client:', error);
            throw error;
        }
    }
    async query(text, params) {
        const client = await this.getClient();
        try {
            const result = await client.query(text, params);
            return result;
        }
        catch (error) {
            logger_1.default.error('Database query error:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async transaction(callback) {
        const client = await this.getClient();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.default.error('Transaction error:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async testConnection() {
        try {
            await this.query('SELECT NOW()');
            logger_1.default.info('Database connection successful');
            return true;
        }
        catch (error) {
            logger_1.default.error('Database connection failed:', error);
            return false;
        }
    }
    async close() {
        await this.pool.end();
        logger_1.default.info('Database connection pool closed');
    }
}
exports.default = DatabaseConnection.getInstance();
//# sourceMappingURL=connection.js.map