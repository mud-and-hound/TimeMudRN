/* ==================================================
   auth.js — TimeMud Admin
   Login / Token / Route Guard / Permissions
================================================== */

async function login(username, password) {
  const res = await fetch(`${CONFIG.API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'เข้าสู่ระบบไม่สำเร็จ');

  if (data.user.role !== 'admin' && data.user.role !== 'super_admin') {
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

/* ==================================================
   เช็คสิทธิ์ — คืนค่า true/false ไม่ redirect
   key ที่รับ: 'super_admin' (ต้องเป็น super_admin เป๊ะ)
              'can_manage_users' / 'can_manage_devices' (super_admin ผ่านเสมอ, admin ต้องถูกเปิดสิทธิ์)
================================================== */
function hasAccess(key) {
  const user = getCurrentUser();
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  if (key === 'super_admin') return false; // ต้องเป็น super_admin เท่านั้น ไม่มีทางลัด
  if (user.role === 'admin') return !!(user.permissions && user.permissions[key]);
  return false;
}

/* เรียกทุกหน้าที่ต้องการสิทธิ์เฉพาะ — เด้งกลับ login ถ้าไม่มี token, เด้งไปหน้าแรกที่เข้าได้ถ้าไม่มีสิทธิ์หน้านี้ */
function requireAccess(key) {
  const token = getToken();
  const user = getCurrentUser();
  if (!token || !user) {
    window.location.href = 'index.html';
    return false;
  }
  if (!hasAccess(key)) {
    window.location.href = getLandingPage();
    return false;
  }
  return true;
}

/* หน้าแรกที่ควรเด้งไปหลัง login หรือหลังโดนเด้งเพราะไม่มีสิทธิ์หน้าที่พยายามเข้า
   เรียงตามลำดับความสำคัญ: dashboard (super_admin) > attendance (can_manage_users) > beacons (can_manage_devices) */
function getLandingPage() {
  if (hasAccess('super_admin')) return 'dashboard.html';
  if (hasAccess('can_manage_users')) return 'attendance.html';
  if (hasAccess('can_manage_devices')) return 'beacons.html';
  return 'no-access.html';
}

/* ซ่อนเมนู sidebar ที่ผู้ใช้ไม่มีสิทธิ์เข้า — ใส่ data-requires="..." ไว้ที่ <a class="nav-item"> แต่ละอัน */
function applySidebarVisibility() {
  document.querySelectorAll('.nav-item[data-requires]').forEach((el) => {
    const key = el.getAttribute('data-requires');
    if (!hasAccess(key)) el.style.display = 'none';
  });
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

  sidebar.querySelectorAll('.nav-item').forEach((link) => {
    link.addEventListener('click', closeSidebar);
  });
})();

/* ซ่อนเมนูที่ไม่มีสิทธิ์อัตโนมัติทุกหน้าที่มี sidebar (รันหลัง DOM พร้อม) */
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.sidebar')) applySidebarVisibility();
});
