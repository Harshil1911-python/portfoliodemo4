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

/* ════════════════════════════════════════
   BLOG POSTS
════════════════════════════════════════ */
document.getElementById('add-blog-btn')?.addEventListener('click', () => {
  document.getElementById('blog-form')?.reset();
  document.getElementById('blog-id').value = '';
  document.getElementById('blog-modal-title').textContent = 'New Blog Post';
  document.getElementById('blog-content').value = '';
  openModal('blog-modal');
});

document.querySelectorAll('.edit-blog-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const res  = await fetch('/api/blog');
    const list = await res.json();
    const post = list.find(x => x.id == btn.dataset.id);
    if (!post) return;
    const form = document.getElementById('blog-form');
    document.getElementById('blog-id').value   = post.id;
    form.title.value    = post.title    || '';
    form.excerpt.value  = post.excerpt  || '';
    form.category.value = post.category || 'general';
    form.status.value   = post.status   || 'published';
    form.tags.value     = post.tags     || '';
    document.getElementById('blog-content').value = post.content || '';
    document.getElementById('blog-modal-title').textContent = 'Edit Blog Post';
    openModal('blog-modal');
  });
});

document.querySelectorAll('.delete-blog-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete this blog post?')) return;
    const res = await api.del(`/api/blog/${btn.dataset.id}`);
    if (res.success) { showToast('Post deleted','success'); btn.closest('tr')?.remove(); }
    else showToast('Error','error');
  });
});

document.getElementById('blog-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const fd  = new FormData(e.target);
    const pid = document.getElementById('blog-id').value;
    const res = pid ? await api.formPut(`/api/blog/${pid}`, fd)
                    : await api.formPost('/api/blog', fd);
    if (res.success) {
      showToast(pid ? 'Post updated!' : 'Post created!', 'success');
      closeModal('blog-modal');
      setTimeout(() => location.reload(), 500);
    } else showToast('Error saving post','error');
  } catch(err) { showToast('Upload error','error'); }
  btn.disabled = false; btn.textContent = 'Save Post';
});

// HTML tag insertion helper for blog editor
function insertTag(id, open, close) {
  const ta = document.getElementById(id);
  if (!ta) return;
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  const sel   = ta.value.substring(start, end);
  ta.value    = ta.value.substring(0, start) + open + sel + close + ta.value.substring(end);
  ta.focus();
  ta.setSelectionRange(start + open.length, start + open.length + sel.length);
}

function insertImg() {
  const url = prompt('Image URL or path (e.g. /static/uploads/blog/xyz.jpg):');
  if (!url) return;
  const alt = prompt('Alt text (description):') || 'Image';
  insertTag('blog-content', `<img src="${url}" alt="${alt}" style="max-width:100%;border-radius:12px;margin:1.5em 0"/>`, '');
}

