import api from '../lib/axios.js';

export const getStats = () => api.get('/admin/stats').then((r) => r.data.data);
export const listUsers = (params) => api.get('/admin/users', { params }).then((r) => r.data.data);
export const updateUser = (id, body) => api.patch(`/admin/users/${id}`, body).then((r) => r.data);
export const deactivateUser = (id) => api.delete(`/admin/users/${id}`).then((r) => r.data);
export const listDocuments = (params) => api.get('/admin/documents', { params }).then((r) => r.data.data);
export const listLogs = (params) => api.get('/admin/logs', { params }).then((r) => r.data.data);
export const listSubscriptions = (params) => api.get('/admin/subscriptions', { params }).then((r) => r.data.data);
