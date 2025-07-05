"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const connection_1 = __importDefault(require("../connection"));
const logger_1 = __importDefault(require("../../utils/logger"));
class MigrationRunner {
    constructor() {
        this.migrationsPath = path_1.default.join(__dirname);
    }
    async createMigrationsTable() {
        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
        try {
            await connection_1.default.query(createTableSQL);
            logger_1.default.info('Migrations table created or already exists');
        }
        catch (error) {
            logger_1.default.error('Error creating migrations table:', error);
            throw error;
        }
    }
    async getExecutedMigrations() {
        try {
            const result = await connection_1.default.query('SELECT name FROM migrations ORDER BY id');
            return result.rows.map((row) => row.name);
        }
        catch (error) {
            logger_1.default.error('Error getting executed migrations:', error);
            return [];
        }
    }
    async loadMigrations() {
        const migrations = [];
        try {
            const files = fs_1.default.readdirSync(this.migrationsPath)
                .filter(file => file.endsWith('.sql'))
                .sort();
            for (const file of files) {
                const filePath = path_1.default.join(this.migrationsPath, file);
                const sql = fs_1.default.readFileSync(filePath, 'utf8');
                const idParts = file.split('_');
                const id = idParts[0] || 'unknown';
                const name = file.replace('.sql', '');
                migrations.push({
                    id,
                    name,
                    sql
                });
            }
        }
        catch (error) {
            logger_1.default.error('Error loading migrations:', error);
            throw error;
        }
        return migrations;
    }
    async executeMigration(migration) {
        try {
            logger_1.default.info(`Executing migration: ${migration.name}`);
            await connection_1.default.transaction(async (client) => {
                await client.query(migration.sql);
                await client.query('INSERT INTO migrations (name) VALUES ($1)', [migration.name]);
            });
            logger_1.default.info(`Migration ${migration.name} executed successfully`);
        }
        catch (error) {
            logger_1.default.error(`Error executing migration ${migration.name}:`, error);
            throw error;
        }
    }
    async runMigrations() {
        try {
            logger_1.default.info('Starting database migrations...');
            await this.createMigrationsTable();
            const executedMigrations = await this.getExecutedMigrations();
            const migrations = await this.loadMigrations();
            const pendingMigrations = migrations.filter(migration => !executedMigrations.includes(migration.name));
            if (pendingMigrations.length === 0) {
                logger_1.default.info('No pending migrations found');
                return;
            }
            logger_1.default.info(`Found ${pendingMigrations.length} pending migrations`);
            for (const migration of pendingMigrations) {
                await this.executeMigration(migration);
            }
            logger_1.default.info('All migrations completed successfully');
        }
        catch (error) {
            logger_1.default.error('Migration process failed:', error);
            throw error;
        }
    }
    async rollbackMigration(migrationName) {
        try {
            logger_1.default.info(`Rolling back migration: ${migrationName}`);
            await connection_1.default.query('DELETE FROM migrations WHERE name = $1', [migrationName]);
            logger_1.default.info(`Migration ${migrationName} rolled back successfully`);
        }
        catch (error) {
            logger_1.default.error(`Error rolling back migration ${migrationName}:`, error);
            throw error;
        }
    }
}
if (require.main === module) {
    const runner = new MigrationRunner();
    runner.runMigrations()
        .then(() => {
        logger_1.default.info('Migrations completed');
        process.exit(0);
    })
        .catch((error) => {
        logger_1.default.error('Migrations failed:', error);
        process.exit(1);
    });
}
exports.default = MigrationRunner;
//# sourceMappingURL=run-migrations.js.map