/* ==================================================
   auth.js — TimeMud Admin
   Login / Token / Route Guard
================================================== */

async function login(username, password) {
  const res = await fetch(`${CONFIG.API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'เข้าสู่ระบบไม่สำเร็จ');

  if (data.user.role !== 'admin') {
    throw new Error('บัญชีนี้ไม่มีสิทธิ์เข้าหน้าผู้ดูแลระบบ');
  }

  localStorage.setItem(CONFIG.STORAGE_KEY, data.token);
  localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(data.user));
  return data;
}

function getToken() {
  return localStorage.getItem(CONFIG.STORAGE_KEY);
}

function getCurrentUser() {
  const raw = localStorage.getItem(CONFIG.USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function logout() {
  localStorage.removeItem(CONFIG.STORAGE_KEY);
  localStorage.removeItem(CONFIG.USER_KEY);
  window.location.href = 'index.html';
}

/* เรียกทุกหน้ายกเว้น index.html — เด้งกลับ login ถ้าไม่มี token */
function requireAdmin() {
  const token = getToken();
  const user = getCurrentUser();
  if (!token || !user || user.role !== 'admin') {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

/* fetch แนบ token อัตโนมัติ */
async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${CONFIG.API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    logout();
    throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  }

  return res;
}
