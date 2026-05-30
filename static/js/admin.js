/* ── Admin Dashboard JS ── */

/* ── Sidebar Navigation ── */
document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.dataset.target;
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`panel-${target}`)?.classList.add('active');
    if (window.innerWidth < 900) closeSidebar();
  });
});

/* ── Mobile Sidebar ── */
function openSidebar() { document.getElementById('admin-sidebar')?.classList.add('open'); }
function closeSidebar() { document.getElementById('admin-sidebar')?.classList.remove('open'); }
document.getElementById('sidebar-toggle')?.addEventListener('click', openSidebar);
document.getElementById('sidebar-close')?.addEventListener('click', closeSidebar);

/* ── Toast ── */
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* ── Confirm Dialog ── */
function confirmDialog(msg) { return confirm(msg); }

/* ── API Helpers ── */
async function apiPost(url, data) {
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}
async function apiPut(url, data) {
  const res = await fetch(url, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}
async function apiDelete(url) {
  const res = await fetch(url, { method: 'DELETE' });
  return res.json();
}
async function apiFormPost(url, formData) {
  const res = await fetch(url, { method: 'POST', body: formData });
  return res.json();
}
async function apiFormPut(url, formData) {
  const res = await fetch(url, { method: 'PUT', body: formData });
  return res.json();
}

/* ── Modal Helpers ── */
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  document.body.style.overflow = '';
}
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    const m = btn.closest('.modal-overlay');
    if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
  });
});
document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => {
    if (e.target === ov) { ov.classList.remove('open'); document.body.style.overflow = ''; }
  });
});

/* ── Settings Panel ── */
document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);
  const res = await apiPost('/api/settings', data);
  if (res.success) showToast('Settings saved!', 'success');
  else showToast('Error saving settings', 'error');
});

document.getElementById('profile-upload-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const res = await apiFormPost('/api/upload-profile', fd);
  if (res.success) { showToast('Images uploaded!', 'success'); setTimeout(() => location.reload(), 800); }
  else showToast('Upload failed', 'error');
});

/* ── Change Password ── */
document.getElementById('change-pw-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = document.getElementById('new-password').value;
  const pw2 = document.getElementById('confirm-password').value;
  if (pw !== pw2) { showToast('Passwords do not match', 'error'); return; }
  const res = await apiPost('/api/change-password', { password: pw });
  if (res.success) { showToast('Password changed!', 'success'); e.target.reset(); }
  else showToast('Error', 'error');
});

/* ── Projects ── */
document.getElementById('add-project-btn')?.addEventListener('click', () => {
  document.getElementById('project-form').reset();
  document.getElementById('project-id').value = '';
  document.getElementById('project-modal-title').textContent = 'Add Project';
  openModal('project-modal');
});

document.querySelectorAll('.edit-project-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const pid = btn.dataset.id;
    const res = await fetch(`/api/projects/${pid}`);
    const p = await res.json();
    const form = document.getElementById('project-form');
    document.getElementById('project-id').value = p.id;
    form.title.value = p.title || '';
    form.description.value = p.description || '';
    form.technologies.value = p.technologies || '';
    form.github_link.value = p.github_link || '';
    form.live_link.value = p.live_link || '';
    form.features.value = p.features || '';
    form.status.value = p.status || 'completed';
    form.date.value = p.date || '';
    form.category.value = p.category || 'web';
    document.getElementById('project-modal-title').textContent = 'Edit Project';
    openModal('project-modal');
  });
});

document.querySelectorAll('.delete-project-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirmDialog('Delete this project?')) return;
    const res = await apiDelete(`/api/projects/${btn.dataset.id}`);
    if (res.success) { showToast('Project deleted', 'success'); btn.closest('tr')?.remove(); }
    else showToast('Error', 'error');
  });
});

document.getElementById('project-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const pid = document.getElementById('project-id').value;
  let res;
  if (pid) res = await apiFormPut(`/api/projects/${pid}`, fd);
  else res = await apiFormPost('/api/projects', fd);
  if (res.success) {
    showToast(pid ? 'Project updated!' : 'Project added!', 'success');
    closeModal('project-modal');
    setTimeout(() => location.reload(), 500);
  } else showToast('Error saving project', 'error');
});

/* ── Skills ── */
document.getElementById('add-skill-btn')?.addEventListener('click', () => {
  document.getElementById('skill-form').reset();
  document.getElementById('skill-id').value = '';
  openModal('skill-modal');
});

document.querySelectorAll('.edit-skill-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const res = await fetch('/api/skills');
    const skills = await res.json();
    const s = skills.find(x => x.id == btn.dataset.id);
    if (!s) return;
    const form = document.getElementById('skill-form');
    document.getElementById('skill-id').value = s.id;
    form.name.value = s.name;
    form.level.value = s.level;
    form.category.value = s.category;
    form.icon.value = s.icon || '';
    openModal('skill-modal');
  });
});

