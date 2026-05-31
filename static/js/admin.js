/* ── Admin Dashboard JS ── */

/* ── Sidebar ── */
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
function openSidebar()  { document.getElementById('admin-sidebar')?.classList.add('open'); }
function closeSidebar() { document.getElementById('admin-sidebar')?.classList.remove('open'); }
document.getElementById('sidebar-toggle')?.addEventListener('click', openSidebar);
document.getElementById('sidebar-close')?.addEventListener('click', closeSidebar);

/* ── Toast ── */
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type==='success'?'✓':type==='error'?'✗':'ℹ'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* ── API helpers ── */
const api = {
  async post(url, data) {
    const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
    return r.json();
  },
  async put(url, data) {
    const r = await fetch(url, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
    return r.json();
  },
  async del(url) {
    const r = await fetch(url, { method:'DELETE' });
    return r.json();
  },
  async formPost(url, fd) {
    const r = await fetch(url, { method:'POST', body:fd });
    return r.json();
  },
  async formPut(url, fd) {
    const r = await fetch(url, { method:'PUT', body:fd });
    return r.json();
  }
};

/* ── Modal helpers ── */
function openModal(id)  { document.getElementById(id)?.classList.add('open');    document.body.style.overflow='hidden'; }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); document.body.style.overflow=''; }
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    const m = btn.closest('.modal-overlay');
    if (m) { m.classList.remove('open'); document.body.style.overflow=''; }
  });
});
document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => {
    if (e.target === ov) { ov.classList.remove('open'); document.body.style.overflow=''; }
  });
});

/* ── Image upload preview ── */
document.querySelectorAll('.file-input-preview').forEach(input => {
  input.addEventListener('change', () => {
    const preview = document.getElementById(input.dataset.preview);
    if (!preview || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = e => { preview.src = e.target.result; preview.style.display='block'; };
    reader.readAsDataURL(input.files[0]);
  });
});

/* ════════════════════════════════════════
   SETTINGS / PROFILE
════════════════════════════════════════ */
document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const res  = await api.post('/api/settings', data);
  showToast(res.success ? 'Settings saved!' : 'Error', res.success ? 'success' : 'error');
});

document.getElementById('profile-upload-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd  = new FormData(e.target);
  const res = await api.formPost('/api/upload-profile', fd);
  if (res.success) { showToast('Images uploaded!', 'success'); setTimeout(() => location.reload(), 600); }
  else showToast('Upload failed', 'error');
});

/* ════════════════════════════════════════
   TYPING PHRASES
════════════════════════════════════════ */
document.getElementById('typing-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const raw   = document.getElementById('typing-phrases-input').value;
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean).join('|');
  const res   = await api.post('/api/settings', { typing_phrases: lines });
  showToast(res.success ? 'Typing phrases saved!' : 'Error', res.success ? 'success' : 'error');
});

/* ════════════════════════════════════════
   CUSTOM HTML
════════════════════════════════════════ */
document.getElementById('custom-html-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const head = document.getElementById('custom_html_head').value;
  const body = document.getElementById('custom_html_body').value;
  const res  = await api.post('/api/settings', { custom_html_head: head, custom_html_body: body });
  showToast(res.success ? 'Custom HTML saved!' : 'Error', res.success ? 'success' : 'error');
});

/* ════════════════════════════════════════
   SECTION VISIBILITY
════════════════════════════════════════ */
document.querySelectorAll('.section-vis-toggle').forEach(cb => {
  cb.addEventListener('change', async function () {
    const key = this.dataset.key;
    const val = this.checked ? '1' : '0';
    const slider = this.nextElementSibling;
    const knob   = slider?.querySelector('span');
    if (slider) slider.style.background = this.checked ? 'var(--secondary)' : '#cbd5e1';
    if (knob)   knob.style.left = this.checked ? '28px' : '4px';
    const row  = this.closest('.section-toggle-row');
    const desc = row?.querySelector('.toggle-desc');
    if (desc) desc.textContent = this.checked ? 'Visible to visitors' : 'Hidden from visitors';
    const res = await api.post('/api/settings', { [key]: val });
    showToast(this.checked ? 'Section enabled' : 'Section hidden', res.success ? 'success' : 'error');
  });
});