// Blog image quick-upload
document.getElementById('preview-blog-btn')?.addEventListener('click', () => {
  const content = document.getElementById('blog-content')?.value || '';
  const title   = document.querySelector('#blog-form [name=title]')?.value || 'Preview';
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>${title}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>
    <style>
      body{font-family:'DM Sans',sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#1a1a2e;line-height:1.9;font-size:1.05rem}
      h1,h2,h3{font-family:Georgia,serif;margin:2em 0 .75em}
      h1{font-size:2.5rem} h2{font-size:1.8rem} h3{font-size:1.4rem}
      blockquote{border-left:4px solid #00d4ff;padding:16px 24px;background:rgba(0,212,255,.05);border-radius:0 12px 12px 0;margin:2em 0;font-style:italic;color:#6b7280}
      code{background:#f8faff;color:#1a73e8;padding:2px 8px;border-radius:4px;font-size:.875em}
      pre{background:#0a2540;color:#e8edf5;padding:24px;border-radius:12px;overflow-x:auto}
      pre code{background:none;color:inherit;padding:0}
      img{max-width:100%;border-radius:12px;margin:1.5em 0}
      hr{border:none;border-top:1px solid #eee;margin:3em 0}
    </style></head><body>
    <h1>${title}</h1>${content}</body></html>`);
  win.document.close();
});

/* ════════════════════════════════════════
   SERVICES
════════════════════════════════════════ */
document.getElementById('add-service-btn')?.addEventListener('click', () => {
  document.getElementById('service-form')?.reset();
  document.getElementById('service-id').value = '';
  openModal('service-modal');
});

document.querySelectorAll('.edit-service-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const res  = await fetch('/api/services');
    const list = await res.json();
    const svc  = list.find(x => x.id == btn.dataset.id);
    if (!svc) return;
    const form = document.getElementById('service-form');
    document.getElementById('service-id').value = svc.id;
    form.title.value       = svc.title       || '';
    form.description.value = svc.description || '';
    form.icon.value        = svc.icon        || 'fas fa-code';
    form.price.value       = svc.price       || '';
    form.features.value    = svc.features    || '';
    form.sort_order.value  = svc.sort_order  || 0;
    openModal('service-modal');
  });
});

document.querySelectorAll('.delete-service-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete this service?')) return;
    const res = await api.del(`/api/services/${btn.dataset.id}`);
    if (res.success) { showToast('Deleted','success'); btn.closest('tr')?.remove(); }
  });
});

document.getElementById('service-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pid  = document.getElementById('service-id').value;
  const data = Object.fromEntries(new FormData(e.target));
  data.sort_order = parseInt(data.sort_order) || 0;
  const res  = pid ? await api.put(`/api/services/${pid}`, data)
                   : await api.post('/api/services', data);
  if (res.success) { showToast('Saved!','success'); closeModal('service-modal'); setTimeout(()=>location.reload(),500); }
  else showToast('Error','error');
});

/* ════════════════════════════════════════
   ACHIEVEMENTS
════════════════════════════════════════ */
document.getElementById('add-achievement-btn')?.addEventListener('click', () => {
  document.getElementById('achievement-form')?.reset();
  document.getElementById('achievement-id').value = '';
  openModal('achievement-modal');
});

document.querySelectorAll('.edit-achievement-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const res  = await fetch('/api/achievements');
    const list = await res.json();
    const a    = list.find(x => x.id == btn.dataset.id);
    if (!a) return;
    const form = document.getElementById('achievement-form');
    document.getElementById('achievement-id').value = a.id;
    form.title.value      = a.title      || '';
    form.value.value      = a.value      || '';
    form.icon.value       = a.icon       || 'fas fa-trophy';
    form.color.value      = a.color      || '#00d4ff';
    form.sort_order.value = a.sort_order || 0;
    openModal('achievement-modal');
  });
});

document.querySelectorAll('.delete-achievement-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete?')) return;
    const res = await api.del(`/api/achievements/${btn.dataset.id}`);
    if (res.success) { showToast('Deleted','success'); btn.closest('tr')?.remove(); }
  });
});

document.getElementById('achievement-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pid  = document.getElementById('achievement-id').value;
  const data = Object.fromEntries(new FormData(e.target));
  data.sort_order = parseInt(data.sort_order) || 0;
  const res  = pid ? await api.put(`/api/achievements/${pid}`, data)
                   : await api.post('/api/achievements', data);
  if (res.success) { showToast('Saved!','success'); closeModal('achievement-modal'); setTimeout(()=>location.reload(),500); }
  else showToast('Error','error');
});

/* ════════════════════════════════════════
   ANNOUNCEMENTS
════════════════════════════════════════ */
document.getElementById('announcement-toggle')?.addEventListener('change', async function () {
  const val = this.checked ? '1' : '0';
  const res = await api.post('/api/settings', { announcement_enabled: val });
  showToast(this.checked ? 'Announcement bar enabled' : 'Announcement bar hidden', 'success');
});

document.getElementById('announcement-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const res  = await api.post('/api/announcements', data);
  if (res.success) { showToast('Announcement set!','success'); setTimeout(()=>location.reload(),500); }
  else showToast('Error','error');
});

document.querySelectorAll('.delete-announcement-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete?')) return;
    const res = await api.del(`/api/announcements/${btn.dataset.id}`);
    if (res.success) { showToast('Deleted','success'); btn.closest('tr')?.remove(); }
  });
});

/* ════════════════════════════════════════
   FAVICON UPLOAD
════════════════════════════════════════ */
document.getElementById('favicon-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Uploading...';
  try {
    const res = await api.formPost('/api/upload-favicon', new FormData(e.target));
    if (res.success) { showToast('Favicon uploaded! Refresh your browser to see it.','success'); setTimeout(()=>location.reload(),800); }
    else showToast(res.error || 'Error','error');
  } catch { showToast('Upload failed','error'); }
  btn.disabled = false; btn.textContent = 'Upload Favicon';
});

/* ════════════════════════════════════════
   SEO FORM
════════════════════════════════════════ */
document.getElementById('seo-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const res  = await api.post('/api/settings', data);
  showToast(res.success ? 'SEO settings saved!' : 'Error', res.success ? 'success' : 'error');
});

/* ════════════════════════════════════════
   MAINTENANCE FORM
════════════════════════════════════════ */
document.getElementById('maintenance-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd   = new FormData(e.target);
  const mode = fd.get('maintenance_mode') === '1' ? '1' : '0';
  const msg  = fd.get('maintenance_msg') || '';
  const res  = await api.post('/api/settings', { maintenance_mode: mode, maintenance_msg: msg });
  if (res.success) showToast(mode==='1' ? '⚠️ Maintenance mode ON — visitors see maintenance page' : 'Maintenance mode OFF', 'success');
  else showToast('Error','error');
});

// Fix maintenance checkbox value
document.querySelector('#maintenance-form input[name=maintenance_mode]')?.addEventListener('change', function() {
  this.value = this.checked ? '1' : '0';
});


/* ── WhatsApp float toggle ── */
document.getElementById('wa-float-toggle')?.addEventListener('change', async function() {
  const res = await api.post('/api/settings', { whatsapp_float: this.checked ? '1' : '0' });
  showToast(this.checked ? '💬 WhatsApp float enabled' : 'WhatsApp float hidden', 'success');
});

/* ── Clear Custom HTML helpers ── */
function clearCustomHtml(which) {
  if (!confirm('Clear custom HTML ' + which + '?')) return;
  const head = document.getElementById('custom_html_head');
  const body = document.getElementById('custom_html_body');
  const data = {};
  if (which === 'head' || which === 'both') { if(head) head.value=''; data.custom_html_head=''; }
  if (which === 'body' || which === 'both') { if(body) body.value=''; data.custom_html_body=''; }
  api.post('/api/settings', data).then(r => {
    if(r.success) showToast('Custom HTML cleared!','success');
  });
}

/* ── saveTheme includes custom_css ── */
async function saveTheme() {
  const data = {};
  document.querySelectorAll('#theme-form [name]').forEach(el => {
    if (el.name) data[el.name] = el.value;
  });
  const res = await api.post('/api/settings', data);
  showToast(res.success ? 'Theme saved!' : 'Error', res.success ? 'success' : 'error');
}

/* ── Message detail modal ── */
function openMsgDetail(id, name, email, phone, subject, message, date, unread) {
  const msg = message.replace(/\\n/g,'\n');
  document.getElementById('msg-detail-content').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
      <div>
        <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:4px">Name</div>
        <div style="font-weight:700;color:var(--text)">${name}</div>
      </div>
      <div>
        <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:4px">Date</div>
        <div style="font-weight:600;color:var(--text)">${date}</div>
      </div>
      <div>
        <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:4px">Email</div>
        <div>${email ? '<a href="mailto:'+email+'" style="color:var(--secondary);font-weight:600">'+email+'</a>' : '<span style="color:var(--text-muted)">—</span>'}</div>
      </div>
      <div>
        <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:4px">Phone</div>
        <div>${phone ? '<a href="tel:'+phone+'" style="color:var(--secondary);font-weight:600">'+phone+'</a>' : '<span style="color:var(--text-muted)">—</span>'}</div>
      </div>
    </div>
    <div style="margin-bottom:16px">
      <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:6px">Subject</div>
      <div style="font-weight:600;color:var(--text);padding:10px 14px;background:var(--bg);border-radius:8px">${subject || '—'}</div>
    </div>
    <div>
      <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:6px">Message</div>
      <div style="white-space:pre-wrap;color:var(--text);padding:16px;background:var(--bg);border-radius:8px;line-height:1.8;font-size:.95rem">${msg}</div>
    </div>
    <div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap">
      ${email ? '<a href="mailto:'+email+'" class="btn btn-primary btn-sm"><i class="fas fa-reply"></i> Reply via Email</a>' : ''}
      ${phone ? '<a href="tel:'+phone+'" class="btn btn-secondary btn-sm"><i class="fas fa-phone"></i> Call</a>' : ''}
      ${email ? '<a href="https://wa.me/'+phone.replace(/[^0-9]/g,'')+'" target="_blank" class="btn btn-secondary btn-sm" style="background:rgba(37,211,102,.1);color:#25d366"><i class="fab fa-whatsapp"></i> WhatsApp</a>' : ''}
    </div>`;
  openModal('msg-detail-modal');
  if (unread) {
    fetch('/api/messages/'+id+'/read', {method:'POST'});
  }
}

/* ── Custom Links ── */
document.getElementById('custom-link-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  data.sort_order = parseInt(data.sort_order)||0;
  data.open_new_tab = data.open_new_tab==='1' ? 1 : 0;
  const res = await api.post('/api/custom-links', data);
  if (res.success) { showToast('Link added!','success'); setTimeout(()=>location.reload(),500); }
  else showToast(res.error||'Error','error');
});

document.querySelectorAll('.delete-custom-link-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete this link?')) return;
    const res = await api.del('/api/custom-links/'+btn.dataset.id);
    if (res.success) { showToast('Deleted','success'); btn.closest('tr')?.remove(); }
  });
});

