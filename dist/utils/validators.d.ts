import Joi from 'joi';
export declare const profileValidationSchema: Joi.ObjectSchema<any>;
export declare const validators: {
    name: (input: string) => {
        isValid: boolean;
        error?: string;
    };
    title: (input: string) => {
        isValid: boolean;
        error?: string;
    };
    description: (input: string) => {
        isValid: boolean;
        error?: string;
    };
    githubUsername: (input: string) => {
        isValid: boolean;
        error?: string;
    };
    linkedinUrl: (input: string) => {
        isValid: boolean;
        error?: string;
    };
    websiteUrl: (input: string) => {
        isValid: boolean;
        error?: string;
    };
    worldId: (input: string) => {
        isValid: boolean;
        error?: string;
    };
    validateProfile: (data: Record<string, any>) => {
        isValid: boolean;
        errors?: string[];
    };
};
export declare const sanitizeInput: (input: string) => string;
export declare const formatUrl: (url: string) => string;
export declare const formatGithubUsername: (username: string) => string;
//# sourceMappingURL=validators.d.ts.map