/* ════════════════════════════════════════
   THEME
════════════════════════════════════════ */
document.querySelectorAll('.color-input').forEach(input => {
  input.addEventListener('input', () => {
    const key = input.dataset.cssvar;
    if (key) document.documentElement.style.setProperty(key, input.value);
  });
});
async function saveTheme() {
  const data = {};
  document.querySelectorAll('#theme-form [name]').forEach(el => { data[el.name] = el.value; });
  const res = await api.post('/api/settings', data);
  showToast(res.success ? 'Theme saved!' : 'Error', res.success ? 'success' : 'error');
}

/* ════════════════════════════════════════
   PROJECTS
════════════════════════════════════════ */
document.getElementById('add-project-btn')?.addEventListener('click', () => {
  document.getElementById('project-form')?.reset();
  document.getElementById('project-id').value = '';
  document.getElementById('project-modal-title').textContent = 'Add Project';
  document.getElementById('proj-img-preview').style.display = 'none';
  openModal('project-modal');
});

document.querySelectorAll('.edit-project-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const res = await fetch(`/api/projects/${btn.dataset.id}`);
    const p   = await res.json();
    const form = document.getElementById('project-form');
    document.getElementById('project-id').value = p.id;
    form.title.value        = p.title        || '';
    form.description.value  = p.description  || '';
    form.technologies.value = p.technologies || '';
    form.github_link.value  = p.github_link  || '';
    form.live_link.value    = p.live_link    || '';
    form.features.value     = p.features     || '';
    form.status.value       = p.status       || 'completed';
    form.date.value         = p.date         || '';
    form.category.value     = p.category     || 'web';
    const prev = document.getElementById('proj-img-preview');
    if (p.cover_image) { prev.src = `/static/${p.cover_image}`; prev.style.display='block'; }
    else prev.style.display='none';
    document.getElementById('project-modal-title').textContent = 'Edit Project';
    openModal('project-modal');
  });
});

document.querySelectorAll('.delete-project-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    const res = await api.del(`/api/projects/${btn.dataset.id}`);
    if (res.success) { showToast('Project deleted','success'); btn.closest('tr')?.remove(); }
    else showToast('Error','error');
  });
});

document.getElementById('project-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd  = new FormData(e.target);
  const pid = document.getElementById('project-id').value;
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const res = pid ? await api.formPut(`/api/projects/${pid}`, fd)
                    : await api.formPost('/api/projects', fd);
    if (res.success) {
      showToast(pid ? 'Project updated!' : 'Project added!', 'success');
      closeModal('project-modal');
      setTimeout(() => location.reload(), 500);
    } else showToast('Error saving project','error');
  } catch(err) {
    showToast('Upload error — check file size','error');
  }
  btn.disabled = false; btn.textContent = 'Save Project';
});

/* ════════════════════════════════════════
   COLLABORATIONS
════════════════════════════════════════ */
document.getElementById('add-collab-btn')?.addEventListener('click', () => {
  document.getElementById('collab-form')?.reset();
  openModal('collab-modal');
});
document.querySelectorAll('.delete-collab-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete?')) return;
    const res = await api.del(`/api/collaborations/${btn.dataset.id}`);
    if (res.success) { showToast('Deleted','success'); btn.closest('tr')?.remove(); }
  });
});
document.getElementById('collab-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const res = await api.formPost('/api/collaborations', new FormData(e.target));
    if (res.success) { showToast('Added!','success'); closeModal('collab-modal'); setTimeout(()=>location.reload(),500); }
    else showToast('Error','error');
  } catch { showToast('Upload error','error'); }
  btn.disabled = false; btn.textContent = 'Save';
});

/* ════════════════════════════════════════
   SKILLS
════════════════════════════════════════ */
document.getElementById('add-skill-btn')?.addEventListener('click', () => {
  document.getElementById('skill-form')?.reset();
  document.getElementById('skill-id').value = '';
  document.getElementById('level-display').textContent = '80';
  openModal('skill-modal');
});
document.querySelectorAll('.edit-skill-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const res  = await fetch('/api/skills');
    const list = await res.json();
    const s    = list.find(x => x.id == btn.dataset.id);
    if (!s) return;
    const form = document.getElementById('skill-form');
    document.getElementById('skill-id').value = s.id;
    form.name.value     = s.name;
    form.level.value    = s.level;
    form.category.value = s.category;
    form.icon.value     = s.icon || '';
    document.getElementById('level-display').textContent = s.level;
    openModal('skill-modal');
  });
});
document.querySelectorAll('.delete-skill-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete?')) return;
    const res = await api.del(`/api/skills/${btn.dataset.id}`);
    if (res.success) { showToast('Deleted','success'); btn.closest('tr')?.remove(); }
  });
});
document.getElementById('skill-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd  = new FormData(e.target);
  const pid = document.getElementById('skill-id').value;
  const data = Object.fromEntries(fd); data.level = parseInt(data.level);
  const res  = pid ? await api.put(`/api/skills/${pid}`, data)
                   : await api.post('/api/skills', data);
  if (res.success) { showToast('Saved!','success'); closeModal('skill-modal'); setTimeout(()=>location.reload(),500); }
  else showToast('Error','error');
});

