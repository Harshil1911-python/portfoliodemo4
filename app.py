import os, json, sqlite3, secrets, io, base64, re as _re, time, hashlib
from datetime import datetime, date, timedelta
from functools import wraps
from collections import defaultdict
from flask import (Flask, render_template, request, jsonify, session,
                   redirect, url_for, abort, Response, g)
from werkzeug.security import generate_password_hash, check_password_hash
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
try:
    import qrcode
    HAS_QRCODE = True
except ImportError:
    HAS_QRCODE = False

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
RENDER_DISK   = '/opt/render/project/src/static/uploads'
LOCAL_UPLOAD  = os.path.join(BASE_DIR, 'static', 'uploads')
UPLOAD_FOLDER = RENDER_DISK if os.path.exists('/opt/render') else LOCAL_UPLOAD

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['UPLOAD_FOLDER']        = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH']   = 50 * 1024 * 1024
app.config['SESSION_COOKIE_HTTPONLY']  = True
app.config['SESSION_COOKIE_SAMESITE']  = 'Lax'
app.config['SESSION_COOKIE_SECURE']    = os.environ.get('FLASK_ENV') == 'production'

ALLOWED_IMAGE = {'png','jpg','jpeg','gif','webp','svg'}
ALLOWED_DOC   = {'pdf'}
ALLOWED_VIDEO = {'mp4','webm','ogg'}
DB_PATH = os.path.join(BASE_DIR, 'database.db')

# ── In-memory rate limiter ────────────────────────────────────────────────────
_rate_store: dict = defaultdict(list)

def rate_limit(max_calls: int, window: int):
    """Decorator: max_calls per window seconds per IP."""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            ip  = request.headers.get('X-Forwarded-For','').split(',')[0].strip() or request.remote_addr
            key = f"{f.__name__}:{ip}"
            now = time.time()
            _rate_store[key] = [t for t in _rate_store[key] if now - t < window]
            if len(_rate_store[key]) >= max_calls:
                return jsonify({'error':'Too many requests. Please wait.'}), 429
            _rate_store[key].append(now)
            return f(*args, **kwargs)
        return wrapped
    return decorator

# ── Input validators ──────────────────────────────────────────────────────────
def sanitize(text, max_len=2000):
    """Strip dangerous chars, limit length."""
    if not isinstance(text, str): return ''
    text = text.strip()[:max_len]
    # Remove script tags and event handlers
    text = _re.sub(r'<script[\s\S]*?</script>', '', text, flags=_re.IGNORECASE)
    text = _re.sub(r'on\w+\s*=\s*["\'][^"\']*["\']', '', text, flags=_re.IGNORECASE)
    return text

