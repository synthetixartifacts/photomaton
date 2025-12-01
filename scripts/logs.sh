#!/bin/bash

# Photomaton Log Viewer Script

LOG_DIR="./data/logs"
LOG_FILE="$LOG_DIR/photomaton.log"
ERROR_FILE="$LOG_DIR/error.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_help() {
    echo "Photomaton Log Viewer"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  tail          Follow logs in real-time (default)"
    echo "  errors        Show only error logs"
    echo "  today         Show today's logs"
    echo "  search TERM   Search for specific term in logs"
    echo "  clean         Clean old logs (keep last 7 days)"
    echo "  stats         Show log statistics"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0               # Follow logs in real-time"
    echo "  $0 errors        # Show only errors"
    echo "  $0 search gemini # Search for 'gemini' in logs"
}

case "$1" in
    tail|"")
        echo -e "${GREEN}📋 Following logs in real-time...${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
        echo ""
        tail -f "$LOG_FILE" | while read line; do
            if echo "$line" | grep -q '"level":"ERROR"'; then
                echo -e "${RED}$line${NC}"
            elif echo "$line" | grep -q '"level":"WARN"'; then
                echo -e "${YELLOW}$line${NC}"
            elif echo "$line" | grep -q '"level":"DEBUG"'; then
                echo -e "${BLUE}$line${NC}"
            else
                echo "$line"
            fi
        done
        ;;
    errors)
        echo -e "${RED}❌ Error Logs:${NC}"
        echo ""
        if [ -s "$ERROR_FILE" ]; then
            cat "$ERROR_FILE"
        else
            echo "No errors logged."
        fi
        echo ""
        echo -e "${YELLOW}Recent errors from main log:${NC}"
        grep '"level":"ERROR"' "$LOG_FILE" | tail -20
        ;;
    today)
        echo -e "${GREEN}📅 Today's Logs:${NC}"
        TODAY=$(date +%Y-%m-%d)
        grep "$TODAY" "$LOG_FILE"
        ;;
    search)
        if [ -z "$2" ]; then
            echo "Please provide a search term"
            exit 1
        fi
        echo -e "${BLUE}🔍 Searching for '$2' in logs...${NC}"
        echo ""
        grep -i "$2" "$LOG_FILE" | tail -50
        ;;
    clean)
        echo -e "${YELLOW}🧹 Cleaning old logs...${NC}"
        find "$LOG_DIR" -name "*.log" -mtime +7 -delete
        echo "Logs older than 7 days have been removed."
        ;;
    stats)
        echo -e "${GREEN}📊 Log Statistics:${NC}"
        echo ""
        if [ -f "$LOG_FILE" ]; then
            echo "Main log file: $LOG_FILE"
            echo "Size: $(du -h "$LOG_FILE" | cut -f1)"
            echo "Lines: $(wc -l < "$LOG_FILE")"
            echo ""
            echo "Log levels distribution:"
            echo -e "  INFO:  $(grep -c '"level":"INFO"' "$LOG_FILE")"
            echo -e "  WARN:  $(grep -c '"level":"WARN"' "$LOG_FILE")"
            echo -e "  ERROR: $(grep -c '"level":"ERROR"' "$LOG_FILE")"
            echo -e "  DEBUG: $(grep -c '"level":"DEBUG"' "$LOG_FILE")"
            echo ""
            echo "Recent providers used:"
            grep -o '"provider":"[^"]*"' "$LOG_FILE" | sort | uniq -c | sort -rn | head -5
        else
            echo "Log file not found!"
        fi
        ;;
    help)
        show_help
        ;;
    *)
        echo "Unknown option: $1"
        echo ""
        show_help
        exit 1
        ;;
esac