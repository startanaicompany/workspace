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

/**
 * Get project by name
 */
async function getProjectByName(projectName) {
  const client = createClient();
  const response = await client.get('/api/projects/by-name', {
    params: { name: projectName }
  });
  return response.data;
}

/**
 * List features
 */
async function listFeatures(filters = {}) {
  const client = createClient();
  const response = await client.get('/api/features', {
    params: filters
  });
  return response.data;
}

/**
 * Create feature
 */
async function createFeature(data) {
  const client = createClient();
  const response = await client.post('/api/features', data);
  return response.data;
}

/**
 * Get feature details
 */
async function getFeature(featureId) {
  const client = createClient();
  const response = await client.get(`/api/features/${featureId}`);
  return response.data;
}

/**
 * Update feature
 */
async function updateFeature(featureId, updates) {
  const client = createClient();
  const response = await client.put(`/api/features/${featureId}`, updates);
  return response.data;
}

/**
 * Delete feature
 */
async function deleteFeature(featureId) {
  const client = createClient();
  const response = await client.delete(`/api/features/${featureId}`);
  return response.data;
}

/**
 * Add comment to feature
 */
async function addFeatureComment(featureId, comment) {
  const client = createClient();
  const response = await client.post(`/api/features/${featureId}/comments`, comment);
  return response.data;
}

/**
 * List feature comments
 */
async function listFeatureComments(featureId) {
  const client = createClient();
  const response = await client.get(`/api/features/${featureId}/comments`);
  return response.data;
}

/**
 * List bugs
 */
async function listBugs(filters = {}) {
  const client = createClient();
  const response = await client.get('/api/bugs', {
    params: filters
  });
  return response.data;
}

/**
 * Create bug
 */
async function createBug(data) {
  const client = createClient();
  const response = await client.post('/api/bugs', data);
  return response.data;
}

/**
 * Get bug details
 */
async function getBug(bugId) {
  const client = createClient();
  const response = await client.get(`/api/bugs/${bugId}`);
  return response.data;
}

/**
 * Update bug
 */
async function updateBug(bugId, updates) {
  const client = createClient();
  const response = await client.put(`/api/bugs/${bugId}`, updates);
  return response.data;
}

/**
 * Delete bug
 */
async function deleteBug(bugId) {
  const client = createClient();
  const response = await client.delete(`/api/bugs/${bugId}`);
  return response.data;
}

/**
 * Add comment to bug
 */
async function addBugComment(bugId, comment) {
  const client = createClient();
  const response = await client.post(`/api/bugs/${bugId}/comments`, comment);
  return response.data;
}

/**
 * List bug comments
 */
async function listBugComments(bugId) {
  const client = createClient();
  const response = await client.get(`/api/bugs/${bugId}/comments`);
  return response.data;
}

/**
 * List test cases
 */
async function listTestCases(filters = {}) {
  const client = createClient();
  const response = await client.get('/api/test-cases', {
    params: filters
  });
  return response.data;
}

/**
 * Create test case
 */
async function createTestCase(data) {
  const client = createClient();
  const response = await client.post('/api/test-cases', data);
  return response.data;
}

/**
 * Get test case details (includes steps)
 */
async function getTestCase(testCaseId) {
  const client = createClient();
  const response = await client.get(`/api/test-cases/${testCaseId}`);
  return response.data;
}

/**
 * Update test case
 */
async function updateTestCase(testCaseId, updates) {
  const client = createClient();
  const response = await client.put(`/api/test-cases/${testCaseId}`, updates);
  return response.data;
}

/**
 * Delete test case
 */
async function deleteTestCase(testCaseId) {
  const client = createClient();
  const response = await client.delete(`/api/test-cases/${testCaseId}`);
  return response.data;
}

/**
 * Add comment to test case
 */
async function addTestCaseComment(testCaseId, comment) {
  const client = createClient();
  const response = await client.post(`/api/test-cases/${testCaseId}/comments`, comment);
  return response.data;
}

/**
 * List test case comments
 */
async function listTestCaseComments(testCaseId) {
  const client = createClient();
  const response = await client.get(`/api/test-cases/${testCaseId}/comments`);
  return response.data;
}

module.exports = {
  createClient,
  uploadFile,
  downloadFile,
  listFiles,
  getFileMetadata,
  deleteFile,
  updateFile,
  getProjectByName,
  listFeatures,
  createFeature,
  getFeature,
  updateFeature,
  deleteFeature,
  addFeatureComment,
  listFeatureComments,
  listBugs,
  createBug,
  getBug,
  updateBug,
  deleteBug,
  addBugComment,
  listBugComments,
  listTestCases,
  createTestCase,
  getTestCase,
  updateTestCase,
  deleteTestCase,
  addTestCaseComment,
  listTestCaseComments
};