document.querySelectorAll('.delete-skill-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirmDialog('Delete this skill?')) return;
    const res = await apiDelete(`/api/skills/${btn.dataset.id}`);
    if (res.success) { showToast('Skill deleted', 'success'); btn.closest('tr')?.remove(); }
    else showToast('Error', 'error');
  });
});

document.getElementById('skill-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const pid = document.getElementById('skill-id').value;
  const data = Object.fromEntries(fd);
  data.level = parseInt(data.level);
  let res;
  if (pid) res = await apiPut(`/api/skills/${pid}`, data);
  else res = await apiPost('/api/skills', data);
  if (res.success) {
    showToast('Skill saved!', 'success');
    closeModal('skill-modal');
    setTimeout(() => location.reload(), 500);
  } else showToast('Error', 'error');
});

/* ── Experience ── */
document.getElementById('add-exp-btn')?.addEventListener('click', () => {
  document.getElementById('exp-form').reset();
  document.getElementById('exp-id').value = '';
  openModal('exp-modal');
});

document.querySelectorAll('.edit-exp-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const res = await fetch('/api/experience');
    const items = await res.json();
    const item = items.find(x => x.id == btn.dataset.id);
    if (!item) return;
    const form = document.getElementById('exp-form');
    document.getElementById('exp-id').value = item.id;
    form.position.value = item.position || '';
    form.company.value = item.company || '';
    form.duration.value = item.duration || '';
    form.start_date.value = item.start_date || '';
    form.end_date.value = item.end_date || '';
    form.description.value = item.description || '';
    form.location.value = item.location || '';
    form.sort_order.value = item.sort_order || 0;
    openModal('exp-modal');
  });
});

document.querySelectorAll('.delete-exp-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirmDialog('Delete this experience?')) return;
    const res = await apiDelete(`/api/experience/${btn.dataset.id}`);
    if (res.success) { showToast('Deleted', 'success'); btn.closest('tr')?.remove(); }
  });
});

document.getElementById('exp-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const pid = document.getElementById('exp-id').value;
  const data = Object.fromEntries(fd);
  let res;
  if (pid) res = await apiPut(`/api/experience/${pid}`, data);
  else res = await apiPost('/api/experience', data);
  if (res.success) {
    showToast('Saved!', 'success');
    closeModal('exp-modal');
    setTimeout(() => location.reload(), 500);
  } else showToast('Error', 'error');
});

/* ── Certifications ── */
document.getElementById('add-cert-btn')?.addEventListener('click', () => {
  document.getElementById('cert-form').reset();
  openModal('cert-modal');
});

document.querySelectorAll('.delete-cert-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirmDialog('Delete certificate?')) return;
    const res = await apiDelete(`/api/certifications/${btn.dataset.id}`);
    if (res.success) { showToast('Deleted', 'success'); btn.closest('tr')?.remove(); }
  });
});

document.getElementById('cert-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const res = await apiFormPost('/api/certifications', fd);
  if (res.success) {
    showToast('Certificate added!', 'success');
    closeModal('cert-modal');
    setTimeout(() => location.reload(), 500);
  } else showToast('Error', 'error');
});

/* ── Testimonials ── */
document.getElementById('add-testimonial-btn')?.addEventListener('click', () => {
  document.getElementById('testimonial-form').reset();
  openModal('testimonial-modal');
});

document.querySelectorAll('.delete-testimonial-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirmDialog('Delete testimonial?')) return;
    const res = await apiDelete(`/api/testimonials/${btn.dataset.id}`);
    if (res.success) { showToast('Deleted', 'success'); btn.closest('tr')?.remove(); }
  });
});

document.getElementById('testimonial-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const res = await apiFormPost('/api/testimonials', fd);
  if (res.success) {
    showToast('Added!', 'success');
    closeModal('testimonial-modal');
    setTimeout(() => location.reload(), 500);
  } else showToast('Error', 'error');
});

/* ── Gallery ── */
document.getElementById('gallery-upload-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const res = await apiFormPost('/api/gallery', fd);
  if (res.success) {
    showToast('Uploaded!', 'success');
    e.target.reset();
    setTimeout(() => location.reload(), 500);
  } else showToast('Error', 'error');
});

document.querySelectorAll('.delete-gallery-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirmDialog('Delete item?')) return;
    const res = await apiDelete(`/api/gallery/${btn.dataset.id}`);
    if (res.success) { showToast('Deleted', 'success'); btn.closest('tr')?.remove(); }
  });
});

/* ── Collaborations ── */
document.getElementById('add-collab-btn')?.addEventListener('click', () => {
  document.getElementById('collab-form').reset();
  openModal('collab-modal');
});

