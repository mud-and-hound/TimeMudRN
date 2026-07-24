/* ==================================================
   beacons.js — TimeMud Admin
================================================== */

if (!requireAccess('can_manage_devices')) { /* redirect handled inside */ }

const user = getCurrentUser();
if (user) document.getElementById('user-branch').textContent = user.full_name;

let branches = [];
let beacons = [];

const content = document.getElementById('content');
const modal = document.getElementById('modal');
const modalBox = document.getElementById('modal-box');
const form = document.getElementById('beacon-form');

/* ==================================================
   โหลดข้อมูลเริ่มต้น
================================================== */
async function loadAll() {
  try {
    const [branchRes, beaconRes] = await Promise.all([
      apiFetch('/admin/branches'),
      apiFetch('/admin/beacons'),
    ]);
    branches = await branchRes.json();
    beacons = await beaconRes.json();

    populateBranchSelect();
    render();
  } catch (err) {
    content.innerHTML = `<div class="empty-state">โหลดข้อมูลไม่สำเร็จ: ${err.message}</div>`;
  }
}

function populateBranchSelect() {
  const sel = document.getElementById('f-branch');
  sel.innerHTML = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
}

/* ==================================================
   วาดหน้าจอ — แยก 2 กลุ่ม
================================================== */
function render() {
  const active = beacons.filter(b => b.is_active);
  const inactive = beacons.filter(b => !b.is_active);

  let html = '';

  html += `<div class="section-label">ลงทะเบียนแล้ว (${active.length})</div>`;
  html += active.length
    ? `<div class="card-grid">${active.map(cardHtml).join('')}</div>`
    : `<div class="empty-state">ยังไม่มี Beacon ที่ลงทะเบียน</div>`;

  if (inactive.length) {
    html += `<div class="section-label">ปิดการใช้งาน (${inactive.length})</div>`;
    html += `<div class="card-grid">${inactive.map(cardHtml).join('')}</div>`;
  }

  content.innerHTML = html;

  gsap.fromTo('.beacon-card',
    { opacity: 0, y: 8 },
    { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' }
  );
}

function cardHtml(b) {
  const statusClass = b.is_active ? 'registered' : 'unregistered';
  const badge = b.is_active
    ? `<span class="badge badge-green">ใช้งานอยู่</span>`
    : `<span class="badge badge-gray">ปิดใช้งาน</span>`;

  return `
    <div class="beacon-card ${statusClass}">
      <div class="beacon-card-top">
        <div>
          <div class="beacon-card-title">${b.branch_name}</div>
          <div class="beacon-card-sub">${b.label}</div>
        </div>
        ${badge}
      </div>
      <div class="beacon-meta">${b.mac_address || '—'}</div>
      <div class="beacon-actions">
        <button class="btn-sm" onclick="openEdit(${b.id})">แก้ไข</button>
        <button class="btn-sm danger" onclick="removeBeacon(${b.id})">ลบ</button>
      </div>
    </div>
  `;
}

/* ==================================================
   Modal — เปิด/ปิด
================================================== */
function openModal() {
  modal.classList.add('open');
  gsap.fromTo(modalBox, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'power2.out' });
}

function closeModal() {
  gsap.to(modalBox, {
    scale: 0.95, opacity: 0, duration: 0.15,
    onComplete: () => modal.classList.remove('open'),
  });
}

document.getElementById('add-btn').addEventListener('click', () => {
  form.reset();
  document.getElementById('modal-title').textContent = 'เพิ่ม Beacon';
  document.getElementById('f-id').value = '';
  openModal();
});

document.getElementById('modal-cancel').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

window.openEdit = function (id) {
  const b = beacons.find(x => x.id === id);
  if (!b) return;

  document.getElementById('modal-title').textContent = 'แก้ไข Beacon';
  document.getElementById('f-id').value = b.id;
  document.getElementById('f-label').value = b.label;
  document.getElementById('f-branch').value = b.branch_id;
  document.getElementById('f-mac').value = b.mac_address || '';
  document.getElementById('f-uuid').value = b.uuid;
  document.getElementById('f-major').value = b.major;
  document.getElementById('f-minor').value = b.minor;
  openModal();
};

/* ==================================================
   บันทึก (เพิ่ม/แก้ไข)
================================================== */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('f-id').value;

  const payload = {
    label: document.getElementById('f-label').value.trim(),
    branch_id: parseInt(document.getElementById('f-branch').value),
    mac_address: document.getElementById('f-mac').value.trim().toUpperCase(),
    uuid: document.getElementById('f-uuid').value.trim(),
    major: parseInt(document.getElementById('f-major').value),
    minor: parseInt(document.getElementById('f-minor').value),
  };

  try {
    if (id) {
      await apiFetch(`/admin/beacons/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/admin/beacons', { method: 'POST', body: JSON.stringify(payload) });
    }
    closeModal();
    await loadAll();
  } catch (err) {
    alert('บันทึกไม่สำเร็จ: ' + err.message);
  }
});

/* ==================================================
   ลบ
================================================== */
window.removeBeacon = async function (id) {
  if (!confirm('ยืนยันลบ Beacon นี้?')) return;
  try {
    await apiFetch(`/admin/beacons/${id}`, { method: 'DELETE' });
    await loadAll();
  } catch (err) {
    alert('ลบไม่สำเร็จ: ' + err.message);
  }
};

loadAll();
