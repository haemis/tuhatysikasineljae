import Joi from 'joi';
import logger from './logger';

// Validation schemas
export const profileValidationSchema = Joi.object({
  name: Joi.string().min(1).max(50).required().messages({
    'string.empty': 'Name cannot be empty',
    'string.max': 'Name must be 50 characters or less',
    'any.required': 'Name is required'
  }),
  title: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'Title cannot be empty',
    'string.max': 'Title must be 100 characters or less',
    'any.required': 'Title is required'
  }),
  description: Joi.string().min(1).max(300).required().messages({
    'string.empty': 'Description cannot be empty',
    'string.max': 'Description must be 300 characters or less',
    'any.required': 'Description is required'
  }),
  github_username: Joi.string().pattern(/^[a-zA-Z0-9-]+$/).max(39).optional().allow('').messages({
    'string.pattern.base': 'GitHub username can only contain letters, numbers, and hyphens',
    'string.max': 'GitHub username must be 39 characters or less'
  }),
  linkedin_url: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Please enter a valid LinkedIn URL'
  }),
  website_url: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Please enter a valid website URL'
  }),
  world_id: Joi.string().max(255).optional().allow('').messages({
    'string.max': 'World ID must be 255 characters or less'
  })
});

// Individual field validators
export const validators = {
  /**
   * Validate name field
   */
  name: (input: string): { isValid: boolean; error?: string } => {
    if (!input || input.trim().length === 0) {
      return { isValid: false, error: 'Name cannot be empty' };
    }
    
    if (input.length > 50) {
      return { isValid: false, error: 'Name must be 50 characters or less' };
    }
    
    return { isValid: true };
  },

  /**
   * Validate title field
   */
  title: (input: string): { isValid: boolean; error?: string } => {
    if (!input || input.trim().length === 0) {
      return { isValid: false, error: 'Title cannot be empty' };
    }
    
    if (input.length > 100) {
      return { isValid: false, error: 'Title must be 100 characters or less' };
    }
    
    return { isValid: true };
  },

  /**
   * Validate description field
   */
  description: (input: string): { isValid: boolean; error?: string } => {
    if (!input || input.trim().length === 0) {
      return { isValid: false, error: 'Description cannot be empty' };
    }
    
    if (input.length > 300) {
      return { isValid: false, error: 'Description must be 300 characters or less' };
    }
    
    return { isValid: true };
  },

  /**
   * Validate GitHub username
   */
  githubUsername: (input: string): { isValid: boolean; error?: string } => {
    if (!input || input.trim().length === 0) {
      return { isValid: true }; // Optional field
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

  /**
   * Validate LinkedIn URL
   */
  linkedinUrl: (input: string): { isValid: boolean; error?: string } => {
    if (!input || input.trim().length === 0) {
      return { isValid: true }; // Optional field
    }
    
    try {
      const url = new URL(input);
      if (!url.hostname.includes('linkedin.com')) {
        return { isValid: false, error: 'Please enter a valid LinkedIn URL' };
      }
      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Please enter a valid LinkedIn URL' };
    }
  },

  /**
   * Validate website URL
   */
  websiteUrl: (input: string): { isValid: boolean; error?: string } => {
    if (!input || input.trim().length === 0) {
      return { isValid: true }; // Optional field
    }
    
    try {
      new URL(input);
      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Please enter a valid website URL' };
    }
  },

  /**
   * Validate World ID
   */
  worldId: (input: string): { isValid: boolean; error?: string } => {
    if (!input || input.trim().length === 0) {
      return { isValid: true }; // Optional field
    }
    
    if (input.length > 255) {
      return { isValid: false, error: 'World ID must be 255 characters or less' };
    }
    
    return { isValid: true };
  },

  /**
   * Validate complete profile data
   */
  validateProfile: (data: Record<string, any>): { isValid: boolean; errors?: string[] } => {
    try {
      const { error } = profileValidationSchema.validate(data, { abortEarly: false });
      
      if (error) {
        const errors = error.details.map(detail => detail.message);
        return { isValid: false, errors };
      }
      
      return { isValid: true };
    } catch (err) {
      logger.error('Profile validation error:', err);
      return { isValid: false, errors: ['Validation failed'] };
    }
  }
};

// Helper functions
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/\s+/g, ' ');
};

export const formatUrl = (url: string): string => {
  if (!url) return '';
  
  let formattedUrl = url.trim();
  
  // Add protocol if missing
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = 'https://' + formattedUrl;
  }
  
  return formattedUrl;
};

export const formatGithubUsername = (username: string): string => {
  if (!username) return '';
  
  // Remove @ symbol if present
  return username.trim().replace(/^@/, '');
}; 