def valid_email(email):
    return bool(_re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', (email or '').strip()))

def valid_url(url):
    return bool(_re.match(r'^https?://', (url or '').strip()))

# ── DB ────────────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    with get_db() as db:
        with open(os.path.join(BASE_DIR, 'schema.sql')) as f:
            db.executescript(f.read())
        if not db.execute("SELECT id FROM users LIMIT 1").fetchone():
            db.execute("INSERT INTO users (username,password_hash) VALUES (?,?)",
                       ('admin', generate_password_hash('admin123')))
        defaults = {
            'site_name':'Harshil Sandip Khandhar',
            'nav_logo':'H.Khandhar',
            'footer_name':'Harshil Sandip Khandhar',
            'tagline':'Full Stack Developer | AI Enthusiast | Problem Solver',
            'bio':'Passionate developer crafting innovative digital experiences.',
            'email':'harshil@example.com','phone':'+91 98765 43210','location':'Gujarat, India',
            'profile_photo':'','cover_image':'',
            'github':'','linkedin':'','twitter':'','instagram':'',
            'youtube':'','dribbble':'','behance':'',
            'primary_color':'#0a2540','secondary_color':'#1a73e8','accent_color':'#00d4ff',
            'font_heading':'Playfair Display','font_body':'DM Sans',
            'about_text':'I am a passionate software developer.',
            'about_section_title':'Crafting Digital Experiences with Passion',
            'contact_section_title':"Let's Work Together",
            'years_experience':'3','projects_completed':'25','clients_served':'15',
            'typing_phrases':'Full Stack Developer|AI Enthusiast|Problem Solver|Open Source Contributor',
            'section_about':'1','section_skills':'1','section_portfolio':'1',
            'section_collaborations':'1','section_experience':'1','section_certifications':'1',
            'section_testimonials':'1','section_gallery':'1','section_resume':'1',
            'section_contact':'1','section_blog':'1','section_services':'1','section_achievements':'1',
            'custom_html_head':'','custom_html_body':'','custom_css':'',
            'selling_mode':'0','selling_price':'$99','selling_title':'Get This Portfolio',
            'selling_desc':'A premium portfolio website.','selling_features':'Full admin|Mobile responsive|Dark mode',
            'selling_contact_email':'','selling_demo_url':'',
            'favicon':'','seo_keywords':'','og_image':'',
            'google_analytics_id':'','tawk_id':'',
            'whatsapp':'','whatsapp_float':'0','whatsapp_msg':'Hi! I saw your portfolio.',
            'announcement_enabled':'0','maintenance_mode':'0',
            'maintenance_msg':'Site under maintenance. Back soon!',
            'users_can_register':'0',
            'hero_btn1_text':'Contact Me','hero_btn2_text':'Download CV',
            'card_style':'rounded','btn_style':'pill',
            'show_back_to_top':'1','show_scroll_progress':'1',
            'footer_copyright':'All rights reserved.',
        }
        for k, v in defaults.items():
            db.execute("INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)", (k, v))
        db.commit()

def all_settings():
    with get_db() as db:
        return {r['key']: r['value'] for r in db.execute("SELECT key,value FROM settings")}

def allowed_file(fn, kinds):
    return '.' in fn and fn.rsplit('.',1)[1].lower() in kinds

def save_upload(file, subfolder=''):
    if not file or not file.filename: return None
    ext = file.filename.rsplit('.',1)[-1].lower() if '.' in file.filename else ''
    if not ext: return None
    folder = os.path.join(app.config['UPLOAD_FOLDER'], subfolder)
    os.makedirs(folder, exist_ok=True)
    fname = secrets.token_hex(10) + '.' + ext
    fpath = os.path.join(folder, fname)
    try: file.save(fpath)
    except Exception as e: app.logger.error(f"Upload failed: {e}"); return None
    if HAS_PIL and ext in ALLOWED_IMAGE - {'svg','gif'}:
        try:
            img = Image.open(fpath)
            if ext in {'jpg','jpeg'} and img.mode in ('RGBA','P'):
                img = img.convert('RGB')
            img.save(fpath, optimize=True, quality=85)
        except Exception: pass
    return os.path.relpath(fpath, os.path.join(BASE_DIR,'static')).replace('\\','/')

def track_visit():
    ip = request.headers.get('X-Forwarded-For','').split(',')[0].strip() or request.remote_addr
    today = date.today().isoformat()
    try:
        with get_db() as db:
            db.execute("INSERT INTO visitors (ip,user_agent) VALUES (?,?)",
                       (ip, request.headers.get('User-Agent','')[:300]))
            db.execute("""INSERT INTO analytics (date,total_visits,unique_visits)
                          VALUES (?,1,0) ON CONFLICT(date)
                          DO UPDATE SET total_visits=total_visits+1""", (today,))
            uniq = db.execute("SELECT COUNT(DISTINCT ip) FROM visitors WHERE DATE(visited_at)=?",(today,)).fetchone()[0]
            db.execute("UPDATE analytics SET unique_visits=? WHERE date=?", (uniq, today))
            db.commit()
    except Exception: pass

def slugify(text):
    text = text.lower().strip()
    text = _re.sub(r'[^\w\s-]', '', text)
    text = _re.sub(r'[\s_-]+', '-', text)
    return _re.sub(r'^-+|-+$', '', text) or secrets.token_hex(4)

# ── Security headers ──────────────────────────────────────────────────────────
@app.after_request
def add_security_headers(resp):
    resp.headers['X-Content-Type-Options'] = 'nosniff'
    resp.headers['X-Frame-Options']        = 'SAMEORIGIN'
    resp.headers['X-XSS-Protection']       = '1; mode=block'
    resp.headers['Referrer-Policy']        = 'strict-origin-when-cross-origin'
    # Block source viewing hint (JS obfuscation handled separately)
    if resp.content_type and 'text/html' in resp.content_type:
        resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate'
    return resp

# ── Auth ──────────────────────────────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin'):
            return jsonify({'error':'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

# ── Maintenance ───────────────────────────────────────────────────────────────
@app.before_request
def check_maintenance():
    skip = ('/admin','/api/login','/api/user','/static',
            '/api/logout','/login','/register','/blog')
    if any(request.path.startswith(p) for p in skip): return
    s = all_settings()
    if s.get('maintenance_mode','0')=='1' and not session.get('admin'):
        return render_template('maintenance.html',
                               msg=s.get('maintenance_msg','Under maintenance'), s=s), 503

# ── Template context ──────────────────────────────────────────────────────────
@app.context_processor
def inject_globals():
    """Inject computed display values — no raw secrets ever sent to template."""
    return dict(
        current_year=date.today().year,
        site_user=session.get('site_user'),
    )

# ── PUBLIC ROUTES ─────────────────────────────────────────────────────────────
@app.route('/')
def index():
    track_visit()
    s = all_settings()
    with get_db() as db:
        projects       = db.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
        skills         = db.execute("SELECT * FROM skills ORDER BY category,level DESC").fetchall()
        experience     = db.execute("SELECT * FROM experience ORDER BY sort_order,start_date DESC").fetchall()
        certifications = db.execute("SELECT * FROM certifications ORDER BY date DESC").fetchall()
        testimonials   = db.execute("SELECT * FROM testimonials ORDER BY created_at DESC").fetchall()
        gallery        = db.execute("SELECT * FROM gallery ORDER BY created_at DESC").fetchall()
        collaborations = db.execute("SELECT * FROM collaborations ORDER BY created_at DESC").fetchall()
        resume_row     = db.execute("SELECT * FROM resume ORDER BY updated_at DESC LIMIT 1").fetchone()
        services_rows  = db.execute("SELECT * FROM services ORDER BY sort_order").fetchall()
        achievements_r = db.execute("SELECT * FROM achievements ORDER BY sort_order").fetchall()
        blog_rows      = db.execute("SELECT * FROM blog_posts WHERE status='published' ORDER BY created_at DESC LIMIT 6").fetchall()
        announcement   = db.execute("SELECT * FROM announcements WHERE is_active=1 LIMIT 1").fetchone()
        custom_links   = db.execute("SELECT * FROM custom_links WHERE is_active=1 ORDER BY sort_order").fetchall()
    return render_template('index.html', s=s, projects=projects, skills=skills,
                           experience=experience, certifications=certifications,
                           testimonials=testimonials, gallery=gallery,
                           collaborations=collaborations, resume=resume_row,
                           services=services_rows, achievements=achievements_r,
                           blog_posts=blog_rows, announcement=announcement,
                           custom_links=custom_links)

@app.route('/admin')
def admin():
    if not session.get('admin'): return redirect('/?admin_login=1')
    s = all_settings()
    with get_db() as db:
        messages          = db.execute("SELECT * FROM messages ORDER BY created_at DESC").fetchall()
        projects          = db.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
        skills            = db.execute("SELECT * FROM skills ORDER BY category").fetchall()
        experience        = db.execute("SELECT * FROM experience ORDER BY sort_order").fetchall()
        certs             = db.execute("SELECT * FROM certifications ORDER BY date DESC").fetchall()
        testimonials      = db.execute("SELECT * FROM testimonials ORDER BY created_at DESC").fetchall()
        gallery           = db.execute("SELECT * FROM gallery ORDER BY created_at DESC").fetchall()
        collabs           = db.execute("SELECT * FROM collaborations ORDER BY created_at DESC").fetchall()
        resume_row        = db.execute("SELECT * FROM resume ORDER BY updated_at DESC LIMIT 1").fetchone()
        blog_posts_all    = db.execute("SELECT * FROM blog_posts ORDER BY created_at DESC").fetchall()
        services_all      = db.execute("SELECT * FROM services ORDER BY sort_order").fetchall()
        achievements_all  = db.execute("SELECT * FROM achievements ORDER BY sort_order").fetchall()
        announcements_all = db.execute("SELECT * FROM announcements ORDER BY created_at DESC").fetchall()
        custom_links_all  = db.execute("SELECT * FROM custom_links ORDER BY sort_order").fetchall()
        site_users_all    = db.execute("SELECT id,name,email,created_at FROM site_users ORDER BY created_at DESC").fetchall()
        analytics_rows    = [dict(r) for r in db.execute("SELECT * FROM analytics ORDER BY date DESC LIMIT 30").fetchall()]
        unread        = db.execute("SELECT COUNT(*) as c FROM messages WHERE is_read=0").fetchone()['c']
        total_visits  = db.execute("SELECT COALESCE(SUM(total_visits),0) as t FROM analytics").fetchone()['t']
        total_dl      = db.execute("SELECT COALESCE(SUM(resume_downloads),0) as t FROM analytics").fetchone()['t']
        top_proj      = db.execute("""SELECT p.title,COUNT(pv.id) as views FROM project_views pv
                                       JOIN projects p ON p.id=pv.project_id
                                       GROUP BY pv.project_id ORDER BY views DESC LIMIT 1""").fetchone()
    # Strip secrets from s before passing to template
    safe_s = {k: v for k, v in s.items()
              if k not in ('google_analytics_id','tawk_id','custom_html_head','custom_html_body')}
    return render_template('admin.html', s=s, safe_s=safe_s,
                           messages=messages, projects=projects,
                           skills=skills, experience=experience, certs=certs,
                           testimonials=testimonials, gallery=gallery, collabs=collabs,
                           resume=resume_row, analytics=analytics_rows,
                           unread=unread, total_visits=total_visits, total_downloads=total_dl,
                           top_project=top_proj, blog_posts=blog_posts_all,
                           services=services_all, achievements=achievements_all,
                           announcements=announcements_all, custom_links=custom_links_all,
                           site_users=site_users_all)

# ── Auth API ──────────────────────────────────────────────────────────────────
@app.route('/api/login', methods=['POST'])
@rate_limit(5, 60)   # 5 attempts per minute
def api_login():
    data = request.get_json() or {}
    pw   = sanitize(data.get('password',''), max_len=200)
    with get_db() as db:
        user = db.execute("SELECT * FROM users LIMIT 1").fetchone()
    if user and pw and check_password_hash(user['password_hash'], pw):
        session['admin'] = True; session.permanent = True
        return jsonify({'success':True})
    # Delay on failure to slow brute-force
    time.sleep(0.8)
    return jsonify({'success':False,'error':'Invalid password'}), 401

@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear(); return jsonify({'success':True})

@app.route('/api/change-password', methods=['POST'])
@login_required
def change_password():
    pw = sanitize((request.get_json() or {}).get('password',''), 200)
    if len(pw) < 6: return jsonify({'error':'Min 6 characters'}), 400
    with get_db() as db:
        db.execute("UPDATE users SET password_hash=? WHERE id=1", (generate_password_hash(pw),))
        db.commit()
    return jsonify({'success':True})

# ── Site user auth ────────────────────────────────────────────────────────────
@app.route('/register', methods=['GET','POST'])
def register():
    s = all_settings()
    if s.get('users_can_register','0') != '1': return redirect('/')
    if request.method == 'POST':
        name  = sanitize(request.form.get('name',''), 100)
        email = sanitize(request.form.get('email',''), 200).lower()
        pw    = request.form.get('password','')
        if not name or not valid_email(email) or len(pw) < 6:
            return render_template('register.html', s=s, error='Please fill all fields correctly.')
        with get_db() as db:
            if db.execute("SELECT id FROM site_users WHERE email=?", (email,)).fetchone():
                return render_template('register.html', s=s, error='Email already registered.')
            db.execute("INSERT INTO site_users (name,email,password_hash) VALUES (?,?,?)",
                       (name, email, generate_password_hash(pw)))
            db.commit()
        return redirect('/login?registered=1')
    return render_template('register.html', s=s)

@app.route('/login', methods=['GET','POST'])
@rate_limit(10, 60)
def site_login():
    s = all_settings()
    if request.method == 'POST':
        email = sanitize(request.form.get('email',''), 200).lower()
        pw    = request.form.get('password','')
        with get_db() as db:
            user = db.execute("SELECT * FROM site_users WHERE email=?", (email,)).fetchone()
        if user and check_password_hash(user['password_hash'], pw):
            session['site_user'] = {'id':user['id'],'name':user['name'],'email':user['email']}
            return redirect(sanitize(request.args.get('next','/'), 200) or '/')
        time.sleep(0.5)
        return render_template('login.html', s=s, error='Invalid email or password.')
    return render_template('login.html', s=s)

@app.route('/logout')
def site_logout():
    session.pop('site_user', None); return redirect('/')

# ── Settings API ──────────────────────────────────────────────────────────────
@app.route('/api/settings', methods=['POST'])
@login_required
def update_settings():
    data = request.get_json() or {}
    # Allowed keys whitelist — never expose server internals via settings
    ALLOWED_KEYS = {
        'site_name','nav_logo','footer_name','tagline','bio','email','phone','location',
        'github','linkedin','twitter','instagram','youtube','dribbble','behance',
        'primary_color','secondary_color','accent_color','font_heading','font_body',
        'about_text','about_section_title','contact_section_title',
        'years_experience','projects_completed','clients_served',
        'typing_phrases','custom_html_head','custom_html_body','custom_css',
        'selling_mode','selling_price','selling_title','selling_desc',
        'selling_features','selling_contact_email','selling_demo_url',
        'seo_keywords','og_image','google_analytics_id','tawk_id',
        'whatsapp','whatsapp_float','whatsapp_msg',
        'announcement_enabled','maintenance_mode','maintenance_msg',
        'users_can_register','hero_btn1_text','hero_btn2_text',
        'card_style','btn_style','show_back_to_top','show_scroll_progress',
        'footer_copyright','favicon',
    } | {f'section_{s}' for s in [
        'about','skills','portfolio','collaborations','experience',
        'certifications','testimonials','gallery','resume','contact',
        'blog','services','achievements'
    ]}
    with get_db() as db:
        for k, v in data.items():
            if k in ALLOWED_KEYS:
                db.execute("INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP)",
                           (k, sanitize(str(v), 5000)))
        db.commit()
    return jsonify({'success':True})

@app.route('/api/upload-profile', methods=['POST'])
@login_required
def upload_profile():
    saved = {}
    for field in ('profile_photo','cover_image'):
        f = request.files.get(field)
        if f and f.filename and allowed_file(f.filename, ALLOWED_IMAGE):
            path = save_upload(f,'profiles')
            if path:
                with get_db() as db:
                    db.execute("INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)",(field,path))
                    db.commit()
                saved[field] = path
    return jsonify({'success':True,'saved':saved})

@app.route('/api/upload-favicon', methods=['POST'])
@login_required
def upload_favicon():
    f = request.files.get('favicon')
    if not f or not f.filename: return jsonify({'error':'No file'}), 400
    ext = f.filename.rsplit('.',1)[-1].lower() if '.' in f.filename else ''
    if ext not in {'ico','png','jpg','jpeg','svg'}:
        return jsonify({'error':'Invalid format'}), 400
    folder = os.path.join(BASE_DIR, 'static', 'favicon')
    os.makedirs(folder, exist_ok=True)
    fpath = os.path.join(folder, f'favicon.{ext}')
    f.save(fpath)
    rel = f'favicon/favicon.{ext}'
    with get_db() as db:
        db.execute("INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)",('favicon', rel))
        db.commit()
    return jsonify({'success':True,'path':rel})

# ── Custom links ──────────────────────────────────────────────────────────────
@app.route('/api/custom-links', methods=['GET'])
def get_custom_links():
    with get_db() as db:
        return jsonify([dict(r) for r in db.execute("SELECT * FROM custom_links ORDER BY sort_order")])

@app.route('/api/custom-links', methods=['POST'])
@login_required
def create_custom_link():
    d = request.get_json() or {}
    label = sanitize(d.get('label',''), 100)
    url   = sanitize(d.get('url',''), 500)
    if not label or not url:
        return jsonify({'error':'Label and URL required'}), 400
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO custom_links (label,url,icon,location,open_new_tab,sort_order,is_active) VALUES (?,?,?,?,?,?,1)",
            (label, url, sanitize(d.get('icon','fas fa-link'),50),
             sanitize(d.get('location','navbar'),20),
             int(bool(d.get('open_new_tab',1))), int(d.get('sort_order',0))))
        db.commit()
        return jsonify({'success':True,'id':cur.lastrowid})

@app.route('/api/custom-links/<int:lid>', methods=['DELETE'])
@login_required
def delete_custom_link(lid):
    with get_db() as db:
        db.execute("DELETE FROM custom_links WHERE id=?", (lid,)); db.commit()
    return jsonify({'success':True})

# ── Projects ──────────────────────────────────────────────────────────────────
@app.route('/api/projects', methods=['GET'])
def get_projects():
    with get_db() as db:
        return jsonify([dict(r) for r in db.execute("SELECT * FROM projects ORDER BY created_at DESC")])

@app.route('/api/projects/<int:pid>', methods=['GET'])
def get_project(pid):
    with get_db() as db:
        row = db.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
        if not row: return jsonify({'error':'Not found'}), 404
        images = db.execute("SELECT * FROM project_images WHERE project_id=?", (pid,)).fetchall()
        db.execute("INSERT INTO project_views (project_id) VALUES (?)", (pid,)); db.commit()
        return jsonify({**dict(row),'images':[dict(i) for i in images]})

@app.route('/api/projects', methods=['POST'])
@login_required
def create_project():
    d = request.form
    cover = request.files.get('cover_image')
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO projects (title,description,technologies,github_link,live_link,features,cover_image,status,date,category) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (sanitize(d.get('title',''),200), sanitize(d.get('description',''),2000),
             sanitize(d.get('technologies',''),500), sanitize(d.get('github_link',''),500),
             sanitize(d.get('live_link',''),500), sanitize(d.get('features',''),2000),
             save_upload(cover,'projects') or '' if cover and cover.filename else '',
             sanitize(d.get('status','completed'),20), sanitize(d.get('date',''),50),
             sanitize(d.get('category','web'),20)))
        db.commit(); return jsonify({'success':True,'id':cur.lastrowid})

@app.route('/api/projects/<int:pid>', methods=['PUT'])
@login_required
def update_project(pid):
    d = request.form; cover = request.files.get('cover_image')
    with get_db() as db:
        row = db.execute("SELECT cover_image FROM projects WHERE id=?", (pid,)).fetchone()
        cover_path = row['cover_image'] if row else ''
        if cover and cover.filename and allowed_file(cover.filename, ALLOWED_IMAGE):
            saved = save_upload(cover,'projects')
            if saved: cover_path = saved
        db.execute(
            "UPDATE projects SET title=?,description=?,technologies=?,github_link=?,live_link=?,features=?,cover_image=?,status=?,date=?,category=? WHERE id=?",
            (sanitize(d.get('title',''),200), sanitize(d.get('description',''),2000),
             sanitize(d.get('technologies',''),500), sanitize(d.get('github_link',''),500),
             sanitize(d.get('live_link',''),500), sanitize(d.get('features',''),2000),
             cover_path, sanitize(d.get('status',''),20),
             sanitize(d.get('date',''),50), sanitize(d.get('category',''),20), pid))
        db.commit()
    return jsonify({'success':True})

@app.route('/api/projects/<int:pid>', methods=['DELETE'])
@login_required
def delete_project(pid):
    with get_db() as db:
        db.execute("DELETE FROM projects WHERE id=?", (pid,)); db.commit()
    return jsonify({'success':True})

# ── Skills ────────────────────────────────────────────────────────────────────
@app.route('/api/skills', methods=['GET'])
def get_skills():
    with get_db() as db:
        return jsonify([dict(r) for r in db.execute("SELECT * FROM skills ORDER BY category,level DESC")])

@app.route('/api/skills', methods=['POST'])
@login_required
def create_skill():
    d = request.get_json() or {}
    with get_db() as db:
        cur = db.execute("INSERT INTO skills (name,level,category,icon) VALUES (?,?,?,?)",
                         (sanitize(d.get('name',''),100), min(100,max(0,int(d.get('level',80)))),
                          sanitize(d.get('category','programming'),30), sanitize(d.get('icon',''),60)))
        db.commit(); return jsonify({'success':True,'id':cur.lastrowid})

@app.route('/api/skills/<int:sid>', methods=['PUT'])
@login_required
def update_skill(sid):
    d = request.get_json() or {}
    with get_db() as db:
        db.execute("UPDATE skills SET name=?,level=?,category=?,icon=? WHERE id=?",
                   (sanitize(d.get('name',''),100), min(100,max(0,int(d.get('level',80)))),
                    sanitize(d.get('category',''),30), sanitize(d.get('icon',''),60), sid))
        db.commit()
    return jsonify({'success':True})

@app.route('/api/skills/<int:sid>', methods=['DELETE'])
@login_required
def delete_skill(sid):
    with get_db() as db:
        db.execute("DELETE FROM skills WHERE id=?", (sid,)); db.commit()
    return jsonify({'success':True})

# ── Experience ────────────────────────────────────────────────────────────────
@app.route('/api/experience', methods=['GET'])
def get_experience():
    with get_db() as db:
        return jsonify([dict(r) for r in db.execute("SELECT * FROM experience ORDER BY sort_order,start_date DESC")])

@app.route('/api/experience', methods=['POST'])
@login_required
def create_experience():
    d = request.get_json() or {}
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO experience (position,company,duration,start_date,end_date,description,location,sort_order) VALUES (?,?,?,?,?,?,?,?)",
            (sanitize(d.get('position',''),200), sanitize(d.get('company',''),200),
             sanitize(d.get('duration',''),100), sanitize(d.get('start_date',''),20),
             sanitize(d.get('end_date',''),20), sanitize(d.get('description',''),2000),
             sanitize(d.get('location',''),200), int(d.get('sort_order',0))))
        db.commit(); return jsonify({'success':True,'id':cur.lastrowid})