/* ════════════════════════════════════════
   EXPERIENCE
════════════════════════════════════════ */
document.getElementById('add-exp-btn')?.addEventListener('click', () => {
  document.getElementById('exp-form')?.reset();
  document.getElementById('exp-id').value = '';
  openModal('exp-modal');
});
document.querySelectorAll('.edit-exp-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const res  = await fetch('/api/experience');
    const list = await res.json();
    const item = list.find(x => x.id == btn.dataset.id);
    if (!item) return;
    const form = document.getElementById('exp-form');
    document.getElementById('exp-id').value = item.id;
    form.position.value    = item.position    || '';
    form.company.value     = item.company     || '';
    form.duration.value    = item.duration    || '';
    form.start_date.value  = item.start_date  || '';
    form.end_date.value    = item.end_date    || '';
    form.description.value = item.description || '';
    form.location.value    = item.location    || '';
    form.sort_order.value  = item.sort_order  || 0;
    openModal('exp-modal');
  });
});
document.querySelectorAll('.delete-exp-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete?')) return;
    const res = await api.del(`/api/experience/${btn.dataset.id}`);
    if (res.success) { showToast('Deleted','success'); btn.closest('tr')?.remove(); }
  });
});
document.getElementById('exp-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pid  = document.getElementById('exp-id').value;
  const data = Object.fromEntries(new FormData(e.target));
  const res  = pid ? await api.put(`/api/experience/${pid}`, data)
                   : await api.post('/api/experience', data);
  if (res.success) { showToast('Saved!','success'); closeModal('exp-modal'); setTimeout(()=>location.reload(),500); }
  else showToast('Error','error');
});

/* ════════════════════════════════════════
   CERTIFICATIONS
════════════════════════════════════════ */
document.getElementById('add-cert-btn')?.addEventListener('click', () => {
  document.getElementById('cert-form')?.reset(); openModal('cert-modal');
});
document.querySelectorAll('.delete-cert-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete?')) return;
    const res = await api.del(`/api/certifications/${btn.dataset.id}`);
    if (res.success) { showToast('Deleted','success'); btn.closest('tr')?.remove(); }
  });
});
document.getElementById('cert-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = await api.formPost('/api/certifications', new FormData(e.target));
  if (res.success) { showToast('Added!','success'); closeModal('cert-modal'); setTimeout(()=>location.reload(),500); }
  else showToast('Error','error');
});

/* ════════════════════════════════════════
   TESTIMONIALS
════════════════════════════════════════ */
document.getElementById('add-testimonial-btn')?.addEventListener('click', () => {
  document.getElementById('testimonial-form')?.reset(); openModal('testimonial-modal');
});
document.querySelectorAll('.delete-testimonial-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete?')) return;
    const res = await api.del(`/api/testimonials/${btn.dataset.id}`);
    if (res.success) { showToast('Deleted','success'); btn.closest('tr')?.remove(); }
  });
});
document.getElementById('testimonial-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = await api.formPost('/api/testimonials', new FormData(e.target));
  if (res.success) { showToast('Added!','success'); closeModal('testimonial-modal'); setTimeout(()=>location.reload(),500); }
  else showToast('Error','error');
});

/* ════════════════════════════════════════
   GALLERY
════════════════════════════════════════ */
document.getElementById('gallery-upload-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Uploading...';
  try {
    const res = await api.formPost('/api/gallery', new FormData(e.target));
    if (res.success) { showToast('Uploaded!','success'); e.target.reset(); setTimeout(()=>location.reload(),500); }
    else showToast('Error','error');
  } catch { showToast('Upload failed — check file size','error'); }
  btn.disabled = false; btn.textContent = 'Upload';
});
document.querySelectorAll('.delete-gallery-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete?')) return;
    const res = await api.del(`/api/gallery/${btn.dataset.id}`);
    if (res.success) { showToast('Deleted','success'); btn.closest('tr')?.remove(); }
  });
});

