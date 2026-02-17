#!/usr/bin/env node

/**
 * Workspace CLI - Official CLI for StartAnAiCompany Workspace Management
 *
 * Environment Variables:
 *   WORKSPACE_API_KEY          Required: Your API key for authentication
 *   SAAC_HIVE_AGENT_NAME       Required: Agent name for identification
 */

const { Command } = require('commander');
const { readFileSync, writeFileSync } = require('fs');
const { join, basename } = require('path');
const { prepareFileForUpload, formatFileSize, formatExpiry } = require('../src/lib/fileUtils');
const { uploadFile, downloadFile, listFiles, getFileMetadata, deleteFile: apiDeleteFile, updateFile: apiUpdateFile, getProjectByName, listFeatures, createFeature, getFeature, updateFeature, deleteFeature, addFeatureComment, listFeatureComments, listBugs, createBug, getBug, updateBug, deleteBug, addBugComment, listBugComments, listTestCases, createTestCase, getTestCase, updateTestCase, deleteTestCase, addTestCaseComment, listTestCaseComments, startExecution, updateExecutionStep, completeExecution, getExecution, listExecutions, updateTicket } = require('../src/lib/api');
const axios = require('axios');

// Get package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);

const program = new Command();

program
  .name('workspace')
  .description('Official CLI for StartAnAiCompany Workspace Management')
  .version(packageJson.version);

// Check environment variables
function checkEnv() {
  const errors = [];

  if (!process.env.WORKSPACE_API_KEY) {
    errors.push('WORKSPACE_API_KEY');
  }

  if (!process.env.SAAC_HIVE_AGENT_NAME) {
    errors.push('SAAC_HIVE_AGENT_NAME');
  }

  if (errors.length > 0) {
    console.error('❌ Error: Missing required environment variables:');
    console.error('');
    errors.forEach(varName => {
      console.error(`  • ${varName}`);
    });
    console.error('');
    console.error('Set them with:');
    console.error('  export WORKSPACE_API_KEY=your-api-key-here');
    console.error('  export SAAC_HIVE_AGENT_NAME=your-agent-name');
    console.error('');
    process.exit(1);
  }
}

// ============================================================================
// FILES Commands - File storage with auto-expiry
// ============================================================================
const files = program
  .command('files')
  .description('Manage files with auto-expiry (replaces /app/storage/)');

files
  .command('upload <local-path>')
  .description('Upload a file to workspace storage')
  .requiredOption('--path <remote-path>', 'Remote path (e.g., /app/storage/marketing/report.md)')
  .requiredOption('--expire <minutes>', 'TTL in minutes (max 43200 = 30 days)')
  .option('--description <text>', 'File description')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--project-id <id>', 'Link to project')
  .option('--public', 'Make file publicly accessible', false)
  .action(async (localPath, options) => {
    checkEnv();

    try {
      console.log(`📤 Uploading file: ${localPath}`);
      console.log('');

      // Prepare file for upload
      const result = prepareFileForUpload(localPath, options.path, {
        expire: parseInt(options.expire),
        description: options.description,
        tags: options.tags,
        projectId: options.projectId,
        public: options.public
      });

      if (!result.success) {
        console.error('❌ Error:', result.error);
        process.exit(1);
      }

      // Display file info
      console.log('📄 File Information:');
      console.log(`   Name: ${result.metadata.filename}`);
      console.log(`   Size: ${result.metadata.sizeFormatted}`);
      console.log(`   Type: ${result.metadata.content_type}`);
      console.log(`   Encoding: ${result.metadata.base64_encoded ? 'Base64' : 'Plain text'}`);
      console.log(`   Checksum: ${result.metadata.checksum}`);
      console.log(`   Expires: ${formatExpiry(parseInt(options.expire))}`);
      console.log('');

      // Upload to API
      console.log('☁️  Uploading to workspace storage...');
      const response = await uploadFile(result.payload);

      console.log('');
      console.log('✅ File uploaded successfully!');
      console.log('');
      console.log(`   Remote Path: ${response.file.path}`);
      console.log(`   File ID: ${response.file.id}`);
      console.log(`   Expires At: ${new Date(response.file.expire_at).toLocaleString()}`);
      console.log('');

    } catch (error) {
      console.error('');
      console.error('❌ Upload failed:', error.response?.data?.error || error.message);
      if (error.response?.data?.details) {
        console.error('   Details:', error.response.data.details);
      }
      process.exit(1);
    }
  });

files
  .command('download <remote-path>')
  .description('Download a file from workspace storage')
  .option('--output <local-path>', 'Local output path (default: current directory)')
  .action(async (remotePath, options) => {
    checkEnv();

    try {
      console.log(`📥 Downloading file: ${remotePath}`);
      console.log('');

      // Download from API
      console.log('☁️  Fetching from workspace storage...');
      const response = await downloadFile(remotePath);
      const fileData = response.file;

      // Determine output path
      const outputPath = options.output || basename(fileData.filename);

      // Decode and write file
      let content;
      if (fileData.base64_encoded) {
        content = Buffer.from(fileData.content, 'base64');
      } else {
        content = fileData.content;
      }

      writeFileSync(outputPath, content);

      console.log('');
      console.log('✅ File downloaded successfully!');
      console.log('');
      console.log(`   Saved to: ${outputPath}`);
      console.log(`   Size: ${formatFileSize(fileData.size)}`);
      console.log(`   Type: ${fileData.content_type}`);
      console.log(`   Checksum: ${fileData.checksum.substring(0, 16)}...`);
      console.log('');

    } catch (error) {
      console.error('');
      console.error('❌ Download failed:', error.response?.data?.error || error.message);
      if (error.response?.status === 404) {
        console.error('   File not found at:', remotePath);
      } else if (error.response?.status === 410) {
        console.error('   File has expired');
      }
      process.exit(1);
    }
  });

