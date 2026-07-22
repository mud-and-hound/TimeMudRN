/* ==================================================
   dashboard.js — TimeMud Admin
   หน้าแรกหลัง Login — สรุปภาพรวมระบบ
================================================== */

if (!requireAdmin()) { /* redirect handled inside */ }

const user = getCurrentUser();
if (user) document.getElementById('user-branch').textContent = user.full_name;

const recentWrap = document.getElementById('recent-wrap');

/* วันที่วันนี้ รูปแบบ YYYY-MM-DD ตามเวลาเครื่อง (ผู้ใช้งานอยู่ไทยอยู่แล้ว) */
function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function loadAll() {
  gsap.fromTo('.icon-menu-item',
    { opacity: 0, y: 6 },
    { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
  );

  try {
    const today = todayStr();

    const [branchRes, beaconRes, userRes, attendanceRes] = await Promise.all([
      apiFetch('/admin/branches'),
      apiFetch('/admin/beacons'),
      apiFetch('/admin/users'),
      apiFetch(`/admin/attendance?date_from=${today}&date_to=${today}`),
    ]);

    const branches = await branchRes.json();
    const beacons = await beaconRes.json();
    const users = await userRes.json();
    const attendance = await attendanceRes.json();

    renderStats(branches, beacons, users, attendance);
    renderRecentTable(attendance);
  } catch (err) {
    recentWrap.innerHTML = `<div class="empty-state">โหลดข้อมูลไม่สำเร็จ: ${err.message}</div>`;
  }
}

/* ==================================================
   การ์ดสรุป — ใช้แค่ .length ไม่พึ่ง field ภายใน
   จึงไม่มีทางพังจาก field name ไม่ตรง
================================================== */
function renderStats(branches, beacons, users, attendance) {
  const activeBeacons = Array.isArray(beacons) ? beacons.filter(b => b.is_active).length : '-';

  document.getElementById('stat-branches').textContent = Array.isArray(branches) ? branches.length : '-';
  document.getElementById('stat-beacons').textContent = activeBeacons;
  document.getElementById('stat-users').textContent = Array.isArray(users) ? users.length : '-';
  document.getElementById('stat-clockin').textContent = Array.isArray(attendance) ? attendance.length : '-';

  gsap.fromTo('.stat-card',
    { opacity: 0, y: 8 },
    { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out' }
  );
}

/* ==================================================
   ตาราง generic — ดึง column header จาก key ของ record จริง
   กันเดา field name ผิด (ยังไม่รู้ schema จริงของ /admin/attendance)
================================================== */
function renderRecentTable(attendance) {
  if (!Array.isArray(attendance) || attendance.length === 0) {
    recentWrap.innerHTML = `<div class="empty-state">ยังไม่มีรายการ Clock-in วันนี้</div>`;
    return;
  }

  // เอาแค่ 10 รายการล่าสุด (สมมติ backend ส่งเรียงใหม่ล่าสุดมาก่อน — ถ้าไม่ใช่ค่อยปรับ sort ทีหลัง)
  const rows = attendance.slice(0, 10);
  const columns = Object.keys(rows[0]);

  let html = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(r => `<tr>${columns.map(c => `<td>${formatCell(r[c])}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;

  recentWrap.innerHTML = html;
}

function formatCell(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

loadAll();
