import api, { downloadBlobResponse } from '../lib/axios.js';

export const listDocuments = (params) => api.get('/documents', { params }).then((r) => r.data.data);
export const recentDocuments = () => api.get('/documents/recent').then((r) => r.data.data.documents);
export const getDocument = (id) => api.get(`/documents/${id}`).then((r) => r.data.data.document);
export const updateDocument = (id, body) => api.patch(`/documents/${id}`, body).then((r) => r.data);
export const duplicateDocument = (id) => api.post(`/documents/${id}/duplicate`).then((r) => r.data);
export const trashDocument = (id) => api.delete(`/documents/${id}`).then((r) => r.data);
export const restoreDocument = (id) => api.post(`/documents/${id}/restore`).then((r) => r.data);
export const permanentDelete = (id) => api.delete(`/documents/${id}/permanent`).then((r) => r.data);
export const emptyTrash = () => api.delete('/documents/trash/empty').then((r) => r.data);

export const downloadDocument = async (id, name) => {
  const res = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
  return downloadBlobResponse(res, name);
};

export const uploadDocuments = (files, { folder, onProgress } = {}) => {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  if (folder) form.append('folder', folder);
  return api
    .post('/documents/upload', form, {
      onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
    })
    .then((r) => r.data);
};

/** Chunked upload for large files (5MB parts with real progress). */
export const chunkedUpload = async (file, { folder, onProgress } = {}) => {
  const { data: initData } = await api.post('/uploads/init', {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
  });
  const { uploadId, chunkSize } = initData.data;
  const totalChunks = Math.ceil(file.size / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
    const form = new FormData();
    form.append('uploadId', uploadId);
    form.append('chunkIndex', String(i));
    form.append('chunk', chunk, `${file.name}.part${i}`);
    await api.post('/uploads/chunk', form);
    onProgress?.(Math.round(((i + 1) / totalChunks) * 95));
  }

  const { data } = await api.post('/uploads/complete', { uploadId, totalChunks, folder });
  onProgress?.(100);
  return data;
};

/** Smart upload: chunked for files over 8MB, simple otherwise. */
export const smartUpload = (file, opts = {}) =>
  file.size > 8 * 1024 * 1024 ? chunkedUpload(file, opts) : uploadDocuments([file], opts);

// Folders
export const listFolders = () => api.get('/folders').then((r) => r.data.data.folders);
export const createFolder = (body) => api.post('/folders', body).then((r) => r.data);
export const updateFolder = (id, body) => api.patch(`/folders/${id}`, body).then((r) => r.data);
export const deleteFolder = (id) => api.delete(`/folders/${id}`).then((r) => r.data);

// Activities / storage
export const listActivities = (params) => api.get('/activities', { params }).then((r) => r.data.data);
export const storageStats = () => api.get('/users/me/storage').then((r) => r.data.data);

// Sharing
export const createShare = (body) => api.post('/share', body).then((r) => r.data.data.share);
export const listShares = () => api.get('/share/mine').then((r) => r.data.data.shares);
export const revokeShare = (id) => api.delete(`/share/${id}`).then((r) => r.data);