@app.route('/api/experience/<int:eid>', methods=['PUT'])
@login_required
def update_experience(eid):
    d = request.get_json() or {}
    with get_db() as db:
        db.execute(
            "UPDATE experience SET position=?,company=?,duration=?,start_date=?,end_date=?,description=?,location=?,sort_order=? WHERE id=?",
            (sanitize(d.get('position',''),200), sanitize(d.get('company',''),200),
             sanitize(d.get('duration',''),100), sanitize(d.get('start_date',''),20),
             sanitize(d.get('end_date',''),20), sanitize(d.get('description',''),2000),
             sanitize(d.get('location',''),200), int(d.get('sort_order',0)), eid))
        db.commit()
    return jsonify({'success':True})

@app.route('/api/experience/<int:eid>', methods=['DELETE'])
@login_required
def delete_experience(eid):
    with get_db() as db:
        db.execute("DELETE FROM experience WHERE id=?", (eid,)); db.commit()
    return jsonify({'success':True})

# ── Certifications ────────────────────────────────────────────────────────────
@app.route('/api/certifications', methods=['GET'])
def get_certs():
    with get_db() as db:
        return jsonify([dict(r) for r in db.execute("SELECT * FROM certifications ORDER BY date DESC")])

@app.route('/api/certifications', methods=['POST'])
@login_required
def create_cert():
    d = request.form
    img = request.files.get('image'); pdf = request.files.get('pdf')
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO certifications (title,organization,date,image,pdf,credential_url) VALUES (?,?,?,?,?,?)",
            (sanitize(d.get('title',''),200), sanitize(d.get('organization',''),200),
             sanitize(d.get('date',''),50),
             save_upload(img,'certs') or '' if img and img.filename else '',
             save_upload(pdf,'certs') or '' if pdf and pdf.filename else '',
             sanitize(d.get('credential_url',''),500)))
        db.commit(); return jsonify({'success':True,'id':cur.lastrowid})

