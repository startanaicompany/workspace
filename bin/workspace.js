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
const { uploadFile, downloadFile, listFiles, getFileMetadata, deleteFile: apiDeleteFile, updateFile: apiUpdateFile } = require('../src/lib/api');

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
  .option('--project-id <id>', 'Filter by project')
  .option('--agent <name>', 'Filter by creator agent')
  .action(async (options) => {
    checkEnv();

    try {
      const response = await listFiles(options);

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
      console.log(`   Created By: ${file.created_by_agent_name}`);
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

      const response = await apiUpdateFile(remotePath, updates);

      console.log('');
      console.log('✅ File updated successfully');
      console.log(`   Path: ${response.file.path}`);
      if (options.expire) {
        console.log(`   New Expiry: ${new Date(response.file.expire_at).toLocaleString()}`);
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
  .option('--project <name>', 'Filter by project')
  .option('--status <status>', 'Filter by status')
  .option('--priority <level>', 'Filter by priority')
  .action(async (options) => {
    checkEnv();
    console.log('Would list features with options:', options);
  });

features
  .command('create <title>')
  .description('Create new feature request')
  .option('--project <name>', 'Project name')
  .option('--description <text>', 'Feature description')
  .option('--priority <level>', 'Priority (low|medium|high|critical)')
  .option('--requested-by <name>', 'Requester name')
  .action(async (title, options) => {
    checkEnv();
    console.log('Would create feature:', { title, options });
  });

features
  .command('get <feature-id>')
  .description('Get feature details')
  .action(async (featureId) => {
    checkEnv();
    console.log('Would get feature:', featureId);
  });

features
  .command('update <feature-id>')
  .description('Update feature request')
  .option('--status <status>', 'New status')
  .option('--priority <level>', 'New priority')
  .option('--description <text>', 'New description')
  .action(async (featureId, options) => {
    checkEnv();
    console.log('Would update feature:', { featureId, options });
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
  .option('--agent <name>', 'Executor agent name')
  .option('--environment <env>', 'Test environment')
  .action(async (testCaseId, options) => {
    checkEnv();
    console.log('Would start execution:', { testCaseId, options });
  });

executions
  .command('list')
  .description('List test executions')
  .option('--project <name>', 'Filter by project')
  .option('--status <status>', 'Filter by status')
  .option('--agent <name>', 'Filter by executor')
  .action(async (options) => {
    checkEnv();
    console.log('Would list executions with options:', options);
  });

executions
  .command('get <execution-id>')
  .description('Get execution details')
  .action(async (executionId) => {
    checkEnv();
    console.log('Would get execution:', executionId);
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
  .option('--status <status>', 'New status')
  .option('--priority <level>', 'New priority')
  .action(async (ticketId, options) => {
    checkEnv();
    console.log('Would update ticket:', { ticketId, options });
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
// Show help if no command provided
// ============================================================================
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);
