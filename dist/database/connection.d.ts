import { PoolClient } from 'pg';
declare class DatabaseConnection {
    private pool;
    private static instance;
    private constructor();
    static getInstance(): DatabaseConnection;
    getClient(): Promise<PoolClient>;
    query(text: string, params?: any[]): Promise<any>;
    transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    testConnection(): Promise<boolean>;
    close(): Promise<void>;
}
declare const _default: DatabaseConnection;
export default _default;
//# sourceMappingURL=connection.d.ts.map