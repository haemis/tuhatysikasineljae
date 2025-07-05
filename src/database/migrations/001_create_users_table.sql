-- Migration: Create users table
-- Created: 2024-01-01

CREATE TABLE IF NOT EXISTS users (
    telegram_id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    name VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    github_username VARCHAR(39),
    linkedin_url TEXT,
    website_url TEXT,
    world_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    privacy_settings JSONB DEFAULT '{
        "profile_visible": true,
        "show_github": true,
        "show_linkedin": true,
        "show_website": true,
        "show_world_id": true,
        "allow_search": true,
        "allow_connections": true
    }'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_name ON users USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_users_title ON users USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_users_description ON users USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_users_github_username ON users(github_username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 