files
  .command('list')
  .description('List all files')
  .option('--path <prefix>', 'Filter by path prefix')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .option('--project-name <name>', 'Filter by project name (a-z0-9)')
  .option('--project-id <id>', 'Filter by project ID (short or long UUID)')
  .option('--created-by <name>', 'Filter by creator agent')
  .option('--limit <number>', 'Max results (default: 50, max: 500)')
  .option('--offset <number>', 'Skip first N results (default: 0)')
  .action(async (options) => {
    checkEnv();

    try {
      // Build filter params
      const filters = {};
      if (options.path) filters.path = options.path;
      if (options.tags) filters.tags = options.tags;
      if (options.projectName) filters.project_name = options.projectName;
      if (options.projectId) filters.project_id = options.projectId;
      if (options.createdBy) filters.created_by = options.createdBy;
      if (options.limit) filters.limit = parseInt(options.limit);
      if (options.offset) filters.offset = parseInt(options.offset);

      const response = await listFiles(filters);

      console.log('');
      console.log(`📂 Files (${response.count} total)`);
      console.log('');

      if (response.files.length === 0) {
        console.log('   No files found');
        console.log('');
        return;
      }

      response.files.forEach(file => {
        const expiresIn = new Date(file.expire_at) - new Date();
        const expiresFormatted = expiresIn > 0 ? formatExpiry(Math.floor(expiresIn / 60000)) : 'EXPIRED';

        console.log(`   📄 ${file.filename}`);
        console.log(`      Path: ${file.path}`);
        console.log(`      Size: ${formatFileSize(file.size)} | Type: ${file.content_type}`);
        console.log(`      Created: ${new Date(file.created_at).toLocaleString()} by ${file.created_by_agent_name}`);
        console.log(`      Expires: ${expiresFormatted}`);
        if (file.tags && file.tags.length > 0) {
          console.log(`      Tags: ${file.tags.join(', ')}`);
        }
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

files
  .command('get <remote-path>')
  .description('Get file metadata')
  .action(async (remotePath) => {
    checkEnv();

    try {
      const response = await getFileMetadata(remotePath);
      const file = response.file;

      console.log('');
      console.log(`📄 ${file.filename}`);
      console.log('');
      console.log(`   Path: ${file.path}`);
      console.log(`   Size: ${formatFileSize(file.size)}`);
      console.log(`   Type: ${file.content_type}`);
      console.log(`   Encoding: ${file.base64_encoded ? 'Base64' : 'Plain text'}`);
      console.log(`   Checksum: ${file.checksum}`);
      console.log('');
      console.log(`   Created: ${new Date(file.created_at).toLocaleString()}`);
      console.log(`   Created By: ${file.created_by}`);
      if (file.updated_by_agent_name) {
        console.log(`   Updated By: ${file.updated_by_agent_name}`);
      }
      console.log(`   Expires: ${new Date(file.expire_at).toLocaleString()}`);
      console.log('');
      if (file.description) {
        console.log(`   Description: ${file.description}`);
        console.log('');
      }
      if (file.tags && file.tags.length > 0) {
        console.log(`   Tags: ${file.tags.join(', ')}`);
        console.log('');
      }
      if (file.is_public) {
        console.log('   🌐 Public file');
        console.log('');
      }

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

files
  .command('delete <remote-path>')
  .description('Delete a file')
  .action(async (remotePath) => {
    checkEnv();

    try {
      const response = await apiDeleteFile(remotePath);
      console.log('');
      console.log('✅ File deleted successfully');
      console.log(`   Path: ${response.file.path}`);
      console.log('');
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

files
  .command('update <remote-path>')
  .description('Update file metadata or refresh TTL')
  .option('--expire <minutes>', 'New TTL in minutes')
  .option('--description <text>', 'New description')
  .option('--tags <tags>', 'New tags (comma-separated)')
  .option('--project-id <id>', 'Move to different project (short or long UUID)')
  .action(async (remotePath, options) => {
    checkEnv();

    try {
      const updates = {
        updated_by_agent_name: process.env.SAAC_HIVE_AGENT_NAME
      };

      if (options.expire) {
        updates.expire_minutes = parseInt(options.expire);
      }

      if (options.description) {
        updates.description = options.description;
      }

      if (options.tags) {
        updates.tags = options.tags.split(',').map(t => t.trim());
      }

      if (options.projectId) {
        updates.project_id = options.projectId;
      }

      const response = await apiUpdateFile(remotePath, updates);

      console.log('');
      console.log('✅ File updated successfully');
      console.log(`   Path: ${response.file.path}`);
      if (options.expire) {
        console.log(`   New Expiry: ${new Date(response.file.expire_at).toLocaleString()}`);
      }
      if (options.tags) {
        console.log(`   New Tags: ${response.file.tags?.join(', ') || 'none'}`);
      }
      if (options.projectId) {
        console.log(`   New Project ID: ${response.file.project_id?.substring(0, 8)}`);
      }
      console.log('');
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

// ============================================================================
// FEATURES Commands
// ============================================================================
const features = program
  .command('features')
  .description('Manage feature requests');

features
  .command('list')
  .description('List feature requests')
  .option('--project-name <name>', 'Filter by project name (a-z0-9)')
  .option('--project-id <id>', 'Filter by project ID (short or long UUID)')
  .option('--status <status>', 'Filter by status')
  .option('--priority <level>', 'Filter by priority')
  .option('--created-by <name>', 'Filter by creator agent')
  .option('--limit <number>', 'Max results (default: 50, max: 500)')
  .option('--offset <number>', 'Skip first N results (default: 0)')
  .action(async (options) => {
    checkEnv();

    try {
      // Build filter params
      const filters = {};
      if (options.projectName) filters.project_name = options.projectName;
      if (options.projectId) filters.project_id = options.projectId;
      if (options.status) filters.status = options.status;
      if (options.priority) filters.priority = options.priority;
      if (options.createdBy) filters.created_by = options.createdBy;
      if (options.limit) filters.limit = parseInt(options.limit);
      if (options.offset) filters.offset = parseInt(options.offset);

      const response = await listFeatures(filters);

      console.log('');
      console.log(`📋 Features (${response.count} total)`);
      console.log('');

      if (response.features.length === 0) {
        console.log('   No features found');
        console.log('');
        return;
      }

      response.features.forEach(feature => {
        const statusEmoji = {
          'requested': '📝',
          'in_progress': '🔄',
          'completed': '✅',
          'rejected': '❌'
        }[feature.status] || '📋';

        const priorityColor = {
          'low': '🟢',
          'medium': '🟡',
          'high': '🟠',
          'critical': '🔴'
        }[feature.priority] || '⚪';

        console.log(`   ${statusEmoji} ${feature.title}`);
        console.log(`      ID: ${feature.id}`);
        console.log(`      Project: ${feature.project || 'N/A'} | Priority: ${priorityColor} ${feature.priority || 'N/A'}`);
        console.log(`      Status: ${feature.status || 'requested'}`);
        console.log(`      Created: ${new Date(feature.created_at).toLocaleString()} by ${feature.created_by_agent}`);
        if (feature.updated_at && feature.updated_at !== feature.created_at) {
          console.log(`      Updated: ${new Date(feature.updated_at).toLocaleString()}`);
        }
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

features
  .command('create <title>')
  .description('Create new feature request')
  .option('--project <name>', 'Project name (will lookup UUID automatically)')
  .option('--description <text>', 'Feature description')
  .option('--priority <level>', 'Priority (low|medium|high|critical)')
  .option('--requested-by <name>', 'Requester name')
  .action(async (title, options) => {
    checkEnv();

    try {
      console.log(`🚀 Creating feature: ${title}`);
      console.log('');

      // Lookup project UUID by name
      let projectId = null;
      if (options.project) {
        console.log(`   Looking up project: ${options.project}...`);
        const projectResponse = await getProjectByName(options.project);
        projectId = projectResponse.project.id;
        console.log(`   Project ID: ${projectId.substring(0, 8)}`);
        console.log('');
      }

      const data = {
        title,
        project_id: projectId,
        description: options.description,
        priority: options.priority || 'medium',
        created_by: options.requestedBy || process.env.SAAC_HIVE_AGENT_NAME
      };

      const response = await createFeature(data);

      console.log('✅ Feature created successfully!');
      console.log('');
      console.log(`   ID: ${response.featureRequest.id.substring(0, 8)}`);
      console.log(`   Title: ${response.featureRequest.title}`);
      console.log(`   Priority: ${response.featureRequest.priority}`);
      console.log(`   Status: ${response.featureRequest.status}`);
      console.log(`   Votes: ${response.featureRequest.votes}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      if (error.response?.data?.details) {
        console.error('   Details:', error.response.data.details);
      }
      process.exit(1);
    }
  });

features
  .command('get <feature-id>')
  .description('Get feature details')
  .action(async (featureId) => {
    checkEnv();

    try {
      const response = await getFeature(featureId);
      const feature = response.featureRequest;

      console.log('');
      console.log(`📋 ${feature.title}`);
      console.log('');
      console.log(`   ID: ${feature.id}`);
      console.log(`   Project: ${feature.project || 'N/A'}`);
      console.log(`   Priority: ${feature.priority || 'N/A'}`);
      console.log(`   Status: ${feature.status || 'requested'}`);
      console.log('');
      console.log(`   Created: ${new Date(feature.created_at).toLocaleString()}`);
      console.log(`   Created By: ${feature.created_by}`);
      if (feature.updated_by_agent) {
        console.log(`   Updated By: ${feature.updated_by_agent}`);
        console.log(`   Updated: ${new Date(feature.updated_at).toLocaleString()}`);
      }
      console.log('');

      if (feature.description) {
        console.log(`   Description:`);
        console.log(`   ${feature.description}`);
        console.log('');
      }

      if (feature.requested_by) {
        console.log(`   Requested By: ${feature.requested_by}`);
        console.log('');
      }

      // Try to get comments
      try {
        const commentsResponse = await listFeatureComments(featureId);
        if (commentsResponse.comments && commentsResponse.comments.length > 0) {
          console.log(`   💬 Comments (${commentsResponse.comments.length}):`);
          console.log('');
          commentsResponse.comments.forEach(comment => {
            console.log(`      "${comment.comment}"`);
            console.log(`      - ${comment.created_by} at ${new Date(comment.created_at).toLocaleString()}`);
            console.log('');
          });
        }
      } catch (err) {
        // Comments might not be supported yet, silently ignore
      }

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      if (error.response?.status === 404) {
        console.error('   Feature not found');
      }
      process.exit(1);
    }
  });

features
  .command('update <feature-id>')
  .description('Update feature request')
  .option('--status <status>', 'New status (requested|planned|in_progress|completed|rejected)')
  .option('--priority <level>', 'New priority (low|medium|high|critical)')
  .option('--description <text>', 'New description')
  .option('--tags <tags>', 'New tags (comma-separated)')
  .option('--project-id <id>', 'Move to different project (short or long UUID)')
  .action(async (featureId, options) => {
    checkEnv();

    try {
      const updates = {
        updated_by_agent: process.env.SAAC_HIVE_AGENT_NAME
      };

      if (options.status) updates.status = options.status;
      if (options.priority) updates.priority = options.priority;
      if (options.description) updates.description = options.description;
      if (options.tags) updates.tags = options.tags.split(',').map(t => t.trim());
      if (options.projectId) updates.project_id = options.projectId;

      const response = await updateFeature(featureId, updates);

      console.log('');
      console.log('✅ Feature updated successfully');
      console.log(`   ID: ${response.featureRequest.id}`);
      console.log(`   Title: ${response.featureRequest.title}`);
      if (options.status) {
        console.log(`   New Status: ${response.featureRequest.status}`);
      }
      if (options.priority) {
        console.log(`   New Priority: ${response.featureRequest.priority}`);
      }
      if (options.tags) {
        console.log(`   New Tags: ${response.featureRequest.tags?.join(', ') || 'none'}`);
      }
      if (options.projectId) {
        console.log(`   New Project ID: ${response.featureRequest.project_id?.substring(0, 8)}`);
      }
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

features
  .command('comment <feature-id> <comment>')
  .description('Add comment to feature')
  .action(async (featureId, comment) => {
    checkEnv();

    try {
      const data = {
        comment,
        created_by: process.env.SAAC_HIVE_AGENT_NAME
      };

      const response = await addFeatureComment(featureId, data);

      console.log('');
      console.log('✅ Comment added successfully');
      console.log(`   Feature: ${featureId}`);
      console.log(`   Comment: "${comment}"`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

features
  .command('delete <feature-id>')
  .description('Delete feature')
  .action(async (featureId) => {
    checkEnv();

    try {
      const response = await deleteFeature(featureId);

      console.log('');
      console.log('✅ Feature deleted successfully');
      console.log(`   ID: ${featureId}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

// ============================================================================
// BUGS Commands
// ============================================================================

const bugs = program
  .command('bugs')
  .description('Manage bugs and issues');

bugs
  .command('list')
  .description('List bugs')
  .option('--project-name <name>', 'Filter by project name (a-z0-9)')
  .option('--project-id <id>', 'Filter by project ID (short or long UUID)')
  .option('--status <status>', 'Filter by status (open|in_progress|fixed|verified|closed|wont_fix|duplicate|archived)')
  .option('--priority <level>', 'Filter by priority (low|medium|high|critical)')
  .option('--severity <level>', 'Filter by severity (low|medium|high|critical)')
  .option('--created-by <name>', 'Filter by creator agent')
  .option('--include-archived', 'Include archived bugs (default: false)')
  .option('--limit <number>', 'Max results (default: 50, max: 500)')
  .option('--offset <number>', 'Skip first N results (default: 0)')
  .action(async (options) => {
    checkEnv();

    try {
      // Build filter params
      const filters = {};
      if (options.projectName) filters.project_name = options.projectName;
      if (options.projectId) filters.project_id = options.projectId;
      if (options.status) filters.status = options.status;
      if (options.priority) filters.priority = options.priority;
      if (options.severity) filters.severity = options.severity;
      if (options.createdBy) filters.created_by = options.createdBy;
      if (options.includeArchived) filters.include_archived = true;
      if (options.limit) filters.limit = parseInt(options.limit);
      if (options.offset) filters.offset = parseInt(options.offset);

      const response = await listBugs(filters);

      console.log('');
      console.log(`🐛 Bugs (${response.bugs.length} found)`);
      console.log('');

      if (response.bugs.length === 0) {
        console.log('   No bugs found');
        console.log('');
        return;
      }

      response.bugs.forEach(bug => {
        const severityEmoji = {
          'low': '🟢',
          'medium': '🟡',
          'high': '🟠',
          'critical': '🔴'
        }[bug.severity] || '⚪';

        const statusEmoji = {
          'open': '📋',
          'in_progress': '🔄',
          'resolved': '✅',
          'closed': '🔒'
        }[bug.status] || '📋';

        console.log(`   ${statusEmoji} ${bug.title}`);
        console.log(`      ID: ${bug.id.substring(0, 8)}`);
        console.log(`      Severity: ${severityEmoji} ${bug.severity} | Status: ${bug.status}`);
        console.log(`      Created: ${new Date(bug.created_at).toLocaleString()}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

bugs
  .command('create <title>')
  .description('Create new bug report')
  .option('--project <name>', 'Project name')
  .option('--description <text>', 'Bug description')
  .option('--severity <level>', 'Severity (low|medium|high|critical)')
  .option('--steps <text>', 'Steps to reproduce')
  .option('--environment <env>', 'Environment (staging|production)')
  .action(async (title, options) => {
    checkEnv();

    try {
      console.log(`🐛 Creating bug: ${title}`);
      console.log('');

      const data = {
        project: options.project,
        title,
        description: options.description || '',
        severity: options.severity || 'medium',
        steps_to_reproduce: options.steps,
        environment: options.environment || 'staging'
      };

      const response = await createBug(data);

      console.log('✅ Bug created successfully!');
      console.log('');
      console.log(`   ID: ${response.bug.id.substring(0, 8)}`);
      console.log(`   Title: ${response.bug.title}`);
      console.log(`   Severity: ${response.bug.severity}`);
      console.log(`   Status: ${response.bug.status}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      if (error.response?.data?.details) {
        console.error('   Details:', error.response.data.details);
      }
      process.exit(1);
    }
  });

bugs
  .command('get <bug-id>')
  .description('Get bug details')
  .action(async (bugId) => {
    checkEnv();

    try {
      const response = await getBug(bugId);
      const bug = response.bug;

      console.log('');
      console.log(`🐛 ${bug.title}`);
      console.log('');
      console.log(`   ID: ${bug.id}`);
      console.log(`   Severity: ${bug.severity}`);
      console.log(`   Status: ${bug.status}`);
      console.log('');
      console.log(`   Created: ${new Date(bug.created_at).toLocaleString()}`);
      console.log('');

      if (bug.description) {
        console.log(`   Description:`);
        console.log(`   ${bug.description}`);
        console.log('');
      }

      // Try to get comments
      try {
        const commentsResponse = await listBugComments(bugId);
        if (commentsResponse.comments && commentsResponse.comments.length > 0) {
          console.log(`   💬 Comments (${commentsResponse.comments.length}):`);
          console.log('');
          commentsResponse.comments.forEach(comment => {
            console.log(`      "${comment.comment_text}"`);
            console.log(`      - ${comment.created_by} at ${new Date(comment.created_at).toLocaleString()}`);
            console.log('');
          });
        }
      } catch (err) {
        // Comments might not be supported yet, silently ignore
      }

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      if (error.response?.status === 404) {
        console.error('   Bug not found');
      }
      process.exit(1);
    }
  });

bugs
  .command('update <bug-id>')
  .description('Update bug')
  .option('--status <status>', 'New status (open|in_progress|fixed|verified|closed|wont_fix|duplicate|archived)')
  .option('--severity <level>', 'New severity (low|medium|high|critical)')
  .option('--description <text>', 'New description')
  .option('--tags <tags>', 'New tags (comma-separated)')
  .option('--project-id <id>', 'Move to different project (short or long UUID)')
  .action(async (bugId, options) => {
    checkEnv();

    try {
      const updates = {};

      if (options.status) updates.status = options.status;
      if (options.severity) updates.severity = options.severity;
      if (options.description) updates.description = options.description;
      if (options.tags) updates.tags = options.tags.split(',').map(t => t.trim());
      if (options.projectId) updates.project_id = options.projectId;

      const response = await updateBug(bugId, updates);

      console.log('');
      console.log('✅ Bug updated successfully');
      console.log(`   ID: ${response.bug.id.substring(0, 8)}`);
      console.log(`   Title: ${response.bug.title}`);
      if (options.status) {
        console.log(`   New Status: ${response.bug.status}`);
      }
      if (options.severity) {
        console.log(`   New Severity: ${response.bug.severity}`);
      }
      if (options.tags) {
        console.log(`   New Tags: ${response.bug.tags?.join(', ') || 'none'}`);
      }
      if (options.projectId) {
        console.log(`   New Project ID: ${response.bug.project_id?.substring(0, 8)}`);
      }
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

bugs
  .command('comment <bug-id> <comment>')
  .description('Add comment to bug')
  .action(async (bugId, comment) => {
    checkEnv();

    try {
      const data = {
        comment,
        created_by: process.env.SAAC_HIVE_AGENT_NAME
      };

      const response = await addBugComment(bugId, data);

      console.log('');
      console.log('✅ Comment added successfully');
      console.log(`   Bug: ${bugId}`);
      console.log(`   Comment: "${comment}"`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

bugs
  .command('delete <bug-id>')
  .description('Delete bug')
  .action(async (bugId) => {
    checkEnv();

    try {
      const response = await deleteBug(bugId);

      console.log('');
      console.log('✅ Bug deleted successfully');
      console.log(`   ID: ${bugId}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

// ============================================================================
// TEST CASES Commands
// ============================================================================

const testCases = program
  .command('test-cases')
  .alias('tests')
  .description('Manage test cases');

testCases
  .command('list')
  .description('List test cases')
  .option('--project-name <name>', 'Filter by project name (a-z0-9)')
  .option('--project-id <id>', 'Filter by project ID (short or long UUID)')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .option('--status <status>', 'Filter by status (active|inactive|all, default: active)')
  .option('--priority <level>', 'Filter by priority')
  .option('--role <name>', 'Filter by role')
  .option('--created-by <name>', 'Filter by creator agent')
  .option('--limit <number>', 'Max results (default: 50, max: 500)')
  .option('--offset <number>', 'Skip first N results (default: 0)')
  .action(async (options) => {
    checkEnv();

    try {
      // Build filter params
      const filters = {};
      if (options.projectName) filters.project_name = options.projectName;
      if (options.projectId) filters.project_id = options.projectId;
      if (options.tags) filters.tags = options.tags;
      if (options.status) filters.status = options.status;
      if (options.priority) filters.priority = options.priority;
      if (options.role) filters.role = options.role;
      if (options.createdBy) filters.created_by = options.createdBy;
      if (options.limit) filters.limit = parseInt(options.limit);
      if (options.offset) filters.offset = parseInt(options.offset);

      const response = await listTestCases(filters);

      console.log('');
      console.log(`📋 Test Cases (${response.count || response.testCases.length} found)`);
      console.log('');

      if (response.testCases.length === 0) {
        console.log('   No test cases found');
        console.log('');
        return;
      }

      response.testCases.forEach(tc => {
        const priorityEmoji = {
          'low': '🟢',
          'medium': '🟡',
          'high': '🟠',
          'critical': '🔴'
        }[tc.priority] || '⚪';

        console.log(`   📝 ${tc.name}`);
        console.log(`      ID: ${tc.id.substring(0, 8)}`);
        console.log(`      Suite: ${tc.suite_name} | Priority: ${priorityEmoji} ${tc.priority}`);
        console.log(`      Project: ${tc.project_name}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

testCases
  .command('create <name>')
  .description('Create new test case with steps')
  .option('--project <name>', 'Project name (required)')
  .option('--description <text>', 'Test description')
  .option('--priority <level>', 'Priority (low|medium|high|critical)')
  .option('--role <name>', 'User role for testing')
  .option('--page-url <url>', 'Page URL to test')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--steps <json>', 'Steps as JSON array (required for meaningful tests!)')
  .action(async (name, options) => {
    checkEnv();

    try {
      if (!options.project) {
        console.error('❌ Error: --project is required');
        process.exit(1);
      }

      console.log(`📝 Creating test case: ${name}`);
      console.log('');

      // Parse steps if provided
      let steps = [];
      if (options.steps) {
        try {
          steps = JSON.parse(options.steps);
        } catch (e) {
          console.error('❌ Error: Invalid JSON for --steps');
          console.error('   Example: --steps \'[{"step_number":1,"description":"Click login","expected_result":"Form appears"}]\'');
          process.exit(1);
        }
      }

      const data = {
        name,
        project: options.project,
        description: options.description,
        priority: options.priority || 'medium',
        role: options.role,
        page_url: options.pageUrl,
        tags: options.tags ? options.tags.split(',') : [],
        created_by: process.env.SAAC_HIVE_AGENT_NAME,
        steps
      };

      const response = await createTestCase(data);

      console.log('✅ Test case created successfully!');
      console.log('');
      console.log(`   ID: ${response.testCase.id.substring(0, 8)}`);
      console.log(`   Name: ${response.testCase.name}`);
      console.log(`   Priority: ${response.testCase.priority}`);
      if (steps.length > 0) {
        console.log(`   Steps: ${steps.length} steps created`);
      }
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      if (error.response?.data?.details) {
        console.error('   Details:', error.response.data.details);
      }
      process.exit(1);
    }
  });

testCases
  .command('get <test-case-id>')
  .description('Get test case details with steps')
  .action(async (testCaseId) => {
    checkEnv();

    try {
      const response = await getTestCase(testCaseId);
      const tc = response.testCase;

      console.log('');
      console.log(`📝 ${tc.name}`);
      console.log('');
      console.log(`   ID: ${tc.id}`);
      console.log(`   Suite: ${tc.suite_name}`);
      console.log(`   Project: ${tc.project_name}`);
      console.log(`   Priority: ${tc.priority}`);
      if (tc.role_name) {
        console.log(`   Role: ${tc.role_name}`);
      }
      console.log('');

      if (tc.description) {
        console.log(`   Description: ${tc.description}`);
        console.log('');
      }

      if (tc.page_url) {
        console.log(`   Page URL: ${tc.page_url}`);
        console.log('');
      }

      // Display steps
      if (response.steps && response.steps.length > 0) {
        console.log(`   📋 Steps (${response.steps.length}):`);
        console.log('');
        response.steps.forEach(step => {
          const critical = step.is_critical ? ' ⚠️' : '';
          console.log(`      ${step.step_number}. ${step.description}${critical}`);
          if (step.expected_result) {
            console.log(`         Expected: ${step.expected_result}`);
          }
          console.log('');
        });
      }

      // Display recent executions if any
      if (response.recent_executions && response.recent_executions.length > 0) {
        console.log(`   🚀 Recent Executions (${response.recent_executions.length}):`);
        console.log('');
        response.recent_executions.forEach(exec => {
          const statusEmoji = exec.status === 'passed' ? '✅' : exec.status === 'failed' ? '❌' : '⏭️';
          console.log(`      ${statusEmoji} ${exec.status} - ${new Date(exec.started_at).toLocaleString()}`);
        });
        console.log('');
      }

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      if (error.response?.status === 404) {
        console.error('   Test case not found');
      }
      process.exit(1);
    }
  });

testCases
  .command('update <test-case-id>')
  .description('Update test case')
  .option('--name <text>', 'New name')
  .option('--description <text>', 'New description')
  .option('--priority <level>', 'New priority')
  .option('--active <boolean>', 'Set active status (true/false)')
  .option('--tags <tags>', 'New tags (comma-separated)')
  .option('--project-id <id>', 'Move to different project (short or long UUID)')
  .action(async (testCaseId, options) => {
    checkEnv();

    try {
      const updates = {};

      if (options.name) updates.name = options.name;
      if (options.description) updates.description = options.description;
      if (options.priority) updates.priority = options.priority;
      if (options.active !== undefined) updates.is_active = options.active === 'true';
      if (options.tags) updates.tags = options.tags.split(',').map(t => t.trim());
      if (options.projectId) updates.project_id = options.projectId;

      const response = await updateTestCase(testCaseId, updates);

      console.log('');
      console.log('✅ Test case updated successfully');
      console.log(`   ID: ${response.testCase.id.substring(0, 8)}`);
      console.log(`   Name: ${response.testCase.name}`);
      if (options.tags) {
        console.log(`   New Tags: ${response.testCase.tags?.join(', ') || 'none'}`);
      }
      if (options.projectId) {
        console.log(`   New Project ID: ${response.testCase.project_id?.substring(0, 8)}`);
      }
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

testCases
  .command('delete <test-case-id>')
  .description('Delete test case')
  .action(async (testCaseId) => {
    checkEnv();

    try {
      await deleteTestCase(testCaseId);

      console.log('');
      console.log('✅ Test case deleted successfully');
      console.log(`   ID: ${testCaseId}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

// ============================================================================
// TEST EXECUTIONS Commands
// ============================================================================
const executions = program
  .command('test-executions')
  .alias('executions')
  .description('Manage test executions');

executions
  .command('start <test-case-id>')
  .description('Start test execution')
  .option('--environment <env>', 'Environment (staging|production|development)')
  .option('--browser <name>', 'Browser name')
  .option('--browser-version <version>', 'Browser version')
  .action(async (testCaseId, options) => {
    checkEnv();

    try {
      console.log(`🚀 Starting execution for test case: ${testCaseId}`);
      console.log('');

      const data = {
        test_case_id: testCaseId,
        agent_name: process.env.SAAC_HIVE_AGENT_NAME,
        environment: options.environment || 'staging',
        browser: options.browser,
        browser_version: options.browserVersion
      };

      const response = await startExecution(data);

      console.log('✅ Execution started successfully!');
      console.log('');
      console.log(`   Execution ID: ${response.execution.id.substring(0, 8)}`);
      console.log(`   Status: ${response.execution.status}`);
      console.log(`   Environment: ${response.execution.environment}`);
      console.log(`   Agent: ${response.execution.agent_name}`);
      console.log('');
      console.log('💡 Next steps:');
      console.log(`   1. Update step results: workspace executions update-step ${response.execution.id.substring(0, 8)} <step-number> --status passed`);
      console.log(`   2. Complete execution: workspace executions complete ${response.execution.id.substring(0, 8)} --status passed --comment "..."`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      if (error.response?.data?.details) {
        console.error('   Details:', error.response.data.details);
      }
      process.exit(1);
    }
  });

executions
  .command('update-step <execution-id> <step-number>')
  .description('Update execution step result')
  .option('--status <status>', 'Step status (passed|failed|skipped) - REQUIRED')
  .option('--actual-result <text>', 'Actual result observed')
  .option('--error <message>', 'Error message (for failed steps)')
  .option('--screenshot <url>', 'Screenshot URL')
  .action(async (executionId, stepNumber, options) => {
    checkEnv();

    try {
      if (!options.status) {
        console.error('❌ Error: --status is required (passed|failed|skipped)');
        process.exit(1);
      }

      const data = {
        status: options.status,
        actual_result: options.actualResult,
        error_message: options.error,
        screenshot_url: options.screenshot
      };

      const response = await updateExecutionStep(executionId, stepNumber, data);

      console.log('');
      console.log(`✅ Step ${stepNumber} updated: ${options.status}`);
      if (response.step.duration_ms) {
        console.log(`   Duration: ${response.step.duration_ms}ms`);
      }
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

executions
  .command('complete <execution-id>')
  .description('Complete test execution')
  .option('--status <status>', 'Final status (passed|failed|skipped) - REQUIRED')
  .option('--comment <text>', 'Execution comment - REQUIRED for QA docs')
  .option('--error <summary>', 'Error summary (for failed executions)')
  .action(async (executionId, options) => {
    checkEnv();

    try {
      if (!options.status) {
        console.error('❌ Error: --status is required (passed|failed|skipped)');
        process.exit(1);
      }

      if (!options.comment) {
        console.error('❌ Error: --comment is REQUIRED');
        console.error('   Comments provide QA documentation for this execution');
        process.exit(1);
      }

      const data = {
        status: options.status,
        comment: options.comment,
        error_summary: options.error
      };

      const response = await completeExecution(executionId, data);

      console.log('');
      console.log('✅ Execution completed!');
      console.log('');
      console.log(`   Status: ${response.execution.status}`);
      console.log(`   Duration: ${response.execution.duration_ms}ms`);
      console.log(`   Comment added to test case`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

executions
  .command('get <execution-id>')
  .description('Get execution details with step results')
  .action(async (executionId) => {
    checkEnv();

    try {
      const response = await getExecution(executionId);
      const exec = response.execution;

      console.log('');
      console.log(`🚀 Execution: ${exec.test_name}`);
      console.log('');
      console.log(`   ID: ${exec.id}`);
      console.log(`   Status: ${exec.status}`);
      console.log(`   Environment: ${exec.environment}`);
      console.log(`   Agent: ${exec.agent_name}`);
      console.log(`   Started: ${new Date(exec.started_at).toLocaleString()}`);
      if (exec.completed_at) {
        console.log(`   Completed: ${new Date(exec.completed_at).toLocaleString()}`);
        console.log(`   Duration: ${exec.duration_ms}ms`);
      }
      console.log('');

      // Display step results
      if (response.steps && response.steps.length > 0) {
        console.log(`   📋 Step Results (${response.steps.length}):`);
        console.log('');
        response.steps.forEach(step => {
          const statusEmoji = {
            'passed': '✅',
            'failed': '❌',
            'skipped': '⏭️'
          }[step.result_status] || '⚪';

          console.log(`      ${step.step_number}. ${step.action || step.description} ${statusEmoji}`);
          if (step.expected_result) {
            console.log(`         Expected: ${step.expected_result}`);
          }
          if (step.actual_result) {
            console.log(`         Actual: ${step.actual_result}`);
          }
          if (step.error_message) {
            console.log(`         Error: ${step.error_message}`);
          }
          console.log('');
        });
      }

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      if (error.response?.status === 404) {
        console.error('   Execution not found');
      }
      process.exit(1);
    }
  });

executions
  .command('list')
  .description('List test executions')
  .option('--project-name <name>', 'Filter by project name (a-z0-9)')
  .option('--project-id <id>', 'Filter by project ID (short or long UUID)')
  .option('--status <status>', 'Filter by status (pending|running|passed|failed|skipped)')
  .option('--created-by <name>', 'Filter by executor agent')
  .option('--environment <env>', 'Filter by environment')
  .option('--limit <number>', 'Max results (default: 50, max: 500)')
  .option('--offset <number>', 'Skip first N results (default: 0)')
  .action(async (options) => {
    checkEnv();

    try {
      // Build filter params
      const filters = {};
      if (options.projectName) filters.project_name = options.projectName;
      if (options.projectId) filters.project_id = options.projectId;
      if (options.status) filters.status = options.status;
      if (options.createdBy) filters.agent = options.createdBy; // Maps to agent field in backend
      if (options.environment) filters.environment = options.environment;
      if (options.limit) filters.limit = parseInt(options.limit);
      if (options.offset) filters.offset = parseInt(options.offset);

      const response = await listExecutions(filters);

      console.log('');
      console.log(`🚀 Test Executions (${response.count || response.executions.length} found)`);
      console.log('');

      if (response.executions.length === 0) {
        console.log('   No executions found');
        console.log('');
        return;
      }

      response.executions.forEach(exec => {
        const statusEmoji = {
          'running': '🔄',
          'passed': '✅',
          'failed': '❌',
          'skipped': '⏭️'
        }[exec.status] || '⚪';

        console.log(`   ${statusEmoji} ${exec.test_name}`);
        console.log(`      ID: ${exec.id.substring(0, 8)}`);
        console.log(`      Status: ${exec.status} | Environment: ${exec.environment}`);
        console.log(`      Agent: ${exec.agent_name}`);
        console.log(`      Started: ${new Date(exec.started_at).toLocaleString()}`);
        if (exec.completed_at) {
          console.log(`      Duration: ${exec.duration_ms}ms`);
        }
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

executions
  .command('update-step <execution-id> <step-number>')
  .description('Update execution step result')
  .requiredOption('--status <status>', 'Step status (passed|failed|skipped)')
  .option('--notes <text>', 'Step notes')
  .action(async (executionId, stepNumber, options) => {
    checkEnv();
    console.log('Would update step:', { executionId, stepNumber, options });
  });

executions
  .command('complete <execution-id>')
  .description('Complete test execution')
  .requiredOption('--status <status>', 'Final status (passed|failed)')
  .option('--notes <text>', 'Execution notes')
  .action(async (executionId, options) => {
    checkEnv();
    console.log('Would complete execution:', { executionId, options });
  });

// ============================================================================
// TICKETS Commands - Support Tickets
// ============================================================================
const tickets = program
  .command('tickets')
  .description('Manage support tickets');

tickets
  .command('list')
  .description('List support tickets')
  .option('--project <name>', 'Filter by project')
  .option('--status <status>', 'Filter by status')
  .option('--priority <level>', 'Filter by priority')
  .action(async (options) => {
    checkEnv();
    console.log('Would list tickets with options:', options);
  });

tickets
  .command('create <title>')
  .description('Create new support ticket')
  .option('--project <name>', 'Project name')
  .option('--description <text>', 'Ticket description')
  .option('--priority <level>', 'Priority (low|medium|high|critical)')
  .option('--customer-email <email>', 'Customer email')
  .action(async (title, options) => {
    checkEnv();
    console.log('Would create ticket:', { title, options });
  });

tickets
  .command('get <ticket-id>')
  .description('Get ticket details')
  .action(async (ticketId) => {
    checkEnv();
    console.log('Would get ticket:', ticketId);
  });

tickets
  .command('update <ticket-id>')
  .description('Update ticket')
  .option('--status <status>', 'New status (new|open|pending|resolved|closed)')
  .option('--priority <level>', 'New priority (low|medium|high|urgent)')
  .option('--tags <tags>', 'New tags (comma-separated)')
  .option('--project-id <id>', 'Move to different project (short or long UUID)')
  .action(async (ticketId, options) => {
    checkEnv();

    try {
      const updates = {};

      if (options.status) updates.status = options.status;
      if (options.priority) updates.priority = options.priority;
      if (options.tags) updates.tags = options.tags.split(',').map(t => t.trim());
      if (options.projectId) updates.project_id = options.projectId;

      const response = await updateTicket(ticketId, updates);

      console.log('');
      console.log('✅ Ticket updated successfully');
      console.log(`   ID: ${response.ticket.id.substring(0, 8)}`);
      console.log(`   Title: ${response.ticket.title}`);
      if (options.status) {
        console.log(`   New Status: ${response.ticket.status}`);
      }
      if (options.priority) {
        console.log(`   New Priority: ${response.ticket.priority}`);
      }
      if (options.tags) {
        console.log(`   New Tags: ${response.ticket.tags?.join(', ') || 'none'}`);
      }
      if (options.projectId) {
        console.log(`   New Project ID: ${response.ticket.project_id?.substring(0, 8)}`);
      }
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

tickets
  .command('respond <ticket-id> <message>')
  .description('Add response to ticket')
  .action(async (ticketId, message) => {
    checkEnv();
    console.log('Would respond to ticket:', { ticketId, message });
  });

tickets
  .command('resolve <ticket-id>')
  .description('Resolve ticket')
  .option('--resolution <type>', 'Resolution type')
  .action(async (ticketId, options) => {
    checkEnv();
    console.log('Would resolve ticket:', { ticketId, options });
  });

// ============================================================================
// PROJECTS Commands
// ============================================================================
const projects = program
  .command('projects')
  .description('Manage projects');

projects
  .command('list')
  .description('List all projects')
  .action(async () => {
    checkEnv();
    console.log('Would list projects');
  });

projects
  .command('get <project-id>')
  .description('Get project details')
  .action(async (projectId) => {
    checkEnv();
    console.log('Would get project:', projectId);
  });

projects
  .command('create <name>')
  .description('Create new project')
  .option('--description <text>', 'Project description')
  .action(async (name, options) => {
    checkEnv();
    console.log('Would create project:', { name, options });
  });

projects
  .command('stats <project-id>')
  .description('Get project statistics')
  .action(async (projectId) => {
    checkEnv();
    console.log('Would get project stats:', projectId);
  });

// ============================================================================
// MANUAL Command - Fetch full documentation from GitHub
// ============================================================================
program
  .command('manual')
  .description('Display full documentation from GitHub')
  .action(async () => {
    try {
      console.log('');
      console.log('📖 Workspace CLI Manual');
      console.log('');
      console.log('⏳ Fetching documentation from GitHub...');
      console.log('');

      try {
        // Fetch README from GitHub
        const response = await axios.get(
          'https://raw.githubusercontent.com/startanaicompany/workspace/main/README.md',
          { timeout: 10000 }
        );

        console.log('✅ Documentation loaded');
        console.log('');
        console.log('─'.repeat(80));
        console.log('');

        // Display the README content
        console.log(response.data);

        console.log('');
        console.log('─'.repeat(80));
        console.log('');
        console.log('💡 Online documentation: https://github.com/startanaicompany/workspace');
        console.log('');

      } catch (error) {
        console.log('❌ Failed to fetch documentation');
        console.log('');
        console.log('Could not fetch README from GitHub');
        console.log('');
        console.log('Visit the documentation online:');
        console.log('  https://github.com/startanaicompany/workspace');
        console.log('');
        console.log('Or run:');
        console.log('  workspace --help');
        console.log('');

        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// Show help if no command provided
// ============================================================================
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);