/* ── Site user registration toggle ── */
document.getElementById('registration-toggle')?.addEventListener('change', async function() {
  const res = await api.post('/api/settings', { users_can_register: this.checked ? '1' : '0' });
  showToast(this.checked ? 'Registration enabled for visitors' : 'Registration disabled', 'success');
});

/* ── show_scroll_progress toggle ── */
document.getElementById('scroll-progress-toggle')?.addEventListener('change', async function() {
  const res = await api.post('/api/settings', { show_scroll_progress: this.checked ? '1' : '0' });
  showToast('Saved!','success');
});

/* ── Blog rich editor toolbar ── */
function insertTag(id, open, close) {
  const ta = document.getElementById(id);
  if (!ta) return;
  const s = ta.selectionStart, e2 = ta.selectionEnd;
  const sel = ta.value.substring(s, e2);
  ta.value = ta.value.substring(0,s) + open + sel + close + ta.value.substring(e2);
  ta.focus();
  ta.setSelectionRange(s+open.length, s+open.length+sel.length);
}

function insertImg() {
  const url = prompt('Image URL (e.g. /static/uploads/blog/xyz.jpg):');
  if (!url) return;
  const alt = prompt('Alt text:') || 'Image';
  insertTag('blog-content','<img src="'+url+'" alt="'+alt+'" style="max-width:100%;border-radius:12px;margin:1.5em 0"/>','');
}

