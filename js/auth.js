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

/* ==================================================
   Mobile Nav — ปุ่มแฮมเบอร์เกอร์ + toggle sidebar (จอ ≤768px)
   ทำงานอัตโนมัติทุกหน้าที่มี .sidebar (ข้าม index.html เพราะไม่มี sidebar)
================================================== */
(function initMobileNav() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const btn = document.createElement('button');
  btn.className = 'mobile-menu-btn';
  btn.setAttribute('aria-label', 'เปิดเมนู');
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M4 6h16M4 12h16M4 18h16"/>
    </svg>
  `;

  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';

  document.body.appendChild(btn);
  document.body.appendChild(backdrop);

  function openSidebar() {
    sidebar.classList.add('open');
    backdrop.classList.add('open');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
  }

  btn.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  backdrop.addEventListener('click', closeSidebar);

  /* ปิดเมนูอัตโนมัติเมื่อกดลิงก์ใน sidebar (กันเมนูค้างเปิดตอนเปลี่ยนหน้าบนจอเล็ก) */
  sidebar.querySelectorAll('.nav-item').forEach((link) => {
    link.addEventListener('click', closeSidebar);
  });
})();