@app.route('/api/certifications/<int:cid>', methods=['DELETE'])
@login_required
def delete_cert(cid):
    with get_db() as db:
        db.execute("DELETE FROM certifications WHERE id=?", (cid,)); db.commit()
    return jsonify({'success':True})

# ── Testimonials ──────────────────────────────────────────────────────────────
@app.route('/api/testimonials', methods=['GET'])
def get_testimonials():
    with get_db() as db:
        return jsonify([dict(r) for r in db.execute("SELECT * FROM testimonials ORDER BY created_at DESC")])

@app.route('/api/testimonials', methods=['POST'])
@login_required
def create_testimonial():
    d = request.form; img = request.files.get('image')
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO testimonials (name,position,company,message,rating,image) VALUES (?,?,?,?,?,?)",
            (sanitize(d.get('name',''),100), sanitize(d.get('position',''),100),
             sanitize(d.get('company',''),100), sanitize(d.get('message',''),2000),
             min(5,max(1,int(d.get('rating',5)))),
             save_upload(img,'testimonials') or '' if img and img.filename else ''))
        db.commit(); return jsonify({'success':True,'id':cur.lastrowid})

@app.route('/api/testimonials/<int:tid>', methods=['DELETE'])
@login_required
def delete_testimonial(tid):
    with get_db() as db:
        db.execute("DELETE FROM testimonials WHERE id=?", (tid,)); db.commit()
    return jsonify({'success':True})