document.getElementById('preview-blog-btn')?.addEventListener('click', () => {
  const content = document.getElementById('blog-content')?.value || '';
  const title   = document.querySelector('#blog-form [name=title]')?.value || 'Preview';
  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${title}</title>
    <style>body{font-family:sans-serif;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.9;font-size:1.05rem;color:#1a1a2e}
    h1,h2,h3{font-family:Georgia,serif;margin:2em 0 .75em}blockquote{border-left:4px solid #00d4ff;padding:16px 24px;background:rgba(0,212,255,.05);border-radius:0 12px 12px 0;margin:2em 0;font-style:italic;color:#6b7280}
    code{background:#f0f4f8;color:#1a73e8;padding:2px 8px;border-radius:4px;font-size:.875em}pre{background:#0a2540;color:#e8edf5;padding:24px;border-radius:12px;overflow-x:auto}pre code{background:none;color:inherit;padding:0}
    img{max-width:100%;border-radius:12px;margin:1.5em 0}hr{border:none;border-top:1px solid #eee;margin:3em 0}</style></head><body>
    <h1>${title}</h1>${content}</body></html>`);
  win.document.close();
});

/* ── Announcement toggle ── */
document.getElementById('announcement-toggle')?.addEventListener('change', async function() {
  const res = await api.post('/api/settings', { announcement_enabled: this.checked ? '1' : '0' });
  showToast(this.checked ? 'Announcement bar visible' : 'Announcement bar hidden', 'success');
});

/* ── Maintenance toggle ── */
document.querySelector('#maintenance-form input[name=maintenance_mode]')?.addEventListener('change', function() {
  this.value = this.checked ? '1' : '0';
});
document.getElementById('maintenance-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd   = new FormData(e.target);
  const mode = fd.get('maintenance_mode')==='1' ? '1' : '0';
  const msg  = fd.get('maintenance_msg') || '';
  const res  = await api.post('/api/settings', { maintenance_mode: mode, maintenance_msg: msg });
  showToast(mode==='1' ? '⚠️ Maintenance mode ON' : 'Maintenance mode OFF', 'success');
});

/* ── Blog post CRUD ── */
document.getElementById('add-blog-btn')?.addEventListener('click', () => {
  document.getElementById('blog-form')?.reset();
  document.getElementById('blog-id').value = '';
  document.getElementById('blog-modal-title').textContent = 'New Blog Post';
  document.getElementById('blog-content').value = '';
  openModal('blog-modal');
});
document.querySelectorAll('.edit-blog-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const res  = await fetch('/api/blog');
    const list = await res.json();
    const post = list.find(x => x.id == btn.dataset.id);
    if (!post) return;
    const form = document.getElementById('blog-form');
    document.getElementById('blog-id').value = post.id;
    form.title.value    = post.title    || '';
    form.excerpt.value  = post.excerpt  || '';
    form.category.value = post.category || 'general';
    form.status.value   = post.status   || 'published';
    form.tags.value     = post.tags     || '';
    document.getElementById('blog-content').value = post.content || '';
    document.getElementById('blog-modal-title').textContent = 'Edit Blog Post';
    openModal('blog-modal');
  });
});
document.querySelectorAll('.delete-blog-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete this post?')) return;
    const res = await api.del('/api/blog/'+btn.dataset.id);
    if (res.success) { showToast('Deleted','success'); btn.closest('tr')?.remove(); }
  });
});
document.getElementById('blog-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled=true; btn.textContent='Saving...';
  try {
    const fd  = new FormData(e.target);
    const pid = document.getElementById('blog-id').value;
    const res = pid ? await api.formPut('/api/blog/'+pid, fd)
                    : await api.formPost('/api/blog', fd);
    if (res.success) {
      showToast(pid ? 'Post updated!':'Post created!','success');
      closeModal('blog-modal');
      setTimeout(()=>location.reload(),500);
    } else showToast(res.error||'Error','error');
  } catch { showToast('Upload error','error'); }
  btn.disabled=false; btn.textContent='Save Post';
});

/* ── Service CRUD ── */
document.getElementById('add-service-btn')?.addEventListener('click', () => {
  document.getElementById('service-form')?.reset();
  document.getElementById('service-id').value='';
  openModal('service-modal');
});
document.querySelectorAll('.edit-service-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const list = await (await fetch('/api/services')).json();
    const svc = list.find(x=>x.id==btn.dataset.id); if(!svc) return;
    const form=document.getElementById('service-form');
    document.getElementById('service-id').value=svc.id;
    form.title.value=svc.title||''; form.description.value=svc.description||'';
    form.icon.value=svc.icon||'fas fa-code'; form.price.value=svc.price||'';
    form.features.value=svc.features||''; form.sort_order.value=svc.sort_order||0;
    openModal('service-modal');
  });
});
document.querySelectorAll('.delete-service-btn').forEach(btn => {
  btn.addEventListener('click', async ()=>{
    if(!confirm('Delete?')) return;
    const res=await api.del('/api/services/'+btn.dataset.id);
    if(res.success){showToast('Deleted','success');btn.closest('tr')?.remove();}
  });
});
document.getElementById('service-form')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const pid=document.getElementById('service-id').value;
  const data=Object.fromEntries(new FormData(e.target)); data.sort_order=parseInt(data.sort_order)||0;
  const res=pid?await api.put('/api/services/'+pid,data):await api.post('/api/services',data);
  if(res.success){showToast('Saved!','success');closeModal('service-modal');setTimeout(()=>location.reload(),500);}
  else showToast('Error','error');
});

/* ── Achievement CRUD ── */
document.getElementById('add-achievement-btn')?.addEventListener('click',()=>{
  document.getElementById('achievement-form')?.reset();
  document.getElementById('achievement-id').value='';
  openModal('achievement-modal');
});
document.querySelectorAll('.edit-achievement-btn').forEach(btn=>{
  btn.addEventListener('click',async()=>{
    const list=await(await fetch('/api/achievements')).json();
    const a=list.find(x=>x.id==btn.dataset.id); if(!a) return;
    const form=document.getElementById('achievement-form');
    document.getElementById('achievement-id').value=a.id;
    form.title.value=a.title||''; form.value.value=a.value||'';
    form.icon.value=a.icon||'fas fa-trophy'; form.color.value=a.color||'#00d4ff';
    form.sort_order.value=a.sort_order||0;
    openModal('achievement-modal');
  });
});
document.querySelectorAll('.delete-achievement-btn').forEach(btn=>{
  btn.addEventListener('click',async()=>{
    if(!confirm('Delete?')) return;
    const res=await api.del('/api/achievements/'+btn.dataset.id);
    if(res.success){showToast('Deleted','success');btn.closest('tr')?.remove();}
  });
});
document.getElementById('achievement-form')?.addEventListener('submit',async(e)=>{
  e.preventDefault();
  const pid=document.getElementById('achievement-id').value;
  const data=Object.fromEntries(new FormData(e.target)); data.sort_order=parseInt(data.sort_order)||0;
  const res=pid?await api.put('/api/achievements/'+pid,data):await api.post('/api/achievements',data);
  if(res.success){showToast('Saved!','success');closeModal('achievement-modal');setTimeout(()=>location.reload(),500);}
  else showToast('Error','error');
});

/* ── Announcement form ── */
document.getElementById('announcement-form')?.addEventListener('submit',async(e)=>{
  e.preventDefault();
  const data=Object.fromEntries(new FormData(e.target));
  const res=await api.post('/api/announcements',data);
  if(res.success){showToast('Announcement set!','success');setTimeout(()=>location.reload(),500);}
  else showToast('Error','error');
});
document.querySelectorAll('.delete-announcement-btn').forEach(btn=>{
  btn.addEventListener('click',async()=>{
    if(!confirm('Delete?')) return;
    const res=await api.del('/api/announcements/'+btn.dataset.id);
    if(res.success){showToast('Deleted','success');btn.closest('tr')?.remove();}
  });
});

/* ── Favicon ── */
document.getElementById('favicon-form')?.addEventListener('submit',async(e)=>{
  e.preventDefault();
  const btn=e.target.querySelector('button[type=submit]');
  btn.disabled=true; btn.textContent='Uploading...';
  try {
    const res=await api.formPost('/api/upload-favicon',new FormData(e.target));
    if(res.success){showToast('Favicon uploaded! Refresh to see it.','success');setTimeout(()=>location.reload(),800);}
    else showToast(res.error||'Error','error');
  } catch { showToast('Upload failed','error'); }
  btn.disabled=false; btn.textContent='Upload Favicon';
});

/* ── SEO form ── */
document.getElementById('seo-form')?.addEventListener('submit',async(e)=>{
  e.preventDefault();
  const data=Object.fromEntries(new FormData(e.target));
  const res=await api.post('/api/settings',data);
  showToast(res.success?'SEO settings saved!':'Error',res.success?'success':'error');
});