document.querySelectorAll('.delete-collab-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirmDialog('Delete collaboration?')) return;
    const res = await apiDelete(`/api/collaborations/${btn.dataset.id}`);
    if (res.success) { showToast('Deleted', 'success'); btn.closest('tr')?.remove(); }
  });
});

document.getElementById('collab-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const res = await apiFormPost('/api/collaborations', fd);
  if (res.success) {
    showToast('Added!', 'success');
    closeModal('collab-modal');
    setTimeout(() => location.reload(), 500);
  } else showToast('Error', 'error');
});

/* ── Resume ── */
document.getElementById('resume-upload-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const res = await apiFormPost('/api/resume/upload', fd);
  if (res.success) {
    showToast('Resume uploaded!', 'success');
    setTimeout(() => location.reload(), 500);
  } else showToast('Error', 'error');
});

/* ── Messages ── */
document.querySelectorAll('.read-msg-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    await apiPost(`/api/messages/${btn.dataset.id}/read`, {});
    btn.closest('tr')?.querySelector('.unread-badge')?.remove();
    btn.remove();
  });
});

document.querySelectorAll('.delete-msg-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirmDialog('Delete message?')) return;
    const res = await apiDelete(`/api/messages/${btn.dataset.id}`);
    if (res.success) { showToast('Deleted', 'success'); btn.closest('tr')?.remove(); }
  });
});

/* ── Theme Customizer ── */
const colorInputs = document.querySelectorAll('.color-input');
colorInputs.forEach(input => {
  input.addEventListener('input', () => {
    const key = input.dataset.cssvar;
    if (key) document.documentElement.style.setProperty(key, input.value);
  });
});

/* ── Analytics Chart ── */
function initAnalyticsChart() {
  const canvas = document.getElementById('analytics-chart');
  if (!canvas || !window.analyticsData) return;
  const data = window.analyticsData.slice().reverse();
  const labels = data.map(d => d.date.slice(5));
  const visits = data.map(d => d.total_visits);
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0, 'rgba(26,115,232,0.4)');
  grad.addColorStop(1, 'rgba(26,115,232,0)');
  // Simple manual chart
  drawLineChart(ctx, canvas.width, canvas.height, labels, visits, grad);
}

function drawLineChart(ctx, w, h, labels, values, grad) {
  const pad = { top: 20, right: 20, bottom: 40, left: 40 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;
  const max = Math.max(...values, 1);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'transparent';
  // Grid lines
  ctx.strokeStyle = 'rgba(128,128,128,0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + ch - (i / 4) * ch;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
  }
  if (values.length < 2) return;
  const stepX = cw / (values.length - 1);
  const points = values.map((v, i) => ({
    x: pad.left + i * stepX,
    y: pad.top + ch - (v / max) * ch
  }));
  // Fill area
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, pad.top + ch);
  ctx.lineTo(pad.left, pad.top + ch);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  // Line
  ctx.beginPath();
  ctx.strokeStyle = '#1a73e8';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();
  // Dots
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#1a73e8';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  // Labels
  ctx.fillStyle = '#888';
  ctx.font = '11px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  labels.forEach((l, i) => {
    if (i % Math.ceil(labels.length / 7) === 0) {
      ctx.fillText(l, points[i].x, pad.top + ch + 20);
    }
  });
}

initAnalyticsChart();

/* ── Logout ── */
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
});

/* ── File preview ── */
document.querySelectorAll('.file-input-preview').forEach(input => {
  input.addEventListener('change', () => {
    const previewId = input.dataset.preview;
    const preview = document.getElementById(previewId);
    if (!preview || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(input.files[0]);
  });
});

/* ── Section Visibility Toggles ── */
document.querySelectorAll('.section-vis-toggle').forEach(checkbox => {
  checkbox.addEventListener('change', async function () {
    const key = this.dataset.key;
    const val = this.checked ? '1' : '0';

    // Update visual toggle immediately
    const slider = this.nextElementSibling;
    const knob = slider.querySelector('span');
    slider.style.background = this.checked ? 'var(--secondary)' : '#cbd5e1';
    knob.style.left = this.checked ? '28px' : '4px';

    // Update the description text
    const row = this.closest('.section-toggle-row');
    const desc = row.querySelector('div > div > div:last-child');
    if (desc) desc.textContent = this.checked ? 'Visible to visitors' : 'Hidden from visitors';

    // Update icon bg/color
    const iconWrap = row.querySelector('div > div:first-child');
    if (iconWrap) {
      iconWrap.style.background = this.checked ? 'rgba(26,115,232,0.1)' : 'rgba(0,0,0,0.05)';
      iconWrap.style.color = this.checked ? 'var(--secondary)' : 'var(--text-muted)';
    }

    // Save to server
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: val })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          this.checked
            ? `Section enabled ✓`
            : `Section hidden from visitors`,
          this.checked ? 'success' : 'info'
        );
      }
    } catch (e) {
      showToast('Failed to save', 'error');
    }
  });
});
