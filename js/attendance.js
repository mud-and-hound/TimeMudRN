/* ==================================================
   attendance.js — TimeMud Admin
   หน้าประวัติเข้า-ออก — filter สาขา + ช่วงวันที่
================================================== */

if (!requireAccess('can_manage_users')) { /* redirect handled inside */ }

const user = getCurrentUser();
if (user) document.getElementById('user-branch').textContent = user.full_name;

const tableWrap = document.getElementById('table-wrap');
const resultCount = document.getElementById('result-count');
const fBranch = document.getElementById('f-branch');
const fFrom = document.getElementById('f-from');
const fTo = document.getElementById('f-to');

/* วันที่วันนี้ รูปแบบ YYYY-MM-DD ตามเวลาเครื่อง — pattern เดียวกับ dashboard.js */
function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/* ==================================================
   โหลดรายชื่อสาขาใส่ dropdown ตัวกรอง
================================================== */
async function loadBranches() {
  try {
    const res = await apiFetch('/admin/branches');
    const branches = await res.json();
    branches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      fBranch.appendChild(opt);
    });
  } catch (err) {
    console.error('โหลดรายชื่อสาขาไม่สำเร็จ:', err);
  }
}

/* ==================================================
   ดึงประวัติ attendance ตามตัวกรองที่เลือก
================================================== */
async function loadAttendance() {
  tableWrap.innerHTML = `<div class="empty-state">กำลังโหลดข้อมูล...</div>`;
  resultCount.textContent = '';

  try {
    const params = new URLSearchParams();
    if (fBranch.value) params.set('branch_id', fBranch.value);
    if (fFrom.value) params.set('date_from', fFrom.value);
    if (fTo.value) params.set('date_to', fTo.value);

    const res = await apiFetch(`/admin/attendance?${params.toString()}`);
    const rows = await res.json();

    renderTable(rows);
  } catch (err) {
    tableWrap.innerHTML = `<div class="empty-state">โหลดข้อมูลไม่สำเร็จ: ${err.message}</div>`;
  }
}

/* ==================================================
   badge ประเภทเข้า/ออก
================================================== */
function clockTypeBadge(type) {
  if (type === 'in') return `<span class="badge badge-green">เข้างาน</span>`;
  if (type === 'out') return `<span class="badge badge-gray">ออกงาน</span>`;
  return `<span class="badge badge-gray">${type}</span>`;
}

/* ==================================================
   แสดงผลตาราง — ใช้ field name จริงจาก backend
   (id, user_id, full_name, branch_id, branch_name,
    clock_type, clock_time, lat, lng, gps_accuracy, rssi)
================================================== */
function renderTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    resultCount.textContent = 'พบ 0 รายการ';
    tableWrap.innerHTML = `<div class="empty-state">ไม่พบรายการในช่วงเวลาที่เลือก</div>`;
    return;
  }

  resultCount.textContent = `พบ ${rows.length} รายการ`;

  const html = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>พนักงาน</th>
            <th>สาขา</th>
            <th>ประเภท</th>
            <th>เวลา</th>
            <th>ความแม่นยำ GPS</th>
            <th>สัญญาณ (RSSI)</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${r.full_name ?? '—'}</td>
              <td>${r.branch_name ?? '—'}</td>
              <td>${clockTypeBadge(r.clock_type)}</td>
              <td>${r.clock_time ?? '—'}</td>
              <td>${r.gps_accuracy != null ? r.gps_accuracy + ' m' : '—'}</td>
              <td>${r.rssi != null ? r.rssi + ' dBm' : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  tableWrap.innerHTML = html;
}

/* ==================================================
   Init — default filter = วันนี้, โหลดสาขาแล้วค่อยดึงข้อมูล
================================================== */
(async function init() {
  const today = todayStr();
  fFrom.value = today;
  fTo.value = today;
  await loadBranches();
  loadAttendance();
})();
