/* ── Loading Screen ── */
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loading-screen')?.classList.add('hide');
  }, 1800);
});

/* ── Theme Toggle ── */
const root = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
let isDark = localStorage.getItem('theme') === 'dark';
function applyTheme() {
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  if (themeToggle) themeToggle.innerHTML = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}
applyTheme();
themeToggle?.addEventListener('click', () => { isDark = !isDark; applyTheme(); });

/* ── Navigation ── */
const nav = document.getElementById('main-nav');
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');
window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 60);
  document.getElementById('back-to-top')?.classList.toggle('visible', window.scrollY > 400);
});
hamburger?.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  mobileMenu?.classList.toggle('open');
});
document.querySelectorAll('.nav-link, .mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburger?.classList.remove('active');
    mobileMenu?.classList.remove('open');
  });
});

/* ── Back to Top ── */
document.getElementById('back-to-top')?.addEventListener('click', () =>
  window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ── Typing Effect ── */
const typedEl = document.getElementById('typed-text');
const phrases = window.TYPED_PHRASES || ['Full Stack Developer', 'AI Enthusiast', 'Problem Solver', 'Open Source Contributor'];
let pi = 0, ci = 0, deleting = false;
function typeEffect() {
  if (!typedEl) return;
  const word = phrases[pi];
  typedEl.textContent = deleting ? word.slice(0, ci--) : word.slice(0, ci++);
  let delay = deleting ? 60 : 100;
  if (!deleting && ci > word.length) { delay = 2000; deleting = true; }
  else if (deleting && ci < 0) { deleting = false; pi = (pi + 1) % phrases.length; delay = 400; }
  setTimeout(typeEffect, delay);
}
typeEffect();

/* ── Animated Counters ── */
function animateCounter(el) {
  const target = parseInt(el.dataset.target || el.textContent);
  const suffix = el.dataset.suffix || '';
  let current = 0;
  const step = Math.ceil(target / 60);
  el.dataset.target = target;
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current + suffix;
    if (current >= target) clearInterval(timer);
  }, 24);
}

/* ── Scroll Reveal ── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 80);
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => revealObserver.observe(el));

/* ── Counter Observer ── */
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(e.target);
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.counter-num, .stat-num').forEach(el => counterObserver.observe(el));

/* ── Skill Bar Animation ── */
const skillObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.skill-fill').forEach(bar => {
        bar.style.width = bar.dataset.width + '%';
      });
      skillObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.2 });
document.querySelectorAll('.skill-category').forEach(el => skillObserver.observe(el));

/* ── Project Filter & Search ── */
const filterBtns = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');
const searchInput = document.getElementById('project-search');

function filterProjects() {
  const active = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
  const query = searchInput?.value.toLowerCase() || '';
  projectCards.forEach(card => {
    const cat = card.dataset.category || '';
    const title = card.dataset.title?.toLowerCase() || '';
    const techs = card.dataset.techs?.toLowerCase() || '';
    const matchFilter = active === 'all' || cat === active;
    const matchSearch = !query || title.includes(query) || techs.includes(query);
    card.style.display = matchFilter && matchSearch ? '' : 'none';
  });
}

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterProjects();
  });
});
searchInput?.addEventListener('input', filterProjects);

/* ── Project Modal ── */
const projectModal = document.getElementById('project-modal');
document.querySelectorAll('.project-card').forEach(card => {
  card.addEventListener('click', async () => {
    const pid = card.dataset.id;
    if (!pid) return;
    try {
      const res = await fetch(`/api/projects/${pid}`);
      const p = await res.json();
      openProjectModal(p);
    } catch (e) { showToast('Failed to load project', 'error'); }
  });
});

function openProjectModal(p) {
  const modal = document.getElementById('project-modal');
  if (!modal) return;
  modal.querySelector('#modal-cover').src = p.cover_image ? `/static/${p.cover_image}` : '';
  modal.querySelector('#modal-cover').style.display = p.cover_image ? 'block' : 'none';
  modal.querySelector('#modal-title').textContent = p.title;
  modal.querySelector('#modal-date').textContent = p.date || '';
  modal.querySelector('#modal-desc').textContent = p.description || '';
  const techs = (p.technologies || '').split(',').filter(Boolean);
  modal.querySelector('#modal-techs').innerHTML = techs.map(t => `<span class="modal-tech">${t.trim()}</span>`).join('');
  const features = (p.features || '').split('\n').filter(Boolean);
  modal.querySelector('#modal-features-list').innerHTML = features.map(f => `<li>${f}</li>`).join('');
  modal.querySelector('#modal-github').href = p.github_link || '#';
  modal.querySelector('#modal-live').href = p.live_link || '#';
  modal.querySelector('#modal-github').style.display = p.github_link ? '' : 'none';
  modal.querySelector('#modal-live').style.display = p.live_link ? '' : 'none';
  openModal('project-modal');
}

