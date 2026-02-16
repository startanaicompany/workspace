/**
 * API Client for Workspace CLI
 */

const axios = require('axios');

const API_BASE_URL = process.env.WORKSPACE_API_URL || 'https://workspace.startanaicompany.com';

/**
 * Create axios client with authentication headers
 */
function createClient() {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Add API key authentication
  if (process.env.WORKSPACE_API_KEY) {
    headers['X-Api-Key'] = process.env.WORKSPACE_API_KEY;
  }

  return axios.create({
    baseURL: API_BASE_URL,
    headers,
    timeout: 60000, // 60 seconds for file uploads
    maxContentLength: 100 * 1024 * 1024, // 100MB max
    maxBodyLength: 100 * 1024 * 1024,
  });
}

/**
 * Upload file to workspace storage
 */
async function uploadFile(payload) {
  const client = createClient();
  const response = await client.post('/api/files', payload);
  return response.data;
}

/**
 * Download file from workspace storage
 */
async function downloadFile(remotePath) {
  const client = createClient();
  const response = await client.get('/api/files/by-path', {
    params: { path: remotePath }
  });
  return response.data;
}

/**
 * List files
 */
async function listFiles(filters = {}) {
  const client = createClient();
  const response = await client.get('/api/files', {
    params: filters
  });
  return response.data;
}

/**
 * Get file metadata
 */
async function getFileMetadata(remotePath) {
  const client = createClient();
  const response = await client.get('/api/files/metadata', {
    params: { path: remotePath }
  });
  return response.data;
}

/**
 * Delete file
 */
async function deleteFile(remotePath) {
  const client = createClient();
  const response = await client.delete('/api/files', {
    params: { path: remotePath }
  });
  return response.data;
}

/**
 * Update file metadata or refresh TTL
 */
async function updateFile(remotePath, updates) {
  const client = createClient();
  const response = await client.patch('/api/files', updates, {
    params: { path: remotePath }
  });
  return response.data;
}

module.exports = {
  createClient,
  uploadFile,
  downloadFile,
  listFiles,
  getFileMetadata,
  deleteFile,
  updateFile
};
