#!/bin/bash

# Virtual Business Card Bot - Monitoring Script
# This script monitors the health and performance of the bot

set -e

# Configuration
APP_NAME="telegram-business-card-bot"
LOG_DIR="/var/log/$APP_NAME"
ALERT_EMAIL="admin@example.com"
DISK_THRESHOLD=80
MEMORY_THRESHOLD=80
CPU_THRESHOLD=80

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to send alert
send_alert() {
    local subject="$1"
    local message="$2"
    
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "$subject" $ALERT_EMAIL
    else
        print_warning "Mail command not available. Alert not sent."
    fi
}

# Check system resources
check_system_resources() {
    print_info "Checking system resources..."
    
    # Check disk usage
    disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt "$DISK_THRESHOLD" ]; then
        print_warning "Disk usage is ${disk_usage}% (threshold: ${DISK_THRESHOLD}%)"
        send_alert "Bot Alert: High Disk Usage" "Disk usage is ${disk_usage}% on $(hostname)"
    else
        print_success "Disk usage: ${disk_usage}%"
    fi
    
    # Check memory usage
    memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$memory_usage" -gt "$MEMORY_THRESHOLD" ]; then
        print_warning "Memory usage is ${memory_usage}% (threshold: ${MEMORY_THRESHOLD}%)"
        send_alert "Bot Alert: High Memory Usage" "Memory usage is ${memory_usage}% on $(hostname)"
    else
        print_success "Memory usage: ${memory_usage}%"
    fi
    
    # Check CPU usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    if [ "$cpu_usage" -gt "$CPU_THRESHOLD" ]; then
        print_warning "CPU usage is ${cpu_usage}% (threshold: ${CPU_THRESHOLD}%)"
        send_alert "Bot Alert: High CPU Usage" "CPU usage is ${cpu_usage}% on $(hostname)"
    else
        print_success "CPU usage: ${cpu_usage}%"
    fi
}

# Check PM2 process status
check_pm2_status() {
    print_info "Checking PM2 process status..."
    
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed"
        return 1
    fi
    
    if pm2 list | grep -q $APP_NAME; then
        status=$(pm2 jlist | jq -r ".[] | select(.name == \"$APP_NAME\") | .pm2_env.status")
        if [ "$status" = "online" ]; then
            print_success "PM2 process is running (status: $status)"
        else
            print_error "PM2 process is not running properly (status: $status)"
            send_alert "Bot Alert: PM2 Process Down" "PM2 process for $APP_NAME is not running properly"
            return 1
        fi
    else
        print_error "PM2 process not found"
        send_alert "Bot Alert: PM2 Process Missing" "PM2 process for $APP_NAME not found"
        return 1
    fi
}

# Check database connectivity
check_database() {
    print_info "Checking database connectivity..."
    
    # This would require database credentials and connection testing
    # For now, we'll check if PostgreSQL is running
    if systemctl is-active --quiet postgresql; then
        print_success "PostgreSQL service is running"
    else
        print_error "PostgreSQL service is not running"
        send_alert "Bot Alert: Database Down" "PostgreSQL service is not running on $(hostname)"
        return 1
    fi
}

# Check log files
check_logs() {
    print_info "Checking log files..."
    
    if [ -d "$LOG_DIR" ]; then
        # Check for error logs
        error_count=$(find $LOG_DIR -name "*.log" -exec grep -l "ERROR\|FATAL" {} \; | wc -l)
        if [ "$error_count" -gt 0 ]; then
            print_warning "Found $error_count log files with errors"
            
            # Get recent errors
            recent_errors=$(find $LOG_DIR -name "*.log" -exec grep -H "ERROR\|FATAL" {} \; | tail -5)
            if [ ! -z "$recent_errors" ]; then
                print_warning "Recent errors:"
                echo "$recent_errors"
            fi
        else
            print_success "No error logs found"
        fi
        
        # Check log file sizes
        for log_file in $LOG_DIR/*.log; do
            if [ -f "$log_file" ]; then
                size=$(du -h "$log_file" | cut -f1)
                print_info "Log file $(basename $log_file): $size"
            fi
        done
    else
        print_warning "Log directory not found: $LOG_DIR"
    fi
}

# Check bot health endpoint (if available)
check_bot_health() {
    print_info "Checking bot health..."
    
    # This would require the bot to expose a health endpoint
    # For now, we'll check if the process is responding
    if pm2 list | grep -q $APP_NAME; then
        uptime=$(pm2 jlist | jq -r ".[] | select(.name == \"$APP_NAME\") | .pm2_env.pm_uptime")
        if [ "$uptime" != "null" ]; then
            uptime_seconds=$((uptime / 1000))
            uptime_formatted=$(printf '%dd %dh %dm %ds' $((uptime_seconds/86400)) $((uptime_seconds%86400/3600)) $((uptime_seconds%3600/60)) $((uptime_seconds%60)))
            print_success "Bot uptime: $uptime_formatted"
        else
            print_warning "Could not determine bot uptime"
        fi
    fi
}

# Generate monitoring report
generate_report() {
    local report_file="/tmp/bot_monitoring_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "=== Telegram Business Card Bot Monitoring Report ==="
        echo "Generated: $(date)"
        echo "Hostname: $(hostname)"
        echo ""
        
        echo "=== System Resources ==="
        echo "Disk usage: $(df / | awk 'NR==2 {print $5}')"
        echo "Memory usage: $(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
        echo "CPU usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
        echo ""
        
        echo "=== Application Status ==="
        if pm2 list | grep -q $APP_NAME; then
            echo "PM2 Status: $(pm2 jlist | jq -r ".[] | select(.name == \"$APP_NAME\") | .pm2_env.status")"
        else
            echo "PM2 Status: Not found"
        fi
        
        echo "PostgreSQL Status: $(systemctl is-active postgresql)"
        echo ""
        
        echo "=== Recent Log Activity ==="
        if [ -d "$LOG_DIR" ]; then
            find $LOG_DIR -name "*.log" -exec tail -5 {} \;
        else
            echo "Log directory not found"
        fi
        
    } > "$report_file"
    
    print_info "Monitoring report generated: $report_file"
}

# Main monitoring function
main() {
    print_info "Starting monitoring check..."
    
    local exit_code=0
    
    check_system_resources || exit_code=1
    check_pm2_status || exit_code=1
    check_database || exit_code=1
    check_logs
    check_bot_health
    generate_report
    
    if [ $exit_code -eq 0 ]; then
        print_success "All monitoring checks passed"
    else
        print_error "Some monitoring checks failed"
    fi
    
    return $exit_code
}

# Run monitoring
main "$@" 