/* ── Testimonials Slider ── */
let slideIndex = 0;
const track = document.querySelector('.testimonials-track');
const slides = document.querySelectorAll('.testimonial-card');
const dots = document.querySelectorAll('.slider-dot');

function goToSlide(i) {
  if (!track || slides.length === 0) return;
  slideIndex = (i + slides.length) % slides.length;
  track.style.transform = `translateX(calc(-${slideIndex * 100}% - ${slideIndex * 28}px))`;
  dots.forEach((d, idx) => d.classList.toggle('active', idx === slideIndex));
}

document.getElementById('prev-slide')?.addEventListener('click', () => goToSlide(slideIndex - 1));
document.getElementById('next-slide')?.addEventListener('click', () => goToSlide(slideIndex + 1));
dots.forEach((d, i) => d.addEventListener('click', () => goToSlide(i)));
if (slides.length > 1) setInterval(() => goToSlide(slideIndex + 1), 5000);

/* ── Gallery Lightbox ── */
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxVideo = document.getElementById('lightbox-video');

document.querySelectorAll('.gallery-item').forEach(item => {
  item.addEventListener('click', () => {
    const src = item.dataset.src;
    const type = item.dataset.type || 'image';
    if (type === 'video') {
      lightboxImg.style.display = 'none';
      lightboxVideo.style.display = 'block';
      lightboxVideo.src = src;
    } else {
      lightboxVideo.style.display = 'none';
      lightboxImg.style.display = 'block';
      lightboxImg.src = src;
    }
    lightbox?.classList.add('open');
  });
});
document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
function closeLightbox() {
  lightbox?.classList.remove('open');
  if (lightboxVideo) { lightboxVideo.pause(); lightboxVideo.src = ''; }
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
    const modal = btn.closest('.modal-overlay');
    if (modal) { modal.classList.remove('open'); document.body.style.overflow = ''; }
  });
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }
  });
});

/* ── Secret Admin Trigger ── */
let clickCount = 0, clickTimer = null;
document.getElementById('footer-trigger')?.addEventListener('click', () => {
  clickCount++;
  clearTimeout(clickTimer);
  clickTimer = setTimeout(() => { clickCount = 0; }, 10000);
  if (clickCount >= 5) {
    clickCount = 0;
    openModal('admin-login-modal');
  }
});

/* ── Admin Login ── */
document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = document.getElementById('admin-password').value;
  const errEl = document.getElementById('login-error');
  try {
    const res = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('admin-login-modal');
      window.location.href = '/admin';
    } else {
      errEl.textContent = 'Invalid password. Try again.';
      errEl.style.display = 'block';
    }
  } catch (err) {
    errEl.textContent = 'Connection error.';
    errEl.style.display = 'block';
  }
});

/* ── Password Toggle ── */
document.querySelectorAll('.password-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = btn.previousElementSibling;
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? '👁' : '🙈';
  });
});

/* ── Contact Form ── */
document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const msgEl = document.getElementById('form-msg');
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Sending...';
  const data = {
    name: form.name.value,
    email: form.email.value,
    phone: form.phone?.value || '',
    subject: form.subject.value,
    message: form.message.value
  };
  try {
    const res = await fetch('/api/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      msgEl.textContent = '✓ Message sent! I\'ll get back to you soon.';
      msgEl.className = 'form-msg success';
      form.reset();
    } else throw new Error();
  } catch {
    msgEl.textContent = '✗ Something went wrong. Please try again.';
    msgEl.className = 'form-msg error';
  }
  btn.disabled = false; btn.textContent = 'Send Message';
  msgEl.style.display = 'block';
  setTimeout(() => { msgEl.style.display = 'none'; }, 5000);
});

/* ── Resume QR ── */
async function loadQR() {
  const el = document.getElementById('resume-qr');
  if (!el) return;
  try {
    const res = await fetch('/api/resume/qr');
    const data = await res.json();
    el.src = data.qr;
  } catch (e) { console.log('QR load failed'); }
}
loadQR();

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

/* ── Lazy Load Images ── */
if ('IntersectionObserver' in window) {
  const imgObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const img = e.target;
        if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
        imgObserver.unobserve(img);
      }
    });
  });
  document.querySelectorAll('img[data-src]').forEach(img => imgObserver.observe(img));
}

/* ── Active nav link on scroll ── */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 120) current = s.id;
  });
  navLinks.forEach(a => {
    a.classList.toggle('active-nav', a.getAttribute('href') === `#${current}`);
  });
}, { passive: true });
