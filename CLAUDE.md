# @startanaicompany/workspace - Developer Guide

**Version:** 1.6.0
**API:** https://workspace.startanaicompany.com
**Target Users:** AI Agents (programmatic usage)

---

## Overview

CLI tool for workspace management: files, features, bugs, test cases, test executions. Built for **AI agents** - simple, consistent, programmatic.

**Key Features:**
- File storage with auto-expiry (max 30 days)
- Feature requests tracking
- Bug tracking with soft delete
- Test cases with steps
- Test execution tracking
- Tags for organization (no hierarchy needed for agents)

---

## Architecture

**Stack:**
- Node.js (CommonJS)
- Commander.js v11.1.0
- Axios v1.6.2

**Design:**
- Simple, flat structure (AI agents don't need hierarchy)
- Tags for organization (not suites)
- Consistent parameter naming across all commands
- Environment-based auth (no interactive prompts)

---

## Project Structure

```
workspace-cli/
├── bin/workspace.js          # CLI entry point, all commands (inline)
├── src/lib/
│   ├── api.js                # Axios client, API methods
│   └── fileUtils.js          # File utils (base64, checksums, MIME)
├── package.json
├── README.md                 # Full manual (see: workspace manual)
└── CLAUDE.md                 # This file
```

---

## Development Setup

```bash
cd workspace-cli
npm install

# Set env vars (REQUIRED)
export WORKSPACE_API_KEY="your-api-key"
export SAAC_HIVE_AGENT_NAME="your-agent-name"

# Test locally
node bin/workspace.js --help
node bin/workspace.js files list
```

---

## Command Structure

```
workspace <domain> <action> [args] [options]
```

**Domains:**
- `files` - File storage (upload, download, list, get, delete, update)
- `features` - Feature requests (create, list, get, update, delete, comment)
- `bugs` - Bug tracking (create, list, get, update, comment, delete/archive)
- `test-cases` - Test cases with steps (create, list, get, update, delete)
- `executions` - Test executions (start, update-step, complete, get, list)
- `manual` - Fetch full README from GitHub

---

## Standard Patterns

### Filter Naming (CONSISTENT ACROSS ALL ENDPOINTS)

**All list commands support:**
- `--project-name <name>` - Filter by project name (a-z0-9)
- `--project-id <id>` - Filter by project UUID (short or long)
- `--created-by <name>` - Filter by creator agent
- `--limit <number>` - Max results (default: 50, max: 500)
- `--offset <number>` - Pagination offset (default: 0)
- `--tags <tags>` - Filter by tags (comma-separated)

**Backend mapping:**
- CLI `--created-by` → backend `created_by` (files, features, bugs, test-cases)
- CLI `--created-by` → backend `agent` (executions only - who executed test)

### Field Naming (STANDARDIZED)

**Always use snake_case for backend fields:**
- `created_by` (not author, created_by_agent, etc.)
- `project_id`, `project_name`
- `suite_name` (being removed - use tags instead)
- `test_case_id`, `execution_id`

### Environment Validation

**Every command MUST call `checkEnv()` first:**

```javascript
.action(async (args, options) => {
  checkEnv(); // Validates WORKSPACE_API_KEY + SAAC_HIVE_AGENT_NAME
  try {
    // Command logic
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.error || error.message);
    process.exit(1);
  }
});
```

---

## Adding New Commands

1. **Add to bin/workspace.js:**

```javascript
const myDomain = program.command('my-domain').description('...');

myDomain
  .command('create <name>')
  .option('--description <text>', 'Description')
  .option('--tags <tags>', 'Tags (comma-separated)')
  .action(async (name, options) => {
    checkEnv();
    try {
      const data = {
        name,
        description: options.description,
        tags: options.tags?.split(','),
        created_by: process.env.SAAC_HIVE_AGENT_NAME
      };
      const response = await createMyEntity(data);
      console.log('✅ Created:', response.entity.id);
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });
```

2. **Add API method to src/lib/api.js:**

```javascript
async function createMyEntity(data) {
  const client = createClient();
  const response = await client.post('/api/my-entities', data);
  return response.data;
}

module.exports = { createMyEntity, ...otherExports };
```

3. **Test:**

```bash
node bin/workspace.js my-domain create "Test" --description "..."
```

---

## File Utilities

**Auto-encoding:**
- `.txt`, `.md` → Plain text (no encoding)
- Everything else → Base64 encoded

**Key functions:**
- `prepareFileForUpload(localPath, remotePath, options)` - Prepares file payload
- `calculateChecksum(filePath)` - SHA256 checksum
- `getMimeType(filename)` - MIME type from extension
- `formatFileSize(bytes)`, `formatExpiry(minutes)` - Display helpers

---

## API Client

**Authentication:**
- Header: `X-Api-Key: <WORKSPACE_API_KEY>`
- Timeout: 60s
- Max size: 100MB

**All API methods in src/lib/api.js:**
- Files: uploadFile, downloadFile, listFiles, getFileMetadata, deleteFile, updateFile
- Features: createFeature, listFeatures, getFeature, updateFeature, deleteFeature, addFeatureComment
- Bugs: createBug, listBugs, getBug, updateBug, deleteBug (soft delete), addBugComment
- Test Cases: createTestCase, listTestCases, getTestCase, updateTestCase, deleteTestCase
- Executions: startExecution, updateExecutionStep, completeExecution, getExecution, listExecutions
- Projects: getProjectByName

---

## Testing

```bash
# Test files workflow
echo "test" > test.txt
node bin/workspace.js files upload test.txt --path /test.txt --expire 60
node bin/workspace.js files list --created-by my-agent
node bin/workspace.js files download /test.txt
node bin/workspace.js files delete /test.txt

# Test features
node bin/workspace.js features create "Add CSV export" --priority high --tags "export,csv"
node bin/workspace.js features list --tags export
```

---

## Publishing

```bash
# Version bump
npm version patch|minor|major

# Push and tag
git add . && git commit -m "..." && git push
git tag v1.6.0 && git push --tags

# Publish to npm
npm publish --access public
```

---

## Key Design Decisions

### 1. **Tags > Suites**
- AI agents don't need hierarchical structure
- Tags are flexible (multiple per resource)
- Simpler for programmatic usage
- **Decision:** Remove suite system, use tags only

### 2. **Consistent Parameter Naming**
- All list commands use `--created-by` (not --agent, --author, etc.)
- All list commands support `--project-name` and `--project-id`
- All list commands have `--limit` and `--offset` pagination

### 3. **Snake_case Backend Fields**
- `created_by`, `project_id`, `test_case_id` (consistent)
- Not: `author`, `createdByAgent`, `testCaseId`

### 4. **Short UUID Support**
- 8-char UUIDs work everywhere (saves 78% tokens for AI agents)
- Example: `1fc150e8` instead of `1fc150e8-2e3e-4b0a-892f-cf08b99c3f74`

### 5. **No Interactive Prompts**
- Everything via CLI options (AI agents can't handle prompts)
- Environment variables for auth (no login flow)

---

## HIVE Collaboration

**Backend Developer:** `saac-workspace-backend-developer`

**Workflow:**
1. Design feature/change
2. Message backend developer via HIVE
3. Backend implements API changes
4. Update CLI to match
5. Test together
6. Document in README

**Current coordination:**
- ✅ Filter standardization complete (created_by, dual project filtering)
- 🔄 Pending: Remove suite system (use tags only)

---

## Common Issues

**Module System:**
- Uses CommonJS (`require`/`module.exports`)
- No `.js` extensions needed in requires

**Binary Files:**
- Only `.txt` and `.md` are plain text
- Everything else gets base64 encoded

**Field Naming:**
- Display code uses `created_by` (not legacy `created_by_agent`)
- Backend returns snake_case fields

---

## Version History

- **v1.6.0** - Dual project filtering, pagination, created_by standardization, manual command
- **v1.5.0** - Test executions
- **v1.4.0** - Test cases with steps
- **v1.3.0** - Bugs tracking
- **v1.2.0** - Features tracking
- **v1.1.0** - File CRUD operations
- **v1.0.0** - Initial release

---

## Notes for AI Developers

1. **README has all parameter details** - Don't duplicate here
2. **Use `workspace manual`** - Fetches full README from GitHub
3. **Coordinate with backend** - Message via HIVE before making API changes
4. **Keep it simple** - AI agents don't need fancy UX
5. **Tags not suites** - Flat structure, no hierarchy
6. **Consistent naming** - Always `--created-by`, `--project-name`, `--project-id`

---

**Last Updated:** 2025-02-17
**Maintainer:** StartAnAiCompany
**License:** MIT
