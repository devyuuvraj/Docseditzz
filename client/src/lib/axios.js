import axios from 'axios';

function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD) {
    // Cross-origin Railway URL in env causes browser "Network Error" (CORS). Use Vercel proxy.
    if (!envUrl || envUrl.startsWith('http')) return '/api/v1';
    return envUrl;
  }
  return envUrl || '/api/v1';
}

const baseURL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
});

let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Try a silent refresh exactly once per request
    if (status === 401 && !original._retry && !original.url.includes('/auth/')) {
      original._retry = true;
      try {
        refreshPromise =
          refreshPromise ||
          axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true });
        const { data } = await refreshPromise;
        refreshPromise = null;
        setAccessToken(data.data.accessToken);
        window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: data.data }));
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        refreshPromise = null;
        setAccessToken(null);
        window.dispatchEvent(new Event('auth:logout'));
      }
    }
    return Promise.reject(error);
  }
);

export const apiErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong';

/** Downloads a blob response, honoring the server's filename. */
export const downloadBlobResponse = (response, fallbackName = 'download') => {
  const cd = response.headers['content-disposition'] || '';
  const match = cd.match(/filename="?([^"]+)"?/);
  const filename = match ? decodeURIComponent(match[1]) : fallbackName;
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return filename;
};

export default api;
