# @startanaicompany/workspace

Official CLI for StartAnAiCompany Workspace Management - file storage with attachments, features, bugs, test cases, test executions, roadmaps, milestones, knowledge base, and project management.

**Version:** 1.12.1
**License:** MIT
**Homepage:** https://workspace.startanaicompany.com

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Commands Reference](#commands-reference)
  - [Files Management](#files-management)
  - [File Attachments](#file-attachments)
  - [Features Management](#features-management)
  - [Bugs Management](#bugs-management)
  - [Test Cases Management](#test-cases-management)
  - [Test Executions](#test-executions)
  - [Support Tickets](#support-tickets)
  - [Roadmaps and Milestones](#roadmaps-and-milestones)
  - [Knowledge Base Management](#knowledge-base-management)
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

**Examples:**

```bash
# Upload PDF with 1-day expiry
workspace files upload ./report.pdf \
  --path /app/storage/reports/q1-2025.pdf \
  --expire 1440 \
  --tags "quarterly,analysis" \
  --description "Q1 2025 Financial Report"

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

### File Attachments

Attach files to bugs, features, test cases, tickets, milestones, and roadmaps. Attachments create bidirectional relationships:
- **Forward:** Entity → Files attached to it
- **Backward:** File → Entities using it

This helps track file usage, prevent accidental deletion, and maintain cross-references.

#### Attachment Commands

All entity types support the same 4 attachment commands:

1. **`attach`** - Upload file + link to entity (2-step: upload then link)
2. **`link-file`** - Link existing file to entity
3. **`list-files`** - List files attached to entity
4. **`unlink-file`** - Unlink file from entity (doesn't delete file)

**Supported Entities:**
- `bugs` - Bug reports
- `features` - Feature requests
- `test-cases` - Test cases
- `tickets` - Support tickets
- `milestones` - Milestone goals
- `roadmaps` - Product roadmaps

---

#### `workspace <entity> attach <entity-id> <file-path>`

Upload a file and attach it to an entity in one command.

**Options:**
- `--description <text>` - Attachment description/note
- `--expire <minutes>` - File expiry in minutes (default: 43200 = 30 days)
- `--path <remote-path>` - Custom remote file path (optional)

**Examples:**

```bash
# Attach screenshot to bug
workspace bugs attach 48f3eaaf ./error-screenshot.png \
  --description "Screenshot showing login button freeze"

# Attach market analysis to feature
workspace features attach abc12345 ./market-research.pdf \
  --description "Q1 2026 market analysis supporting this feature" \
  --expire 129600  # 90 days

# Attach test data to test case
workspace test-cases attach def67890 ./test-data.csv \
  --description "Expected output data for validation"

# Attach design mockup to roadmap
workspace roadmaps attach xyz98765 ./dashboard-mockup.png \
  --description "Dashboard redesign mockup"

# Attach documentation to milestone
workspace milestones attach abc11111 ./sprint-plan.pdf \
  --description "Sprint 1 planning document"

# Attach customer email to ticket
workspace tickets attach ticket123 ./customer-email.txt \
  --description "Original customer report"
```

**Workflow:**
1. File is uploaded to workspace storage (default path: `/<entity-type>/<filename>`)
2. File is linked to entity via `entity_attachments` junction table
3. Both entity and file now show the relationship

---

#### `workspace <entity> link-file <entity-id> <file-id-or-path>`

Link an existing file to an entity (file must already be uploaded).

**Options:**
- `--description <text>` - Attachment description/note

**Examples:**

```bash
# Link file by path
workspace bugs link-file 48f3eaaf /screenshots/login-error.png \
  --description "Screenshot showing the UI freeze"

# Link file by ID (short UUID)
workspace features link-file abc12345 f8a3c2d1

# Link same file to multiple entities
workspace bugs link-file bug1 /analysis/performance-report.pdf
workspace features link-file feat1 /analysis/performance-report.pdf
workspace milestones link-file mile1 /analysis/performance-report.pdf
```

**Benefits:**
- Reuse files across multiple entities without duplication
- Attach high-value files (market research, architecture docs) to multiple features/milestones
- Save storage space and maintain single source of truth

---

#### `workspace <entity> list-files <entity-id>`

List all files attached to an entity.

**Examples:**

```bash
# List files attached to bug
workspace bugs list-files 48f3eaaf

# List files attached to feature
workspace features list-files abc12345

# List files attached to milestone
workspace milestones list-files mile1
```

**Output:**
```
📎 File Attachments (3)

   📄 error-screenshot.png
      Path: /bugs/error-screenshot.png
      Size: 1.2 MB | Type: image/png
      Attached: 2/17/2026, 10:05:00 AM by qa-tester-agent
      Note: Screenshot showing the login button UI freeze

   📄 performance-log.txt
      Path: /bugs/performance-log.txt
      Size: 45 KB | Type: text/plain
      Attached: 2/17/2026, 11:00:00 AM by backend-dev
      Note: Server logs during the incident

   📄 video-recording.mp4
      Path: /bugs/video-recording.mp4
      Size: 8.5 MB | Type: video/mp4
      Attached: 2/17/2026, 11:30:00 AM by qa-tester-agent
      Note: Screen recording showing bug reproduction
```

---

#### `workspace <entity> unlink-file <entity-id> <attachment-id>`

Unlink a file from an entity (does NOT delete the file, only removes the link).

**Examples:**

```bash
# Unlink file from bug
workspace bugs unlink-file 48f3eaaf a1b2c3d4

# Unlink file from feature
workspace features unlink-file abc12345 e5f6g7h8

# Unlink file from milestone
workspace milestones unlink-file mile1 i9j0k1l2
```

**Note:** The attachment ID is displayed when you run `list-files` command.

---

#### Bidirectional Display

Files and entities now show their relationships in both directions.

**Entity → Files (bugs get, features get, etc.):**

```bash
workspace bugs get 48f3eaaf
```

Output:
```
🐛 Login button not responding (48f3eaaf)

   Severity: high
   Status: in_progress
   ...

   📎 File Attachments (2):

      📄 error-screenshot.png
         Path: /bugs/error-screenshot.png
         Size: 1.2 MB
         Note: Screenshot showing the login button UI freeze
         Attached: 2/17/2026, 10:05:00 AM by qa-tester-agent

      📄 performance-log.txt
         Path: /bugs/performance-log.txt
         Size: 45 KB
         Note: Server logs during the incident
         Attached: 2/17/2026, 11:00:00 AM by backend-dev
```

**File → Entities (files get, files list):**

```bash
workspace files get /bugs/error-screenshot.png
```

Output:
```
📄 error-screenshot.png

   Path: /bugs/error-screenshot.png
   Size: 1.2 MB
   Type: image/png
   ...

   📎 Attached to (3):

      🐛 Bug: Login button not responding (48f3eaaf)
         Attached: 2/17/2026, 10:05:00 AM by qa-tester-agent
         Note: Screenshot showing the login button UI freeze

      🐛 Bug: Session timeout after 2 minutes (abc12345)
         Attached: 2/17/2026, 10:10:00 AM by dev-team-lead
         Note: Same error appears during session timeout

      💡 Feature: Improve login error handling (def67890)
         Attached: 2/17/2026, 10:15:00 AM by product-manager
         Note: Reference for UX improvement design
```

---

#### Use Cases

**Bugs:**
- Attach screenshots of errors
- Link error logs
- Attach video recordings of bug reproduction
- Link stack traces and debug output

**Features:**
- Attach market analysis documents
- Link design mockups and wireframes
- Attach user research findings
- Link competitive analysis reports
- Attach customer feedback documents

**Test Cases:**
- Attach expected output files
- Link test data files (CSV, JSON)
- Attach execution screenshots
- Link performance benchmarks

**Tickets:**
- Attach customer communications
- Link support documentation
- Attach solution proposals
- Link knowledge base articles

**Milestones:**
- Attach project documentation
- Link sprint reports
- Attach deliverables
- Link planning documents

**Roadmaps:**
- Attach strategic plans
- Link executive summaries
- Attach stakeholder presentations
- Link market research reports

---

#### File Management Best Practices

**1. Prevent Accidental Deletion**
```bash
# Check what would be affected before deleting
workspace files get /analysis/market-research.pdf

# Shows:
# 📎 Attached to (6):
#    💡 Feature: Add AI features (feat1234)
#    💡 Feature: Expand to Europe (feat5678)
#    🎯 Milestone: Launch AI features (mile1111)
#    🗺️  Roadmap: 2026 Product Strategy (road2222)
#    ... (6 total)

# Don't delete! File is actively used.
```

**2. Find Orphaned Files (Safe to Delete)**
```bash
# List all files
workspace files list --created-by my-agent

# Look for files with no attachments:
# 📄 old-screenshot.png
#    Path: /temp/old-screenshot.png
#    Expires: EXPIRED
#    (No attachments shown = orphaned file)

# Safe to delete
workspace files delete /temp/old-screenshot.png
```

**3. Reuse High-Value Files**
```bash
# Upload once
workspace files upload ./Q1-analysis.pdf \
  --path /analysis/q1-2026-market-research.pdf \
  --expire 129600

# Link to multiple entities
workspace features link-file feat1 /analysis/q1-2026-market-research.pdf
workspace features link-file feat2 /analysis/q1-2026-market-research.pdf
workspace milestones link-file mile1 /analysis/q1-2026-market-research.pdf
workspace roadmaps link-file road1 /analysis/q1-2026-market-research.pdf

# Single source of truth, multiple references
```

**4. Extend TTL for Important Files**
```bash
# File shows it's used by 5 entities
workspace files get /analysis/critical-data.pdf

# Extend expiry to 90 days
workspace files update /analysis/critical-data.pdf --expire 129600
```

**5. Track File Usage Analytics**
```bash
# Find heavily-used files (keep and extend TTL)
workspace files list | grep "Attached to"

# Find unused files (safe to clean up)
workspace files list --tags temp
# Delete files with no attachments or expired
```

---

## Important: Description Requirements

**All CREATE commands require descriptions with a minimum of 500 words.**

This ensures proper context for AI agent collaboration. Descriptions should include:
- How did you discover this issue/need?
- What tables/systems are affected?
- Technical implementation details
- Business context and customer impact
- Expected behavior vs actual behavior
- Any relevant data or examples

**Affected Commands:**
- `workspace features create` - Requires `--description` (500 words minimum)
- `workspace bugs create` - Requires `--description` (500 words minimum)
- `workspace test-cases create` - Requires `--description` (500 words minimum)
- `workspace tickets create` - Requires `--description` (500 words minimum)
- `workspace roadmaps create` - Requires `--description` (500 words minimum)
- `workspace milestones create` - Requires `--description` (500 words minimum)

Quality over quantity - but context is critical for collaboration!

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

Manage customer support tickets for tracking customer issues, feature requests, and general inquiries.

#### `workspace tickets list`

List support tickets with filtering options.

**Options:**
- `--project-name <name>` - Filter by project name (a-z0-9)
- `--project-id <id>` - Filter by project ID (short or long UUID)
- `--status <status>` - Filter by status (new|open|pending|resolved|closed)
- `--priority <level>` - Filter by priority (low|medium|high|urgent)
- `--category <cat>` - Filter by category
- `--customer-email <email>` - Filter by customer email
- `--created-by <name>` - Filter by creator agent
- `--tags <tags>` - Filter by tags (comma-separated)
- `--limit <number>` - Max results (default: 50, max: 500)
- `--offset <number>` - Skip first N results (default: 0)

**Example:**

```bash
workspace tickets list --status open --priority high
workspace tickets list --customer-email customer@example.com
workspace tickets list --project-name myproject --limit 20
```

---

#### `workspace tickets create <subject>`

Create new support ticket.

**Options:**
- `--project <name>` - Project name (will lookup UUID automatically)
- `--description <text>` - Ticket description (minimum 500 words) - **REQUIRED**
- `--priority <level>` - Priority (low|medium|high|urgent, default: medium)
- `--category <category>` - Category (bug|feature|question|other)
- `--customer-email <email>` - Customer email address
- `--customer-name <name>` - Customer name
- `--source <source>` - Ticket source (web|email|api|chat)
- `--tags <tags>` - Tags (comma-separated)

**Example:**

```bash
workspace tickets create "Login page not loading" \
  --project myproject \
  --description "Customer reported that... [500+ words]" \
  --priority high \
  --category bug \
  --customer-email user@example.com \
  --customer-name "John Doe" \
  --source email
```

---

#### `workspace tickets get <ticket-id>`

Get detailed ticket information including responses and attachments.

**Example:**

```bash
workspace tickets get abc12345
```

**Output:**
- Ticket subject, status, priority
- Customer information
- Description and timestamps
- **Milestone attachments** (if linked to milestones)
- **File attachments** (if any)

---

#### `workspace tickets update <ticket-id>`

Update ticket status, priority, or other fields.

**Options:**
- `--status <status>` - New status (new|open|pending|resolved|closed)
- `--priority <level>` - New priority (low|medium|high|urgent)
- `--tags <tags>` - New tags (comma-separated)
- `--project-id <id>` - Move to different project (short or long UUID)

**Example:**

```bash
workspace tickets update abc12345 --status resolved
workspace tickets update abc12345 --priority urgent --tags "critical,production"
```

---

#### `workspace tickets respond <ticket-id> <message>`

Add a response to a ticket.

**Options:**
- `--internal` - Mark response as internal note (not visible to customer, default: false)
- `--responder-type <type>` - Responder type (agent|user|system, default: agent)

**Example:**

```bash
workspace tickets respond abc12345 "We've deployed a fix to production. Please verify."
workspace tickets respond abc12345 "Internal note: needs database migration" --internal
```

---

#### `workspace tickets resolve <ticket-id>`

Resolve a ticket with a resolution type.

**Options:**
- `--resolution-type <type>` - Resolution type (fixed|wont_fix|duplicate|by_design|not_reproducible) - **REQUIRED**
- `--notes <text>` - Resolution notes

**Example:**

```bash
workspace tickets resolve abc12345 --resolution-type fixed --notes "Fixed in version 2.1.0"
workspace tickets resolve abc12345 --resolution-type duplicate --notes "Duplicate of ticket #xyz78901"
```

---

### Roadmaps and Milestones

Plan and track product roadmaps with time-bound milestones. Supports Gantt chart visualization and polymorphic item attachments.

#### `workspace roadmaps list`

List all roadmaps with filtering.

**Options:**
- `--status <status>` - Filter by status (planning|active|completed|archived)
- `--created-by <name>` - Filter by creator agent
- `--limit <number>` - Max results (default: 50, max: 500)
- `--offset <number>` - Skip first N results (default: 0)

**Example:**

```bash
workspace roadmaps list --status active
```

---

#### `workspace roadmaps create <name>`

Create a new product roadmap.

**Options:**
- `--start-date <date>` - Start date (YYYY-MM-DD, required)
- `--end-date <date>` - End date (YYYY-MM-DD, required)
- `--description <text>` - Roadmap description
- `--status <status>` - Status (planning|active|completed|archived, default: planning)
- `--tags <tags>` - Comma-separated tags

**Example:**

```bash
workspace roadmaps create "Q1 2026 Product Roadmap" \
  --start-date 2026-01-01 \
  --end-date 2026-03-31 \
  --description "First quarter feature delivery" \
  --status active \
  --tags "2026,q1,product"
```

---

#### `workspace roadmaps get <roadmap-id>`

Get roadmap details by ID.

**Example:**

```bash
workspace roadmaps get abc12345
```

**Output:**
- Roadmap name, status, dates
- Description and tags
- Created/updated timestamps
- **File attachments** (if any)

---

#### `workspace roadmaps update <roadmap-id>`

Update roadmap details.

**Options:**
- `--name <text>` - New name
- `--description <text>` - New description
- `--status <status>` - New status
- `--start-date <date>` - New start date
- `--end-date <date>` - New end date
- `--tags <tags>` - New tags (replaces existing)

**Example:**

```bash
workspace roadmaps update abc12345 \
  --status active \
  --description "Updated Q1 2026 roadmap"
```

---

#### `workspace roadmaps delete <roadmap-id>`

Delete roadmap (cascades to milestones and items).

**Example:**

```bash
workspace roadmaps delete abc12345
```

---

#### `workspace roadmaps gantt <roadmap-id>`

Get Gantt chart visualization data for roadmap.

**Example:**

```bash
workspace roadmaps gantt abc12345
```

**Output:**
- ASCII Gantt chart showing milestones timeline
- Milestone progress bars
- Item counts and status indicators

---

#### `workspace milestones list <roadmap-id>`

List milestones for a roadmap.

**Example:**

```bash
workspace milestones list abc12345
```

**Output:**
- Milestone name, status, dates
- Progress percentage
- Item count

---

#### `workspace milestones get <milestone-id>`

Get milestone details by ID.

**Example:**

```bash
workspace milestones get mile1234
```

**Output:**
- Milestone name, status, dates, progress
- Roadmap information
- Description, tags, color
- Created/updated timestamps
- **Attached items** (bugs, features, test cases, tickets)
- **File attachments** (if any)

---

#### `workspace milestones create <roadmap-id> <name>`

Create a new milestone within a roadmap.

**Options:**
- `--start-date <date>` - Start date (YYYY-MM-DD, required)
- `--end-date <date>` - End date (YYYY-MM-DD, required)
- `--description <text>` - Milestone description
- `--status <status>` - Status (pending|in_progress|completed|cancelled, default: pending)
- `--tags <tags>` - Comma-separated tags
- `--color <hex>` - Color hex code (e.g., #2563EB)

**Example:**

```bash
workspace milestones create abc12345 "Sprint 1 - Authentication" \
  --start-date 2026-01-01 \
  --end-date 2026-01-15 \
  --description "Authentication and user management features" \
  --status in_progress \
  --tags "auth,sprint1" \
  --color "#2563EB"
```

---

#### `workspace milestones update <milestone-id>`

Update milestone details (including moving to different roadmap).

**Options:**
- `--roadmap-id <id>` - Move to different roadmap (short or long UUID)
- `--name <text>` - New name
- `--description <text>` - New description
- `--status <status>` - New status
- `--start-date <date>` - New start date
- `--end-date <date>` - New end date
- `--tags <tags>` - New tags (replaces existing)
- `--color <hex>` - New color hex code

**Example:**

```bash
workspace milestones update mile1234 \
  --status completed \
  --description "Successfully completed Sprint 1"
```

---

#### `workspace milestones delete <milestone-id>`

Delete milestone (cascades to milestone items).

**Example:**

```bash
workspace milestones delete mile1234
```

---

#### `workspace milestones add-item <milestone-id>`

Add an item (bug, feature, test case, ticket) to milestone.

**Options:**
- `--type <type>` - Item type (bug|feature|test_case|support_ticket|po_task|test_plan, required)
- `--id <id>` - Item ID (short or long UUID, required)

**Examples:**

```bash
# Add bug to milestone
workspace milestones add-item mile1234 --type bug --id 48f3eaaf

# Add feature to milestone
workspace milestones add-item mile1234 --type feature --id feat5678

# Add test case to milestone
workspace milestones add-item mile1234 --type test_case --id test9012
```

---

#### `workspace milestones remove-item <milestone-id> <item-id>`

Remove an item from milestone (doesn't delete the item).

**Example:**

```bash
workspace milestones remove-item mile1234 item5678
```

---

### Knowledge Base Management

Manage knowledge base articles for documentation, guides, and automated responses. Articles support Markdown formatting and require minimum 2 tags for organization. Articles can be linked to bugs, features, tickets, files, and test cases.

#### `workspace knowledgebase list`

List knowledge base articles with filtering (alias: `workspace kb list`).

**Options:**
- `--project-id <id>` - Filter by project ID (short or long UUID)
- `--tags <tags>` - Filter by tags (comma-separated)
- `--limit <number>` - Max results (default: 50, max: 500)
- `--offset <number>` - Skip first N results (default: 0)

**Example:**

```bash
workspace knowledgebase list --tags "troubleshooting,common" --limit 10
workspace kb list --project-id abc12345
```

---

#### `workspace knowledgebase create <title>`

Create a new knowledge base article (alias: `workspace kb create`).

**Options:**
- `--content <text>` - Article content in Markdown (minimum 500 words required)
- `--summary <text>` - Short summary (minimum 20 words required)
- `--tags <tags>` - Comma-separated tags (minimum 2 tags required)
- `--project-id <id>` - Link to project (short or long UUID)
- `--auto-response` - Enable for auto-response features (default: false)
- `--response-template <text>` - Template for auto-responses

**Example:**

```bash
workspace knowledgebase create "How to Fix Connection Timeout" \
  --content "## Solution\n\n1. Check network connectivity\n2. Verify firewall settings\n3. Restart service" \
  --tags "troubleshooting,network,timeout" \
  --summary "Common fixes for connection timeout errors" \
  --auto-response \
  --response-template "This is a known issue. Please follow the KB article for resolution."
```

---

#### `workspace knowledgebase get <article-id>`

Get knowledge base article details by ID (alias: `workspace kb get`).

Supports article number (KB-000001), short UUID (8 chars), or full UUID.

**Example:**

```bash
workspace knowledgebase get KB-000042
workspace kb get abc12345
```

**Output:**
- Article title and summary
- Full Markdown content
- Tags and auto-response settings
- Created/updated timestamps
- Linked resources (bugs, features, tickets, files, test cases)

---

#### `workspace knowledgebase update <article-id>`

Update knowledge base article (alias: `workspace kb update`).

**Options:**
- `--title <text>` - New title
- `--content <text>` - New Markdown content
- `--summary <text>` - New summary
- `--tags <tags>` - New tags (comma-separated, minimum 2 tags, replaces existing)
- `--project-id <id>` - New project ID
- `--auto-response <boolean>` - Enable/disable auto-response (true/false)
- `--response-template <text>` - New response template

**Example:**

```bash
workspace knowledgebase update KB-000042 \
  --title "Updated: Connection Timeout Fix" \
  --content "## Updated Solution\n\nNew steps..." \
  --tags "troubleshooting,network,timeout,updated"
```

---

#### `workspace knowledgebase delete <article-id>`

Delete knowledge base article (alias: `workspace kb delete`).

**Example:**

```bash
workspace knowledgebase delete KB-000042
workspace kb delete abc12345
```

---

#### `workspace knowledgebase search <query>`

Full-text search across knowledge base articles (alias: `workspace kb search`).

**Options:**
- `--tags <tags>` - Filter results by tags (comma-separated)
- `--limit <number>` - Max results (default: 50)

**Example:**

```bash
workspace knowledgebase search "connection timeout" --tags "troubleshooting,network"
workspace kb search "API error" --tags "api,troubleshooting" --limit 5
```

---

#### `workspace knowledgebase link <article-id>`

Link knowledge base article to a resource (bug, feature, ticket, file, or test case).

**Options:**
- `--resource-type <type>` - Resource type: bug, feature, ticket, file, test-case (required)
- `--resource-id <id>` - Resource ID (short or long UUID, required)
- `--reason <text>` - Reason for linking (optional)

**Example:**

```bash
workspace knowledgebase link KB-000042 \
  --resource-type bug \
  --resource-id bug5678 \
  --reason "This article explains the root cause and fix"

workspace kb link abc12345 \
  --resource-type feature \
  --resource-id feat9012
```

---

#### `workspace knowledgebase unlink <article-id>`

Unlink knowledge base article from a resource.

**Options:**
- `--resource-type <type>` - Resource type: bug, feature, ticket, file, test-case (required)
- `--resource-id <id>` - Resource ID (short or long UUID, required)

**Example:**

```bash
workspace knowledgebase unlink KB-000042 \
  --resource-type bug \
  --resource-id bug5678

workspace kb unlink abc12345 \
  --resource-type feature \
  --resource-id feat9012
```

---

#### `workspace knowledgebase find-by-resource <type> <resource-id>`

Find all knowledge base articles linked to a specific resource.

**Arguments:**
- `<type>` - Resource type: bug, feature, ticket, file, test-case
- `<resource-id>` - Resource ID (short or long UUID)

**Example:**

```bash
workspace knowledgebase find-by-resource bug bug5678
workspace kb find-by-resource feature feat9012
workspace kb find-by-resource ticket ticket1234
```

**Output:**
- List of all KB articles linked to the resource
- Article titles, categories, summaries
- Link reasons (if provided)

---

### Projects Management

Organize and track test cases, bugs, and features within projects. Projects provide grouping and statistics for better organization.

#### `workspace projects list`

List all projects with pagination.

**Options:**
- `--limit <number>` - Max results (default: 50)
- `--offset <number>` - Skip first N results (default: 0)

**Example:**

```bash
workspace projects list
workspace projects list --limit 20 --offset 40
```

**Output:**
- Project ID, name, and display name
- Description (truncated)
- Creator and creation date

---

#### `workspace projects get <project-id>`

Get detailed project information including statistics (supports short UUIDs).

**Example:**

```bash
workspace projects get abc12345
workspace projects get abc12345-6789-abcd-ef01-234567890abc
```

**Output:**
- Project details (ID, name, display name, description)
- Creation information
- **Statistics:**
  - Test cases count
  - Bugs count (total and open)
  - Test executions (total and passed)
  - Pass rate percentage

---

#### `workspace projects create <name>`

Create a new project.

**Options:**
- `--description <text>` - Project description
- `--display-name <name>` - Display name (user-friendly name)

**Example:**

```bash
workspace projects create "myproject" \
  --display-name "My Awesome Project" \
  --description "Main application for customer management"
```

**Output:**
- Project ID (short UUID)
- Name and display name
- Description

---

#### `workspace projects stats <project-id>`

Get detailed project statistics (supports short UUIDs).

**Example:**

```bash
workspace projects stats abc12345
```

**Output:**
- Project name and ID
- **Metrics:**
  - Test cases count
  - Bugs reported (total)
  - Open bugs
  - Test executions (total)
  - Passed executions
  - Failed executions
  - Overall pass rate percentage

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
| `files list` | ✅ project-name, project-id | ✅ limit, offset | path, tags, created_by |
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

### File Attachments Workflow

```bash
# 1. Create a bug
workspace bugs create "Login error with screenshot" \
  --project testproj01 \
  --severity high \
  --description "Login fails with cryptic error message"

# Bug ID: 48f3eaaf

# 2. Attach screenshot to bug (upload + link in one command)
workspace bugs attach 48f3eaaf ./screenshots/login-error.png \
  --description "Screenshot showing the error message"

# 3. Attach error log to same bug
workspace bugs attach 48f3eaaf ./logs/error.log \
  --description "Server logs during the incident"

# 4. View bug with attachments
workspace bugs get 48f3eaaf
# Output shows:
#   📎 File Attachments (2):
#      📄 login-error.png
#         Path: /bugs/login-error.png
#         Size: 1.2 MB
#         Note: Screenshot showing the error message
#      📄 error.log
#         Path: /bugs/error.log
#         Size: 45 KB
#         Note: Server logs during the incident

# 5. Reuse same screenshot for related feature request
workspace features create "Improve error messages" \
  --project testproj01 \
  --priority high \
  --description "Make error messages more user-friendly"

# Feature ID: def67890

# Link existing screenshot to feature (no re-upload)
workspace features link-file def67890 /bugs/login-error.png \
  --description "Example of current confusing error message"

# 6. Check which entities are using the screenshot (bidirectional)
workspace files get /bugs/login-error.png
# Output shows:
#   📎 Attached to (2):
#      🐛 Bug: Login error with screenshot (48f3eaaf)
#         Note: Screenshot showing the error message
#      💡 Feature: Improve error messages (def67890)
#         Note: Example of current confusing error message

# 7. List all files and see attachment count
workspace files list --tags screenshot
# Shows which files have attachments and how many entities use them

# 8. Unlink file from bug (doesn't delete file)
workspace bugs unlink-file 48f3eaaf a1b2c3d4

# 9. Delete file only when no longer needed
workspace files delete /bugs/login-error.png
# ⚠️  Only safe to delete when not attached to any entities
```

### Roadmap and Milestones Workflow

```bash
# 1. Create Q1 roadmap
workspace roadmaps create "Q1 2026 Product Roadmap" \
  --start-date 2026-01-01 \
  --end-date 2026-03-31 \
  --description "First quarter feature delivery" \
  --status active \
  --tags "2026,q1,product"

# Roadmap ID: roadmap1

# 2. Create Sprint 1 milestone
workspace milestones create roadmap1 "Sprint 1 - Authentication" \
  --start-date 2026-01-01 \
  --end-date 2026-01-15 \
  --description "Auth features and user management" \
  --status in_progress \
  --tags "auth,sprint1" \
  --color "#2563EB"

# Milestone ID: mile1234

# 3. Add items to milestone
workspace milestones add-item mile1234 --type bug --id 48f3eaaf
workspace milestones add-item mile1234 --type feature --id def67890

# 4. Attach planning document to milestone
workspace milestones attach mile1234 ./docs/sprint1-plan.pdf \
  --description "Sprint 1 planning document"

# 5. View milestone with items and attachments
workspace milestones get mile1234
# Output shows:
#   📋 Attached Items (2):
#      🐛 Login error with screenshot (48f3eaaf)
#      💡 Improve error messages (def67890)
#   📎 File Attachments (1):
#      📄 sprint1-plan.pdf

# 6. View Gantt chart for roadmap
workspace roadmaps gantt roadmap1

# 7. Complete milestone
workspace milestones update mile1234 --status completed
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

### v1.12.1 (2026-02-18)
- **New:** 500-word minimum validation for KB article content (consistent with other entities)
- **New:** 20-word minimum validation for KB article summary (ensures useful context)
- **New:** KB articles now displayed in bug/feature/ticket/test-case GET commands
- **Improved:** Summary is now required (not optional) for KB articles
- **Improved:** When viewing bugs/features/tickets/test-cases, linked KB articles show summary with article number
- **Improved:** Agents can quickly see if KB article is relevant without fetching full content
- **Improved:** Better documentation with validation requirements clearly stated
- **Fixed:** KB update command now validates content (500 words) and summary (20 words) when updated

### v1.12.0 (2026-02-18)
- **New:** Complete Knowledge Base system for documentation and automated responses (9 commands)
- **New:** `workspace knowledgebase list` - List KB articles with tag/project filtering (alias: `kb`)
- **New:** `workspace knowledgebase create` - Create articles with Markdown support (minimum 2 tags required)
- **New:** `workspace knowledgebase get` - Get article details with linked resources
- **New:** `workspace knowledgebase update` - Update article content, tags, auto-response settings
- **New:** `workspace knowledgebase delete` - Delete articles
- **New:** `workspace knowledgebase search` - Full-text search with tag filtering
- **New:** `workspace knowledgebase link` - Link articles to bugs, features, tickets, files, test-cases
- **New:** `workspace knowledgebase unlink` - Unlink articles from resources
- **New:** `workspace knowledgebase find-by-resource` - Find articles linked to specific resources
- **New:** 9 new API methods in api.js for KB operations
- **Improved:** Tags-based organization (no categories - flat structure for AI agents)
- **Improved:** Minimum 2 tags validation for better organization
- **Improved:** Auto-response template support for automated ticket responses
- **Improved:** Polymorphic linking to bugs, features, tickets, files, and test-cases
- **Improved:** Full Markdown support for article content
- **Improved:** Article numbering system (KB-000001 format)

### v1.11.2 (2026-02-17)
- **Fixed:** Display issues showing "by undefined" in features and files list commands
- **Fixed:** Changed `created_by_agent` and `created_by_agent_name` to `created_by` (matches backend response)
- **Improved:** Added fallback to 'N/A' if creator field is missing

### v1.11.1 (2026-02-17)
- **CRITICAL FIX:** All tickets and projects commands were broken with "function is not defined" errors
- **Fixed:** Added missing imports for 7 new API functions (listProjects, getProject, createProject, listTickets, createTicket, respondToTicket, resolveTicket)
- **Impact:** All commands now work correctly

### v1.11.0 (2026-02-17)
- **New:** Complete tickets system implementation (8 commands eliminated fake stubs)
- **New:** Complete projects management implementation (4 commands)
- **New:** `workspace tickets list` - List support tickets with comprehensive filters
- **New:** `workspace tickets create` - Create support tickets (with 500-word validation)
- **New:** `workspace tickets respond` - Add responses to tickets (internal/external)
- **New:** `workspace tickets resolve` - Resolve tickets with resolution types
- **New:** `workspace projects list` - List all projects with pagination
- **New:** `workspace projects get` - Get project details with statistics (supports short UUIDs)
- **New:** `workspace projects create` - Create new projects
- **New:** `workspace projects stats` - Get detailed project statistics and metrics
- **New:** 7 new API methods in api.js (listTickets, createTicket, respondToTicket, resolveTicket, listProjects, getProject, createProject)
- **Improved:** Full documentation for all tickets and projects commands with examples
- **Improved:** All commands properly call backend APIs (no more "Would..." stub messages)
- **Fixed:** Removed duplicate executions command definitions
- **Note:** Executions commands were already properly implemented (not stubs as initially thought)

### v1.10.2 (2026-02-17)
- **New:** 500 word minimum validation for description fields on all CREATE commands
- **New:** Helpful error messages explaining why detailed context is important
- **Improved:** Better quality data for AI agent collaboration
- **Affected:** features, bugs, test-cases, tickets, roadmaps, milestones create commands

### v1.10.1 (2026-02-17)
- **Removed:** Non-functional `--public` flag from `workspace files upload` command
- **Removed:** `is_public` payload logic and display indicators
- **Improved:** Cleaner codebase without dead features that don't work
- **Fixed:** Removed confusing documentation about public file access

### v1.10.0 (2026-02-17)
- **New:** Complete bidirectional file attachments system for all entity types
- **New:** File attachment commands (attach, link-file, list-files, unlink-file) for bugs, features, test-cases, tickets, milestones, roadmaps
- **New:** `workspace milestones get` command to view milestone details
- **New:** Bidirectional display - entities show attached files, files show which entities use them
- **New:** File attachments display in all entity GET commands (bugs, features, test-cases, tickets, milestones, roadmaps)
- **New:** Comprehensive test suite for attachment workflows
- **New:** Extensive file attachments documentation with use cases and best practices
- **Improved:** Entity GET commands now display file attachments with metadata
- **Improved:** Files list/get commands now show which entities are using each file
- **Improved:** Test-functionality suite includes bidirectional attachment verification

### v1.9.0 (2026-02-17)
- **New:** Roadmaps and milestones system with Gantt chart support
- **New:** Polymorphic item attachments (bugs, features, test cases, tickets to milestones)
- **New:** Roadmaps commands (list, create, get, update, delete, gantt)
- **New:** Milestones commands (list, create, update, delete, add-item, remove-item)
- **New:** Bidirectional milestone relationships (milestones show items, items show milestones)
- **Improved:** Progress tracking and item count calculations

### v1.8.1 (2026-02-17)
- **Fixed:** Status enum values updated to match backend schema
- **Fixed:** Bugs status values (open, in_progress, resolved, closed, archived)
- **Fixed:** Features status values (requested, planned, in_progress, completed, rejected)
- **Fixed:** Tickets status values (open, in_progress, resolved, closed)
- **Fixed:** Executions status values (pending, running, passed, failed, skipped)

### v1.8.0 (2026-02-17)
- **New:** Tags update support for all resources (files, features, bugs, test-cases, tickets)
- **New:** Project ID update support for all resources
- **New:** Metadata update commands without content re-upload
- **Improved:** File update command supports tags and project_id changes

### v1.7.0 (2026-02-17)
- **Removed:** Suite system (tags-only approach for AI agents)
- **Improved:** Simplified organization with tags instead of hierarchical suites
- **Improved:** Better fit for programmatic/agent usage

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
