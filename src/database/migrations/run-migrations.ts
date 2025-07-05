import fs from 'fs';
import path from 'path';
import db from '../connection';
import logger from '../../utils/logger';

interface Migration {
  id: string;
  name: string;
  sql: string;
}

class MigrationRunner {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = path.join(__dirname);
  }

  private async createMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    try {
      await db.query(createTableSQL);
      logger.info('Migrations table created or already exists');
    } catch (error) {
      logger.error('Error creating migrations table:', error);
      throw error;
    }
  }

  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await db.query('SELECT name FROM migrations ORDER BY id');
      return result.rows.map((row: any) => row.name);
    } catch (error) {
      logger.error('Error getting executed migrations:', error);
      return [];
    }
  }

  private async loadMigrations(): Promise<Migration[]> {
    const migrations: Migration[] = [];
    
    try {
      const files = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const filePath = path.join(this.migrationsPath, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        const idParts = file.split('_');
        const id = idParts[0] || 'unknown';
        const name = file.replace('.sql', '');

        migrations.push({
          id,
          name,
          sql
        });
      }
    } catch (error) {
      logger.error('Error loading migrations:', error);
      throw error;
    }

    return migrations;
  }

  private async executeMigration(migration: Migration): Promise<void> {
    try {
      logger.info(`Executing migration: ${migration.name}`);
      
      await db.transaction(async (client) => {
        // Execute the migration SQL
        await client.query(migration.sql);
        
        // Record the migration as executed
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migration.name]
        );
      });

      logger.info(`Migration ${migration.name} executed successfully`);
    } catch (error) {
      logger.error(`Error executing migration ${migration.name}:`, error);
      throw error;
    }
  }

  public async runMigrations(): Promise<void> {
    try {
      logger.info('Starting database migrations...');

      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();

      // Get already executed migrations
      const executedMigrations = await this.getExecutedMigrations();

      // Load all migration files
      const migrations = await this.loadMigrations();

      // Filter out already executed migrations
      const pendingMigrations = migrations.filter(
        migration => !executedMigrations.includes(migration.name)
      );

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations found');
        return;
      }

      logger.info(`Found ${pendingMigrations.length} pending migrations`);

      // Execute pending migrations
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration process failed:', error);
      throw error;
    }
  }

  public async rollbackMigration(migrationName: string): Promise<void> {
    try {
      logger.info(`Rolling back migration: ${migrationName}`);
      
      await db.query(
        'DELETE FROM migrations WHERE name = $1',
        [migrationName]
      );

      logger.info(`Migration ${migrationName} rolled back successfully`);
    } catch (error) {
      logger.error(`Error rolling back migration ${migrationName}:`, error);
      throw error;
    }
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  const runner = new MigrationRunner();
  runner.runMigrations()
    .then(() => {
      logger.info('Migrations completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migrations failed:', error);
      process.exit(1);
    });
}

export default MigrationRunner; 