# ── Gallery ───────────────────────────────────────────────────────────────────
@app.route('/api/gallery', methods=['GET'])
def get_gallery():
    with get_db() as db:
        return jsonify([dict(r) for r in db.execute("SELECT * FROM gallery ORDER BY created_at DESC")])

@app.route('/api/gallery', methods=['POST'])
@login_required
def upload_gallery():
    f = request.files.get('file')
    if not f or not f.filename: return jsonify({'error':'No file'}), 400
    ext  = f.filename.rsplit('.',1)[-1].lower() if '.' in f.filename else ''
    path = save_upload(f,'gallery')
    if not path: return jsonify({'error':'Upload failed'}), 500
    with get_db() as db:
        cur = db.execute("INSERT INTO gallery (title,file_path,file_type,category) VALUES (?,?,?,?)",
                         (sanitize(request.form.get('title',''),200), path,
                          'video' if ext in ALLOWED_VIDEO else 'image',
                          sanitize(request.form.get('category','general'),30)))
        db.commit(); return jsonify({'success':True,'id':cur.lastrowid})

@app.route('/api/gallery/<int:gid>', methods=['DELETE'])
@login_required
def delete_gallery(gid):
    with get_db() as db:
        db.execute("DELETE FROM gallery WHERE id=?", (gid,)); db.commit()
    return jsonify({'success':True})

