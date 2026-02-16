/**
 * File Utilities for CLI
 * Handles file operations, base64 encoding, checksums, etc.
 */

const { readFileSync, statSync, writeFileSync } = require('fs');
const { createHash } = require('crypto');
const { extname, basename } = require('path');

/**
 * MIME type mapping for common file extensions
 */
const MIME_TYPES = {
  // Text files
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.ts': 'application/typescript',

  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',

  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',

  // Video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',

  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.7z': 'application/x-7z-compressed',

  // Other
  '.bin': 'application/octet-stream',
  '.exe': 'application/x-msdownload',
  '.sh': 'application/x-sh',
};

/**
 * Detect if a file is text based on extension
 * Text files: .txt, .md (not base64 encoded)
 * All others: Binary (base64 encoded)
 */
function isTextFile(filename) {
  const ext = extname(filename).toLowerCase();
  return ['.txt', '.md'].includes(ext);
}

/**
 * Get MIME type from filename extension
 */
function getMimeType(filename) {
  const ext = extname(filename).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Calculate SHA256 checksum of file
 */
function calculateChecksum(filePath) {
  const fileBuffer = readFileSync(filePath);
  const hash = createHash('sha256');
  hash.update(fileBuffer);
  return hash.digest('hex');
}

/**
 * Read file and prepare for upload
 * Returns object with all required metadata
 */
function prepareFileForUpload(localPath, remotePath, options = {}) {
  try {
    // Check file exists and get stats
    const stats = statSync(localPath);

    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }

    // Read file content
    const fileBuffer = readFileSync(localPath);
    const filename = basename(localPath);
    const isText = isTextFile(filename);

    // Prepare content (base64 encode if binary)
    let content;
    if (isText) {
      content = fileBuffer.toString('utf8');
    } else {
      content = fileBuffer.toString('base64');
    }

    // Calculate checksum
    const checksum = createHash('sha256').update(fileBuffer).digest('hex');

    // Get content type
    const content_type = getMimeType(filename);

    // Prepare upload payload
    const payload = {
      path: remotePath,
      filename,
      content,
      size: stats.size,
      content_type,
      checksum,
      base64_encoded: !isText,
      expire_minutes: options.expire,
      created_by_agent_name: process.env.SAAC_HIVE_AGENT_NAME,
      last_modified: stats.mtime.toISOString(),
    };

    // Add optional fields
    if (options.description) {
      payload.description = options.description;
    }

    if (options.tags) {
      // Convert comma-separated string to array
      payload.tags = options.tags.split(',').map(t => t.trim());
    }

    if (options.projectId) {
      payload.project_id = options.projectId;
    }

    if (options.public) {
      payload.is_public = true;
    }

    return {
      success: true,
      payload,
      metadata: {
        filename,
        size: stats.size,
        sizeFormatted: formatFileSize(stats.size),
        content_type,
        checksum: checksum.substring(0, 16) + '...', // Short version for display
        base64_encoded: !isText,
        last_modified: stats.mtime,
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Decode and write downloaded file
 */
function writeDownloadedFile(fileData, outputPath) {
  try {
    let content;

    if (fileData.base64_encoded) {
      // Decode base64 for binary files
      content = Buffer.from(fileData.content, 'base64');
    } else {
      // Write text files as-is
      content = fileData.content;
    }

    // Write to file
    writeFileSync(outputPath, content);

    return {
      success: true,
      path: outputPath,
      size: content.length
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format expiry time in human-readable format
 */
function formatExpiry(minutes) {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(minutes / 1440);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
}

module.exports = {
  isTextFile,
  getMimeType,
  calculateChecksum,
  prepareFileForUpload,
  writeDownloadedFile,
  formatFileSize,
  formatExpiry
};
