import api, { setAccessToken } from '../../lib/axios.js';

const SESSION_EMAIL_DOMAIN = '@session.docseditz.local';
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

function storeSession({ email, password }) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ email, password }));
}

function newBrowserSessionCredentials() {
  const id = crypto.randomUUID();
  const email = `guest_${id}${SESSION_EMAIL_DOMAIN}`;
  const password = `Gs${crypto.randomUUID().replace(/-/g, '')}1`;
  return { email, password };
}

function applyAuthPayload(data) {
  setAccessToken(data.data.accessToken);
  return data.data;
}

/** Restore cookie session or create a passwordless browser workspace. */
export async function runBootstrapSession() {
  try {
    const { data } = await api.post('/auth/refresh');
    return applyAuthPayload(data);
  } catch {
    /* fall through */
  }

  try {
    const { data } = await api.post('/auth/guest');
    return applyAuthPayload(data);
  } catch (guestErr) {
    const status = guestErr.response?.status;
    if (status && status !== 404 && status !== 405) {
      throw guestErr;
    }
  }

  let creds = loadStoredSession();
  if (!creds) {
    creds = newBrowserSessionCredentials();
  }

  try {
    const { data } = await api.post('/auth/login', creds);
    storeSession(creds);
    return applyAuthPayload(data);
  } catch (loginErr) {
    const code = loginErr.response?.status;
    if (code && code !== 401 && code !== 404) {
      throw loginErr;
    }
  }

  creds = newBrowserSessionCredentials();
  const { data } = await api.post('/auth/register', {
    name: 'Guest',
    email: creds.email,
    password: creds.password,
  });

  if (data.data?.accessToken) {
    storeSession(creds);
    return applyAuthPayload(data);
  }

  throw new Error('Could not start browser workspace');
}
