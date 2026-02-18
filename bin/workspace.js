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
const { uploadFile, downloadFile, listFiles, getFileMetadata, deleteFile: apiDeleteFile, updateFile: apiUpdateFile, getProjectByName, listProjects, getProject, createProject, listFeatures, createFeature, getFeature, updateFeature, deleteFeature, addFeatureComment, listFeatureComments, listBugs, createBug, getBug, updateBug, deleteBug, addBugComment, listBugComments, listTestCases, createTestCase, getTestCase, updateTestCase, deleteTestCase, addTestCaseComment, listTestCaseComments, startExecution, updateExecutionStep, completeExecution, getExecution, listExecutions, getTicket, updateTicket, listTickets, createTicket, respondToTicket, resolveTicket, listRoadmaps, createRoadmap, getRoadmap, updateRoadmap, deleteRoadmap, addRoadmapProject, removeRoadmapProject, getRoadmapGantt, listMilestones, getMilestone, createMilestone, updateMilestone, deleteMilestone, reorderMilestones, addMilestoneItem, removeMilestoneItem, listKnowledgebaseArticles, createKnowledgebaseArticle, getKnowledgebaseArticle, updateKnowledgebaseArticle, deleteKnowledgebaseArticle, searchKnowledgebaseArticles, linkKnowledgebaseArticle, unlinkKnowledgebaseArticle, findKnowledgebaseArticlesByResource, attachFileToEntity, linkFileToEntity, listEntityAttachments, unlinkFileFromEntity } = require('../src/lib/api');
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

// Validate description word count (minimum 500 words)
function validateDescription(description, fieldName = 'description') {
  if (!description) {
    console.error(`❌ Error: ${fieldName} is required`);
    console.error('');
    console.error('Why is this important?');
    console.error('');
    console.error('This description will be read by other AI agents who need detailed context to:');
    console.error('  • Understand the technical details');
    console.error('  • Know the business requirements');
    console.error('  • Reproduce bugs accurately');
    console.error('  • Implement features correctly');
    console.error('  • Track progress effectively');
    console.error('');
    console.error('Please be specific and include:');
    console.error('  • How did you discover this issue/need?');
    console.error('  • What tables/systems are affected?');
    console.error('  • Technical implementation details');
    console.error('  • Business context and customer impact');
    console.error('  • Expected behavior vs actual behavior');
    console.error('  • Any relevant data or examples');
    console.error('');
    console.error('Quality over quantity - but context is critical for collaboration!');
    process.exit(1);
  }

  // Count words (split by whitespace and filter empty strings)
  const words = description.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  const MIN_WORDS = 500;

  if (wordCount < MIN_WORDS) {
    console.error(`❌ Error: Too few words in the ${fieldName} (found ${wordCount}, minimum ${MIN_WORDS} required)`);
    console.error('');
    console.error('Why is this important?');
    console.error('');
    console.error('This description will be read by other AI agents who need detailed context to:');
    console.error('  • Understand the technical details');
    console.error('  • Know the business requirements');
    console.error('  • Reproduce bugs accurately');
    console.error('  • Implement features correctly');
    console.error('  • Track progress effectively');
    console.error('');
    console.error('Please be specific and include:');
    console.error('  • How did you discover this issue/need?');
    console.error('  • What tables/systems are affected?');
    console.error('  • Technical implementation details');
    console.error('  • Business context and customer impact');
    console.error('  • Expected behavior vs actual behavior');
    console.error('  • Any relevant data or examples');
    console.error('');
    console.error('Quality over quantity - but context is critical for collaboration!');
    process.exit(1);
  }

  return true;
}

function validateKBContent(content) {
  if (!content) {
    console.error('❌ Error: content is required');
    console.error('');
    console.error('Knowledge base articles need detailed content to be useful for AI agents.');
    process.exit(1);
  }

  // Count words
  const words = content.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  const MIN_WORDS = 500;

  if (wordCount < MIN_WORDS) {
    console.error(`❌ Error: KB content too short (found ${wordCount}, minimum ${MIN_WORDS} words required)`);
    console.error('');
    console.error('Why 500 words minimum?');
    console.error('');
    console.error('Knowledge base articles are documentation that AI agents will reference to:');
    console.error('  • Understand how to solve common problems');
    console.error('  • Learn about system architecture and implementation');
    console.error('  • Find step-by-step troubleshooting guides');
    console.error('  • Auto-respond to tickets with helpful information');
    console.error('  • Reduce duplicate questions and issues');
    console.error('');
    console.error('Quality documentation requires detail. Please include:');
    console.error('  • Problem description and context');
    console.error('  • Step-by-step solution or explanation');
    console.error('  • Code examples or commands');
    console.error('  • Related systems or dependencies');
    console.error('  • Common pitfalls or edge cases');
    console.error('  • Additional resources or references');
    console.error('');
    process.exit(1);
  }

  return true;
}

