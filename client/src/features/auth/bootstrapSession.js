import api, { setAccessToken } from '../../lib/axios.js';

const SESSION_STORAGE_KEY = 'docseditz_browser_session_v1';

function loadStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.email && parsed?.password) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function applyAuthPayload(data) {
  setAccessToken(data.data.accessToken);
  return data.data;
}

async function tryPost(path) {
  const { data } = await api.post(path);
  return applyAuthPayload(data);
}

/** Restore cookie session or create a passwordless browser workspace. */
export async function runBootstrapSession() {
  try {
    return await tryPost('/auth/refresh');
  } catch {
    /* fall through */
  }

  for (const path of ['/auth/session', '/auth/guest']) {
    try {
      return await tryPost(path);
    } catch (err) {
      const status = err.response?.status;
      if (status && status !== 404 && status !== 405) {
        throw err;
      }
    }
  }

  const stored = loadStoredSession();
  if (stored) {
    try {
      const { data } = await api.post('/auth/login', stored);
      return applyAuthPayload(data);
    } catch (loginErr) {
      const code = loginErr.response?.status;
      if (code && code !== 401 && code !== 404) {
        throw loginErr;
      }
    }
  }

  throw new Error(
    'API is missing /auth/session. Redeploy the Railway service from latest main.'
  );
}
