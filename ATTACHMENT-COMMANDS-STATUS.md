# File Attachments Implementation Status

## ✅ Completed: CLI Commands (All Entity Types)

Successfully implemented attachment commands for **all 6 entity types**:

### 1. **Bugs** (bugs)
- `workspace bugs attach <bug-id> <file-path>` - Upload + link file
- `workspace bugs link-file <bug-id> <file-id-or-path>` - Link existing file
- `workspace bugs list-files <bug-id>` - List attached files
- `workspace bugs unlink-file <bug-id> <attachment-id>` - Unlink file

### 2. **Features** (features)
- `workspace features attach <feature-id> <file-path>`
- `workspace features link-file <feature-id> <file-id-or-path>`
- `workspace features list-files <feature-id>`
- `workspace features unlink-file <feature-id> <attachment-id>`

### 3. **Test Cases** (test-cases)
- `workspace test-cases attach <test-case-id> <file-path>`
- `workspace test-cases link-file <test-case-id> <file-id-or-path>`
- `workspace test-cases list-files <test-case-id>`
- `workspace test-cases unlink-file <test-case-id> <attachment-id>`

### 4. **Tickets** (tickets)
- `workspace tickets attach <ticket-id> <file-path>`
- `workspace tickets link-file <ticket-id> <file-id-or-path>`
- `workspace tickets list-files <ticket-id>`
- `workspace tickets unlink-file <ticket-id> <attachment-id>`

### 5. **Milestones** (milestones)
- `workspace milestones attach <milestone-id> <file-path>`
- `workspace milestones link-file <milestone-id> <file-id-or-path>`
- `workspace milestones list-files <milestone-id>`
- `workspace milestones unlink-file <milestone-id> <attachment-id>`

### 6. **Roadmaps** (roadmaps)
- `workspace roadmaps attach <roadmap-id> <file-path>`
- `workspace roadmaps link-file <roadmap-id> <file-id-or-path>`
- `workspace roadmaps list-files <roadmap-id>`
- `workspace roadmaps unlink-file <roadmap-id> <attachment-id>`

## Command Options

### `attach` command
```bash
workspace <entity> attach <entity-id> <file-path> \
  --description "Description of attachment" \
  --expire 43200 \  # 30 days (default)
  --path /custom/remote/path  # Optional custom storage path
```

### `link-file` command
```bash
workspace <entity> link-file <entity-id> <file-id-or-path> \
  --description "Description of attachment"
```

## Implementation Details

### API Functions Added (`src/lib/api.js`)
```javascript
attachFileToEntity(entityType, entityId, fileData)      // Upload + link (NOT USED - see notes)
linkFileToEntity(entityType, entityId, linkData)        // Link existing file
listEntityAttachments(entityType, entityId)             // List attachments
unlinkFileFromEntity(entityType, entityId, attachmentId) // Unlink file
```

### Attach Command Workflow
The `attach` command performs a **2-step process**:

1. **Upload file** using existing `uploadFile()` API
   - Prepares file with `prepareFileForUpload()`
   - Uploads to `/api/files`
   - Receives `file.id` in response

2. **Link file** using `linkFileToEntity()` API
   - Sends `file_id`, `attached_by`, `description`
   - Links file to entity via junction table

## ⚠️ Backend Issue Discovered

### Error Details
```
POST /api/bugs/48f3eaaf/attachments/link
Status: 500 Internal Server Error
{
  "error": "Internal server error",
  "details": "relation \"undefined\" does not exist"
}
```

### Root Cause
Backend code is trying to query a database table named "undefined", indicating:
- Missing or incorrect table name variable
- Possible entity type mapping issue
- Junction table might not be properly created/referenced

### Backend Fix Needed
The backend developer (`saac-workspace-backend-developer`) needs to:

1. Check entity type mapping for attachment endpoints
2. Verify `entity_attachments` table exists and is accessible
3. Ensure table name is correctly interpolated in SQL queries
4. Test all 6 entity types × 4 endpoints (24 total)

### Test Data for Backend Debugging
```bash
# Test file already uploaded
File Path: /bugs/test-attachment.txt
File ID: (use `workspace files list` to get ID)

# Test bug created
Bug ID: 48f3eaaf-0b59-4537-a4e4-d0f21dd5d4a6
Bug Short ID: 48f3eaaf

# Link request payload
{
  "file_path": "/bugs/test-attachment.txt",
  "attached_by": "saac-saac-clitool-developer",
  "description": "Test description"
}
```

## Next Steps

### 1. Backend Fix (Urgent)
- [ ] Backend developer fixes `entity_attachments` API
- [ ] Test all entity types (bugs, features, test-cases, tickets, milestones, roadmaps)
- [ ] Verify junction table queries work correctly

### 2. CLI Testing (After Backend Fix)
- [ ] Test all 24 attachment commands (6 entities × 4 commands)
- [ ] Verify file upload + link workflow
- [ ] Test with both file_id and file_path in link-file command
- [ ] Test short UUID support (8-char IDs)

### 3. Test Suite Integration
- [ ] Add attachment examples to `test-functionality` suite
- [ ] Include attach/list-files/unlink workflow
- [ ] Add to bugs, features, test-cases workflows

### 4. Documentation
- [ ] Update README.md with attachment commands
- [ ] Document use cases (screenshots for bugs, market analysis for features, etc.)
- [ ] Add examples for each entity type

## Use Cases

### Bugs
- Attach screenshots of errors
- Link error logs
- Attach video recordings of bug reproduction

### Features
- Attach market analysis documents
- Link design mockups
- Attach user research findings

### Test Cases
- Attach expected output files
- Link test data files
- Attach execution screenshots

### Tickets
- Attach customer communications
- Link support documentation
- Attach solution proposals

### Milestones
- Attach project documentation
- Link sprint reports
- Attach deliverables

### Roadmaps
- Attach strategic plans
- Link executive summaries
- Attach stakeholder presentations

---

**Status:** CLI implementation complete, waiting for backend fix.
**Date:** 2026-02-17
**Developer:** Claude Code (AI Agent)
