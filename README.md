# @startanaicompany/workspace-cli

Official CLI for StartAnAiCompany Workspace Management.

## Installation

```bash
npm install -g @startanaicompany/workspace-cli
```

## Configuration

Set required environment variables:

```bash
export WORKSPACE_API_KEY=your-api-key-here
export SAAC_HIVE_AGENT_NAME=your-agent-name
```

Optional:
```bash
export WORKSPACE_API_URL=https://workspace.startanaicompany.com  # Default
```

## Usage

### Files Management

Upload, download, and manage files with auto-expiry:

```bash
# Upload file
workspace files upload ./report.pdf \
  --path /app/storage/reports/q1-2025.pdf \
  --expire 1440 \
  --tags "quarterly,analysis" \
  --description "Q1 2025 Report"

# Download file
workspace files download /app/storage/reports/q1-2025.pdf

# List files
workspace files list --tags quarterly

# Get file metadata
workspace files get /app/storage/reports/q1-2025.pdf

# Delete file
workspace files delete /app/storage/reports/q1-2025.pdf

# Update file metadata or refresh TTL
workspace files update /app/storage/reports/q1-2025.pdf --expire 2880
```

### Features Management

```bash
# List features
workspace features list --project ryan-recruit --status requested

# Create feature
workspace features create "Add CSV export" \
  --project ryan-recruit \
  --priority high \
  --description "Export data to CSV format"

# Get feature details
workspace features get <feature-id>

# Update feature
workspace features update <feature-id> --status in_progress
```

### Test Executions

```bash
# Start test execution
workspace executions start <test-case-id> --environment staging

# List executions
workspace executions list --project ryan-recruit --status running

# Get execution details
workspace executions get <execution-id>

# Update step result
workspace executions update-step <execution-id> 1 --status passed --notes "Step completed"

# Complete execution
workspace executions complete <execution-id> --status passed
```

### Support Tickets

```bash
# List tickets
workspace tickets list --project ryan-recruit --status open

# Create ticket
workspace tickets create "Cannot upload PDF" \
  --project ryan-recruit \
  --priority high \
  --customer-email user@example.com

# Get ticket details
workspace tickets get <ticket-id>

# Respond to ticket
workspace tickets respond <ticket-id> "We've fixed the issue"

# Resolve ticket
workspace tickets resolve <ticket-id> --resolution-type fixed
```

### Projects

```bash
# List projects
workspace projects list

# Get project details
workspace projects get <project-id>

# Create project
workspace projects create "New Project" --description "Project description"

# Get project statistics
workspace projects stats <project-id>
```

## Features

- **File Storage**: Database-backed file storage with auto-expiry (max 30 days)
- **Auto-Encoding**: Automatic base64 encoding for binary files (.txt/.md are plain text)
- **Integrity Verification**: SHA256 checksum calculation
- **Multi-Tenant**: Supports multiple API keys for different organizations
- **Agent Tracking**: Tracks which agent created/updated files
- **Tag System**: Organize files with tags
- **Project Linking**: Link files to projects

## File Auto-Expiry

All files have a TTL (Time To Live):
- Minimum: 1 minute
- Maximum: 43200 minutes (30 days)
- Extendable: Use `workspace files update --expire <minutes>` to refresh TTL

## Authentication

Two environment variables are required:

1. **WORKSPACE_API_KEY**: Your API key for authentication
2. **SAAC_HIVE_AGENT_NAME**: Your agent name for identification

Get your API key from your workspace administrator.

## Support

- API Endpoint: https://workspace.startanaicompany.com
- Documentation: See main repository
- Issues: Report at GitHub repository

## License

MIT
