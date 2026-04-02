import apiClient from './client';

// Auth Services
export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  getMe: () => apiClient.get('/auth/me')
};

// Novel Services
export const novelAPI = {
  getAll: (params) => apiClient.get('/novels', { params }),
  getBySlug: (slug) => apiClient.get(`/novels/${slug}`),
  getChapters: (slug, params) => apiClient.get(`/novels/${slug}/chapters`, { params }),
  getChapter: (slug, chapterNumber) => apiClient.get(`/novels/${slug}/chapters/${chapterNumber}`),
  getHot: (params) => apiClient.get('/novels/ranking/hot', { params }),
  getRecentUpdates: (params) => apiClient.get('/novels/updates/recent', { params }),
  create: (data) => apiClient.post('/novels', data),
  addChapter: (novelId, data) => apiClient.post(`/novels/${novelId}/chapters`, data)
};

// Genre Services
export const genreAPI = {
  getAll: () => apiClient.get('/genres'),
  getBySlug: (slug, params) => apiClient.get(`/genres/${slug}`, { params })
};

// Comment Services
export const commentAPI = {
  getAll: (params) => apiClient.get('/comments', { params }),
  create: (data) => apiClient.post('/comments', data),
  update: (id, data) => apiClient.put(`/comments/${id}`, data),
  delete: (id) => apiClient.delete(`/comments/${id}`)
};