/* ════════════════════════════════════════
   RESUME
════════════════════════════════════════ */
document.getElementById('resume-upload-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Uploading...';
  try {
    const res = await api.formPost('/api/resume/upload', new FormData(e.target));
    if (res.success) { showToast('Resume uploaded!','success'); setTimeout(()=>location.reload(),600); }
    else showToast(res.error || 'Error','error');
  } catch { showToast('Upload failed','error'); }
  btn.disabled = false; btn.textContent = 'Upload CV';
});

/* ════════════════════════════════════════
   MESSAGES
════════════════════════════════════════ */
document.querySelectorAll('.read-msg-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    await api.post(`/api/messages/${btn.dataset.id}/read`, {});
    btn.closest('tr')?.querySelector('.unread-badge')?.remove();
    btn.remove();
  });
});
document.querySelectorAll('.delete-msg-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete?')) return;
    const res = await api.del(`/api/messages/${btn.dataset.id}`);
    if (res.success) { showToast('Deleted','success'); btn.closest('tr')?.remove(); }
  });
});

/* ════════════════════════════════════════
   SELLING MODE
════════════════════════════════════════ */
document.getElementById('selling-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const res  = await api.post('/api/settings', data);
  showToast(res.success ? 'Selling settings saved!' : 'Error', res.success ? 'success' : 'error');
});

const sellingToggle = document.getElementById('selling-mode-toggle');
sellingToggle?.addEventListener('change', async function () {
  const val = this.checked ? '1' : '0';
  const res = await api.post('/api/settings', { selling_mode: val });
  const lbl = document.getElementById('selling-mode-label');
  if (lbl) lbl.textContent = this.checked ? 'Selling Mode ON — banner visible to visitors' : 'Selling Mode OFF';
  showToast(this.checked ? '🛒 Selling mode enabled!' : 'Selling mode disabled', 'success');
});

/* ════════════════════════════════════════
   ANALYTICS CHART
════════════════════════════════════════ */
function initChart() {
  const canvas = document.getElementById('analytics-chart');
  if (!canvas || !window.analyticsData?.length) return;
  const data   = [...window.analyticsData].reverse();
  const labels = data.map(d => d.date?.slice(5) || '');
  const values = data.map(d => d.total_visits || 0);
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0, 'rgba(26,115,232,0.35)');
  grad.addColorStop(1, 'rgba(26,115,232,0)');
  const W = canvas.width, H = canvas.height;
  const pad = { top:20, right:20, bottom:36, left:44 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;
  const max = Math.max(...values, 1);
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(128,128,128,0.12)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + ch - (i/4)*ch;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left+cw, y); ctx.stroke();
    ctx.fillStyle='#888'; ctx.font='10px DM Sans,sans-serif'; ctx.textAlign='right';
    ctx.fillText(Math.round((i/4)*max), pad.left-6, y+4);
  }
  if (values.length < 2) return;
  const pts = values.map((v,i) => ({ x: pad.left + i*(cw/(values.length-1)), y: pad.top + ch - (v/max)*ch }));
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length-1].x, pad.top+ch); ctx.lineTo(pad.left, pad.top+ch);
  ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath(); ctx.strokeStyle='#1a73e8'; ctx.lineWidth=2.5; ctx.lineJoin='round';
  pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y)); ctx.stroke();
  pts.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2);
    ctx.fillStyle='#1a73e8'; ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
  });
  ctx.fillStyle='#888'; ctx.font='11px DM Sans,sans-serif'; ctx.textAlign='center';
  labels.forEach((l,i) => {
    if (labels.length <= 10 || i % Math.ceil(labels.length/8) === 0)
      ctx.fillText(l, pts[i].x, pad.top+ch+22);
  });
}
initChart();

/* ── Logout ── */
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await fetch('/api/logout', { method:'POST' });
  window.location.href = '/';
});

/* ── Change password ── */
document.getElementById('change-pw-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw  = document.getElementById('new-password').value;
  const pw2 = document.getElementById('confirm-password').value;
  if (pw !== pw2) { showToast('Passwords do not match','error'); return; }
  const res = await api.post('/api/change-password', { password: pw });
  if (res.success) { showToast('Password changed!','success'); e.target.reset(); }
  else showToast('Error','error');
});
