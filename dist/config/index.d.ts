import { DatabaseConfig, BotConfig, AppConfig } from '../types';
export declare const databaseConfig: DatabaseConfig;
export declare const botConfig: BotConfig;
export declare const appConfig: AppConfig;
export declare const securityConfig: {
    jwt_secret: string;
    encryption_key: string;
};
export declare const apiConfig: {
    github_api_url: string;
    linkedin_api_url: string;
};
export declare const monitoringConfig: {
    sentry_dsn: string | undefined;
    new_relic_license_key: string | undefined;
};
export declare const backupConfig: {
    enabled: boolean;
    schedule: string;
    retention_days: number;
};
export declare const validateConfig: () => void;
declare const _default: {
    database: DatabaseConfig;
    bot: BotConfig;
    app: AppConfig;
    security: {
        jwt_secret: string;
        encryption_key: string;
    };
    api: {
        github_api_url: string;
        linkedin_api_url: string;
    };
    monitoring: {
        sentry_dsn: string | undefined;
        new_relic_license_key: string | undefined;
    };
    backup: {
        enabled: boolean;
        schedule: string;
        retention_days: number;
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map