# ── Collaborations ────────────────────────────────────────────────────────────
@app.route('/api/collaborations', methods=['GET'])
def get_collabs():
    with get_db() as db:
        return jsonify([dict(r) for r in db.execute("SELECT * FROM collaborations ORDER BY created_at DESC")])

@app.route('/api/collaborations', methods=['POST'])
@login_required
def create_collab():
    d = request.form
    logo = request.files.get('logo'); cover = request.files.get('cover_image')
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO collaborations (type,name,description,logo,cover_image,website,social_links) VALUES (?,?,?,?,?,?,?)",
            (sanitize(d.get('type','company'),20), sanitize(d.get('name',''),200),
             sanitize(d.get('description',''),2000),
             save_upload(logo,'collabs') or '' if logo and logo.filename else '',
             save_upload(cover,'collabs') or '' if cover and cover.filename else '',
             sanitize(d.get('website',''),500), sanitize(d.get('social_links',''),500)))
        db.commit(); return jsonify({'success':True,'id':cur.lastrowid})

@app.route('/api/collaborations/<int:cid>', methods=['DELETE'])
@login_required
def delete_collab(cid):
    with get_db() as db:
        db.execute("DELETE FROM collaborations WHERE id=?", (cid,)); db.commit()
    return jsonify({'success':True})

# ── Resume ────────────────────────────────────────────────────────────────────
@app.route('/api/resume/upload', methods=['POST'])
@login_required
def upload_resume():
    f = request.files.get('resume')
    if not f or not f.filename: return jsonify({'error':'No file'}), 400
    ext = f.filename.rsplit('.',1)[-1].lower() if '.' in f.filename else ''
    if ext not in ALLOWED_DOC | {'jpg','jpeg','png'}:
        return jsonify({'error':'Only PDF/JPG/PNG'}), 400
    path = save_upload(f,'resume')
    if not path: return jsonify({'error':'Upload failed'}), 500
    with get_db() as db:
        db.execute("INSERT INTO resume (file_path,file_type,download_count) VALUES (?,?,0)",
                   (path,'image' if ext in {'jpg','jpeg','png'} else 'pdf'))
        db.commit()
    return jsonify({'success':True,'path':path})

@app.route('/api/resume/download')
@rate_limit(20, 60)
def download_resume():
    today = date.today().isoformat()
    with get_db() as db:
        row = db.execute("SELECT * FROM resume ORDER BY updated_at DESC LIMIT 1").fetchone()
        if not row: abort(404)
        db.execute("UPDATE resume SET download_count=download_count+1 WHERE id=?", (row['id'],))
        db.execute("""INSERT INTO analytics (date,resume_downloads) VALUES (?,1)
                      ON CONFLICT(date) DO UPDATE SET resume_downloads=resume_downloads+1""", (today,))
        db.commit()
    from flask import send_from_directory
    file_path = os.path.join(BASE_DIR, 'static', row['file_path'])
    directory  = os.path.dirname(file_path)
    filename   = os.path.basename(file_path)
    return send_from_directory(directory, filename, as_attachment=True)

