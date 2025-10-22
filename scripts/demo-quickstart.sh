#!/bin/bash

# Demo Environment Quick Start Script
# This script helps you set up the demo environment step-by-step

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if .env.local exists
check_env_file() {
    if [ ! -f ".env.local" ]; then
        print_error ".env.local file not found!"
        echo ""
        print_info "Creating .env.local from .env.demo.example..."
        cp .env.demo.example .env.local
        print_success ".env.local created!"
        echo ""
        print_warning "IMPORTANT: Edit .env.local and add your database URLs and API keys"
        echo ""
        read -p "Press Enter when you've updated .env.local..."
    else
        print_success ".env.local file found"
    fi
}

# Check if DEMO_DATABASE_URL is set
check_demo_db_url() {
    if ! grep -q "DEMO_DATABASE_URL" .env.local || grep -q "DEMO_DATABASE_URL=postgresql://postgres:PASSWORD" .env.local; then
        print_error "DEMO_DATABASE_URL not configured in .env.local"
        echo ""
        print_info "Steps to set up demo database:"
        echo "  1. Go to Railway Dashboard (https://railway.app)"
        echo "  2. Click 'New' → 'Database' → 'PostgreSQL'"
        echo "  3. Name it: xelix-invoice-demo"
        echo "  4. Copy the DATABASE_URL from Variables tab"
        echo "  5. Add it to .env.local as DEMO_DATABASE_URL"
        echo ""
        read -p "Press Enter when you've added DEMO_DATABASE_URL to .env.local..."
    else
        print_success "DEMO_DATABASE_URL is configured"
    fi
}

# Check if on demo-event branch
check_branch() {
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "demo-event" ]; then
        print_warning "You're on branch: $current_branch"
        read -p "Switch to demo-event branch? (y/N): " switch_branch
        if [ "$switch_branch" = "y" ] || [ "$switch_branch" = "Y" ]; then
            git checkout demo-event
            print_success "Switched to demo-event branch"
        else
            print_info "Continuing on $current_branch"
        fi
    else
        print_success "On demo-event branch"
    fi
}

# Main script
clear
print_header "Demo Environment Quick Start"

echo "This script will guide you through setting up a demo environment."
echo "It will help you:"
echo "  • Configure environment variables"
echo "  • Set up demo database in Railway"
echo "  • Duplicate data from production"
echo "  • Configure file storage"
echo ""
read -p "Ready to begin? (y/N): " ready
if [ "$ready" != "y" ] && [ "$ready" != "Y" ]; then
    echo "Setup cancelled."
    exit 0
fi

# Step 1: Check branch
print_header "Step 1: Check Git Branch"
check_branch

# Step 2: Check environment file
print_header "Step 2: Check Environment Configuration"
check_env_file

# Step 3: Verify demo database URL
print_header "Step 3: Verify Demo Database URL"
check_demo_db_url

# Step 4: Database setup options
print_header "Step 4: Database Setup"
echo "What would you like to do?"
echo ""
echo "1) Preview what would be synced (dry-run)"
echo "2) Set up schema only (tables, enums, indexes)"
echo "3) Set up data only (assumes schema exists)"
echo "4) Full setup (schema + data)"
echo "5) Skip database setup for now"
echo ""
read -p "Enter choice (1-5): " db_choice

case $db_choice in
    1)
        print_info "Running dry-run preview..."
        node scripts/setup-demo-environment.js --dry-run
        ;;
    2)
        print_info "Setting up schema only..."
        node scripts/setup-demo-environment.js --schema-only
        ;;
    3)
        print_info "Setting up data only..."
        node scripts/setup-demo-environment.js --data-only
        ;;
    4)
        print_info "Running full setup..."
        node scripts/setup-demo-environment.js
        ;;
    5)
        print_warning "Skipping database setup"
        ;;
    *)
        print_error "Invalid choice. Skipping database setup."
        ;;
esac

# Step 5: Railway Volume setup instructions
print_header "Step 5: Railway Volume Setup (File Storage)"
echo "Do you need to set up file storage (Railway Volume)?"
echo ""
read -p "Show instructions? (y/N): " show_volume
if [ "$show_volume" = "y" ] || [ "$show_volume" = "Y" ]; then
    echo ""
    print_info "Railway Volume Setup Steps:"
    echo ""
    echo "1. Go to Railway Dashboard"
    echo "2. Create new Empty Service:"
    echo "   - Click 'New' → 'Empty Service'"
    echo "   - Name: xelix-invoice-demo-files"
    echo ""
    echo "3. Add Volume to the service:"
    echo "   - Go to 'Volumes' tab"
    echo "   - Click 'New Volume'"
    echo "   - Mount Path: /app/uploads"
    echo "   - Size: 1GB (can increase later)"
    echo ""
    echo "4. (Optional) Copy files from production:"
    echo "   - See DEMO_ENVIRONMENT_SETUP.md for detailed instructions"
    echo ""
    read -p "Press Enter to continue..."
fi

# Step 6: Deployment instructions
print_header "Step 6: Deploy to Railway (Optional)"
echo "Do you want to deploy the demo branch to Railway now?"
echo ""
read -p "Show deployment instructions? (y/N): " show_deploy
if [ "$show_deploy" = "y" ] || [ "$show_deploy" = "Y" ]; then
    echo ""
    print_info "Railway Deployment Steps:"
    echo ""
    echo "Option A: Automatic (GitHub connected):"
    echo "  1. Railway Dashboard → Service → Settings"
    echo "  2. Source → Configure → Select 'demo-event' branch"
    echo "  3. Push commits to trigger deployment"
    echo ""
    echo "Option B: Manual (Railway CLI):"
    echo "  1. Install CLI: npm install -g @railway/cli"
    echo "  2. Login: railway login"
    echo "  3. Deploy: railway up"
    echo ""
    echo "Important: Set environment variables in Railway Dashboard!"
    echo "  DATABASE_URL=\${{xelix-invoice-demo.DATABASE_PRIVATE_URL}}"
    echo "  (See .env.demo.example for full list)"
    echo ""
    read -p "Press Enter to continue..."
fi

# Summary
print_header "Setup Summary"
echo "✅ Demo environment setup process completed!"
echo ""
print_info "Next Steps:"
echo ""
echo "1. Verify database connection:"
echo "   node scripts/setup-demo-environment.js --dry-run"
echo ""
echo "2. Test locally:"
echo "   PORT=3001 npm run dev"
echo ""
echo "3. Deploy to Railway (if not done yet)"
echo ""
echo "4. Add more mock data for demos (optional):"
echo "   Edit: app/services/mockInvoiceService.ts"
echo ""
echo "5. Before the event, refresh data:"
echo "   node scripts/setup-demo-environment.js --data-only"
echo ""
print_success "For detailed instructions, see: DEMO_ENVIRONMENT_SETUP.md"
echo ""
print_info "Useful commands:"
echo "  npm run demo:setup      - Run this quick-start script"
echo "  npm run demo:sync:dry   - Preview database sync"
echo "  npm run demo:sync       - Full database sync"
echo "  npm run demo:refresh    - Refresh data only"
echo ""
