#!/bin/bash

# Virtual Business Card Bot - Deployment Script
# This script handles the deployment process for the Telegram bot

set -e  # Exit on any error

echo "🚀 Starting deployment process..."

# Configuration
APP_NAME="telegram-business-card-bot"
DEPLOY_DIR="/opt/$APP_NAME"
BACKUP_DIR="/opt/backups/$APP_NAME"
LOG_DIR="/var/log/$APP_NAME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 is not installed. Installing..."
        npm install -g pm2
    fi
    
    print_status "Dependencies check passed"
}

# Create necessary directories
setup_directories() {
    print_status "Setting up directories..."
    
    sudo mkdir -p $DEPLOY_DIR
    sudo mkdir -p $BACKUP_DIR
    sudo mkdir -p $LOG_DIR
    sudo mkdir -p $DEPLOY_DIR/logs
    
    # Set ownership
    sudo chown -R $USER:$USER $DEPLOY_DIR
    sudo chown -R $USER:$USER $BACKUP_DIR
    sudo chown -R $USER:$USER $LOG_DIR
    
    print_status "Directories created"
}

# Backup current deployment
backup_current() {
    if [ -d "$DEPLOY_DIR/dist" ]; then
        print_status "Creating backup of current deployment..."
        timestamp=$(date +%Y%m%d_%H%M%S)
        sudo cp -r $DEPLOY_DIR $BACKUP_DIR/backup_$timestamp
        print_status "Backup created: backup_$timestamp"
    fi
}

# Build the application
build_app() {
    print_status "Building application..."
    
    # Install dependencies
    npm install
    
    # Run tests (if available)
    if npm run test &> /dev/null; then
        print_status "Tests passed"
    else
        print_warning "No tests found or tests failed"
    fi
    
    # Build the application
    npm run build
    
    if [ ! -d "dist" ]; then
        print_error "Build failed - dist directory not found"
        exit 1
    fi
    
    print_status "Build completed successfully"
}

# Deploy the application
deploy_app() {
    print_status "Deploying application..."
    
    # Copy built files
    cp -r dist/* $DEPLOY_DIR/
    cp package.json $DEPLOY_DIR/
    cp package-lock.json $DEPLOY_DIR/
    
    # Copy configuration files
    if [ -f ".env" ]; then
        cp .env $DEPLOY_DIR/
    else
        print_warning "No .env file found. Please create one manually."
    fi
    
    # Install production dependencies
    cd $DEPLOY_DIR
    npm ci --only=production
    
    print_status "Application deployed to $DEPLOY_DIR"
}

# Setup PM2 process
setup_pm2() {
    print_status "Setting up PM2 process..."
    
    # Create PM2 ecosystem file
    cat > $DEPLOY_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'dist/index.js',
    cwd: '$DEPLOY_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '$LOG_DIR/err.log',
    out_file: '$LOG_DIR/out.log',
    log_file: '$LOG_DIR/combined.log',
    time: true
  }]
};
EOF
    
    # Start or restart the application
    cd $DEPLOY_DIR
    if pm2 list | grep -q $APP_NAME; then
        print_status "Restarting existing PM2 process..."
        pm2 restart $APP_NAME
    else
        print_status "Starting new PM2 process..."
        pm2 start ecosystem.config.js
    fi
    
    # Save PM2 configuration
    pm2 save
    
    print_status "PM2 process configured"
}

# Setup systemd service (optional)
setup_systemd() {
    print_status "Setting up systemd service..."
    
    sudo tee /etc/systemd/system/$APP_NAME.service > /dev/null << EOF
[Unit]
Description=Telegram Business Card Bot
After=network.target

[Service]
Type=forking
User=$USER
WorkingDirectory=$DEPLOY_DIR
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload $APP_NAME
ExecStop=/usr/bin/pm2 stop $APP_NAME
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable $APP_NAME.service
    
    print_status "Systemd service configured"
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    # Wait a moment for the app to start
    sleep 5
    
    # Check if PM2 process is running
    if pm2 list | grep -q $APP_NAME; then
        status=$(pm2 jlist | jq -r ".[] | select(.name == \"$APP_NAME\") | .pm2_env.status")
        if [ "$status" = "online" ]; then
            print_status "Application is running successfully"
        else
            print_error "Application is not running properly"
            pm2 logs $APP_NAME --lines 20
            exit 1
        fi
    else
        print_error "PM2 process not found"
        exit 1
    fi
}

# Main deployment process
main() {
    print_status "Starting deployment of $APP_NAME"
    
    check_dependencies
    setup_directories
    backup_current
    build_app
    deploy_app
    setup_pm2
    setup_systemd
    health_check
    
    print_status "Deployment completed successfully! 🎉"
    print_status "Application is running at: $DEPLOY_DIR"
    print_status "Logs are available at: $LOG_DIR"
    print_status "Use 'pm2 logs $APP_NAME' to view logs"
    print_status "Use 'pm2 restart $APP_NAME' to restart the application"
}

# Run main function
main "$@" 