@app.route('/api/resume/qr')
def resume_qr():
    if not HAS_QRCODE: return jsonify({'qr':''}), 200
    img = qrcode.make(request.host_url.rstrip('/') + '/api/resume/download')
    buf = io.BytesIO(); img.save(buf, format='PNG')
    return jsonify({'qr':'data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode()})

# ── Blog ──────────────────────────────────────────────────────────────────────
@app.route('/blog')
def blog_index():
    track_visit(); s = all_settings()
    with get_db() as db:
        posts = db.execute("SELECT * FROM blog_posts WHERE status='published' ORDER BY created_at DESC").fetchall()
    return render_template('blog.html', s=s, posts=posts)

@app.route('/blog/<slug>')
def blog_post_page(slug):
    slug = sanitize(slug, 200)
    track_visit(); s = all_settings()
    with get_db() as db:
        post = db.execute("SELECT * FROM blog_posts WHERE slug=?", (slug,)).fetchone()
        if not post: abort(404)
        db.execute("UPDATE blog_posts SET views=views+1 WHERE id=?", (post['id'],)); db.commit()
        related = db.execute(
            "SELECT * FROM blog_posts WHERE status='published' AND id!=? AND category=? LIMIT 3",
            (post['id'],post['category'])).fetchall()
    return render_template('blog_post.html', s=s, post=post, related=related)

@app.route('/api/blog', methods=['GET'])
def get_blog_posts():
    with get_db() as db:
        return jsonify([dict(r) for r in db.execute("SELECT * FROM blog_posts ORDER BY created_at DESC")])

@app.route('/api/blog', methods=['POST'])
@login_required
def create_blog_post():
    d = request.form; cover = request.files.get('cover_image')
    title = sanitize(d.get('title',''), 300)
    if not title: return jsonify({'error':'Title required'}), 400
    slug  = slugify(title) + '-' + secrets.token_hex(3)
    raw   = d.get('content','')   # keep HTML as-is — admin-only
    read_time = max(1, len(_re.sub('<[^>]+>','',raw).split()) // 200)
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO blog_posts (title,slug,excerpt,content,cover_image,category,tags,status,read_time) VALUES (?,?,?,?,?,?,?,?,?)",
            (title, slug, sanitize(d.get('excerpt',''),500), raw,
             save_upload(cover,'blog') or '' if cover and cover.filename else '',
             sanitize(d.get('category','general'),30), sanitize(d.get('tags',''),200),
             sanitize(d.get('status','published'),20), read_time))
        db.commit()
    return jsonify({'success':True,'id':cur.lastrowid,'slug':slug})

@app.route('/api/blog/<int:bid>', methods=['PUT'])
@login_required
def update_blog_post(bid):
    d = request.form; cover = request.files.get('cover_image')
    with get_db() as db:
        row = db.execute("SELECT cover_image FROM blog_posts WHERE id=?", (bid,)).fetchone()
        cover_path = row['cover_image'] if row else ''
        if cover and cover.filename:
            saved = save_upload(cover,'blog')
            if saved: cover_path = saved
        raw = d.get('content','')
        db.execute(
            "UPDATE blog_posts SET title=?,excerpt=?,content=?,cover_image=?,category=?,tags=?,status=?,read_time=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
            (sanitize(d.get('title',''),300), sanitize(d.get('excerpt',''),500), raw,
             cover_path, sanitize(d.get('category',''),30),
             sanitize(d.get('tags',''),200), sanitize(d.get('status',''),20),
             max(1,len(_re.sub('<[^>]+>','',raw).split())//200), bid))
        db.commit()
    return jsonify({'success':True})

@app.route('/api/blog/<int:bid>', methods=['DELETE'])
@login_required
def delete_blog_post(bid):
    with get_db() as db:
        db.execute("DELETE FROM blog_posts WHERE id=?", (bid,)); db.commit()
    return jsonify({'success':True})

# ── Services ──────────────────────────────────────────────────────────────────
@app.route('/api/services', methods=['GET'])
def get_services():
    with get_db() as db:
        return jsonify([dict(r) for r in db.execute("SELECT * FROM services ORDER BY sort_order")])

@app.route('/api/services', methods=['POST'])
@login_required
def create_service():
    d = request.get_json() or {}
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO services (title,description,icon,price,features,sort_order) VALUES (?,?,?,?,?,?)",
            (sanitize(d.get('title',''),200), sanitize(d.get('description',''),1000),
             sanitize(d.get('icon','fas fa-code'),60), sanitize(d.get('price',''),50),
             sanitize(d.get('features',''),1000), int(d.get('sort_order',0))))
        db.commit(); return jsonify({'success':True,'id':cur.lastrowid})

@app.route('/api/services/<int:sid>', methods=['PUT'])
@login_required
def update_service(sid):
    d = request.get_json() or {}
    with get_db() as db:
        db.execute("UPDATE services SET title=?,description=?,icon=?,price=?,features=?,sort_order=? WHERE id=?",
                   (sanitize(d.get('title',''),200), sanitize(d.get('description',''),1000),
                    sanitize(d.get('icon',''),60), sanitize(d.get('price',''),50),
                    sanitize(d.get('features',''),1000), int(d.get('sort_order',0)), sid))
        db.commit()
    return jsonify({'success':True})

@app.route('/api/services/<int:sid>', methods=['DELETE'])
@login_required
def delete_service(sid):
    with get_db() as db:
        db.execute("DELETE FROM services WHERE id=?", (sid,)); db.commit()
    return jsonify({'success':True})

# ── Achievements ──────────────────────────────────────────────────────────────
@app.route('/api/achievements', methods=['GET'])
def get_achievements():
    with get_db() as db:
        return jsonify([dict(r) for r in db.execute("SELECT * FROM achievements ORDER BY sort_order")])

@app.route('/api/achievements', methods=['POST'])
@login_required
def create_achievement():
    d = request.get_json() or {}
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO achievements (title,value,icon,color,sort_order) VALUES (?,?,?,?,?)",
            (sanitize(d.get('title',''),200), sanitize(d.get('value',''),50),
             sanitize(d.get('icon','fas fa-trophy'),60), sanitize(d.get('color','#1a73e8'),20),
             int(d.get('sort_order',0))))
        db.commit(); return jsonify({'success':True,'id':cur.lastrowid})

@app.route('/api/achievements/<int:aid>', methods=['PUT'])
@login_required
def update_achievement(aid):
    d = request.get_json() or {}
    with get_db() as db:
        db.execute("UPDATE achievements SET title=?,value=?,icon=?,color=?,sort_order=? WHERE id=?",
                   (sanitize(d.get('title',''),200), sanitize(d.get('value',''),50),
                    sanitize(d.get('icon',''),60), sanitize(d.get('color',''),20),
                    int(d.get('sort_order',0)), aid))
        db.commit()
    return jsonify({'success':True})

@app.route('/api/achievements/<int:aid>', methods=['DELETE'])
@login_required
def delete_achievement(aid):
    with get_db() as db:
        db.execute("DELETE FROM achievements WHERE id=?", (aid,)); db.commit()
    return jsonify({'success':True})

# ── Announcements ─────────────────────────────────────────────────────────────
@app.route('/api/announcements', methods=['GET'])
def get_announcements():
    with get_db() as db:
        return jsonify([dict(r) for r in db.execute("SELECT * FROM announcements ORDER BY created_at DESC")])

@app.route('/api/announcements', methods=['POST'])
@login_required
def create_announcement():
    d = request.get_json() or {}
    text = sanitize(d.get('text',''), 500)
    if not text: return jsonify({'error':'Text required'}), 400
    with get_db() as db:
        db.execute("UPDATE announcements SET is_active=0")
        cur = db.execute(
            "INSERT INTO announcements (text,link,link_label,bg_color,is_active) VALUES (?,?,?,?,1)",
            (text, sanitize(d.get('link',''),500), sanitize(d.get('link_label','Learn more'),50),
             sanitize(d.get('bg_color','#1a73e8'),20)))
        db.commit(); return jsonify({'success':True,'id':cur.lastrowid})

@app.route('/api/announcements/<int:aid>', methods=['DELETE'])
@login_required
def delete_announcement(aid):
    with get_db() as db:
        db.execute("DELETE FROM announcements WHERE id=?", (aid,)); db.commit()
    return jsonify({'success':True})

# ── Contact ───────────────────────────────────────────────────────────────────
@app.route('/api/contact', methods=['POST'])
@rate_limit(3, 60)
def submit_contact():
    d = request.get_json() or {}
    name    = sanitize(d.get('name',''), 100)
    email   = sanitize(d.get('email',''), 200)
    phone   = sanitize(d.get('phone',''), 30)
    subject = sanitize(d.get('subject',''), 200)
    message = sanitize(d.get('message',''), 3000)
    if not name or not valid_email(email) or not message:
        return jsonify({'error':'Please fill Name, Email, and Message.'}), 400
    today = date.today().isoformat()
    with get_db() as db:
        db.execute("INSERT INTO messages (name,email,phone,subject,message) VALUES (?,?,?,?,?)",
                   (name, email, phone, subject, message))
        db.execute("""INSERT INTO analytics (date,contact_submissions) VALUES (?,1)
                      ON CONFLICT(date) DO UPDATE SET contact_submissions=contact_submissions+1""", (today,))
        db.commit()
    return jsonify({'success':True})

@app.route('/api/messages/<int:mid>/read', methods=['POST'])
@login_required
def mark_read(mid):
    with get_db() as db:
        db.execute("UPDATE messages SET is_read=1 WHERE id=?", (mid,)); db.commit()
    return jsonify({'success':True})

@app.route('/api/messages/<int:mid>', methods=['DELETE'])
@login_required
def delete_message(mid):
    with get_db() as db:
        db.execute("DELETE FROM messages WHERE id=?", (mid,)); db.commit()
    return jsonify({'success':True})

@app.route('/api/sell-inquiry', methods=['POST'])
@rate_limit(3, 60)
def sell_inquiry():
    d = request.get_json() or {}
    name  = sanitize(d.get('name',''), 100)
    email = sanitize(d.get('email',''), 200)
    if not name or not valid_email(email):
        return jsonify({'error':'Name and valid email required'}), 400
    with get_db() as db:
        db.execute("INSERT INTO messages (name,email,phone,subject,message) VALUES (?,?,?,?,?)",
                   (name, email, '', 'PORTFOLIO PURCHASE INQUIRY',
                    f"Budget: {sanitize(d.get('budget',''),50)}\nMessage: {sanitize(d.get('message',''),1000)}"))
        db.commit()
    return jsonify({'success':True})

# ── Analytics ─────────────────────────────────────────────────────────────────
@app.route('/api/analytics')
@login_required
def get_analytics():
    with get_db() as db:
        return jsonify([dict(r) for r in db.execute("SELECT * FROM analytics ORDER BY date DESC LIMIT 30")])

# ── Protect uploads from direct browser access ────────────────────────────────
@app.route('/static/uploads/<path:filename>')
def protected_upload(filename):
    """Only allow access to uploads via proper referrer or admin session."""
    # Allowed: images shown on site, PDFs, etc — block direct enumeration attempts
    # Simple check: must have a referrer from same host or be admin
    ref = request.headers.get('Referer','')
    host = request.host
    if session.get('admin') or (ref and host in ref):
        from flask import send_from_directory
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    # Return 403 for direct access without referrer
    abort(403)

# ── 404 / 413 ─────────────────────────────────────────────────────────────────
@app.errorhandler(404)
def page_not_found(e): return render_template('404.html'), 404

@app.errorhandler(403)
def forbidden(e): return render_template('404.html'), 403

@app.errorhandler(413)
def too_large(e): return jsonify({'error':'File too large. Max 50MB.'}), 413

@app.errorhandler(429)
def too_many(e): return jsonify({'error':'Too many requests.'}), 429

# ── Boot ──────────────────────────────────────────────────────────────────────
for sub in ('projects','profiles','certs','gallery','collabs','testimonials',
            'resume','blog','favicon','services'):
    os.makedirs(os.path.join(UPLOAD_FOLDER, sub), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR,'static','favicon'), exist_ok=True)
init_db()

if __name__ == '__main__':
    port  = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV','development') != 'production'
    app.run(debug=debug, host='0.0.0.0', port=port)