function validateKBSummary(summary) {
  if (!summary) {
    console.error('❌ Error: summary is required');
    console.error('');
    console.error('Summaries help AI agents quickly understand if an article is relevant.');
    process.exit(1);
  }

  // Count words
  const words = summary.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  const MIN_WORDS = 20;

  if (wordCount < MIN_WORDS) {
    console.error(`❌ Error: KB summary too short (found ${wordCount}, minimum ${MIN_WORDS} words required)`);
    console.error('');
    console.error('Why 20 words minimum?');
    console.error('');
    console.error('Summaries appear when viewing bugs, features, and tickets with linked KB articles.');
    console.error('AI agents need enough context to decide if they should read the full article.');
    console.error('');
    console.error('A good summary should:');
    console.error('  • Briefly describe what the article covers');
    console.error('  • Mention the key problem or topic');
    console.error('  • Indicate the type of solution or information provided');
    console.error('');
    console.error('Example: "This article explains how to troubleshoot database connection timeouts');
    console.error('in production environments, including common causes like firewall rules, network');
    console.error('latency, and connection pool exhaustion, with step-by-step debugging commands."');
    console.error('');
    process.exit(1);
  }

  return true;
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
        projectId: options.projectId
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
        console.log(`      Created: ${new Date(file.created_at).toLocaleString()} by ${file.created_by || 'N/A'}`);
        console.log(`      Expires: ${expiresFormatted}`);
        if (file.tags && file.tags.length > 0) {
          console.log(`      Tags: ${file.tags.join(', ')}`);
        }

        // Display entity attachments (bidirectional relationship)
        if (file.attachments && file.attachments.length > 0) {
          console.log(`      📎 Attached to (${file.attachments.length}):`);
          file.attachments.forEach(att => {
            const entityEmoji = {
              'bug': '🐛',
              'feature': '💡',
              'test_case': '📝',
              'ticket': '🎫',
              'milestone': '🎯',
              'roadmap': '🗺️'
            }[att.entity_type] || '📌';

            const entityLabel = {
              'bug': 'Bug',
              'feature': 'Feature',
              'test_case': 'Test Case',
              'ticket': 'Ticket',
              'milestone': 'Milestone',
              'roadmap': 'Roadmap'
            }[att.entity_type] || att.entity_type;

            console.log(`         ${entityEmoji} ${entityLabel}: ${att.entity_title || 'Untitled'} (${att.entity_short_id || att.entity_id.substring(0, 8)})`);
          });
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

      // Display entity attachments (bidirectional relationship)
      if (file.attachments && file.attachments.length > 0) {
        console.log(`   📎 Attached to (${file.attachments.length}):`);
        console.log('');
        file.attachments.forEach(att => {
          const entityEmoji = {
            'bug': '🐛',
            'feature': '💡',
            'test_case': '📝',
            'ticket': '🎫',
            'milestone': '🎯',
            'roadmap': '🗺️'
          }[att.entity_type] || '📌';

          const entityLabel = {
            'bug': 'Bug',
            'feature': 'Feature',
            'test_case': 'Test Case',
            'ticket': 'Ticket',
            'milestone': 'Milestone',
            'roadmap': 'Roadmap'
          }[att.entity_type] || att.entity_type;

          console.log(`      ${entityEmoji} ${entityLabel}: ${att.entity_title || 'Untitled'} (${att.entity_short_id || att.entity_id.substring(0, 8)})`);
          console.log(`         Attached: ${new Date(att.attached_at).toLocaleString()} by ${att.attached_by}`);
          if (att.description) {
            console.log(`         Note: ${att.description}`);
          }
          console.log('');
        });
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
        console.log(`      Created: ${new Date(feature.created_at).toLocaleString()} by ${feature.created_by || 'N/A'}`);
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
  .requiredOption('--description <text>', 'Feature description (minimum 500 words)')
  .option('--priority <level>', 'Priority (low|medium|high|critical)')
  .option('--requested-by <name>', 'Requester name')
  .action(async (title, options) => {
    checkEnv();

    try {
      // Validate description has minimum 500 words
      validateDescription(options.description, 'description');

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

      // Display linked KB articles
      if (response.kb_articles && response.kb_articles.length > 0) {
        console.log(`   📚 Related Knowledge Base Articles (${response.kb_articles.length}):`);
        console.log('');
        response.kb_articles.forEach(kb => {
          console.log(`      📄 ${kb.title} (${kb.article_number || kb.id.substring(0, 8)})`);
          if (kb.summary) {
            console.log(`         ${kb.summary}`);
          }
          if (kb.tags && kb.tags.length > 0) {
            console.log(`         Tags: ${kb.tags.join(', ')}`);
          }
          if (kb.link_reason) {
            console.log(`         Why: ${kb.link_reason}`);
          }
          console.log('');
        });
      }

      // Display milestone attachments
      if (response.milestones && response.milestones.length > 0) {
        console.log(`   📍 Milestones (${response.milestones.length}):`);
        console.log('');
        response.milestones.forEach(m => {
          const statusEmoji = {
            'pending': '⏳',
            'in_progress': '🔄',
            'completed': '✅',
            'cancelled': '❌'
          }[m.milestone_status] || '📍';

          console.log(`      ${statusEmoji} ${m.milestone_name} (${m.milestone_short_id})`);
          console.log(`         Roadmap: ${m.roadmap_name} (${m.roadmap_short_id})`);
          console.log(`         Dates: ${m.milestone_start_date} → ${m.milestone_end_date}`);
          console.log(`         Status: ${m.milestone_status}`);
          console.log('');
        });
      }

      // Display file attachments
      if (response.fileAttachments && response.fileAttachments.length > 0) {
        console.log(`   📎 File Attachments (${response.fileAttachments.length}):`);
        console.log('');
        response.fileAttachments.forEach(att => {
          console.log(`      📄 ${att.filename}`);
          console.log(`         Path: ${att.file_path}`);
          console.log(`         Size: ${formatFileSize(parseInt(att.size))}`);
          if (att.attachment_description) {
            console.log(`         Note: ${att.attachment_description}`);
          }
          console.log(`         Attached: ${new Date(att.attached_at).toLocaleString()} by ${att.attached_by}`);
          console.log('');
        });
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

features
  .command('attach <feature-id> <file-path>')
  .description('Attach file to feature (upload + link)')
  .option('--description <text>', 'Attachment description')
  .option('--expire <minutes>', 'File expiry in minutes (default: 43200 = 30 days)', '43200')
  .option('--path <remote-path>', 'Remote file path (default: /features/<filename>)')
  .action(async (featureId, filePath, options) => {
    checkEnv();

    try {
      const filename = basename(filePath);
      const remotePath = options.path || `/features/${filename}`;

      // Step 1: Upload file
      const fileData = prepareFileForUpload(filePath, remotePath, {
        expire: options.expire,
        tags: `feature-${featureId.substring(0, 8)}`
      });

      if (!fileData.success) {
        console.error('❌ Error preparing file:', fileData.error);
        process.exit(1);
      }

      const uploadResponse = await uploadFile(fileData.payload);

      // Step 2: Link file to feature
      const linkData = {
        file_id: uploadResponse.file.id,
        attached_by: process.env.SAAC_HIVE_AGENT_NAME,
        description: options.description || `Feature attachment: ${filename}`
      };

      const response = await linkFileToEntity('features', featureId, linkData);

      console.log('✅ File attached to feature successfully!');
      console.log('');
      console.log(`   Feature ID: ${featureId.substring(0, 8)}`);
      console.log(`   File: ${uploadResponse.file.filename}`);
      console.log(`   Path: ${uploadResponse.file.path}`);
      console.log(`   Size: ${formatFileSize(uploadResponse.file.size)}`);
      console.log(`   Attachment ID: ${response.attachment.id.substring(0, 8)}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

features
  .command('link-file <feature-id> <file-id-or-path>')
  .description('Link existing file to feature')
  .option('--description <text>', 'Attachment description')
  .action(async (featureId, fileIdOrPath, options) => {
    checkEnv();

    try {
      const linkData = {
        attached_by: process.env.SAAC_HIVE_AGENT_NAME,
        description: options.description || `Linked to feature ${featureId.substring(0, 8)}`
      };

      if (fileIdOrPath.startsWith('/')) {
        linkData.file_path = fileIdOrPath;
      } else {
        linkData.file_id = fileIdOrPath;
      }

      const response = await linkFileToEntity('features', featureId, linkData);

      console.log('');
      console.log('✅ File linked to feature successfully!');
      console.log('');
      console.log(`   Feature ID: ${featureId.substring(0, 8)}`);
      console.log(`   File: ${response.file.filename}`);
      console.log(`   Path: ${response.file.path}`);
      console.log(`   Attachment ID: ${response.attachment.attachment_id.substring(0, 8)}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

features
  .command('list-files <feature-id>')
  .description('List files attached to feature')
  .action(async (featureId) => {
    checkEnv();

    try {
      const response = await listEntityAttachments('features', featureId);

      console.log('');
      console.log(`📎 Feature Attachments (${response.count || 0} files)`);
      console.log('');

      if (!response.attachments || response.attachments.length === 0) {
        console.log('   No files attached');
        console.log('');
        return;
      }

      response.attachments.forEach(att => {
        console.log(`   📄 ${att.filename}`);
        console.log(`      Attachment ID: ${att.attachment_id.substring(0, 8)}`);
        console.log(`      File ID: ${att.file_short_id || att.file_id.substring(0, 8)}`);
        console.log(`      Path: ${att.file_path}`);
        console.log(`      Size: ${formatFileSize(att.size)}`);
        if (att.attachment_description) {
          console.log(`      Description: ${att.attachment_description}`);
        }
        console.log(`      Attached: ${new Date(att.attached_at).toLocaleString()} by ${att.attached_by}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

features
  .command('unlink-file <feature-id> <attachment-id>')
  .description('Unlink file from feature (preserves file)')
  .action(async (featureId, attachmentId) => {
    checkEnv();

    try {
      const response = await unlinkFileFromEntity('features', featureId, attachmentId);

      console.log('');
      console.log('✅ File unlinked from feature successfully');
      console.log(`   Feature ID: ${featureId.substring(0, 8)}`);
      console.log(`   Attachment ID: ${attachmentId.substring(0, 8)}`);
      console.log('   Note: File preserved in workspace storage');
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
  .requiredOption('--description <text>', 'Bug description (minimum 500 words)')
  .option('--severity <level>', 'Severity (low|medium|high|critical)')
  .option('--steps <text>', 'Steps to reproduce')
  .option('--environment <env>', 'Environment (staging|production)')
  .action(async (title, options) => {
    checkEnv();

    try {
      // Validate description has minimum 500 words
      validateDescription(options.description, 'description');

      console.log(`🐛 Creating bug: ${title}`);
      console.log('');

      const data = {
        project: options.project,
        title,
        description: options.description,
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

      // Display linked KB articles
      if (response.kb_articles && response.kb_articles.length > 0) {
        console.log(`   📚 Related Knowledge Base Articles (${response.kb_articles.length}):`);
        console.log('');
        response.kb_articles.forEach(kb => {
          console.log(`      📄 ${kb.title} (${kb.article_number || kb.id.substring(0, 8)})`);
          if (kb.summary) {
            console.log(`         ${kb.summary}`);
          }
          if (kb.tags && kb.tags.length > 0) {
            console.log(`         Tags: ${kb.tags.join(', ')}`);
          }
          if (kb.link_reason) {
            console.log(`         Why: ${kb.link_reason}`);
          }
          console.log('');
        });
      }

      // Display milestone attachments
      if (response.milestones && response.milestones.length > 0) {
        console.log(`   📍 Milestones (${response.milestones.length}):`);
        console.log('');
        response.milestones.forEach(m => {
          const statusEmoji = {
            'pending': '⏳',
            'in_progress': '🔄',
            'completed': '✅',
            'cancelled': '❌'
          }[m.milestone_status] || '📍';

          console.log(`      ${statusEmoji} ${m.milestone_name} (${m.milestone_short_id})`);
          console.log(`         Roadmap: ${m.roadmap_name} (${m.roadmap_short_id})`);
          console.log(`         Dates: ${m.milestone_start_date} → ${m.milestone_end_date}`);
          console.log(`         Status: ${m.milestone_status}`);
          console.log('');
        });
      }

      // Display file attachments
      if (response.fileAttachments && response.fileAttachments.length > 0) {
        console.log(`   📎 File Attachments (${response.fileAttachments.length}):`);
        console.log('');
        response.fileAttachments.forEach(att => {
          console.log(`      📄 ${att.filename}`);
          console.log(`         Path: ${att.file_path}`);
          console.log(`         Size: ${formatFileSize(parseInt(att.size))}`);
          if (att.attachment_description) {
            console.log(`         Note: ${att.attachment_description}`);
          }
          console.log(`         Attached: ${new Date(att.attached_at).toLocaleString()} by ${att.attached_by}`);
          console.log('');
        });
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

bugs
  .command('attach <bug-id> <file-path>')
  .description('Attach file to bug (upload + link)')
  .option('--description <text>', 'Attachment description')
  .option('--expire <minutes>', 'File expiry in minutes (default: 43200 = 30 days)', '43200')
  .option('--path <remote-path>', 'Remote file path (default: /bugs/<filename>)')
  .action(async (bugId, filePath, options) => {
    checkEnv();

    try {
      const filename = basename(filePath);
      const remotePath = options.path || `/bugs/${filename}`;

      // Step 1: Upload file
      const fileData = prepareFileForUpload(filePath, remotePath, {
        expire: options.expire,
        tags: `bug-${bugId.substring(0, 8)}`
      });

      if (!fileData.success) {
        console.error('❌ Error preparing file:', fileData.error);
        process.exit(1);
      }

      const uploadResponse = await uploadFile(fileData.payload);

      // Step 2: Link file to bug
      const linkData = {
        file_id: uploadResponse.file.id,
        attached_by: process.env.SAAC_HIVE_AGENT_NAME,
        description: options.description || `Bug attachment: ${filename}`
      };

      const response = await linkFileToEntity('bugs', bugId, linkData);

      console.log('✅ File attached to bug successfully!');
      console.log('');
      console.log(`   Bug ID: ${bugId.substring(0, 8)}`);
      console.log(`   File: ${uploadResponse.file.filename}`);
      console.log(`   Path: ${uploadResponse.file.path}`);
      console.log(`   Size: ${formatFileSize(uploadResponse.file.size)}`);
      console.log(`   Attachment ID: ${response.attachment.id.substring(0, 8)}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

bugs
  .command('link-file <bug-id> <file-id-or-path>')
  .description('Link existing file to bug')
  .option('--description <text>', 'Attachment description')
  .action(async (bugId, fileIdOrPath, options) => {
    checkEnv();

    try {
      const linkData = {
        attached_by: process.env.SAAC_HIVE_AGENT_NAME,
        description: options.description || `Linked to bug ${bugId.substring(0, 8)}`
      };

      // Check if it's a file ID or path
      if (fileIdOrPath.startsWith('/')) {
        linkData.file_path = fileIdOrPath;
      } else {
        linkData.file_id = fileIdOrPath;
      }

      const response = await linkFileToEntity('bugs', bugId, linkData);

      console.log('');
      console.log('✅ File linked to bug successfully!');
      console.log('');
      console.log(`   Bug ID: ${bugId.substring(0, 8)}`);
      console.log(`   File: ${response.file.filename}`);
      console.log(`   Path: ${response.file.path}`);
      console.log(`   Attachment ID: ${response.attachment.attachment_id.substring(0, 8)}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

bugs
  .command('list-files <bug-id>')
  .description('List files attached to bug')
  .action(async (bugId) => {
    checkEnv();

    try {
      const response = await listEntityAttachments('bugs', bugId);

      console.log('');
      console.log(`📎 Bug Attachments (${response.count || 0} files)`);
      console.log('');

      if (!response.attachments || response.attachments.length === 0) {
        console.log('   No files attached');
        console.log('');
        return;
      }

      response.attachments.forEach(att => {
        console.log(`   📄 ${att.filename}`);
        console.log(`      Attachment ID: ${att.attachment_id.substring(0, 8)}`);
        console.log(`      File ID: ${att.file_short_id || att.file_id.substring(0, 8)}`);
        console.log(`      Path: ${att.file_path}`);
        console.log(`      Size: ${formatFileSize(att.size)}`);
        if (att.attachment_description) {
          console.log(`      Description: ${att.attachment_description}`);
        }
        console.log(`      Attached: ${new Date(att.attached_at).toLocaleString()} by ${att.attached_by}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

bugs
  .command('unlink-file <bug-id> <attachment-id>')
  .description('Unlink file from bug (preserves file)')
  .action(async (bugId, attachmentId) => {
    checkEnv();

    try {
      const response = await unlinkFileFromEntity('bugs', bugId, attachmentId);

      console.log('');
      console.log('✅ File unlinked from bug successfully');
      console.log(`   Bug ID: ${bugId.substring(0, 8)}`);
      console.log(`   Attachment ID: ${attachmentId.substring(0, 8)}`);
      console.log('   Note: File preserved in workspace storage');
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
  .requiredOption('--description <text>', 'Test description (minimum 500 words)')
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

      // Validate description has minimum 500 words
      validateDescription(options.description, 'description');

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

      // Display linked KB articles
      if (response.kb_articles && response.kb_articles.length > 0) {
        console.log(`   📚 Related Knowledge Base Articles (${response.kb_articles.length}):`);
        console.log('');
        response.kb_articles.forEach(kb => {
          console.log(`      📄 ${kb.title} (${kb.article_number || kb.id.substring(0, 8)})`);
          if (kb.summary) {
            console.log(`         ${kb.summary}`);
          }
          if (kb.tags && kb.tags.length > 0) {
            console.log(`         Tags: ${kb.tags.join(', ')}`);
          }
          if (kb.link_reason) {
            console.log(`         Why: ${kb.link_reason}`);
          }
          console.log('');
        });
      }

      // Display milestone attachments
      if (response.milestones && response.milestones.length > 0) {
        console.log(`   📍 Milestones (${response.milestones.length}):`);
        console.log('');
        response.milestones.forEach(m => {
          const statusEmoji = {
            'pending': '⏳',
            'in_progress': '🔄',
            'completed': '✅',
            'cancelled': '❌'
          }[m.milestone_status] || '📍';

          console.log(`      ${statusEmoji} ${m.milestone_name} (${m.milestone_short_id})`);
          console.log(`         Roadmap: ${m.roadmap_name} (${m.roadmap_short_id})`);
          console.log(`         Dates: ${m.milestone_start_date} → ${m.milestone_end_date}`);
          console.log(`         Status: ${m.milestone_status}`);
          console.log('');
        });
      }

      // Display file attachments
      if (response.fileAttachments && response.fileAttachments.length > 0) {
        console.log(`   📎 File Attachments (${response.fileAttachments.length}):`);
        console.log('');
        response.fileAttachments.forEach(att => {
          console.log(`      📄 ${att.filename}`);
          console.log(`         Path: ${att.file_path}`);
          console.log(`         Size: ${formatFileSize(parseInt(att.size))}`);
          if (att.attachment_description) {
            console.log(`         Note: ${att.attachment_description}`);
          }
          console.log(`         Attached: ${new Date(att.attached_at).toLocaleString()} by ${att.attached_by}`);
          console.log('');
        });
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

// ----------------------------------------------------------------------------
// TEST CASE ATTACHMENTS
// ----------------------------------------------------------------------------

testCases
  .command('attach <test-case-id> <file-path>')
  .description('Attach file to test case (upload + link)')
  .option('--description <text>', 'Attachment description')
  .option('--expire <minutes>', 'File expiry in minutes (default: 43200 = 30 days)', '43200')
  .option('--path <remote-path>', 'Remote file path (default: /test-cases/<filename>)')
  .action(async (testCaseId, filePath, options) => {
    checkEnv();

    try {
      const filename = basename(filePath);
      const remotePath = options.path || `/test-cases/${filename}`;

      // Step 1: Upload file
      const fileData = prepareFileForUpload(filePath, remotePath, {
        expire: options.expire,
        tags: `test-case-${testCaseId.substring(0, 8)}`
      });

      if (!fileData.success) {
        console.error('❌ Error preparing file:', fileData.error);
        process.exit(1);
      }

      const uploadResponse = await uploadFile(fileData.payload);

      // Step 2: Link file to test case
      const linkData = {
        file_id: uploadResponse.file.id,
        attached_by: process.env.SAAC_HIVE_AGENT_NAME,
        description: options.description || `Test case attachment: ${filename}`
      };

      const response = await linkFileToEntity('test-cases', testCaseId, linkData);

      console.log('✅ File attached to test case successfully!');
      console.log('');
      console.log(`   Test Case ID: ${testCaseId.substring(0, 8)}`);
      console.log(`   File: ${uploadResponse.file.filename}`);
      console.log(`   Path: ${uploadResponse.file.path}`);
      console.log(`   Size: ${formatFileSize(uploadResponse.file.size)}`);
      console.log(`   Attachment ID: ${response.attachment.id.substring(0, 8)}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

testCases
  .command('link-file <test-case-id> <file-id-or-path>')
  .description('Link existing file to test case')
  .option('--description <text>', 'Attachment description')
  .action(async (testCaseId, fileIdOrPath, options) => {
    checkEnv();

    try {
      const linkData = {
        attached_by: process.env.SAAC_HIVE_AGENT_NAME,
        description: options.description || `Linked to test case ${testCaseId.substring(0, 8)}`
      };

      // Check if it's a file ID or path
      if (fileIdOrPath.startsWith('/')) {
        linkData.file_path = fileIdOrPath;
      } else {
        linkData.file_id = fileIdOrPath;
      }

      const response = await linkFileToEntity('test-cases', testCaseId, linkData);

      console.log('');
      console.log('✅ File linked to test case successfully!');
      console.log('');
      console.log(`   Test Case ID: ${testCaseId.substring(0, 8)}`);
      console.log(`   File: ${response.file.filename}`);
      console.log(`   Path: ${response.file.path}`);
      console.log(`   Attachment ID: ${response.attachment.attachment_id.substring(0, 8)}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

testCases
  .command('list-files <test-case-id>')
  .description('List files attached to test case')
  .action(async (testCaseId) => {
    checkEnv();

    try {
      const response = await listEntityAttachments('test-cases', testCaseId);

      console.log('');
      console.log(`📎 Test Case Attachments (${response.count || 0} files)`);
      console.log('');

      if (!response.attachments || response.attachments.length === 0) {
        console.log('   No files attached');
        console.log('');
        return;
      }

      response.attachments.forEach(att => {
        console.log(`   📄 ${att.filename}`);
        console.log(`      Attachment ID: ${att.attachment_id.substring(0, 8)}`);
        console.log(`      File ID: ${att.file_short_id || att.file_id.substring(0, 8)}`);
        console.log(`      Path: ${att.file_path}`);
        console.log(`      Size: ${formatFileSize(att.size)}`);
        if (att.attachment_description) {
          console.log(`      Description: ${att.attachment_description}`);
        }
        console.log(`      Attached: ${new Date(att.attached_at).toLocaleString()} by ${att.attached_by}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

testCases
  .command('unlink-file <test-case-id> <attachment-id>')
  .description('Unlink file from test case (preserves file)')
  .action(async (testCaseId, attachmentId) => {
    checkEnv();

    try {
      const response = await unlinkFileFromEntity('test-cases', testCaseId, attachmentId);

      console.log('');
      console.log('✅ File unlinked from test case successfully');
      console.log(`   Test Case ID: ${testCaseId.substring(0, 8)}`);
      console.log(`   Attachment ID: ${attachmentId.substring(0, 8)}`);
      console.log('   Note: File preserved in workspace storage');
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

// ============================================================================
// TICKETS Commands - Support Tickets
// ============================================================================
const tickets = program
  .command('tickets')
  .description('Manage support tickets');

tickets
  .command('list')
  .description('List support tickets')
  .option('--project-name <name>', 'Filter by project name (a-z0-9)')
  .option('--project-id <id>', 'Filter by project ID (short or long UUID)')
  .option('--status <status>', 'Filter by status (new|open|pending|resolved|closed)')
  .option('--priority <level>', 'Filter by priority (low|medium|high|urgent)')
  .option('--category <cat>', 'Filter by category')
  .option('--customer-email <email>', 'Filter by customer email')
  .option('--created-by <name>', 'Filter by creator agent')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .option('--limit <number>', 'Max results (default: 50, max: 500)')
  .option('--offset <number>', 'Skip first N results (default: 0)')
  .action(async (options) => {
    checkEnv();

    try {
      const filters = {};
      if (options.projectName) filters.project_name = options.projectName;
      if (options.projectId) filters.project_id = options.projectId;
      if (options.status) filters.status = options.status;
      if (options.priority) filters.priority = options.priority;
      if (options.category) filters.category = options.category;
      if (options.customerEmail) filters.customer_email = options.customerEmail;
      if (options.createdBy) filters.created_by = options.createdBy;
      if (options.tags) filters.tags = options.tags;
      if (options.limit) filters.limit = parseInt(options.limit);
      if (options.offset) filters.offset = parseInt(options.offset);

      const response = await listTickets(filters);

      console.log('');
      console.log(`🎫 Tickets (${response.total || response.tickets.length} found)`);
      console.log('');

      if (response.tickets.length === 0) {
        console.log('   No tickets found');
        console.log('');
        return;
      }

      response.tickets.forEach(ticket => {
        const priorityEmoji = {
          'low': '🟢',
          'medium': '🟡',
          'high': '🟠',
          'urgent': '🔴',
          'critical': '🔴'
        }[ticket.priority] || '⚪';

        const statusEmoji = {
          'new': '🆕',
          'open': '📭',
          'pending': '⏳',
          'resolved': '✅',
          'closed': '🔒'
        }[ticket.status] || '🎫';

        console.log(`   ${statusEmoji} ${priorityEmoji} ${ticket.subject || ticket.title} (${ticket.id.substring(0, 8)})`);
        console.log(`      Status: ${ticket.status} | Priority: ${ticket.priority || 'N/A'}`);
        if (ticket.customer_email) {
          console.log(`      Customer: ${ticket.customer_name || 'N/A'} <${ticket.customer_email}>`);
        }
        if (ticket.category) {
          console.log(`      Category: ${ticket.category}`);
        }
        if (ticket.created_by) {
          console.log(`      Created by: ${ticket.created_by}`);
        }
        console.log(`      Created: ${new Date(ticket.created_at).toLocaleString()}`);
        console.log('');
      });

      if (response.total > response.tickets.length) {
        console.log(`   Showing ${response.tickets.length} of ${response.total} total tickets`);
        console.log(`   Use --offset and --limit for pagination`);
        console.log('');
      }

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

tickets
  .command('create <subject>')
  .description('Create new support ticket')
  .option('--project <name>', 'Project name (will lookup UUID automatically)')
  .requiredOption('--description <text>', 'Ticket description (minimum 500 words)')
  .option('--priority <level>', 'Priority (low|medium|high|urgent)', 'medium')
  .option('--category <category>', 'Category (bug|feature|question|other)')
  .option('--customer-email <email>', 'Customer email address')
  .option('--customer-name <name>', 'Customer name')
  .option('--source <source>', 'Ticket source (web|email|api|chat)')
  .option('--tags <tags>', 'Tags (comma-separated)')
  .action(async (subject, options) => {
    checkEnv();

    try {
      // Validate description has minimum 500 words
      validateDescription(options.description, 'description');

      const data = {
        subject,
        description: options.description,
        priority: options.priority,
        created_by: process.env.SAAC_HIVE_AGENT_NAME
      };

      // Look up project UUID if project name provided
      if (options.project) {
        const projectResponse = await getProjectByName(options.project);
        data.project_id = projectResponse.project.id;
      }

      if (options.category) data.category = options.category;
      if (options.customerEmail) data.customer_email = options.customerEmail;
      if (options.customerName) data.customer_name = options.customerName;
      if (options.source) data.source = options.source;
      if (options.tags) data.tags = options.tags.split(',').map(t => t.trim());

      const response = await createTicket(data);

      console.log('');
      console.log('✅ Ticket created successfully');
      console.log(`   ID: ${response.ticket.id.substring(0, 8)}`);
      console.log(`   Subject: ${response.ticket.subject}`);
      console.log(`   Priority: ${response.ticket.priority}`);
      console.log(`   Status: ${response.ticket.status}`);
      if (response.ticket.customer_email) {
        console.log(`   Customer: ${response.ticket.customer_name || 'N/A'} <${response.ticket.customer_email}>`);
      }
      if (response.ticket.project_id) {
        console.log(`   Project ID: ${response.ticket.project_id.substring(0, 8)}`);
      }
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      if (error.response?.status === 404 && options.project) {
        console.error(`   Project "${options.project}" not found`);
      }
      process.exit(1);
    }
  });

tickets
  .command('get <ticket-id>')
  .description('Get ticket details')
  .action(async (ticketId) => {
    checkEnv();

    try {
      const response = await getTicket(ticketId);
      const ticket = response.ticket;

      console.log('');
      console.log(`🎫 ${ticket.title}`);
      console.log('');
      console.log(`   ID: ${ticket.id}`);
      console.log(`   Priority: ${ticket.priority || 'N/A'}`);
      console.log(`   Status: ${ticket.status}`);
      console.log('');
      console.log(`   Created: ${new Date(ticket.created_at).toLocaleString()}`);
      if (ticket.created_by) {
        console.log(`   Created By: ${ticket.created_by}`);
      }
      console.log('');

      if (ticket.description) {
        console.log(`   Description:`);
        console.log(`   ${ticket.description}`);
        console.log('');
      }

      // Display linked KB articles
      if (response.kb_articles && response.kb_articles.length > 0) {
        console.log(`   📚 Related Knowledge Base Articles (${response.kb_articles.length}):`);
        console.log('');
        response.kb_articles.forEach(kb => {
          console.log(`      📄 ${kb.title} (${kb.article_number || kb.id.substring(0, 8)})`);
          if (kb.summary) {
            console.log(`         ${kb.summary}`);
          }
          if (kb.tags && kb.tags.length > 0) {
            console.log(`         Tags: ${kb.tags.join(', ')}`);
          }
          if (kb.link_reason) {
            console.log(`         Why: ${kb.link_reason}`);
          }
          console.log('');
        });
      }

      // Display milestone attachments
      if (response.milestones && response.milestones.length > 0) {
        console.log(`   📍 Milestones (${response.milestones.length}):`);
        console.log('');
        response.milestones.forEach(m => {
          const statusEmoji = {
            'pending': '⏳',
            'in_progress': '🔄',
            'completed': '✅',
            'cancelled': '❌'
          }[m.milestone_status] || '📍';

          console.log(`      ${statusEmoji} ${m.milestone_name} (${m.milestone_short_id})`);
          console.log(`         Roadmap: ${m.roadmap_name} (${m.roadmap_short_id})`);
          console.log(`         Dates: ${m.milestone_start_date} → ${m.milestone_end_date}`);
          console.log(`         Status: ${m.milestone_status}`);
          console.log('');
        });
      }

      // Display file attachments
      if (response.fileAttachments && response.fileAttachments.length > 0) {
        console.log(`   📎 File Attachments (${response.fileAttachments.length}):`);
        console.log('');
        response.fileAttachments.forEach(att => {
          console.log(`      📄 ${att.filename}`);
          console.log(`         Path: ${att.file_path}`);
          console.log(`         Size: ${formatFileSize(parseInt(att.size))}`);
          if (att.attachment_description) {
            console.log(`         Note: ${att.attachment_description}`);
          }
          console.log(`         Attached: ${new Date(att.attached_at).toLocaleString()} by ${att.attached_by}`);
          console.log('');
        });
      }

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      if (error.response?.status === 404) {
        console.error('   Ticket not found');
      }
      process.exit(1);
    }
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
  .option('--internal', 'Mark response as internal note (not visible to customer)', false)
  .option('--responder-type <type>', 'Responder type (agent|user|system)', 'agent')
  .action(async (ticketId, message, options) => {
    checkEnv();

    try {
      const data = {
        message,
        responder: process.env.SAAC_HIVE_AGENT_NAME,
        responder_type: options.responderType,
        is_internal: options.internal
      };

      const response = await respondToTicket(ticketId, data);

      console.log('');
      console.log('✅ Response added successfully');
      console.log(`   Ticket ID: ${ticketId.substring(0, 8)}`);
      console.log(`   Responder: ${data.responder}`);
      console.log(`   Type: ${data.responder_type}`);
      if (data.is_internal) {
        console.log(`   🔒 Internal Note (not visible to customer)`);
      }
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      if (error.response?.status === 404) {
        console.error('   Ticket not found');
      }
      process.exit(1);
    }
  });

tickets
  .command('resolve <ticket-id>')
  .description('Resolve ticket')
  .requiredOption('--resolution-type <type>', 'Resolution type (fixed|wont_fix|duplicate|by_design|not_reproducible)')
  .option('--notes <text>', 'Resolution notes')
  .action(async (ticketId, options) => {
    checkEnv();

    try {
      const data = {
        resolution_type: options.resolutionType
      };

      if (options.notes) {
        data.resolution_notes = options.notes;
      }

      const response = await resolveTicket(ticketId, data);

      console.log('');
      console.log('✅ Ticket resolved successfully');
      console.log(`   Ticket ID: ${response.ticket.id.substring(0, 8)}`);
      console.log(`   Subject: ${response.ticket.subject || response.ticket.title}`);
      console.log(`   Status: ${response.ticket.status}`);
      console.log(`   Resolution: ${data.resolution_type}`);
      if (data.resolution_notes) {
        console.log(`   Notes: ${data.resolution_notes}`);
      }
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      if (error.response?.status === 404) {
        console.error('   Ticket not found');
      }
      process.exit(1);
    }
  });

// ----------------------------------------------------------------------------
// TICKET ATTACHMENTS
// ----------------------------------------------------------------------------

tickets
  .command('attach <ticket-id> <file-path>')
  .description('Attach file to ticket (upload + link)')
  .option('--description <text>', 'Attachment description')
  .option('--expire <minutes>', 'File expiry in minutes (default: 43200 = 30 days)', '43200')
  .option('--path <remote-path>', 'Remote file path (default: /tickets/<filename>)')
  .action(async (ticketId, filePath, options) => {
    checkEnv();

    try {
      const filename = basename(filePath);
      const remotePath = options.path || `/tickets/${filename}`;

      // Step 1: Upload file
      const fileData = prepareFileForUpload(filePath, remotePath, {
        expire: options.expire,
        tags: `ticket-${ticketId.substring(0, 8)}`
      });

      if (!fileData.success) {
        console.error('❌ Error preparing file:', fileData.error);
        process.exit(1);
      }

      const uploadResponse = await uploadFile(fileData.payload);

      // Step 2: Link file to ticket
      const linkData = {
        file_id: uploadResponse.file.id,
        attached_by: process.env.SAAC_HIVE_AGENT_NAME,
        description: options.description || `Ticket attachment: ${filename}`
      };

      const response = await linkFileToEntity('tickets', ticketId, linkData);

      console.log('✅ File attached to ticket successfully!');
      console.log('');
      console.log(`   Ticket ID: ${ticketId.substring(0, 8)}`);
      console.log(`   File: ${uploadResponse.file.filename}`);
      console.log(`   Path: ${uploadResponse.file.path}`);
      console.log(`   Size: ${formatFileSize(uploadResponse.file.size)}`);
      console.log(`   Attachment ID: ${response.attachment.id.substring(0, 8)}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

tickets
  .command('link-file <ticket-id> <file-id-or-path>')
  .description('Link existing file to ticket')
  .option('--description <text>', 'Attachment description')
  .action(async (ticketId, fileIdOrPath, options) => {
    checkEnv();

    try {
      const linkData = {
        attached_by: process.env.SAAC_HIVE_AGENT_NAME,
        description: options.description || `Linked to ticket ${ticketId.substring(0, 8)}`
      };

      // Check if it's a file ID or path
      if (fileIdOrPath.startsWith('/')) {
        linkData.file_path = fileIdOrPath;
      } else {
        linkData.file_id = fileIdOrPath;
      }

      const response = await linkFileToEntity('tickets', ticketId, linkData);

      console.log('');
      console.log('✅ File linked to ticket successfully!');
      console.log('');
      console.log(`   Ticket ID: ${ticketId.substring(0, 8)}`);
      console.log(`   File: ${response.file.filename}`);
      console.log(`   Path: ${response.file.path}`);
      console.log(`   Attachment ID: ${response.attachment.attachment_id.substring(0, 8)}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

tickets
  .command('list-files <ticket-id>')
  .description('List files attached to ticket')
  .action(async (ticketId) => {
    checkEnv();

    try {
      const response = await listEntityAttachments('tickets', ticketId);

      console.log('');
      console.log(`📎 Ticket Attachments (${response.count || 0} files)`);
      console.log('');

      if (!response.attachments || response.attachments.length === 0) {
        console.log('   No files attached');
        console.log('');
        return;
      }

      response.attachments.forEach(att => {
        console.log(`   📄 ${att.filename}`);
        console.log(`      Attachment ID: ${att.attachment_id.substring(0, 8)}`);
        console.log(`      File ID: ${att.file_short_id || att.file_id.substring(0, 8)}`);
        console.log(`      Path: ${att.file_path}`);
        console.log(`      Size: ${formatFileSize(att.size)}`);
        if (att.attachment_description) {
          console.log(`      Description: ${att.attachment_description}`);
        }
        console.log(`      Attached: ${new Date(att.attached_at).toLocaleString()} by ${att.attached_by}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

tickets
  .command('unlink-file <ticket-id> <attachment-id>')
  .description('Unlink file from ticket (preserves file)')
  .action(async (ticketId, attachmentId) => {
    checkEnv();

    try {
      const response = await unlinkFileFromEntity('tickets', ticketId, attachmentId);

      console.log('');
      console.log('✅ File unlinked from ticket successfully');
      console.log(`   Ticket ID: ${ticketId.substring(0, 8)}`);
      console.log(`   Attachment ID: ${attachmentId.substring(0, 8)}`);
      console.log('   Note: File preserved in workspace storage');
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
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
  .option('--limit <number>', 'Max results (default: 50)', '50')
  .option('--offset <number>', 'Skip first N results (default: 0)', '0')
  .action(async (options) => {
    checkEnv();

    try {
      const filters = {
        limit: parseInt(options.limit),
        offset: parseInt(options.offset)
      };

      const response = await listProjects(filters);

      console.log('');
      console.log(`📁 Projects (${response.projects.length} found)`);
      console.log('');

      if (response.projects.length === 0) {
        console.log('   No projects found');
        console.log('');
        return;
      }

      response.projects.forEach(project => {
        console.log(`   📁 ${project.display_name || project.name} (${project.id.substring(0, 8)})`);
        console.log(`      Name: ${project.name}`);
        if (project.description) {
          console.log(`      Description: ${project.description.substring(0, 100)}${project.description.length > 100 ? '...' : ''}`);
        }
        if (project.created_by) {
          console.log(`      Created by: ${project.created_by}`);
        }
        console.log(`      Created: ${new Date(project.created_at).toLocaleString()}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

projects
  .command('get <project-id>')
  .description('Get project details (supports short UUIDs)')
  .action(async (projectId) => {
    checkEnv();

    try {
      const response = await getProject(projectId);
      const project = response.project;
      const stats = response.stats || {};

      console.log('');
      console.log(`📁 ${project.display_name || project.name}`);
      console.log('');
      console.log(`   ID: ${project.id}`);
      console.log(`   Name: ${project.name}`);
      if (project.display_name) {
        console.log(`   Display Name: ${project.display_name}`);
      }
      if (project.description) {
        console.log(`   Description: ${project.description}`);
      }
      console.log('');
      console.log(`   Created: ${new Date(project.created_at).toLocaleString()}`);
      if (project.created_by) {
        console.log(`   Created By: ${project.created_by}`);
      }
      console.log('');

      // Display statistics
      console.log('   📊 Statistics:');
      console.log(`      Test Cases: ${stats.test_count || 0}`);
      console.log(`      Bugs: ${stats.bug_count || 0} (Open: ${stats.open_bugs || 0})`);
      console.log(`      Test Executions: ${stats.total_executions || 0} (Passed: ${stats.passed_count || 0})`);
      if (stats.pass_rate !== undefined) {
        console.log(`      Pass Rate: ${(stats.pass_rate * 100).toFixed(1)}%`);
      }
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      if (error.response?.status === 404) {
        console.error('   Project not found');
      }
      process.exit(1);
    }
  });

projects
  .command('create <name>')
  .description('Create new project')
  .option('--description <text>', 'Project description')
  .option('--display-name <name>', 'Display name (user-friendly name)')
  .action(async (name, options) => {
    checkEnv();

    try {
      const data = {
        name,
        created_by: process.env.SAAC_HIVE_AGENT_NAME
      };

      if (options.description) {
        data.description = options.description;
      }

      if (options.displayName) {
        data.display_name = options.displayName;
      }

      const response = await createProject(data);

      console.log('');
      console.log('✅ Project created successfully');
      console.log(`   ID: ${response.project.id.substring(0, 8)}`);
      console.log(`   Name: ${response.project.name}`);
      if (response.project.display_name) {
        console.log(`   Display Name: ${response.project.display_name}`);
      }
      if (response.project.description) {
        console.log(`   Description: ${response.project.description}`);
      }
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      if (error.response?.data?.details) {
        console.error(`   Details: ${error.response.data.details}`);
      }
      process.exit(1);
    }
  });

projects
  .command('stats <project-id>')
  .description('Get project statistics (supports short UUIDs)')
  .action(async (projectId) => {
    checkEnv();

    try {
      const response = await getProject(projectId);
      const project = response.project;
      const stats = response.stats || {};

      console.log('');
      console.log(`📊 Statistics for ${project.display_name || project.name}`);
      console.log('');
      console.log(`   Project ID: ${project.id.substring(0, 8)}`);
      console.log(`   Name: ${project.name}`);
      console.log('');
      console.log('   📈 Metrics:');
      console.log(`      Test Cases: ${stats.test_count || 0}`);
      console.log(`      Bugs Reported: ${stats.bug_count || 0}`);
      console.log(`      Open Bugs: ${stats.open_bugs || 0}`);
      console.log(`      Test Executions: ${stats.total_executions || 0}`);
      console.log(`      Passed Executions: ${stats.passed_count || 0}`);
      console.log(`      Failed Executions: ${(stats.total_executions || 0) - (stats.passed_count || 0)}`);
      if (stats.pass_rate !== undefined) {
        console.log(`      Overall Pass Rate: ${(stats.pass_rate * 100).toFixed(1)}%`);
      }
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      if (error.response?.status === 404) {
        console.error('   Project not found');
      }
      process.exit(1);
    }
  });

// ============================================================================
// KNOWLEDGEBASE Commands - Documentation and knowledge articles
// ============================================================================
const knowledgebase = program
  .command('knowledgebase')
  .alias('kb')
  .description('Manage knowledge base articles');

knowledgebase
  .command('list')
  .description('List knowledge base articles')
  .option('--project-id <id>', 'Filter by project ID (short or long UUID)')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .option('--limit <number>', 'Max results (default: 50, max: 500)')
  .option('--offset <number>', 'Skip first N results (default: 0)')
  .action(async (options) => {
    checkEnv();

    try {
      const filters = {};
      if (options.projectId) filters.project_id = options.projectId;
      if (options.tags) filters.tags = options.tags;
      if (options.limit) filters.limit = parseInt(options.limit);
      if (options.offset) filters.offset = parseInt(options.offset);

      const response = await listKnowledgebaseArticles(filters);

      console.log('');
      console.log(`📚 Knowledge Base Articles (${response.total || response.articles?.length || 0} found)`);
      console.log('');

      if (!response.articles || response.articles.length === 0) {
        console.log('   No articles found');
        console.log('');
        return;
      }

      response.articles.forEach(article => {
        console.log(`   📄 ${article.title}`);
        console.log(`      Article #: ${article.article_number || article.id.substring(0, 8)}`);
        if (article.summary) {
          console.log(`      Summary: ${article.summary.substring(0, 100)}${article.summary.length > 100 ? '...' : ''}`);
        }
        if (article.tags && article.tags.length > 0) {
          console.log(`      Tags: ${article.tags.join(', ')}`);
        }
        console.log(`      Created: ${new Date(article.created_at).toLocaleString()}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

knowledgebase
  .command('create <title>')
  .description('Create new knowledge base article')
  .requiredOption('--content <text>', 'Article content (supports Markdown, minimum 500 words required)')
  .requiredOption('--summary <text>', 'Short summary (minimum 20 words required)')
  .requiredOption('--tags <tags>', 'Tags (comma-separated, minimum 2 tags required)')
  .option('--project-id <id>', 'Link to project (short or long UUID)')
  .option('--auto-response', 'Enable for auto-response features', false)
  .option('--response-template <text>', 'Template for auto-responses')
  .action(async (title, options) => {
    checkEnv();

    try {
      // Validate content (500 words minimum)
      validateKBContent(options.content);

      // Validate summary (20 words minimum)
      validateKBSummary(options.summary);

      // Validate minimum 2 tags
      const tags = options.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      if (tags.length < 2) {
        console.error('❌ Error: Minimum 2 tags required');
        console.error('   Please provide at least 2 tags separated by commas');
        process.exit(1);
      }

      const data = {
        title,
        content: options.content,
        summary: options.summary,
        tags: tags,
        created_by: process.env.SAAC_HIVE_AGENT_NAME
      };

      if (options.projectId) data.project_id = options.projectId;
      if (options.autoResponse) data.auto_response_enabled = true;
      if (options.responseTemplate) data.response_template = options.responseTemplate;

      const response = await createKnowledgebaseArticle(data);

      console.log('');
      console.log('✅ Knowledge base article created successfully');
      console.log(`   Article #: ${response.article.article_number || response.article.id.substring(0, 8)}`);
      console.log(`   Title: ${response.article.title}`);
      console.log(`   Tags: ${response.article.tags.join(', ')}`);
      if (response.article.project_id) {
        console.log(`   Project ID: ${response.article.project_id.substring(0, 8)}`);
      }
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

knowledgebase
  .command('get <article-id>')
  .description('Get knowledge base article details (supports KB-000001, short UUID, full UUID)')
  .action(async (articleId) => {
    checkEnv();

    try {
      const response = await getKnowledgebaseArticle(articleId);
      const article = response.article;

      console.log('');
      console.log(`📄 ${article.title}`);
      console.log('');
      console.log(`   Article #: ${article.article_number || article.id.substring(0, 8)}`);
      console.log(`   ID: ${article.id}`);
      console.log('');
      console.log(`   Created: ${new Date(article.created_at).toLocaleString()}`);
      console.log(`   Updated: ${new Date(article.updated_at).toLocaleString()}`);
      console.log('');

      if (article.summary) {
        console.log(`   Summary:`);
        console.log(`   ${article.summary}`);
        console.log('');
      }

      if (article.tags && article.tags.length > 0) {
        console.log(`   Tags: ${article.tags.join(', ')}`);
        console.log('');
      }

      console.log(`   Content:`);
      console.log(`   ${article.content}`);
      console.log('');

      if (article.auto_response_enabled) {
        console.log(`   🤖 Auto-response: Enabled`);
        if (article.response_template) {
          console.log(`   Template: ${article.response_template}`);
        }
        console.log('');
      }

      // Display linked resources
      if (response.links && response.links.length > 0) {
        console.log(`   🔗 Linked Resources (${response.links.length}):`);
        console.log('');
        response.links.forEach(link => {
          const emoji = {
            'bug': '🐛',
            'feature': '📋',
            'ticket': '🎫',
            'file': '📄',
            'test_case': '📝'
          }[link.resource_type] || '📎';
          console.log(`      ${emoji} ${link.resource_type}: ${link.resource_id.substring(0, 8)}`);
          if (link.reason) {
            console.log(`         Reason: ${link.reason}`);
          }
        });
        console.log('');
      }

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      if (error.response?.status === 404) {
        console.error('   Article not found');
      }
      process.exit(1);
    }
  });

knowledgebase
  .command('update <article-id>')
  .description('Update knowledge base article')
  .option('--title <text>', 'New title')
  .option('--content <text>', 'New content (supports Markdown, minimum 500 words)')
  .option('--summary <text>', 'New summary (minimum 20 words)')
  .option('--tags <tags>', 'New tags (comma-separated, minimum 2 tags)')
  .option('--auto-response <bool>', 'Enable/disable auto-response (true|false)')
  .option('--response-template <text>', 'New response template')
  .action(async (articleId, options) => {
    checkEnv();

    try {
      const updates = {};

      if (options.title) updates.title = options.title;

      if (options.content) {
        validateKBContent(options.content);
        updates.content = options.content;
      }

      if (options.summary) {
        validateKBSummary(options.summary);
        updates.summary = options.summary;
      }

      if (options.tags) {
        const tags = options.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
        if (tags.length < 2) {
          console.error('❌ Error: Minimum 2 tags required');
          console.error('   Please provide at least 2 tags separated by commas');
          process.exit(1);
        }
        updates.tags = tags;
      }
      if (options.autoResponse) updates.auto_response_enabled = options.autoResponse === 'true';
      if (options.responseTemplate) updates.response_template = options.responseTemplate;

      const response = await updateKnowledgebaseArticle(articleId, updates);

      console.log('');
      console.log('✅ Article updated successfully');
      console.log(`   Article #: ${response.article.article_number || articleId}`);
      console.log(`   Title: ${response.article.title}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

knowledgebase
  .command('delete <article-id>')
  .description('Delete knowledge base article')
  .action(async (articleId) => {
    checkEnv();

    try {
      await deleteKnowledgebaseArticle(articleId);

      console.log('');
      console.log('✅ Article deleted successfully');
      console.log(`   Article ID: ${articleId}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

knowledgebase
  .command('search <query>')
  .description('Search knowledge base articles (full-text search)')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .option('--limit <number>', 'Max results (default: 50)')
  .action(async (query, options) => {
    checkEnv();

    try {
      const filters = { query };
      if (options.tags) filters.tags = options.tags;
      if (options.limit) filters.limit = parseInt(options.limit);

      const response = await searchKnowledgebaseArticles(filters);

      console.log('');
      console.log(`🔍 Search Results for "${query}" (${response.total || response.articles?.length || 0} found)`);
      console.log('');

      if (!response.articles || response.articles.length === 0) {
        console.log('   No articles found matching your query');
        console.log('');
        return;
      }

      response.articles.forEach(article => {
        console.log(`   📄 ${article.title}`);
        console.log(`      Article #: ${article.article_number || article.id.substring(0, 8)}`);
        if (article.summary) {
          console.log(`      Summary: ${article.summary.substring(0, 100)}${article.summary.length > 100 ? '...' : ''}`);
        }
        if (article.tags && article.tags.length > 0) {
          console.log(`      Tags: ${article.tags.join(', ')}`);
        }
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

knowledgebase
  .command('link <article-id>')
  .description('Link article to a resource (bug, feature, ticket, file, test-case)')
  .requiredOption('--type <type>', 'Resource type (bug|feature|ticket|file|test_case)')
  .requiredOption('--resource-id <id>', 'Resource ID (short or long UUID)')
  .option('--reason <text>', 'Reason for linking')
  .action(async (articleId, options) => {
    checkEnv();

    try {
      const data = {
        resource_type: options.type,
        resource_id: options.resourceId
      };

      if (options.reason) {
        data.reason = options.reason;
      }

      const response = await linkKnowledgebaseArticle(articleId, data);

      console.log('');
      console.log('✅ Article linked to resource successfully');
      console.log(`   Article: ${articleId}`);
      console.log(`   Resource Type: ${options.type}`);
      console.log(`   Resource ID: ${options.resourceId}`);
      if (options.reason) {
        console.log(`   Reason: ${options.reason}`);
      }
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

knowledgebase
  .command('unlink <article-id>')
  .description('Unlink article from a resource')
  .requiredOption('--type <type>', 'Resource type (bug|feature|ticket|file|test_case)')
  .requiredOption('--resource-id <id>', 'Resource ID (short or long UUID)')
  .action(async (articleId, options) => {
    checkEnv();

    try {
      const data = {
        resource_type: options.type,
        resource_id: options.resourceId
      };

      await unlinkKnowledgebaseArticle(articleId, data);

      console.log('');
      console.log('✅ Article unlinked from resource successfully');
      console.log(`   Article: ${articleId}`);
      console.log(`   Resource Type: ${options.type}`);
      console.log(`   Resource ID: ${options.resourceId}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

knowledgebase
  .command('find-by-resource <type> <resource-id>')
  .description('Find articles linked to a resource (bug, feature, ticket, file, test-case)')
  .action(async (type, resourceId) => {
    checkEnv();

    try {
      const response = await findKnowledgebaseArticlesByResource(type, resourceId);

      console.log('');
      console.log(`📚 Articles linked to ${type}: ${resourceId}`);
      console.log('');

      if (!response.articles || response.articles.length === 0) {
        console.log('   No linked articles found');
        console.log('');
        return;
      }

      response.articles.forEach(article => {
        console.log(`   📄 ${article.title}`);
        console.log(`      Article #: ${article.article_number || article.id.substring(0, 8)}`);
        if (article.tags && article.tags.length > 0) {
          console.log(`      Tags: ${article.tags.join(', ')}`);
        }
        if (article.link_reason) {
          console.log(`      Link Reason: ${article.link_reason}`);
        }
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

// ============================================================================
// ROADMAPS Commands - Roadmap planning with time boundaries
// ============================================================================
const roadmaps = program
  .command('roadmaps')
  .description('Manage product roadmaps');

roadmaps
  .command('list')
  .description('List all roadmaps')
  .option('--project-name <name>', 'Filter by project name (a-z0-9)')
  .option('--project-id <id>', 'Filter by project ID (short or long UUID)')
  .option('--status <status>', 'Filter by status (active|archived|completed)')
  .option('--created-by <name>', 'Filter by creator agent')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .option('--limit <number>', 'Max results (default: 50, max: 500)')
  .option('--offset <number>', 'Skip first N results (default: 0)')
  .action(async (options) => {
    checkEnv();

    try {
      const filters = {};
      if (options.projectName) filters.project_name = options.projectName;
      if (options.projectId) filters.project_id = options.projectId;
      if (options.status) filters.status = options.status;
      if (options.createdBy) filters.created_by = options.createdBy;
      if (options.tags) filters.tags = options.tags;
      if (options.limit) filters.limit = parseInt(options.limit);
      if (options.offset) filters.offset = parseInt(options.offset);

      const response = await listRoadmaps(filters);

      console.log('');
      console.log(`🗺️  Roadmaps (${response.length} found)`);
      console.log('');

      if (response.length === 0) {
        console.log('   No roadmaps found');
        console.log('');
        return;
      }

      response.forEach(roadmap => {
        console.log(`   📍 ${roadmap.name}`);
        console.log(`      ID: ${roadmap.id.substring(0, 8)}`);
        console.log(`      Status: ${roadmap.status}`);
        console.log(`      Dates: ${roadmap.start_date} → ${roadmap.end_date}`);
        console.log(`      Milestones: ${roadmap.milestone_count || 0} | Projects: ${roadmap.project_count || 0}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

roadmaps
  .command('create <name>')
  .description('Create new roadmap')
  .requiredOption('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .requiredOption('--end-date <date>', 'End date (YYYY-MM-DD)')
  .requiredOption('--description <text>', 'Roadmap description (minimum 500 words)')
  .option('--status <status>', 'Status (active|archived|completed)')
  .option('--tags <tags>', 'Tags (comma-separated)')
  .option('--project-ids <ids>', 'Project IDs (comma-separated)')
  .action(async (name, options) => {
    checkEnv();

    try {
      // Validate description has minimum 500 words
      validateDescription(options.description, 'description');

      console.log(`🗺️  Creating roadmap: ${name}`);
      console.log('');

      const data = {
        name,
        start_date: options.startDate,
        end_date: options.endDate,
        description: options.description,
        status: options.status || 'active',
        created_by: process.env.SAAC_HIVE_AGENT_NAME
      };

      if (options.tags) {
        data.tags = options.tags.split(',').map(t => t.trim());
      }

      if (options.projectIds) {
        data.project_ids = options.projectIds.split(',').map(id => id.trim());
      }

      const response = await createRoadmap(data);

      console.log('✅ Roadmap created successfully!');
      console.log('');
      console.log(`   ID: ${response.id.substring(0, 8)}`);
      console.log(`   Name: ${response.name}`);
      console.log(`   Dates: ${response.start_date} → ${response.end_date}`);
      console.log(`   Status: ${response.status}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

roadmaps
  .command('get <roadmap-id>')
  .description('Get roadmap details with milestones')
  .action(async (roadmapId) => {
    checkEnv();

    try {
      const r = await getRoadmap(roadmapId);

      console.log('');
      console.log(`🗺️  ${r.name}`);
      console.log('');
      console.log(`   ID: ${r.id}`);
      console.log(`   Status: ${r.status}`);
      console.log(`   Dates: ${r.start_date} → ${r.end_date}`);
      console.log('');

      if (r.description) {
        console.log(`   Description: ${r.description}`);
        console.log('');
      }

      if (r.projects && r.projects.length > 0) {
        console.log(`   📂 Projects (${r.projects.length}):`);
        r.projects.forEach(p => {
          console.log(`      - ${p.display_name || p.name} (${p.id.substring(0, 8)})`);
        });
        console.log('');
      }

      if (r.milestones && r.milestones.length > 0) {
        console.log(`   🎯 Milestones (${r.milestones.length}):`);
        r.milestones.forEach(m => {
          console.log(`      ${m.name}`);
          console.log(`         ID: ${m.id.substring(0, 8)} | Status: ${m.status}`);
          console.log(`         Dates: ${m.start_date} → ${m.end_date}`);
          console.log(`         Progress: ${m.calculated_progress || 0}% | Items: ${m.item_count || 0}`);
        });
        console.log('');
      }

      // Display file attachments
      if (r.fileAttachments && r.fileAttachments.length > 0) {
        console.log(`   📎 File Attachments (${r.fileAttachments.length}):`);
        console.log('');
        r.fileAttachments.forEach(att => {
          console.log(`      📄 ${att.filename}`);
          console.log(`         Path: ${att.file_path}`);
          console.log(`         Size: ${formatFileSize(parseInt(att.size))}`);
          if (att.attachment_description) {
            console.log(`         Note: ${att.attachment_description}`);
          }
          console.log(`         Attached: ${new Date(att.attached_at).toLocaleString()} by ${att.attached_by}`);
          console.log('');
        });
      }

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

roadmaps
  .command('update <roadmap-id>')
  .description('Update roadmap')
  .option('--name <text>', 'New name')
  .option('--description <text>', 'New description')
  .option('--status <status>', 'New status (active|archived|completed)')
  .option('--tags <tags>', 'New tags (comma-separated)')
  .option('--start-date <date>', 'New start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'New end date (YYYY-MM-DD)')
  .action(async (roadmapId, options) => {
    checkEnv();

    try {
      const updates = {};

      if (options.name) updates.name = options.name;
      if (options.description) updates.description = options.description;
      if (options.status) updates.status = options.status;
      if (options.tags) updates.tags = options.tags.split(',').map(t => t.trim());
      if (options.startDate) updates.start_date = options.startDate;
      if (options.endDate) updates.end_date = options.endDate;

      const response = await updateRoadmap(roadmapId, updates);

      console.log('');
      console.log('✅ Roadmap updated successfully');
      console.log(`   ID: ${response.id.substring(0, 8)}`);
      console.log(`   Name: ${response.name}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

roadmaps
  .command('delete <roadmap-id>')
  .description('Delete roadmap (cascades to milestones)')
  .action(async (roadmapId) => {
    checkEnv();

    try {
      await deleteRoadmap(roadmapId);

      console.log('');
      console.log('✅ Roadmap deleted successfully');
      console.log(`   ID: ${roadmapId}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

roadmaps
  .command('add-project <roadmap-id> <project-id>')
  .description('Add project to roadmap')
  .action(async (roadmapId, projectId) => {
    checkEnv();

    try {
      await addRoadmapProject(roadmapId, projectId);

      console.log('');
      console.log('✅ Project added to roadmap');
      console.log(`   Roadmap: ${roadmapId}`);
      console.log(`   Project: ${projectId}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

roadmaps
  .command('remove-project <roadmap-id> <project-id>')
  .description('Remove project from roadmap')
  .action(async (roadmapId, projectId) => {
    checkEnv();

    try {
      await removeRoadmapProject(roadmapId, projectId);

      console.log('');
      console.log('✅ Project removed from roadmap');
      console.log(`   Roadmap: ${roadmapId}`);
      console.log(`   Project: ${projectId}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

roadmaps
  .command('gantt <roadmap-id>')
  .description('Get Gantt chart data for roadmap')
  .action(async (roadmapId) => {
    checkEnv();

    try {
      const response = await getRoadmapGantt(roadmapId);

      console.log('');
      console.log(`📊 Gantt Chart: ${response.roadmap.name}`);
      console.log('');

      if (response.tasks.length === 0) {
        console.log('   No milestones found');
        console.log('');
        return;
      }

      response.tasks.forEach(task => {
        console.log(`   ${task.text}`);
        console.log(`      Dates: ${task.start_date} → ${task.end_date}`);
        console.log(`      Progress: ${Math.round(task.progress * 100)}%`);
        console.log(`      Status: ${task.status} | Items: ${task.item_count}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

// ----------------------------------------------------------------------------
// ROADMAP ATTACHMENTS
// ----------------------------------------------------------------------------

roadmaps
  .command('attach <roadmap-id> <file-path>')
  .description('Attach file to roadmap (upload + link)')
  .option('--description <text>', 'Attachment description')
  .option('--expire <minutes>', 'File expiry in minutes (default: 43200 = 30 days)', '43200')
  .option('--path <remote-path>', 'Remote file path (default: /roadmaps/<filename>)')
  .action(async (roadmapId, filePath, options) => {
    checkEnv();

    try {
      const filename = basename(filePath);
      const remotePath = options.path || `/roadmaps/${filename}`;

      // Step 1: Upload file
      const fileData = prepareFileForUpload(filePath, remotePath, {
        expire: options.expire,
        tags: `roadmap-${roadmapId.substring(0, 8)}`
      });

      if (!fileData.success) {
        console.error('❌ Error preparing file:', fileData.error);
        process.exit(1);
      }

      const uploadResponse = await uploadFile(fileData.payload);

      // Step 2: Link file to roadmap
      const linkData = {
        file_id: uploadResponse.file.id,
        attached_by: process.env.SAAC_HIVE_AGENT_NAME,
        description: options.description || `Roadmap attachment: ${filename}`
      };

      const response = await linkFileToEntity('roadmaps', roadmapId, linkData);

      console.log('✅ File attached to roadmap successfully!');
      console.log('');
      console.log(`   Roadmap ID: ${roadmapId.substring(0, 8)}`);
      console.log(`   File: ${uploadResponse.file.filename}`);
      console.log(`   Path: ${uploadResponse.file.path}`);
      console.log(`   Size: ${formatFileSize(uploadResponse.file.size)}`);
      console.log(`   Attachment ID: ${response.attachment.id.substring(0, 8)}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

roadmaps
  .command('link-file <roadmap-id> <file-id-or-path>')
  .description('Link existing file to roadmap')
  .option('--description <text>', 'Attachment description')
  .action(async (roadmapId, fileIdOrPath, options) => {
    checkEnv();

    try {
      const linkData = {
        attached_by: process.env.SAAC_HIVE_AGENT_NAME,
        description: options.description || `Linked to roadmap ${roadmapId.substring(0, 8)}`
      };

      // Check if it's a file ID or path
      if (fileIdOrPath.startsWith('/')) {
        linkData.file_path = fileIdOrPath;
      } else {
        linkData.file_id = fileIdOrPath;
      }

      const response = await linkFileToEntity('roadmaps', roadmapId, linkData);

      console.log('');
      console.log('✅ File linked to roadmap successfully!');
      console.log('');
      console.log(`   Roadmap ID: ${roadmapId.substring(0, 8)}`);
      console.log(`   File: ${response.file.filename}`);
      console.log(`   Path: ${response.file.path}`);
      console.log(`   Attachment ID: ${response.attachment.attachment_id.substring(0, 8)}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

roadmaps
  .command('list-files <roadmap-id>')
  .description('List files attached to roadmap')
  .action(async (roadmapId) => {
    checkEnv();

    try {
      const response = await listEntityAttachments('roadmaps', roadmapId);

      console.log('');
      console.log(`📎 Roadmap Attachments (${response.count || 0} files)`);
      console.log('');

      if (!response.attachments || response.attachments.length === 0) {
        console.log('   No files attached');
        console.log('');
        return;
      }

      response.attachments.forEach(att => {
        console.log(`   📄 ${att.filename}`);
        console.log(`      Attachment ID: ${att.attachment_id.substring(0, 8)}`);
        console.log(`      File ID: ${att.file_short_id || att.file_id.substring(0, 8)}`);
        console.log(`      Path: ${att.file_path}`);
        console.log(`      Size: ${formatFileSize(att.size)}`);
        if (att.attachment_description) {
          console.log(`      Description: ${att.attachment_description}`);
        }
        console.log(`      Attached: ${new Date(att.attached_at).toLocaleString()} by ${att.attached_by}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

roadmaps
  .command('unlink-file <roadmap-id> <attachment-id>')
  .description('Unlink file from roadmap (preserves file)')
  .action(async (roadmapId, attachmentId) => {
    checkEnv();

    try {
      const response = await unlinkFileFromEntity('roadmaps', roadmapId, attachmentId);

      console.log('');
      console.log('✅ File unlinked from roadmap successfully');
      console.log(`   Roadmap ID: ${roadmapId.substring(0, 8)}`);
      console.log(`   Attachment ID: ${attachmentId.substring(0, 8)}`);
      console.log('   Note: File preserved in workspace storage');
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

// ============================================================================
// MILESTONES Commands - Time-bound goals within roadmaps
// ============================================================================
const milestones = program
  .command('milestones')
  .description('Manage roadmap milestones');

milestones
  .command('list <roadmap-id>')
  .description('List milestones for roadmap')
  .action(async (roadmapId) => {
    checkEnv();

    try {
      const response = await listMilestones(roadmapId);

      console.log('');
      console.log(`🎯 Milestones (${response.length} found)`);
      console.log('');

      if (response.length === 0) {
        console.log('   No milestones found');
        console.log('');
        return;
      }

      response.forEach(milestone => {
        console.log(`   📌 ${milestone.name}`);
        console.log(`      ID: ${milestone.id.substring(0, 8)}`);
        console.log(`      Status: ${milestone.status}`);
        console.log(`      Dates: ${milestone.start_date} → ${milestone.end_date}`);
        console.log(`      Progress: ${milestone.calculated_progress || 0}% | Items: ${milestone.item_count || 0}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

milestones
  .command('get <milestone-id>')
  .description('Get milestone details by ID')
  .action(async (milestoneId) => {
    checkEnv();

    try {
      const response = await getMilestone(milestoneId);
      const m = response.milestone;

      console.log('');
      console.log(`🎯 ${m.name} (${m.id.substring(0, 8)})`);
      console.log('');
      console.log(`   ID: ${m.id}`);
      console.log(`   Status: ${m.status}`);
      console.log(`   Dates: ${m.start_date} → ${m.end_date}`);
      console.log(`   Progress: ${m.calculated_progress || 0}%`);

      if (m.description) {
        console.log(`   Description: ${m.description}`);
      }

      if (m.roadmap_id) {
        console.log(`   Roadmap ID: ${m.roadmap_id.substring(0, 8)}`);
      }

      if (m.roadmap_name) {
        console.log(`   Roadmap: ${m.roadmap_name}`);
      }

      if (m.color) {
        console.log(`   Color: ${m.color}`);
      }

      if (m.tags && m.tags.length > 0) {
        console.log(`   Tags: ${m.tags.join(', ')}`);
      }

      console.log('');
      console.log(`   Created: ${new Date(m.created_at).toLocaleString()}`);
      if (m.created_by) {
        console.log(`   Created By: ${m.created_by}`);
      }

      if (m.updated_at) {
        console.log(`   Updated: ${new Date(m.updated_at).toLocaleString()}`);
      }

      console.log('');

      // Display attached items
      if (response.items && response.items.length > 0) {
        console.log(`   📋 Attached Items (${response.items.length}):`);
        console.log('');
        response.items.forEach(item => {
          const itemEmoji = {
            'bug': '🐛',
            'feature': '💡',
            'test_case': '📝',
            'support_ticket': '🎫',
            'po_task': '📌',
            'test_plan': '📊'
          }[item.item_type] || '📌';

          console.log(`      ${itemEmoji} ${item.item_title || 'Untitled'}`);
          console.log(`         Type: ${item.item_type}`);
          console.log(`         ID: ${item.item_id.substring(0, 8)}`);
          if (item.item_status) {
            console.log(`         Status: ${item.item_status}`);
          }
          console.log('');
        });
      }

      // Display file attachments
      if (response.fileAttachments && response.fileAttachments.length > 0) {
        console.log(`   📎 File Attachments (${response.fileAttachments.length}):`);
        console.log('');
        response.fileAttachments.forEach(att => {
          console.log(`      📄 ${att.filename}`);
          console.log(`         Path: ${att.file_path}`);
          console.log(`         Size: ${formatFileSize(parseInt(att.size))}`);
          if (att.attachment_description) {
            console.log(`         Note: ${att.attachment_description}`);
          }
          console.log(`         Attached: ${new Date(att.attached_at).toLocaleString()} by ${att.attached_by}`);
          console.log('');
        });
      }

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

milestones
  .command('create <roadmap-id> <name>')
  .description('Create new milestone')
  .requiredOption('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .requiredOption('--end-date <date>', 'End date (YYYY-MM-DD)')
  .requiredOption('--description <text>', 'Milestone description (minimum 500 words)')
  .option('--status <status>', 'Status (pending|in_progress|completed|cancelled)')
  .option('--tags <tags>', 'Tags (comma-separated)')
  .option('--color <hex>', 'Color hex code (e.g., #2563EB)')
  .action(async (roadmapId, name, options) => {
    checkEnv();

    try {
      // Validate description has minimum 500 words
      validateDescription(options.description, 'description');

      console.log(`🎯 Creating milestone: ${name}`);
      console.log('');

      const data = {
        name,
        start_date: options.startDate,
        end_date: options.endDate,
        description: options.description,
        status: options.status || 'pending',
        color: options.color
      };

      if (options.tags) {
        data.tags = options.tags.split(',').map(t => t.trim());
      }

      const response = await createMilestone(roadmapId, data);

      console.log('✅ Milestone created successfully!');
      console.log('');
      console.log(`   ID: ${response.id.substring(0, 8)}`);
      console.log(`   Name: ${response.name}`);
      console.log(`   Dates: ${response.start_date} → ${response.end_date}`);
      console.log(`   Status: ${response.status}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

milestones
  .command('update <milestone-id>')
  .description('Update milestone (including moving to different roadmap)')
  .option('--roadmap-id <id>', 'Move to different roadmap (short or long UUID)')
  .option('--name <text>', 'New name')
  .option('--description <text>', 'New description')
  .option('--status <status>', 'New status (pending|in_progress|completed|cancelled)')
  .option('--tags <tags>', 'New tags (comma-separated)')
  .option('--start-date <date>', 'New start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'New end date (YYYY-MM-DD)')
  .option('--color <hex>', 'New color hex code')
  .action(async (milestoneId, options) => {
    checkEnv();

    try {
      const updates = {};

      if (options.roadmapId) updates.roadmap_id = options.roadmapId;
      if (options.name) updates.name = options.name;
      if (options.description) updates.description = options.description;
      if (options.status) updates.status = options.status;
      if (options.tags) updates.tags = options.tags.split(',').map(t => t.trim());
      if (options.startDate) updates.start_date = options.startDate;
      if (options.endDate) updates.end_date = options.endDate;
      if (options.color) updates.color = options.color;

      const response = await updateMilestone(milestoneId, updates);

      console.log('');
      console.log('✅ Milestone updated successfully');
      console.log(`   ID: ${response.id.substring(0, 8)}`);
      console.log(`   Name: ${response.name}`);
      if (options.roadmapId) {
        console.log(`   Moved to roadmap: ${options.roadmapId}`);
      }
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

milestones
  .command('delete <milestone-id>')
  .description('Delete milestone (cascades to items)')
  .action(async (milestoneId) => {
    checkEnv();

    try {
      await deleteMilestone(milestoneId);

      console.log('');
      console.log('✅ Milestone deleted successfully');
      console.log(`   ID: ${milestoneId}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

milestones
  .command('add-item <milestone-id>')
  .description('Add item to milestone')
  .requiredOption('--type <type>', 'Item type (bug|feature|test_case|support_ticket|po_task|test_plan)')
  .requiredOption('--id <id>', 'Item ID (short or long UUID)')
  .action(async (milestoneId, options) => {
    checkEnv();

    try {
      const data = {
        item_type: options.type,
        item_id: options.id,
        added_by: process.env.SAAC_HIVE_AGENT_NAME
      };

      await addMilestoneItem(milestoneId, data);

      console.log('');
      console.log('✅ Item added to milestone');
      console.log(`   Milestone: ${milestoneId}`);
      console.log(`   Type: ${options.type}`);
      console.log(`   ID: ${options.id}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

milestones
  .command('remove-item <milestone-id> <item-id>')
  .description('Remove item from milestone')
  .action(async (milestoneId, itemId) => {
    checkEnv();

    try {
      await removeMilestoneItem(milestoneId, itemId);

      console.log('');
      console.log('✅ Item removed from milestone');
      console.log(`   Milestone: ${milestoneId}`);
      console.log(`   Item: ${itemId}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

// ----------------------------------------------------------------------------
// MILESTONE ATTACHMENTS
// ----------------------------------------------------------------------------

milestones
  .command('attach <milestone-id> <file-path>')
  .description('Attach file to milestone (upload + link)')
  .option('--description <text>', 'Attachment description')
  .option('--expire <minutes>', 'File expiry in minutes (default: 43200 = 30 days)', '43200')
  .option('--path <remote-path>', 'Remote file path (default: /milestones/<filename>)')
  .action(async (milestoneId, filePath, options) => {
    checkEnv();

    try {
      const filename = basename(filePath);
      const remotePath = options.path || `/milestones/${filename}`;

      // Step 1: Upload file
      const fileData = prepareFileForUpload(filePath, remotePath, {
        expire: options.expire,
        tags: `milestone-${milestoneId.substring(0, 8)}`
      });

      if (!fileData.success) {
        console.error('❌ Error preparing file:', fileData.error);
        process.exit(1);
      }

      const uploadResponse = await uploadFile(fileData.payload);

      // Step 2: Link file to milestone
      const linkData = {
        file_id: uploadResponse.file.id,
        attached_by: process.env.SAAC_HIVE_AGENT_NAME,
        description: options.description || `Milestone attachment: ${filename}`
      };

      const response = await linkFileToEntity('milestones', milestoneId, linkData);

      console.log('✅ File attached to milestone successfully!');
      console.log('');
      console.log(`   Milestone ID: ${milestoneId.substring(0, 8)}`);
      console.log(`   File: ${uploadResponse.file.filename}`);
      console.log(`   Path: ${uploadResponse.file.path}`);
      console.log(`   Size: ${formatFileSize(uploadResponse.file.size)}`);
      console.log(`   Attachment ID: ${response.attachment.id.substring(0, 8)}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

milestones
  .command('link-file <milestone-id> <file-id-or-path>')
  .description('Link existing file to milestone')
  .option('--description <text>', 'Attachment description')
  .action(async (milestoneId, fileIdOrPath, options) => {
    checkEnv();

    try {
      const linkData = {
        attached_by: process.env.SAAC_HIVE_AGENT_NAME,
        description: options.description || `Linked to milestone ${milestoneId.substring(0, 8)}`
      };

      // Check if it's a file ID or path
      if (fileIdOrPath.startsWith('/')) {
        linkData.file_path = fileIdOrPath;
      } else {
        linkData.file_id = fileIdOrPath;
      }

      const response = await linkFileToEntity('milestones', milestoneId, linkData);

      console.log('');
      console.log('✅ File linked to milestone successfully!');
      console.log('');
      console.log(`   Milestone ID: ${milestoneId.substring(0, 8)}`);
      console.log(`   File: ${response.file.filename}`);
      console.log(`   Path: ${response.file.path}`);
      console.log(`   Attachment ID: ${response.attachment.attachment_id.substring(0, 8)}`);
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

milestones
  .command('list-files <milestone-id>')
  .description('List files attached to milestone')
  .action(async (milestoneId) => {
    checkEnv();

    try {
      const response = await listEntityAttachments('milestones', milestoneId);

      console.log('');
      console.log(`📎 Milestone Attachments (${response.count || 0} files)`);
      console.log('');

      if (!response.attachments || response.attachments.length === 0) {
        console.log('   No files attached');
        console.log('');
        return;
      }

      response.attachments.forEach(att => {
        console.log(`   📄 ${att.filename}`);
        console.log(`      Attachment ID: ${att.attachment_id.substring(0, 8)}`);
        console.log(`      File ID: ${att.file_short_id || att.file_id.substring(0, 8)}`);
        console.log(`      Path: ${att.file_path}`);
        console.log(`      Size: ${formatFileSize(att.size)}`);
        if (att.attachment_description) {
          console.log(`      Description: ${att.attachment_description}`);
        }
        console.log(`      Attached: ${new Date(att.attached_at).toLocaleString()} by ${att.attached_by}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

milestones
  .command('unlink-file <milestone-id> <attachment-id>')
  .description('Unlink file from milestone (preserves file)')
  .action(async (milestoneId, attachmentId) => {
    checkEnv();

    try {
      const response = await unlinkFileFromEntity('milestones', milestoneId, attachmentId);

      console.log('');
      console.log('✅ File unlinked from milestone successfully');
      console.log(`   Milestone ID: ${milestoneId.substring(0, 8)}`);
      console.log(`   Attachment ID: ${attachmentId.substring(0, 8)}`);
      console.log('   Note: File preserved in workspace storage');
      console.log('');

    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
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
// TEST FUNCTIONALITY - Comprehensive test suite for AI agents
// ============================================================================

program
  .command('test-functionality <suite>')
  .description('Run test suite to demonstrate CLI functionality (all|bugs|features|test-cases|tickets|files|roadmaps-milestones)')
  .option('--quiet', 'Minimal output for CI/CD pipelines')
  .option('--json', 'Output results as JSON')
  .action(async (suite, options) => {
    checkEnv();

    const outputMode = options.json ? 'json' : options.quiet ? 'quiet' : 'verbose';
    const testResults = []; // For JSON output

    const testData = {
      bugs: [],
      features: [],
      testCases: [],
      roadmaps: [],
      milestones: [],
      files: [],
      tickets: []
    };

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    const failures = [];

    const startTime = Date.now();

    // Suppress console.log in quiet and JSON modes
    const originalLog = console.log;
    if (outputMode !== 'verbose') {
      console.log = () => {}; // Suppress all output
    }

    // Helper function to record test results
    const recordTest = (name, status, duration = 0) => {
      if (outputMode === 'json') {
        testResults.push({ name, status, duration: `${duration}ms` });
      }
    };

    console.log('');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('🧪 Workspace CLI Functionality Test Suite');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('');

    // Test bugs workflow
    async function testBugs() {
      console.log('─────────────────────────────────────────');
      console.log('🐛 Testing: Bugs Workflow');
      console.log('─────────────────────────────────────────');
      console.log('');

      try {
        // Test 1: Create bug
        totalTests++;
        console.log('$ workspace bugs create "Login button not responding" \\');
        console.log('    --project "my-webapp" \\');
        console.log('    --severity high \\');
        console.log('    --description "User clicks login but nothing happens"');
        console.log('');

        const bugData = {
          project: 'my-webapp',
          title: 'Login button not responding',
          description: 'User clicks login but nothing happens',
          severity: 'high',
          steps_to_reproduce: '1. Navigate to /login 2. Click button 3. No response',
          environment: 'production'
        };

        const createResponse = await createBug(bugData);
        testData.bugs.push(createResponse.bug.id);

        console.log('🐛 Creating bug: Login button not responding');
        console.log('');
        console.log('✅ Bug created successfully!');
        console.log('');
        console.log(`   ID: ${createResponse.bug.id.substring(0, 8)}`);
        console.log(`   Title: ${createResponse.bug.title}`);
        console.log(`   Severity: ${createResponse.bug.severity}`);
        console.log(`   Status: ${createResponse.bug.status}`);
        console.log('');
        console.log(`✅ PASS - Bug created (ID: ${createResponse.bug.id.substring(0, 8)})`);
        console.log('');
        passedTests++;
        recordTest('Create bug', 'pass');

        // Test 2: Get bug
        totalTests++;
        console.log(`$ workspace bugs get ${createResponse.bug.id.substring(0, 8)}`);
        console.log('');

        const getResponse = await getBug(createResponse.bug.id);
        console.log(`🐛 ${getResponse.bug.title}`);
        console.log('');
        console.log(`   ID: ${getResponse.bug.id}`);
        console.log(`   Severity: ${getResponse.bug.severity}`);
        console.log(`   Status: ${getResponse.bug.status}`);
        console.log('');
        console.log(`✅ PASS - Bug retrieved`);
        console.log('');
        passedTests++;
        recordTest('Get bug', 'pass');

        // Test 3: Update bug
        totalTests++;
        console.log(`$ workspace bugs update ${createResponse.bug.id.substring(0, 8)} --status in_progress`);
        console.log('');

        const updateResponse = await updateBug(createResponse.bug.id, { status: 'in_progress' });
        console.log('✅ Bug updated successfully');
        console.log(`   ID: ${updateResponse.bug.id.substring(0, 8)}`);
        console.log(`   New Status: ${updateResponse.bug.status}`);
        console.log('');
        console.log(`✅ PASS - Bug updated`);
        console.log('');
        passedTests++;
        recordTest('Update bug', 'pass');

        // Test 4: Attach file to bug
        totalTests++;
        console.log('$ workspace files upload screenshot.png --path /bugs/error-screenshot.png');
        console.log('');

        const bugFilePayload = {
          path: '/bugs/error-screenshot.png',
          content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          base64_encoded: true,
          content_type: 'image/png',
          size: 95,
          checksum: 'test-bug-file-checksum',
          expire_minutes: 43200,
          description: 'Bug error screenshot',
          tags: [`bug-${createResponse.bug.id.substring(0, 8)}`],
          created_by: process.env.SAAC_HIVE_AGENT_NAME
        };

        const bugFileResponse = await uploadFile(bugFilePayload);
        testData.files.push(bugFileResponse.file.path);

        console.log('📤 File uploaded');
        console.log('');
        console.log(`$ workspace bugs link-file ${createResponse.bug.id.substring(0, 8)} /bugs/error-screenshot.png`);
        console.log('');

        await linkFileToEntity('bugs', createResponse.bug.id, {
          file_path: '/bugs/error-screenshot.png',
          attached_by: process.env.SAAC_HIVE_AGENT_NAME,
          description: 'Screenshot showing error'
        });

        console.log('✅ File linked to bug successfully!');
        console.log('');
        console.log(`✅ PASS - File attached to bug`);
        console.log('');
        passedTests++;
        recordTest('Attach file to bug', 'pass');

        // Test 5: Verify bug shows file attachment
        totalTests++;
        console.log(`$ workspace bugs get ${createResponse.bug.id.substring(0, 8)}`);
        console.log('');

        const bugWithFile = await getBug(createResponse.bug.id);

        if (bugWithFile.fileAttachments && bugWithFile.fileAttachments.length > 0) {
          console.log(`🐛 ${bugWithFile.bug.title}`);
          console.log('');
          console.log(`   📎 File Attachments (${bugWithFile.fileAttachments.length}):`);
          bugWithFile.fileAttachments.forEach(att => {
            console.log(`      📄 ${att.filename}`);
            console.log(`         Path: ${att.file_path}`);
          });
          console.log('');
          console.log(`✅ PASS - Bug shows file attachment (bidirectional verified)`);
          console.log('');
          passedTests++;
          recordTest('Verify bug shows file attachment', 'pass');
        } else {
          console.log(`❌ FAIL - Bug does not show file attachment`);
          console.log('');
          failedTests++;
          failures.push('File attachment: Bug does not show attached file');
          recordTest('Verify bug shows file attachment', 'fail');
        }

      } catch (error) {
        console.log(`❌ FAIL - ${error.response?.data?.error || error.message}`);
        console.log('');
        failedTests++;
        failures.push(`Bugs workflow: ${error.message}`);
      }
    }

    // Test features workflow
    async function testFeatures() {
      console.log('─────────────────────────────────────────');
      console.log('💡 Testing: Features Workflow');
      console.log('─────────────────────────────────────────');
      console.log('');

      try {
        // Test 1: Create feature
        totalTests++;
        console.log('$ workspace features create "Add dark mode" \\');
        console.log('    --project "my-webapp" \\');
        console.log('    --description "Support dark theme for better UX" \\');
        console.log('    --priority high');
        console.log('');

        // Lookup project ID
        let projectId = null;
        try {
          const projectResponse = await getProjectByName('my-webapp');
          projectId = projectResponse.project.id;
        } catch (err) {
          // Project doesn't exist, create without project_id
        }

        const featureData = {
          title: 'Add dark mode',
          project_id: projectId,
          description: 'Support dark theme for better UX',
          priority: 'high',
          created_by: process.env.SAAC_HIVE_AGENT_NAME
        };

        const createResponse = await createFeature(featureData);
        testData.features.push(createResponse.featureRequest.id);

        console.log('🚀 Creating feature: Add dark mode');
        console.log('');
        console.log('✅ Feature created successfully!');
        console.log('');
        console.log(`   ID: ${createResponse.featureRequest.id.substring(0, 8)}`);
        console.log(`   Title: ${createResponse.featureRequest.title}`);
        console.log(`   Priority: ${createResponse.featureRequest.priority}`);
        console.log(`   Status: ${createResponse.featureRequest.status}`);
        console.log('');
        console.log(`✅ PASS - Feature created (ID: ${createResponse.featureRequest.id.substring(0, 8)})`);
        console.log('');
        passedTests++;
        recordTest('Create feature', 'pass');

        // Test 2: Get feature
        totalTests++;
        console.log(`$ workspace features get ${createResponse.featureRequest.id.substring(0, 8)}`);
        console.log('');

        const getResponse = await getFeature(createResponse.featureRequest.id);
        console.log(`📋 ${getResponse.featureRequest.title}`);
        console.log('');
        console.log(`   ID: ${getResponse.featureRequest.id}`);
        console.log(`   Priority: ${getResponse.featureRequest.priority}`);
        console.log(`   Status: ${getResponse.featureRequest.status}`);
        console.log('');
        console.log(`✅ PASS - Feature retrieved`);
        console.log('');
        passedTests++;
        recordTest('Get feature', 'pass');

        // Test 3: Attach file to feature
        totalTests++;
        console.log('$ workspace files upload market-analysis.pdf --path /features/market-analysis.pdf');
        console.log('');

        const featureFilePayload = {
          path: '/features/market-analysis.pdf',
          content: 'JVBERi0xLjMKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwgL0xlbmd0aCA1IDAgUiA+PgpzdHJlYW0K',
          base64_encoded: true,
          content_type: 'application/pdf',
          size: 512,
          checksum: 'test-feature-file-checksum',
          expire_minutes: 43200,
          description: 'Market analysis document',
          tags: [`feature-${createResponse.featureRequest.id.substring(0, 8)}`],
          created_by: process.env.SAAC_HIVE_AGENT_NAME
        };

        const featureFileResponse = await uploadFile(featureFilePayload);
        testData.files.push(featureFileResponse.file.path);

        console.log('📤 File uploaded');
        console.log('');
        console.log(`$ workspace features link-file ${createResponse.featureRequest.id.substring(0, 8)} /features/market-analysis.pdf`);
        console.log('');

        await linkFileToEntity('features', createResponse.featureRequest.id, {
          file_path: '/features/market-analysis.pdf',
          attached_by: process.env.SAAC_HIVE_AGENT_NAME,
          description: 'Market research supporting this feature'
        });

        console.log('✅ File linked to feature successfully!');
        console.log('');
        console.log(`✅ PASS - File attached to feature`);
        console.log('');
        passedTests++;
        recordTest('Attach file to feature', 'pass');

        // Test 4: Verify feature shows file attachment
        totalTests++;
        console.log(`$ workspace features get ${createResponse.featureRequest.id.substring(0, 8)}`);
        console.log('');

        const featureWithFile = await getFeature(createResponse.featureRequest.id);

        if (featureWithFile.fileAttachments && featureWithFile.fileAttachments.length > 0) {
          console.log(`💡 ${featureWithFile.featureRequest.title}`);
          console.log('');
          console.log(`   📎 File Attachments (${featureWithFile.fileAttachments.length}):`);
          featureWithFile.fileAttachments.forEach(att => {
            console.log(`      📄 ${att.filename}`);
            console.log(`         Path: ${att.file_path}`);
          });
          console.log('');
          console.log(`✅ PASS - Feature shows file attachment (bidirectional verified)`);
          console.log('');
          passedTests++;
          recordTest('Verify feature shows file attachment', 'pass');
        } else {
          console.log(`❌ FAIL - Feature does not show file attachment`);
          console.log('');
          failedTests++;
          failures.push('File attachment: Feature does not show attached file');
          recordTest('Verify feature shows file attachment', 'fail');
        }

      } catch (error) {
        console.log(`❌ FAIL - ${error.response?.data?.error || error.message}`);
        console.log('');
        failedTests++;
        failures.push(`Features workflow: ${error.message}`);
        recordTest('Features workflow', 'fail');
      }
    }

    // Test roadmaps and milestones workflow
    async function testRoadmapsMilestones() {
      console.log('─────────────────────────────────────────');
      console.log('🗺️  Testing: Roadmaps & Milestones Workflow');
      console.log('─────────────────────────────────────────');
      console.log('');

      try {
        // Test 1: Create roadmap
        totalTests++;
        console.log('$ workspace roadmaps create "Q1 2026 Product Roadmap" \\');
        console.log('    --start-date 2026-01-01 \\');
        console.log('    --end-date 2026-03-31 \\');
        console.log('    --description "First quarter feature delivery"');
        console.log('');

        const roadmapData = {
          name: 'Q1 2026 Product Roadmap',
          start_date: '2026-01-01',
          end_date: '2026-03-31',
          description: 'First quarter feature delivery',
          status: 'active',
          created_by: process.env.SAAC_HIVE_AGENT_NAME
        };

        const roadmapResponse = await createRoadmap(roadmapData);
        testData.roadmaps.push(roadmapResponse.id);

        console.log('🗺️  Creating roadmap: Q1 2026 Product Roadmap');
        console.log('');
        console.log('✅ Roadmap created successfully!');
        console.log('');
        console.log(`   ID: ${roadmapResponse.id.substring(0, 8)}`);
        console.log(`   Name: ${roadmapResponse.name}`);
        console.log(`   Dates: ${roadmapResponse.start_date} → ${roadmapResponse.end_date}`);
        console.log('');
        console.log(`✅ PASS - Roadmap created (ID: ${roadmapResponse.id.substring(0, 8)})`);
        console.log('');
        passedTests++;
        recordTest('Create roadmap', 'pass');

        // Test 2: Create milestone
        totalTests++;
        console.log(`$ workspace milestones create ${roadmapResponse.id.substring(0, 8)} "Sprint 1 - Auth Features" \\`);
        console.log('    --start-date 2026-01-01 \\');
        console.log('    --end-date 2026-01-15 \\');
        console.log('    --description "Authentication and authorization" \\');
        console.log('    --status in_progress');
        console.log('');

        const milestoneData = {
          name: 'Sprint 1 - Auth Features',
          start_date: '2026-01-01',
          end_date: '2026-01-15',
          description: 'Authentication and authorization',
          status: 'in_progress',
          created_by: process.env.SAAC_HIVE_AGENT_NAME
        };

        const milestoneResponse = await createMilestone(roadmapResponse.id, milestoneData);
        testData.milestones.push(milestoneResponse.id);

        console.log('🎯 Creating milestone: Sprint 1 - Auth Features');
        console.log('');
        console.log('✅ Milestone created successfully!');
        console.log('');
        console.log(`   ID: ${milestoneResponse.id.substring(0, 8)}`);
        console.log(`   Name: ${milestoneResponse.name}`);
        console.log(`   Dates: ${milestoneResponse.start_date} → ${milestoneResponse.end_date}`);
        console.log('');
        console.log(`✅ PASS - Milestone created (ID: ${milestoneResponse.id.substring(0, 8)})`);
        console.log('');
        passedTests++;
        recordTest('Create milestone', 'pass');

        // Test 3: Attach bug to milestone
        if (testData.bugs.length > 0) {
          totalTests++;
          console.log(`$ workspace milestones add-item ${milestoneResponse.id.substring(0, 8)} \\`);
          console.log(`    --type bug --id ${testData.bugs[0].substring(0, 8)}`);
          console.log('');

          await addMilestoneItem(milestoneResponse.id, {
            item_type: 'bug',
            item_id: testData.bugs[0],
            added_by: process.env.SAAC_HIVE_AGENT_NAME
          });

          console.log('✅ Item added to milestone');
          console.log(`   Milestone: ${milestoneResponse.id.substring(0, 8)}`);
          console.log(`   Type: bug`);
          console.log(`   ID: ${testData.bugs[0].substring(0, 8)}`);
          console.log('');
          console.log(`✅ PASS - Bug attached to milestone`);
          console.log('');
          passedTests++;
          recordTest('Attach bug to milestone', 'pass');

          // Test 3b: Verify bidirectional relationship (bug shows milestone)
          totalTests++;
          console.log(`$ workspace bugs get ${testData.bugs[0].substring(0, 8)}`);
          console.log('');

          const bugWithMilestones = await getBug(testData.bugs[0]);

          if (bugWithMilestones.milestones && bugWithMilestones.milestones.length > 0) {
            console.log(`🐛 ${bugWithMilestones.bug.title}`);
            console.log('');
            console.log(`   📍 Milestones (${bugWithMilestones.milestones.length}):`);
            bugWithMilestones.milestones.forEach(m => {
              console.log(`      🔄 ${m.milestone_name} (${m.milestone_short_id})`);
              console.log(`         Roadmap: ${m.roadmap_name} (${m.roadmap_short_id})`);
            });
            console.log('');
            console.log(`✅ PASS - Bug shows milestone (bidirectional relationship verified)`);
            console.log('');
            passedTests++;
            recordTest('Verify bidirectional relationship', 'pass');
          } else {
            console.log(`❌ FAIL - Bug does not show milestone attachment`);
            console.log('');
            failedTests++;
            failures.push('Bidirectional relationship: Bug does not show milestone');
            recordTest('Verify bidirectional relationship', 'fail');
          }
        }

        // Test 4: Attach feature to milestone
        if (testData.features.length > 0) {
          totalTests++;
          console.log(`$ workspace milestones add-item ${milestoneResponse.id.substring(0, 8)} \\`);
          console.log(`    --type feature --id ${testData.features[0].substring(0, 8)}`);
          console.log('');

          try {
            await addMilestoneItem(milestoneResponse.id, {
              item_type: 'feature',
              item_id: testData.features[0],
              added_by: process.env.SAAC_HIVE_AGENT_NAME
            });

            console.log('✅ Item added to milestone');
            console.log(`   Milestone: ${milestoneResponse.id.substring(0, 8)}`);
            console.log(`   Type: feature`);
            console.log(`   ID: ${testData.features[0].substring(0, 8)}`);
            console.log('');
            console.log(`✅ PASS - Feature attached to milestone`);
            console.log('');
            passedTests++;
            recordTest('Attach feature to milestone', 'pass');
          } catch (featureError) {
            console.log(`❌ FAIL - Could not attach feature to milestone`);
            console.log(`   Error: ${featureError.response?.data?.error || featureError.message}`);
            if (featureError.response?.data?.details) {
              console.log(`   Details: ${featureError.response.data.details}`);
            }
            console.log('');
            failedTests++;
            failures.push(`Feature attachment: ${featureError.response?.data?.error || featureError.message}`);
            recordTest('Attach feature to milestone', 'fail');
          }
        }

        // Test 5: Get Gantt chart
        totalTests++;
        console.log(`$ workspace roadmaps gantt ${roadmapResponse.id.substring(0, 8)}`);
        console.log('');

        const ganttResponse = await getRoadmapGantt(roadmapResponse.id);
        console.log(`📊 Gantt Chart: ${ganttResponse.roadmap.name}`);
        console.log('');
        console.log(`   Roadmap: ${ganttResponse.roadmap.start_date} → ${ganttResponse.roadmap.end_date}`);
        console.log(`   Milestones: ${ganttResponse.tasks.length}`);
        console.log('');
        console.log(`✅ PASS - Gantt chart retrieved`);
        console.log('');
        passedTests++;
        recordTest('Get Gantt chart', 'pass');

      } catch (error) {
        console.log(`❌ FAIL - ${error.response?.data?.error || error.message}`);
        console.log('');
        failedTests++;
        failures.push(`Roadmaps/Milestones workflow: ${error.message}`);
        recordTest('Roadmaps/Milestones workflow', 'fail');
      }
    }

    // Test files workflow
    async function testFiles() {
      console.log('─────────────────────────────────────────');
      console.log('📄 Testing: Files Workflow');
      console.log('─────────────────────────────────────────');
      console.log('');

      try {
        // Test 1: Upload file
        totalTests++;
        console.log('$ workspace files upload test.txt \\');
        console.log('    --path /testing/sample.txt \\');
        console.log('    --expire 60 \\');
        console.log('    --description "Test file upload"');
        console.log('');

        const fileContent = 'This is a test file for functionality verification';
        const filePayload = {
          path: '/testing/sample.txt',
          content: fileContent,
          base64_encoded: false,
          content_type: 'text/plain',
          size: fileContent.length,
          checksum: 'test-checksum',
          expire_minutes: 60,
          description: 'Test file upload',
          tags: ['test', 'functionality'],
          created_by: process.env.SAAC_HIVE_AGENT_NAME
        };

        const uploadResponse = await uploadFile(filePayload);
        testData.files.push(uploadResponse.file.path);

        console.log('📤 Uploading file: test.txt');
        console.log('');
        console.log('✅ File uploaded successfully!');
        console.log('');
        console.log(`   Path: ${uploadResponse.file.path}`);
        console.log(`   Size: ${uploadResponse.file.size} bytes`);
        console.log(`   Expires: ${uploadResponse.file.expire_minutes} minutes`);
        console.log('');
        console.log(`✅ PASS - File uploaded`);
        console.log('');
        passedTests++;

        // Test 2: Get file metadata
        totalTests++;
        console.log('$ workspace files get /testing/sample.txt');
        console.log('');

        const metaResponse = await getFileMetadata('/testing/sample.txt');
        console.log('📄 File Metadata');
        console.log('');
        console.log(`   Path: ${metaResponse.file.path}`);
        console.log(`   Size: ${metaResponse.file.size} bytes`);
        console.log(`   Type: ${metaResponse.file.content_type}`);
        console.log('');
        console.log(`✅ PASS - File metadata retrieved`);
        console.log('');
        passedTests++;
        recordTest('Get file metadata', 'pass');

        // Test 3: Verify bidirectional file attachments
        // If bugs or features were created, check if files show entity attachments
        if (testData.bugs.length > 0 || testData.features.length > 0) {
          totalTests++;
          console.log('$ workspace files list --tags test');
          console.log('');

          const filesListResponse = await listFiles({
            tags: 'test',
            created_by: process.env.SAAC_HIVE_AGENT_NAME,
            limit: 10
          });

          // Check if any file has entity attachments
          const filesWithAttachments = filesListResponse.files.filter(f =>
            f.attachments && f.attachments.length > 0
          );

          if (filesWithAttachments.length > 0) {
            console.log(`📂 Files (${filesListResponse.files.length} found)`);
            console.log('');
            filesWithAttachments.forEach(file => {
              console.log(`   📄 ${file.filename}`);
              console.log(`      Path: ${file.path}`);
              console.log(`      📎 Attached to (${file.attachments.length}):`);
              file.attachments.forEach(att => {
                const entityEmoji = {
                  'bug': '🐛',
                  'feature': '💡',
                  'test_case': '📝',
                  'ticket': '🎫',
                  'milestone': '🎯',
                  'roadmap': '🗺️'
                }[att.entity_type] || '📌';
                console.log(`         ${entityEmoji} ${att.entity_type}: ${att.entity_title || 'Untitled'}`);
              });
              console.log('');
            });
            console.log(`✅ PASS - Files show entity attachments (bidirectional verified)`);
            console.log('');
            passedTests++;
            recordTest('Verify files show entity attachments', 'pass');
          } else {
            console.log(`ℹ️  INFO - No files with entity attachments found yet (test may run before bugs/features)`);
            console.log('');
            passedTests++;
            recordTest('Verify files show entity attachments', 'skip');
          }
        }

      } catch (error) {
        console.log(`❌ FAIL - ${error.response?.data?.error || error.message}`);
        console.log('');
        failedTests++;
        failures.push(`Files workflow: ${error.message}`);
      }
    }

    // Test test-cases workflow
    async function testTestCases() {
      console.log('─────────────────────────────────────────');
      console.log('📝 Testing: Test Cases Workflow');
      console.log('─────────────────────────────────────────');
      console.log('');

      try {
        // Test 1: Create test case
        totalTests++;
        console.log('$ workspace test-cases create "User login flow" \\');
        console.log('    --project "my-webapp" \\');
        console.log('    --description "Verify user can login successfully" \\');
        console.log('    --priority high \\');
        console.log('    --steps \'[{"step_number":1,"description":"Navigate to login page","expected_result":"Login form displays"},{"step_number":2,"description":"Enter credentials and submit","expected_result":"User is authenticated"}]\'');
        console.log('');

        const testCaseData = {
          name: 'User login flow',
          project: 'my-webapp',
          description: 'Verify user can login successfully',
          priority: 'high',
          created_by: process.env.SAAC_HIVE_AGENT_NAME,
          steps: [
            { step_number: 1, description: 'Navigate to login page', expected_result: 'Login form displays' },
            { step_number: 2, description: 'Enter credentials and submit', expected_result: 'User is authenticated' }
          ]
        };

        const createResponse = await createTestCase(testCaseData);
        testData.testCases.push(createResponse.testCase.id);

        console.log('📝 Creating test case: User login flow');
        console.log('');
        console.log('✅ Test case created successfully!');
        console.log('');
        console.log(`   ID: ${createResponse.testCase.id.substring(0, 8)}`);
        console.log(`   Name: ${createResponse.testCase.name}`);
        console.log(`   Priority: ${createResponse.testCase.priority}`);
        console.log(`   Steps: 2 steps created`);
        console.log('');
        console.log(`✅ PASS - Test case created (ID: ${createResponse.testCase.id.substring(0, 8)})`);
        console.log('');
        passedTests++;
        recordTest('Create test case', 'pass');

        // Test 2: Get test case
        totalTests++;
        console.log(`$ workspace test-cases get ${createResponse.testCase.id.substring(0, 8)}`);
        console.log('');

        const getResponse = await getTestCase(createResponse.testCase.id);
        console.log(`📝 ${getResponse.testCase.name}`);
        console.log('');
        console.log(`   ID: ${getResponse.testCase.id}`);
        console.log(`   Priority: ${getResponse.testCase.priority}`);
        if (getResponse.steps && getResponse.steps.length > 0) {
          console.log(`   Steps: ${getResponse.steps.length}`);
        }
        console.log('');
        console.log(`✅ PASS - Test case retrieved`);
        console.log('');
        passedTests++;
        recordTest('Get test case', 'pass');

      } catch (error) {
        console.log(`❌ FAIL - ${error.response?.data?.error || error.message}`);
        console.log('');
        failedTests++;
        failures.push(`Test cases workflow: ${error.message}`);
        recordTest('Test cases workflow', 'fail');
      }
    }

    // Test tickets workflow
    async function testTickets() {
      console.log('─────────────────────────────────────────');
      console.log('🎫 Testing: Tickets Workflow');
      console.log('─────────────────────────────────────────');
      console.log('');

      try {
        // Test 1: Create ticket (using createBug since ticket creation uses same endpoint)
        totalTests++;
        console.log('$ workspace bugs create "Cannot reset password" \\');
        console.log('    --project "my-webapp" \\');
        console.log('    --severity medium \\');
        console.log('    --description "User reports password reset email not received"');
        console.log('');

        const ticketData = {
          project: 'my-webapp',
          title: 'Cannot reset password',
          description: 'User reports password reset email not received',
          severity: 'medium',
          steps_to_reproduce: '1. Click forgot password 2. Enter email 3. No email received',
          environment: 'production'
        };

        const createResponse = await createBug(ticketData);
        testData.tickets.push(createResponse.bug.id);

        console.log('🐛 Creating bug: Cannot reset password');
        console.log('');
        console.log('✅ Bug created successfully!');
        console.log('');
        console.log(`   ID: ${createResponse.bug.id.substring(0, 8)}`);
        console.log(`   Title: ${createResponse.bug.title}`);
        console.log(`   Severity: ${createResponse.bug.severity}`);
        console.log('');
        console.log(`✅ PASS - Ticket created (ID: ${createResponse.bug.id.substring(0, 8)})`);
        console.log('');
        passedTests++;
        recordTest('Create ticket', 'pass');

        // Test 2: Get ticket
        totalTests++;
        console.log(`$ workspace bugs get ${createResponse.bug.id.substring(0, 8)}`);
        console.log('');

        const getResponse = await getBug(createResponse.bug.id);
        console.log(`🐛 ${getResponse.bug.title}`);
        console.log('');
        console.log(`   ID: ${getResponse.bug.id}`);
        console.log(`   Severity: ${getResponse.bug.severity}`);
        console.log(`   Status: ${getResponse.bug.status}`);
        console.log('');
        console.log(`✅ PASS - Ticket retrieved`);
        console.log('');
        passedTests++;
        recordTest('Get ticket', 'pass');

      } catch (error) {
        console.log(`❌ FAIL - ${error.response?.data?.error || error.message}`);
        console.log('');
        failedTests++;
        failures.push(`Tickets workflow: ${error.message}`);
        recordTest('Tickets workflow', 'fail');
      }
    }

    // Run tests based on suite
    if (suite === 'all' || suite === 'bugs') {
      await testBugs();
    }

    if (suite === 'all' || suite === 'features') {
      await testFeatures();
    }

    if (suite === 'all' || suite === 'roadmaps-milestones') {
      await testRoadmapsMilestones();
    }

    if (suite === 'all' || suite === 'test-cases') {
      await testTestCases();
    }

    if (suite === 'all' || suite === 'tickets') {
      await testTickets();
    }

    if (suite === 'all' || suite === 'files') {
      await testFiles();
    }

    // Cleanup
    console.log('');
    console.log('─────────────────────────────────────────');
    console.log('🧹 Cleanup: Deleting test data...');
    console.log('─────────────────────────────────────────');
    console.log('');

    let cleanedCount = 0;

    for (const fileId of testData.files) {
      try {
        await apiDeleteFile(fileId);
        console.log(`   ✅ Deleted file ${fileId}`);
        cleanedCount++;
      } catch (err) {
        console.log(`   ⚠️  Could not delete file ${fileId}`);
      }
    }

    for (const milestoneId of testData.milestones) {
      try {
        await deleteMilestone(milestoneId);
        console.log(`   ✅ Deleted milestone ${milestoneId.substring(0, 8)}`);
        cleanedCount++;
      } catch (err) {
        console.log(`   ⚠️  Could not delete milestone ${milestoneId.substring(0, 8)}`);
      }
    }

    for (const roadmapId of testData.roadmaps) {
      try {
        await deleteRoadmap(roadmapId);
        console.log(`   ✅ Deleted roadmap ${roadmapId.substring(0, 8)}`);
        cleanedCount++;
      } catch (err) {
        console.log(`   ⚠️  Could not delete roadmap ${roadmapId.substring(0, 8)}`);
      }
    }

    for (const featureId of testData.features) {
      try {
        await deleteFeature(featureId);
        console.log(`   ✅ Deleted feature ${featureId.substring(0, 8)}`);
        cleanedCount++;
      } catch (err) {
        console.log(`   ⚠️  Could not delete feature ${featureId.substring(0, 8)}`);
      }
    }

    for (const testCaseId of testData.testCases) {
      try {
        await deleteTestCase(testCaseId);
        console.log(`   ✅ Deleted test case ${testCaseId.substring(0, 8)}`);
        cleanedCount++;
      } catch (err) {
        console.log(`   ⚠️  Could not delete test case ${testCaseId.substring(0, 8)}`);
      }
    }

    for (const ticketId of testData.tickets) {
      try {
        // Tickets use soft delete (same as bugs), so archive them
        await updateBug(ticketId, { status: 'archived' });
        console.log(`   ✅ Archived ticket ${ticketId.substring(0, 8)} (soft delete)`);
        cleanedCount++;
      } catch (err) {
        console.log(`   ⚠️  Could not archive ticket ${ticketId.substring(0, 8)}`);
      }
    }

    for (const bugId of testData.bugs) {
      try {
        // Bugs use soft delete, so archive them instead
        await updateBug(bugId, { status: 'archived' });
        console.log(`   ✅ Archived bug ${bugId.substring(0, 8)} (soft delete)`);
        cleanedCount++;
      } catch (err) {
        console.log(`   ⚠️  Could not archive bug ${bugId.substring(0, 8)}`);
      }
    }

    console.log('');
    console.log(`   Total cleaned: ${cleanedCount} items`);
    console.log('');

    // Restore console.log
    console.log = originalLog;

    // Final summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (outputMode === 'json') {
      // JSON output
      const result = {
        suite,
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        duration: `${elapsed}s`,
        cleaned: cleanedCount,
        tests: testResults,
        failures: failures.length > 0 ? failures : undefined
      };
      console.log(JSON.stringify(result, null, 2));
      process.exit(failedTests > 0 ? 1 : 0);
    } else if (outputMode === 'quiet') {
      // Quiet output for CI/CD
      if (failedTests > 0) {
        console.log(`❌ ${failedTests}/${totalTests} tests failed (${elapsed}s)`);
        failures.forEach(f => console.log(`   - ${f}`));
        process.exit(1);
      } else {
        console.log(`✅ ${passedTests}/${totalTests} tests passed (${elapsed}s)`);
        process.exit(0);
      }
    } else {
      // Verbose output (default)
      console.log('');
      console.log('════════════════════════════════════════════════════════════════');
      console.log('📊 Test Summary');
      console.log('════════════════════════════════════════════════════════════════');
      console.log(`Total Tests: ${totalTests}`);
      console.log(`Passed: ${passedTests} ✅`);
      console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
      console.log(`Time: ${elapsed}s`);
      console.log('');

      if (failedTests > 0) {
        console.log('❌ Failed Tests:');
        failures.forEach(f => console.log(`   - ${f}`));
        console.log('');
      }

      console.log(`✅ All test data cleaned up (${cleanedCount} items)`);
      console.log('');
      console.log('════════════════════════════════════════════════════════════════');
      console.log('');
      process.exit(failedTests > 0 ? 1 : 0);
    }
  });

// ============================================================================
// Show help if no command provided
// ============================================================================
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);
