/* ==================================================
   permissions.js — TimeMud Admin
   Super User เปิด/ปิดสิทธิ์ Admin แต่ละคน
================================================== */

if (!requireAccess('super_admin')) { /* redirect handled inside */ }

const user = getCurrentUser();
if (user) document.getElementById('user-branch').textContent = user.full_name;

const content = document.getElementById('content');

async function loadAll() {
  try {
    const res = await apiFetch('/admin/permissions');
    const admins = await res.json();
    render(admins);
  } catch (err) {
    content.innerHTML = `<div class="empty-state">โหลดข้อมูลไม่สำเร็จ: ${err.message}</div>`;
  }
}

function render(admins) {
  if (!admins.length) {
    content.innerHTML = `<div class="empty-state">ยังไม่มีบัญชี Admin ในระบบ (มีแต่ Super User)</div>`;
    return;
  }

  content.innerHTML = `
    <div class="perm-table">
      ${admins.map(rowHtml).join('')}
    </div>
  `;

  gsap.fromTo('.perm-row',
    { opacity: 0, y: 6 },
    { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
  );
}

function rowHtml(a) {
  return `
    <div class="perm-row" data-id="${a.id}">
      <div>
        <div class="perm-user-name">${a.full_name}</div>
        <div class="perm-username">@${a.username}</div>
      </div>
      <div class="perm-toggles">
        <div class="perm-toggle-item">
          <label class="toggle-switch">
            <input type="checkbox" ${a.can_manage_users ? 'checked' : ''}
              onchange="onToggle(${a.id}, 'can_manage_users', this)">
            <span class="toggle-slider"></span>
          </label>
          <span class="perm-toggle-label">จัดการผู้ใช้</span>
        </div>
        <div class="perm-toggle-item">
          <label class="toggle-switch">
            <input type="checkbox" ${a.can_manage_devices ? 'checked' : ''}
              onchange="onToggle(${a.id}, 'can_manage_devices', this)">
            <span class="toggle-slider"></span>
          </label>
          <span class="perm-toggle-label">จัดการอุปกรณ์</span>
        </div>
      </div>
    </div>
  `;
}

/* ==================================================
   Toggle สิทธิ์ — ส่งค่าล่าสุดของทั้ง 2 toggle ในแถวนั้นไปพร้อมกันเสมอ
   (backend รับทีละคู่ ไม่ใช่ทีละ field)
================================================== */
window.onToggle = async function (userId, changedKey, checkboxEl) {
  const row = document.querySelector(`.perm-row[data-id="${userId}"]`);
  const checkboxes = row.querySelectorAll('input[type="checkbox"]');

  checkboxes.forEach((cb) => (cb.disabled = true));

  const payload = {
    can_manage_users: row.querySelector('input[onchange*="can_manage_users"]').checked,
    can_manage_devices: row.querySelector('input[onchange*="can_manage_devices"]').checked,
  };

  try {
    await apiFetch(`/admin/permissions/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    alert('บันทึกไม่สำเร็จ: ' + err.message);
    checkboxEl.checked = !checkboxEl.checked; // ย้อนค่ากลับถ้าบันทึกไม่สำเร็จ
  } finally {
    checkboxes.forEach((cb) => (cb.disabled = false));
  }
};

loadAll();
