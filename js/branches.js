/* ==================================================
   branches.js — TimeMud Admin
================================================== */

if (!requireAccess('super_admin')) { /* redirect handled inside */ }

const user = getCurrentUser();
if (user) document.getElementById('user-branch').textContent = user.full_name;

let branches = [];

const content = document.getElementById('content');
const modal = document.getElementById('modal');
const modalBox = document.getElementById('modal-box');
const form = document.getElementById('branch-form');

/* ==================================================
   โหลดข้อมูลเริ่มต้น
================================================== */
async function loadAll() {
  try {
    const res = await apiFetch('/admin/branches');
    branches = await res.json();
    render();
  } catch (err) {
    content.innerHTML = `<div class="empty-state">โหลดข้อมูลไม่สำเร็จ: ${err.message}</div>`;
  }
}

/* ==================================================
   วาดหน้าจอ
================================================== */
function render() {
  if (!branches.length) {
    content.innerHTML = `<div class="empty-state">ยังไม่มีสาขาในระบบ</div>`;
    return;
  }

  content.innerHTML = `<div class="card-grid">${branches.map(cardHtml).join('')}</div>`;

  gsap.fromTo('.beacon-card',
    { opacity: 0, y: 8 },
    { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' }
  );
}

function cardHtml(b) {
  return `
    <div class="beacon-card registered">
      <div class="beacon-card-top">
        <div>
          <div class="beacon-card-title">${b.name}</div>
          <div class="beacon-card-sub">รัศมี Geofence ${b.radius_m} ม.</div>
        </div>
      </div>
      <div class="beacon-meta">${b.lat}, ${b.lng}</div>
      <div class="beacon-actions">
        <button class="btn-sm" onclick="openEdit(${b.id})">แก้ไข</button>
        <button class="btn-sm danger" onclick="removeBranch(${b.id})">ลบ</button>
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
  document.getElementById('f-radius').value = 100;
  document.getElementById('modal-title').textContent = 'เพิ่มสาขา';
  document.getElementById('f-id').value = '';
  openModal();
});

document.getElementById('modal-cancel').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

window.openEdit = function (id) {
  const b = branches.find(x => x.id === id);
  if (!b) return;

  document.getElementById('modal-title').textContent = 'แก้ไขสาขา';
  document.getElementById('f-id').value = b.id;
  document.getElementById('f-name').value = b.name;
  document.getElementById('f-lat').value = b.lat;
  document.getElementById('f-lng').value = b.lng;
  document.getElementById('f-radius').value = b.radius_m;
  openModal();
};

/* ==================================================
   บันทึก (เพิ่ม/แก้ไข)
================================================== */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('f-id').value;

  const payload = {
    name: document.getElementById('f-name').value.trim(),
    lat: parseFloat(document.getElementById('f-lat').value),
    lng: parseFloat(document.getElementById('f-lng').value),
    radius_m: parseInt(document.getElementById('f-radius').value),
  };

  try {
    if (id) {
      await apiFetch(`/admin/branches/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/admin/branches', { method: 'POST', body: JSON.stringify(payload) });
    }
    closeModal();
    await loadAll();
  } catch (err) {
    alert('บันทึกไม่สำเร็จ: ' + err.message);
  }
});

/* ==================================================
   ลบ
   ⚠️ ระวัง: backend ลบแบบ hard delete ตรงๆ ไม่มีเช็ค foreign key
   ถ้าสาขานี้มี beacon หรือ attendance log ผูกอยู่ อาจลบไม่ผ่าน (FK constraint)
   หรือถ้าไม่มี FK constraint ตั้งไว้ อาจทำให้ข้อมูลลูกกำพร้า — ยังไม่ได้เช็คฝั่ง DB
================================================== */
window.removeBranch = async function (id) {
  if (!confirm('ยืนยันลบสาขานี้? ถ้ามี Beacon หรือประวัติเข้า-ออกผูกกับสาขานี้อยู่ อาจลบไม่สำเร็จ')) return;
  try {
    await apiFetch(`/admin/branches/${id}`, { method: 'DELETE' });
    await loadAll();
  } catch (err) {
    alert('ลบไม่สำเร็จ: ' + err.message);
  }
};

loadAll();
