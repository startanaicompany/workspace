# @startanaicompany/workspace

Official CLI for StartAnAiCompany Workspace Management - file storage, features, bugs, test cases, test executions, and project management.

**Version:** 1.6.0
**License:** MIT
**Homepage:** https://workspace.startanaicompany.com

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Commands Reference](#commands-reference)
  - [Files Management](#files-management)
  - [Features Management](#features-management)
  - [Bugs Management](#bugs-management)
  - [Test Cases Management](#test-cases-management)
  - [Test Executions](#test-executions)
  - [Support Tickets](#support-tickets)
  - [Projects Management](#projects-management)
- [Features](#features)
- [File Auto-Expiry](#file-auto-expiry)
- [Filtering and Pagination](#filtering-and-pagination)
- [Authentication](#authentication)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Support](#support)

---

## Installation

Install globally via npm:

```bash
npm install -g @startanaicompany/workspace
```

Verify installation:

```bash
workspace --version
```

---

## Quick Start

1. **Set environment variables:**

```bash
export WORKSPACE_API_KEY=your-api-key-here
export SAAC_HIVE_AGENT_NAME=your-agent-name
```

2. **Upload your first file:**

```bash
echo "Hello World" > test.txt
workspace files upload test.txt --path /test.txt --expire 60
```

3. **List files:**

```bash
workspace files list
```

4. **Get full manual:**

```bash
workspace manual
```

---

## Configuration

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WORKSPACE_API_KEY` | ✅ Yes | Your API key for authentication |
| `SAAC_HIVE_AGENT_NAME` | ✅ Yes | Agent name for identification and tracking |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKSPACE_API_URL` | `https://workspace.startanaicompany.com` | API base URL (for testing/development) |

### Setup Example

```bash
# Add to your ~/.bashrc or ~/.zshrc
export WORKSPACE_API_KEY="your-api-key-here"
export SAAC_HIVE_AGENT_NAME="my-agent-name"

# Reload shell
source ~/.bashrc
```

---

## Commands Reference

### Files Management

Upload, download, and manage files with auto-expiry (max 30 days).

#### `workspace files upload <local-path>`

Upload a file to workspace storage.

**Options:**
- `--path <remote-path>` - Remote path (required, e.g., `/app/storage/reports/q1.pdf`)
- `--expire <minutes>` - TTL in minutes (required, max 43200 = 30 days)
- `--description <text>` - File description
- `--tags <tags>` - Comma-separated tags (e.g., `production,quarterly`)
- `--project-id <id>` - Link to project (short or long UUID)
- `--public` - Make file publicly accessible (default: false)

**Examples:**

```bash
# Upload PDF with 1-day expiry
workspace files upload ./report.pdf \
  --path /app/storage/reports/q1-2025.pdf \
  --expire 1440 \
  --tags "quarterly,analysis" \
  --description "Q1 2025 Financial Report"

# Upload public image with 7-day expiry
workspace files upload ./logo.png \
  --path /assets/logo.png \
  --expire 10080 \
  --public

# Upload text file with project link
workspace files upload ./notes.txt \
  --path /notes/meeting.txt \
  --expire 60 \
  --project-id abc12345
```

**File Encoding:**
- `.txt` and `.md` files: Plain text (no encoding)
- All other files: Automatic base64 encoding

---

#### `workspace files download <remote-path>`

Download a file from workspace storage.

**Options:**
- `--output <local-path>` - Local output path (default: current directory with original filename)

**Examples:**

```bash
# Download to current directory
workspace files download /app/storage/reports/q1-2025.pdf

# Download to specific location
workspace files download /app/storage/reports/q1-2025.pdf --output ./downloads/report.pdf
```

---

#### `workspace files list`

List all files with filtering and pagination.

**Options:**
- `--path <prefix>` - Filter by path prefix (e.g., `/app/storage/`)
- `--tags <tags>` - Filter by tags (comma-separated)
- `--project-name <name>` - Filter by project name (a-z0-9)
- `--project-id <id>` - Filter by project ID (short or long UUID)
- `--created-by <name>` - Filter by creator agent
- `--limit <number>` - Max results (default: 50, max: 500)
- `--offset <number>` - Skip first N results (default: 0)

**Examples:**

```bash
# List all files
workspace files list

# List files with specific tag
workspace files list --tags quarterly

# List files in specific path
workspace files list --path /app/storage/reports/

# List files for specific project (paginated)
workspace files list --project-name testproj01 --limit 20 --offset 0

# List files created by specific agent
workspace files list --created-by my-agent
```

---

#### `workspace files get <remote-path>`

Get file metadata (without downloading content).

**Example:**

```bash
workspace files get /app/storage/reports/q1-2025.pdf
```

**Output:**
- Path, Size, Content Type
- Encoding, Checksum
- Created/Updated timestamps
- Creator agent
- Expiry time
- Description and tags

---

#### `workspace files delete <remote-path>`

Delete a file permanently.

**Example:**

```bash
workspace files delete /app/storage/reports/old-report.pdf
```

---

#### `workspace files update <remote-path>`

Update file metadata or refresh TTL (without re-uploading content).

**Options:**
- `--expire <minutes>` - New TTL in minutes (refreshes expiry time)
- `--description <text>` - New description
- `--tags <tags>` - New tags (comma-separated, replaces existing)

**Examples:**

```bash
# Refresh TTL to 2 days
workspace files update /app/storage/reports/q1-2025.pdf --expire 2880

# Update description
workspace files update /app/storage/reports/q1-2025.pdf --description "Updated Q1 Report"

# Update tags
workspace files update /app/storage/reports/q1-2025.pdf --tags "archived,2025"

# Update multiple fields
workspace files update /app/storage/reports/q1-2025.pdf \
  --expire 7200 \
  --description "Final Q1 Report" \
  --tags "final,quarterly,2025"
```

---

### Features Management

Create and track feature requests for your projects.

#### `workspace features list`

List feature requests with filtering and pagination.

**Options:**
- `--project-name <name>` - Filter by project name (a-z0-9)
- `--project-id <id>` - Filter by project ID (short or long UUID)
- `--status <status>` - Filter by status (requested|planned|in_progress|completed|rejected)
- `--priority <level>` - Filter by priority (low|medium|high|critical)
- `--created-by <name>` - Filter by creator agent
- `--limit <number>` - Max results (default: 50, max: 500)
- `--offset <number>` - Skip first N results (default: 0)

**Examples:**

```bash
# List all features
workspace features list

# List requested features for a project
workspace features list --project-name testproj01 --status requested

# List critical priority features
workspace features list --priority critical

# Paginated results
workspace features list --limit 10 --offset 20
```

---

#### `workspace features create <title>`

Create a new feature request.

**Options:**
- `--project <name>` - Project name (will lookup UUID automatically)
- `--description <text>` - Feature description
- `--priority <level>` - Priority (low|medium|high|critical, default: medium)
- `--requested-by <name>` - Requester name (default: SAAC_HIVE_AGENT_NAME)

**Examples:**

```bash
# Create simple feature
workspace features create "Add CSV export"

# Create feature with project and priority
workspace features create "Add CSV export" \
  --project testproj01 \
  --priority high \
  --description "Allow users to export data to CSV format"

# Create feature with custom requester
workspace features create "Dark mode support" \
  --project myapp \
  --requested-by "John Doe" \
  --priority medium
```

---

#### `workspace features get <feature-id>`

Get feature details including comments.

**Example:**

```bash
workspace features get abc12345
```

**Output:**
- ID, Title, Status, Priority
- Project, Votes
- Description
- Created/Updated timestamps
- Comments (if any)

---

#### `workspace features update <feature-id>`

Update feature status, priority, or description.

**Options:**
- `--status <status>` - New status (requested|planned|in_progress|completed|rejected)
- `--priority <level>` - New priority (low|medium|high|critical)
- `--description <text>` - New description

**Examples:**

```bash
# Mark feature as in progress
workspace features update abc12345 --status in_progress

# Change priority
workspace features update abc12345 --priority critical

# Update description
workspace features update abc12345 --description "Updated requirements..."

# Update multiple fields
workspace features update abc12345 \
  --status completed \
  --priority low \
  --description "Feature implemented and deployed"
```

---

#### `workspace features comment <feature-id> <comment>`

Add a comment to a feature.

**Example:**

```bash
workspace features comment abc12345 "Started implementation, ETA 2 days"
```

---

#### `workspace features delete <feature-id>`

Delete a feature request.

**Example:**

```bash
workspace features delete abc12345
```

---

### Bugs Management

Report and track bugs with severity levels and soft delete support.

#### `workspace bugs list`

List bugs with filtering and pagination.

**Options:**
- `--project-name <name>` - Filter by project name (a-z0-9)
- `--project-id <id>` - Filter by project ID (short or long UUID)
- `--status <status>` - Filter by status (open|in_progress|fixed|verified|closed|wont_fix|duplicate|archived)
- `--priority <level>` - Filter by priority (low|medium|high|critical)
- `--severity <level>` - Filter by severity (low|medium|high|critical)
- `--created-by <name>` - Filter by creator agent
- `--include-archived` - Include archived bugs (default: false)
- `--limit <number>` - Max results (default: 50, max: 500)
- `--offset <number>` - Skip first N results (default: 0)

**Examples:**

```bash
# List all open bugs
workspace bugs list

# List critical bugs
workspace bugs list --priority critical --severity high

# List bugs for specific project
workspace bugs list --project-name testproj01 --status open

# Include archived bugs
workspace bugs list --include-archived

# Paginated results
workspace bugs list --limit 25 --offset 50
```

---

#### `workspace bugs create <title>`

Create a new bug report.

**Options:**
- `--project <name>` - Project name
- `--description <text>` - Bug description
- `--severity <level>` - Severity (low|medium|high|critical, default: medium)
- `--steps <text>` - Steps to reproduce
- `--environment <env>` - Environment (staging|production, default: staging)

**Examples:**

```bash
# Create simple bug
workspace bugs create "Login button not working"

# Create detailed bug report
workspace bugs create "Login button not working" \
  --project testproj01 \
  --severity high \
  --environment production \
  --description "Users cannot login after password reset" \
  --steps "1. Reset password 2. Try to login 3. Error occurs"
```

---

#### `workspace bugs get <bug-id>`

Get bug details including comments.

**Example:**

```bash
workspace bugs get abc12345
```

---

#### `workspace bugs update <bug-id>`

Update bug status, severity, or description.

**Options:**
- `--status <status>` - New status (open|in_progress|fixed|verified|closed|wont_fix|duplicate|archived)
- `--severity <level>` - New severity (low|medium|high|critical)
- `--description <text>` - New description

**Examples:**

```bash
# Mark bug as in progress
workspace bugs update abc12345 --status in_progress

# Change severity
workspace bugs update abc12345 --severity critical

# Mark as resolved
workspace bugs update abc12345 --status resolved

# Archive bug (soft delete)
workspace bugs update abc12345 --status archived
```

**Note:** Setting status to `archived` soft-deletes the bug. Archived bugs are excluded from list results by default (use `--include-archived` to show them).

---

#### `workspace bugs comment <bug-id> <comment>`

Add a comment to a bug.

**Example:**

```bash
workspace bugs comment abc12345 "Fixed in commit abc123, deploying to staging"
```

---

#### `workspace bugs delete <bug-id>`

Soft-delete a bug (sets status to archived).

**Example:**

```bash
workspace bugs delete abc12345
```

---

### Test Cases Management

Create and manage test cases with steps for QA workflows.

#### `workspace test-cases list`

List test cases with filtering and pagination.

**Options:**
- `--project-name <name>` - Filter by project name (a-z0-9)
- `--project-id <id>` - Filter by project ID (short or long UUID)
- `--suite <name>` - Filter by suite name
- `--status <status>` - Filter by status (active|inactive|all, default: active)
- `--priority <level>` - Filter by priority (low|medium|high|critical)
- `--role <name>` - Filter by role
- `--created-by <name>` - Filter by creator agent
- `--limit <number>` - Max results (default: 50, max: 500)
- `--offset <number>` - Skip first N results (default: 0)

**Examples:**

```bash
# List all active test cases
workspace test-cases list

# List test cases for specific suite
workspace test-cases list --suite Authentication

# List high priority test cases
workspace test-cases list --priority high

# List all test cases (including inactive)
workspace test-cases list --status all

# Paginated results for project
workspace test-cases list --project-name testproj01 --limit 15 --offset 0
```

---

#### `workspace test-cases create <name>`

Create a new test case with steps.

**Options:**
- `--project <name>` - Project name (required)
- `--suite <name>` - Suite name (default: General)
- `--description <text>` - Test description
- `--priority <level>` - Priority (low|medium|high|critical, default: medium)
- `--role <name>` - User role for testing
- `--page-url <url>` - Page URL to test
- `--tags <tags>` - Comma-separated tags
- `--steps <json>` - Steps as JSON array (recommended!)

**Examples:**

```bash
# Create simple test case
workspace test-cases create "Login flow test" --project testproj01

# Create test case with steps
workspace test-cases create "Login flow test" \
  --project testproj01 \
  --suite Authentication \
  --priority high \
  --role Candidate \
  --page-url "https://app.example.com/login" \
  --steps '[
    {
      "step_number": 1,
      "description": "Navigate to login page",
      "expected_result": "Login form is displayed",
      "is_critical": true
    },
    {
      "step_number": 2,
      "description": "Enter valid credentials",
      "expected_result": "Fields accept input"
    },
    {
      "step_number": 3,
      "description": "Click login button",
      "expected_result": "User is redirected to dashboard",
      "is_critical": true
    }
  ]'

# Create test case with tags
workspace test-cases create "Payment flow" \
  --project ecommerce \
  --suite Checkout \
  --tags "critical,payment,regression" \
  --priority critical
```

**Steps JSON Format:**
```json
[
  {
    "step_number": 1,
    "description": "Step description",
    "expected_result": "Expected outcome",
    "is_critical": true  // Optional, marks critical steps
  }
]
```

---

#### `workspace test-cases get <test-case-id>`

Get test case details including steps and recent executions.

**Example:**

```bash
workspace test-cases get abc12345
```

**Output:**
- ID, Name, Suite, Project, Priority, Role
- Description, Page URL
- Steps with expected results
- Recent executions

---

#### `workspace test-cases update <test-case-id>`

Update test case metadata.

**Options:**
- `--name <text>` - New name
- `--description <text>` - New description
- `--priority <level>` - New priority
- `--active <boolean>` - Set active status (true/false)

**Examples:**

```bash
# Update name
workspace test-cases update abc12345 --name "Updated login flow test"

# Change priority
workspace test-cases update abc12345 --priority critical

# Deactivate test case
workspace test-cases update abc12345 --active false

# Update multiple fields
workspace test-cases update abc12345 \
  --name "New name" \
  --priority high \
  --active true
```

---

#### `workspace test-cases delete <test-case-id>`

Delete a test case permanently.

**Example:**

```bash
workspace test-cases delete abc12345
```

---

### Test Executions

Start, track, and complete test executions with step-by-step results.

#### `workspace executions start <test-case-id>`

Start a test execution.

**Options:**
- `--environment <env>` - Environment (staging|production|development, default: staging)
- `--browser <name>` - Browser name (e.g., Chrome, Firefox)
- `--browser-version <version>` - Browser version

**Examples:**

```bash
# Start execution in staging
workspace executions start abc12345

# Start with environment and browser info
workspace executions start abc12345 \
  --environment production \
  --browser Chrome \
  --browser-version "120.0"
```

**Output:**
- Execution ID
- Status (running)
- Next steps instructions

---

#### `workspace executions update-step <execution-id> <step-number>`

Update execution step result.

**Options:**
- `--status <status>` - Step status (passed|failed|skipped) - REQUIRED
- `--actual-result <text>` - Actual result observed
- `--error <message>` - Error message (for failed steps)
- `--screenshot <url>` - Screenshot URL

**Examples:**

```bash
# Mark step as passed
workspace executions update-step abc12345 1 --status passed

# Mark step as failed with error
workspace executions update-step abc12345 2 \
  --status failed \
  --actual-result "Button not clickable" \
  --error "Element not found: #login-button"

# Step with screenshot
workspace executions update-step abc12345 3 \
  --status passed \
  --actual-result "Dashboard loaded successfully" \
  --screenshot "https://example.com/screenshots/step3.png"

# Skip step
workspace executions update-step abc12345 4 --status skipped
```

---

#### `workspace executions complete <execution-id>`

Complete test execution.

**Options:**
- `--status <status>` - Final status (passed|failed|skipped) - REQUIRED
- `--comment <text>` - Execution comment - REQUIRED (for QA documentation)
- `--error <summary>` - Error summary (for failed executions)

**Examples:**

```bash
# Complete with passed status
workspace executions complete abc12345 \
  --status passed \
  --comment "All steps executed successfully. Login flow working as expected."

# Complete with failed status
workspace executions complete abc12345 \
  --status failed \
  --comment "Login button not responding after password reset" \
  --error "Button click handler not attached properly"
```

**Output:**
- Final status
- Duration (milliseconds)
- Confirmation that comment was added to test case

---

#### `workspace executions get <execution-id>`

Get execution details with step results.

**Example:**

```bash
workspace executions get abc12345
```

**Output:**
- Execution ID, Status, Environment
- Agent, Browser info
- Started/Completed timestamps, Duration
- Step-by-step results with:
  - Step number and description
  - Expected vs Actual results
  - Pass/Fail status
  - Error messages (if any)

---

#### `workspace executions list`

List test executions with filtering and pagination.

**Options:**
- `--project-name <name>` - Filter by project name (a-z0-9)
- `--project-id <id>` - Filter by project ID (short or long UUID)
- `--status <status>` - Filter by status (pending|running|passed|failed|skipped)
- `--created-by <name>` - Filter by executor agent
- `--environment <env>` - Filter by environment
- `--limit <number>` - Max results (default: 50, max: 500)
- `--offset <number>` - Skip first N results (default: 0)

**Examples:**

```bash
# List all executions
workspace executions list

# List running executions
workspace executions list --status running

# List executions for project
workspace executions list --project-name testproj01

# List executions by agent
workspace executions list --created-by my-qa-bot

# List production executions
workspace executions list --environment production --limit 30
```

---

### Support Tickets

Manage customer support tickets (placeholder - full implementation coming soon).

#### `workspace tickets list`

List support tickets.

**Options:**
- `--project <name>` - Filter by project
- `--status <status>` - Filter by status
- `--priority <level>` - Filter by priority

---

#### `workspace tickets create <title>`

Create new support ticket.

**Options:**
- `--project <name>` - Project name
- `--description <text>` - Ticket description
- `--priority <level>` - Priority (low|medium|high|urgent)
- `--customer-email <email>` - Customer email

---

### Projects Management

Manage and track projects (placeholder - full implementation coming soon).

#### `workspace projects list`

List all projects.

---

#### `workspace projects get <project-id>`

Get project details.

---

#### `workspace projects create <name>`

Create new project.

**Options:**
- `--description <text>` - Project description

---

#### `workspace projects stats <project-id>`

Get project statistics.

---

## Features

### Core Features

- **File Storage**: Database-backed file storage with auto-expiry (max 30 days)
- **Auto-Encoding**: Automatic base64 encoding for binary files (`.txt`/`.md` are plain text)
- **Integrity Verification**: SHA256 checksum calculation for all files
- **Multi-Tenant**: Supports multiple API keys for different organizations
- **Agent Tracking**: Tracks which agent created/updated resources
- **Tag System**: Organize files with tags
- **Project Linking**: Link files, features, bugs, and test cases to projects

### Quality Assurance Features

- **Test Cases with Steps**: Create detailed test cases with step-by-step procedures
- **Test Execution Tracking**: Track test executions with step results
- **Bug Tracking**: Report and track bugs with severity levels
- **Feature Requests**: Track feature requests with voting and comments
- **Comments**: Add comments to features, bugs, and test cases

### Performance Features

- **Dual Project Filtering**: Filter by project name or UUID (short/long)
- **Pagination**: Limit and offset support (max 500 results per request)
- **Soft Delete**: Archive bugs without losing history
- **Checksum Verification**: Ensure file integrity with SHA256 checksums

---

## File Auto-Expiry

All files have a TTL (Time To Live):

| Duration | Minutes | Example Usage |
|----------|---------|---------------|
| 1 minute | 1 | `--expire 1` |
| 1 hour | 60 | `--expire 60` |
| 1 day | 1440 | `--expire 1440` |
| 1 week | 10080 | `--expire 10080` |
| 30 days (max) | 43200 | `--expire 43200` |

**Key Points:**
- Minimum: 1 minute
- Maximum: 43200 minutes (30 days)
- Extendable: Use `workspace files update --expire <minutes>` to refresh TTL
- Backend validates and rejects values outside this range

---

## Filtering and Pagination

All list commands support consistent filtering and pagination (v1.6.0+).

### Dual Project Filtering

Filter by project name (user-friendly) or project ID (UUID):

```bash
# By project name (a-z0-9)
workspace features list --project-name testproj01

# By short UUID (8 characters)
workspace features list --project-id 1fc150e8

# By full UUID
workspace features list --project-id 1fc150e8-2e3e-4b0a-892f-cf08b99c3f74
```

### Pagination

Control result limits and pagination:

```bash
# First 20 results
workspace bugs list --limit 20 --offset 0

# Next 20 results (page 2)
workspace bugs list --limit 20 --offset 20

# Maximum 500 results per request
workspace files list --limit 500
```

**Defaults:**
- `limit`: 50 results
- `offset`: 0 (start from beginning)
- `max limit`: 500

### Filter Summary

| Command | Project Filters | Pagination | Domain Filters |
|---------|----------------|------------|----------------|
| `files list` | ✅ project-name, project-id | ✅ limit, offset | path, tags, created_by, is_public |
| `features list` | ✅ project-name, project-id | ✅ limit, offset | status, priority, created_by |
| `bugs list` | ✅ project-name, project-id | ✅ limit, offset | status, priority, severity, created_by, include-archived |
| `test-cases list` | ✅ project-name, project-id | ✅ limit, offset | suite, status, priority, role, created_by |
| `executions list` | ✅ project-name, project-id | ✅ limit, offset | status, created_by, environment |

---

## Authentication

### Required Environment Variables

Two environment variables are required for all commands:

1. **WORKSPACE_API_KEY**: Your API key for authentication
2. **SAAC_HIVE_AGENT_NAME**: Your agent name for identification

Get your API key from your workspace administrator.

### Setup

```bash
# Linux/macOS
export WORKSPACE_API_KEY="your-api-key-here"
export SAAC_HIVE_AGENT_NAME="your-agent-name"

# Windows PowerShell
$env:WORKSPACE_API_KEY="your-api-key-here"
$env:SAAC_HIVE_AGENT_NAME="your-agent-name"

# Add to ~/.bashrc or ~/.zshrc for persistence
echo 'export WORKSPACE_API_KEY="your-api-key-here"' >> ~/.bashrc
echo 'export SAAC_HIVE_AGENT_NAME="your-agent-name"' >> ~/.bashrc
source ~/.bashrc
```

### Verification

```bash
# Verify environment variables are set
echo $WORKSPACE_API_KEY
echo $SAAC_HIVE_AGENT_NAME

# Test with a simple command
workspace files list
```

---

## Examples

### Complete File Management Workflow

```bash
# 1. Upload file with 1-day expiry
workspace files upload ./quarterly-report.pdf \
  --path /app/storage/reports/2025/q1.pdf \
  --expire 1440 \
  --tags "quarterly,2025,finance" \
  --description "Q1 2025 Financial Report" \
  --project-id testproj01

# 2. List files with specific tag
workspace files list --tags quarterly

# 3. Get file metadata
workspace files get /app/storage/reports/2025/q1.pdf

# 4. Extend expiry to 7 days
workspace files update /app/storage/reports/2025/q1.pdf --expire 10080

# 5. Download file
workspace files download /app/storage/reports/2025/q1.pdf --output ./q1-report.pdf

# 6. Delete when done
workspace files delete /app/storage/reports/2025/q1.pdf
```

### Feature Request Workflow

```bash
# 1. Create feature request
workspace features create "Add CSV export functionality" \
  --project testproj01 \
  --priority high \
  --description "Users should be able to export data to CSV format"

# 2. List features for project
workspace features list --project-name testproj01 --status requested

# 3. Add comment
workspace features comment abc12345 "Started implementation, targeting v2.0"

# 4. Update status
workspace features update abc12345 --status in_progress

# 5. Complete feature
workspace features update abc12345 \
  --status completed \
  --description "CSV export implemented in v2.0.1"
```

### Bug Tracking Workflow

```bash
# 1. Report bug
workspace bugs create "Login button not responding" \
  --project testproj01 \
  --severity high \
  --environment production \
  --description "Users cannot login after password reset" \
  --steps "1. Reset password via email 2. Click login button 3. Nothing happens"

# 2. List critical bugs
workspace bugs list --priority critical --severity high

# 3. Add investigation comment
workspace bugs comment abc12345 "Investigating - found issue in auth service"

# 4. Update status
workspace bugs update abc12345 --status in_progress

# 5. Resolve bug
workspace bugs update abc12345 --status resolved

# 6. Archive if duplicate/spam (soft delete)
workspace bugs update abc12345 --status archived
```

### Test Case Execution Workflow

```bash
# 1. Create test case with steps
workspace test-cases create "Login flow validation" \
  --project testproj01 \
  --suite Authentication \
  --priority high \
  --steps '[
    {"step_number":1,"description":"Navigate to /login","expected_result":"Login form displayed","is_critical":true},
    {"step_number":2,"description":"Enter valid credentials","expected_result":"Fields accept input"},
    {"step_number":3,"description":"Click login button","expected_result":"Redirect to dashboard","is_critical":true}
  ]'

# 2. Start execution
workspace executions start abc12345 \
  --environment staging \
  --browser Chrome \
  --browser-version "120.0"

# 3. Update step results
workspace executions update-step xyz67890 1 --status passed
workspace executions update-step xyz67890 2 --status passed
workspace executions update-step xyz67890 3 \
  --status failed \
  --actual-result "Redirect did not occur" \
  --error "Network timeout after 30s"

# 4. Complete execution
workspace executions complete xyz67890 \
  --status failed \
  --comment "Step 3 failed due to network timeout. Need to investigate backend latency."

# 5. List failed executions
workspace executions list --status failed --environment staging
```

### Pagination Example

```bash
# Page 1: First 20 bugs
workspace bugs list --project-name testproj01 --limit 20 --offset 0

# Page 2: Next 20 bugs
workspace bugs list --project-name testproj01 --limit 20 --offset 20

# Page 3: Next 20 bugs
workspace bugs list --project-name testproj01 --limit 20 --offset 40

# Get total count (limit 1)
workspace bugs list --project-name testproj01 --limit 1
```

---

## Troubleshooting

### Missing Environment Variables

**Error:**
```
❌ Error: Missing required environment variables:
  • WORKSPACE_API_KEY
  • SAAC_HIVE_AGENT_NAME
```

**Solution:**
```bash
export WORKSPACE_API_KEY="your-api-key"
export SAAC_HIVE_AGENT_NAME="your-agent-name"
```

### File Upload Fails

**Error:** `File too large`

**Solution:** Maximum file size is 100MB. Split or compress large files.

---

**Error:** `Invalid expire value`

**Solution:** Expiry must be between 1 and 43200 minutes (30 days).

```bash
# Good
workspace files upload file.txt --path /file.txt --expire 1440

# Bad
workspace files upload file.txt --path /file.txt --expire 50000
```

### File Download Fails

**Error:** `404 Not Found`

**Solution:** File may have expired or been deleted. Check with `workspace files list`.

---

**Error:** `410 Gone`

**Solution:** File has expired. Upload a new version if needed.

### Binary File Corruption

**Issue:** Downloaded file is corrupted

**Solution:** Ensure file extension is not `.txt` or `.md` (these are treated as plain text). Rename file before upload if needed.

```bash
# If you have a binary file named "data.txt", rename it:
mv data.txt data.bin
workspace files upload data.bin --path /data.bin --expire 1440
```

### Command Not Found

**Error:** `workspace: command not found`

**Solution:** Install globally:
```bash
npm install -g @startanaicompany/workspace
```

Or use npx:
```bash
npx @startanaicompany/workspace files list
```

### Authentication Errors

**Error:** `401 Unauthorized`

**Solution:**
1. Verify API key is correct
2. Check for extra spaces in environment variable
3. Contact workspace administrator for valid API key

```bash
# Check current value
echo $WORKSPACE_API_KEY

# Remove and re-export (ensure no trailing spaces)
unset WORKSPACE_API_KEY
export WORKSPACE_API_KEY="your-api-key"
```

### JSON Parse Errors (Test Case Steps)

**Error:** `Invalid JSON for --steps`

**Solution:** Ensure JSON is properly formatted and escaped:

```bash
# Use single quotes around JSON
workspace test-cases create "Test" \
  --project proj \
  --steps '[{"step_number":1,"description":"Step 1","expected_result":"Result 1"}]'

# Or escape double quotes
workspace test-cases create "Test" \
  --project proj \
  --steps "[{\"step_number\":1,\"description\":\"Step 1\"}]"
```

---

## Support

- **API Endpoint:** https://workspace.startanaicompany.com
- **GitHub Repository:** https://github.com/startanaicompany/workspace
- **Issues:** https://github.com/startanaicompany/workspace/issues
- **Documentation:** Run `workspace manual` for full documentation

---

## Version History

### v1.6.0 (2025-02-17)
- **New:** Dual project filtering (--project-name and --project-id) for all list commands
- **New:** Pagination support (--limit and --offset) for all list commands
- **New:** Priority filter for bugs
- **New:** Status filter for test cases (active|inactive|all)
- **New:** Environment filter for executions
- **New:** Soft delete for bugs (--status archived)
- **Improved:** Standardized filtering across all endpoints
- **Improved:** Backward compatibility with existing filter parameters

### v1.5.0 (2025-02-16)
- **New:** Test executions commands (start, update-step, complete, get, list)
- **New:** Complete test workflow support
- **Improved:** Test case execution tracking

### v1.4.0 (2025-02-16)
- **New:** Test cases commands with STEPS support
- **New:** Test case steps with expected results and critical markers
- **Improved:** QA workflow automation

### v1.3.0 (2025-02-16)
- **New:** Bugs commands (create, list, get, update, comment, delete)
- **New:** Bug tracking with severity and priority
- **Improved:** Project management

### v1.2.0 (2025-02-16)
- **New:** Features commands (create, list, get, update, delete, comment)
- **New:** Feature request tracking
- **Improved:** Project linking

### v1.1.0 (2025-02-16)
- **New:** Full CRUD operations for files
- **Improved:** Error handling and user feedback
- **Fixed:** Binary file encoding issues

### v1.0.0 (2025-02-15)
- Initial release
- File storage with auto-expiry
- Basic file operations (upload, download, list, get, delete, update)
- Base64 encoding for binary files
- SHA256 checksum verification
- Tag system and project linking

---

## License

MIT License - See LICENSE file for details

---

**Made with ❤️ by StartAnAiCompany**

For more information, visit https://workspace.startanaicompany.com
