"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatGithubUsername = exports.formatUrl = exports.sanitizeInput = exports.validators = exports.profileValidationSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const logger_1 = __importDefault(require("./logger"));
exports.profileValidationSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(50).required().messages({
        'string.empty': 'Name cannot be empty',
        'string.max': 'Name must be 50 characters or less',
        'any.required': 'Name is required'
    }),
    title: joi_1.default.string().min(1).max(100).required().messages({
        'string.empty': 'Title cannot be empty',
        'string.max': 'Title must be 100 characters or less',
        'any.required': 'Title is required'
    }),
    description: joi_1.default.string().min(1).max(300).required().messages({
        'string.empty': 'Description cannot be empty',
        'string.max': 'Description must be 300 characters or less',
        'any.required': 'Description is required'
    }),
    github_username: joi_1.default.string().pattern(/^[a-zA-Z0-9-]+$/).max(39).optional().allow('').messages({
        'string.pattern.base': 'GitHub username can only contain letters, numbers, and hyphens',
        'string.max': 'GitHub username must be 39 characters or less'
    }),
    linkedin_url: joi_1.default.string().uri().optional().allow('').messages({
        'string.uri': 'Please enter a valid LinkedIn URL'
    }),
    website_url: joi_1.default.string().uri().optional().allow('').messages({
        'string.uri': 'Please enter a valid website URL'
    }),
    world_id: joi_1.default.string().max(255).optional().allow('').messages({
        'string.max': 'World ID must be 255 characters or less'
    })
});
exports.validators = {
    name: (input) => {
        if (!input || input.trim().length === 0) {
            return { isValid: false, error: 'Name cannot be empty' };
        }
        if (input.length > 50) {
            return { isValid: false, error: 'Name must be 50 characters or less' };
        }
        return { isValid: true };
    },
    title: (input) => {
        if (!input || input.trim().length === 0) {
            return { isValid: false, error: 'Title cannot be empty' };
        }
        if (input.length > 100) {
            return { isValid: false, error: 'Title must be 100 characters or less' };
        }
        return { isValid: true };
    },
    description: (input) => {
        if (!input || input.trim().length === 0) {
            return { isValid: false, error: 'Description cannot be empty' };
        }
        if (input.length > 300) {
            return { isValid: false, error: 'Description must be 300 characters or less' };
        }
        return { isValid: true };
    },
    githubUsername: (input) => {
        if (!input || input.trim().length === 0) {
            return { isValid: true };
        }
        const githubRegex = /^[a-zA-Z0-9-]+$/;
        if (!githubRegex.test(input)) {
            return { isValid: false, error: 'GitHub username can only contain letters, numbers, and hyphens' };
        }
        if (input.length > 39) {
            return { isValid: false, error: 'GitHub username must be 39 characters or less' };
        }
        return { isValid: true };
    },
    linkedinUrl: (input) => {
        if (!input || input.trim().length === 0) {
            return { isValid: true };
        }
        try {
            const url = new URL(input);
            if (!url.hostname.includes('linkedin.com')) {
                return { isValid: false, error: 'Please enter a valid LinkedIn URL' };
            }
            return { isValid: true };
        }
        catch {
            return { isValid: false, error: 'Please enter a valid LinkedIn URL' };
        }
    },
    websiteUrl: (input) => {
        if (!input || input.trim().length === 0) {
            return { isValid: true };
        }
        try {
            new URL(input);
            return { isValid: true };
        }
        catch {
            return { isValid: false, error: 'Please enter a valid website URL' };
        }
    },
    worldId: (input) => {
        if (!input || input.trim().length === 0) {
            return { isValid: true };
        }
        if (input.length > 255) {
            return { isValid: false, error: 'World ID must be 255 characters or less' };
        }
        return { isValid: true };
    },
    validateProfile: (data) => {
        try {
            const { error } = exports.profileValidationSchema.validate(data, { abortEarly: false });
            if (error) {
                const errors = error.details.map(detail => detail.message);
                return { isValid: false, errors };
            }
            return { isValid: true };
        }
        catch (err) {
            logger_1.default.error('Profile validation error:', err);
            return { isValid: false, errors: ['Validation failed'] };
        }
    }
};
const sanitizeInput = (input) => {
    return input.trim().replace(/\s+/g, ' ');
};
exports.sanitizeInput = sanitizeInput;
const formatUrl = (url) => {
    if (!url)
        return '';
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
    }
    return formattedUrl;
};
exports.formatUrl = formatUrl;
const formatGithubUsername = (username) => {
    if (!username)
        return '';
    return username.trim().replace(/^@/, '');
};
exports.formatGithubUsername = formatGithubUsername;
//# sourceMappingURL=validators.js.map