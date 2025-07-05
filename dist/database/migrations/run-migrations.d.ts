declare class MigrationRunner {
    private migrationsPath;
    constructor();
    private createMigrationsTable;
    private getExecutedMigrations;
    private loadMigrations;
    private executeMigration;
    runMigrations(): Promise<void>;
    rollbackMigration(migrationName: string): Promise<void>;
}
export default MigrationRunner;
//# sourceMappingURL=run-migrations.d.ts.map