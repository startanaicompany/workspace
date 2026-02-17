# Bidirectional File Attachments - Display Examples

## Overview

Files now show **which entities they're attached to** (bidirectional relationship).

- **Forward:** Bug → Files attached to bug
- **Backward:** File → Bugs/features/etc. that use this file

---

## Example 1: File Used by Multiple Entities

### Command
```bash
workspace files get /screenshots/login-error.png
```

### Output
```
📄 login-error.png

   Path: /screenshots/login-error.png
   Size: 1.2 MB
   Type: image/png
   Encoding: Base64
   Checksum: a3f5c8d9e2b4...

   Created: 2/17/2026, 10:00:00 AM
   Created By: qa-tester-agent
   Expires: 2/19/2026, 10:00:00 AM

   Tags: screenshot, login, error

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

**Use Case:** Shows that this screenshot is referenced by 2 bugs and 1 feature request. Deleting it would affect multiple work items.

---

## Example 2: File in Files List

### Command
```bash
workspace files list --tags screenshot
```

### Output
```
📂 Files (5 total)

   📄 login-error.png
      Path: /screenshots/login-error.png
      Size: 1.2 MB | Type: image/png
      Created: 2/17/2026, 10:00:00 AM by qa-tester-agent
      Expires: 30 days
      Tags: screenshot, login, error
      📎 Attached to (3):
         🐛 Bug: Login button not responding (48f3eaaf)
         🐛 Bug: Session timeout after 2 minutes (abc12345)
         💡 Feature: Improve login error handling (def67890)

   📄 dashboard-mockup.png
      Path: /features/dashboard-mockup.png
      Size: 2.5 MB | Type: image/png
      Created: 2/17/2026, 9:30:00 AM by design-team
      Expires: 30 days
      Tags: screenshot, design, mockup
      📎 Attached to (2):
         💡 Feature: Redesign analytics dashboard (xyz98765)
         🎯 Milestone: Q1 2026 UX Improvements (abc11111)

   📄 api-error-log.txt
      Path: /bugs/api-error-log.txt
      Size: 45 KB | Type: text/plain
      Created: 2/17/2026, 11:00:00 AM by backend-dev
      Expires: 7 days
      Tags: screenshot, logs, api

   📄 test-data.csv
      Path: /test-cases/test-data.csv
      Size: 156 KB | Type: text/csv
      Created: 2/17/2026, 8:00:00 AM by qa-automation
      Expires: 30 days
      Tags: test-data, csv
      📎 Attached to (1):
         📝 Test Case: User import validation (test5678)

   📄 roadmap-2026.pdf
      Path: /roadmaps/roadmap-2026.pdf
      Size: 3.8 MB | Type: application/pdf
      Created: 2/16/2026, 4:00:00 PM by product-manager
      Expires: 90 days
      Tags: roadmap, planning, 2026
      📎 Attached to (1):
         🗺️  Roadmap: 2026 Product Strategy (roadmap1)
```

**Use Case:** Quickly see which files are actively used vs orphaned files that can be safely deleted.

---

## Example 3: Orphaned File (Not Attached)

### Command
```bash
workspace files get /temp/old-screenshot.png
```

### Output
```
📄 old-screenshot.png

   Path: /temp/old-screenshot.png
   Size: 890 KB
   Type: image/png
   Encoding: Base64
   Checksum: b4d7e9f1c3a2...

   Created: 2/10/2026, 3:00:00 PM
   Created By: former-team-member
   Expires: 2/12/2026, 3:00:00 PM (EXPIRED)

   Tags: temp, screenshot
```

**Use Case:** File has no attachments - safe to delete without affecting any work items.

---

## Example 4: Cross-Entity File Usage

### Command
```bash
workspace files get /analysis/market-research-q1.pdf
```

### Output
```
📄 market-research-q1.pdf

   Path: /analysis/market-research-q1.pdf
   Size: 5.2 MB
   Type: application/pdf
   Encoding: Base64

   Created: 2/15/2026, 2:00:00 PM
   Created By: market-research-agent
   Expires: 90 days

   Description: Q1 2026 competitive analysis and market trends

   Tags: research, market, analysis, q1-2026

   📎 Attached to (6):

      💡 Feature: Add AI-powered recommendations (feat1234)
         Attached: 2/15/2026, 3:00:00 PM by product-manager
         Note: Market data supporting AI features

      💡 Feature: Expand to European markets (feat5678)
         Attached: 2/15/2026, 3:30:00 PM by expansion-team
         Note: European market analysis section

      🎯 Milestone: Launch AI features (mile1111)
         Attached: 2/15/2026, 4:00:00 PM by project-manager
         Note: Supporting research documentation

      🗺️  Roadmap: 2026 Product Strategy (road2222)
         Attached: 2/16/2026, 9:00:00 AM by cto
         Note: Strategic planning reference

      🎫 Ticket: Customer request for AI features (tick3333)
         Attached: 2/16/2026, 10:00:00 AM by support-team
         Note: Customer validation data

      📝 Test Case: Validate AI recommendations accuracy (test4444)
         Attached: 2/16/2026, 11:00:00 AM by qa-lead
         Note: Acceptance criteria baseline
```

**Use Case:** High-value file referenced across entire product lifecycle - from features to milestones to testing. Should NOT be deleted.

---

## Benefits

### 1. **Prevent Accidental Deletion**
See what would be affected before deleting a file.

### 2. **Better File Discovery**
Find files by seeing what work items use them.

### 3. **File Usage Analytics**
- Orphaned files (no attachments) = safe to clean up
- Heavily-used files (many attachments) = keep and extend TTL

### 4. **Cross-Team Visibility**
See how files are reused across bugs, features, test cases, milestones, and roadmaps.

### 5. **Complete Bidirectional Relationships**

**Before (One Direction):**
- ✅ Bug → Files attached to bug
- ❌ File → ??? (unknown usage)

**After (Bidirectional):**
- ✅ Bug → Files attached to bug
- ✅ File → Bugs/features/etc. using this file

---

## Backend Implementation Checklist

- [ ] Add JOIN query to fetch entity_attachments for each file
- [ ] Include entity title/name in response
- [ ] Support all 6 entity types (bug, feature, test_case, ticket, milestone, roadmap)
- [ ] Add to GET /api/files (list)
- [ ] Add to GET /api/files/by-path (get by path)
- [ ] Add to GET /api/files/metadata (get metadata)
- [ ] Return empty array `[]` if no attachments (not null)
- [ ] Include short_id (8-char) for each entity

---

**Status:** CLI implementation complete, waiting for backend to add `attachments` array to file responses.
