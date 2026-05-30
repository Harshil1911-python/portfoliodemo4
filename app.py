import os
import json
import sqlite3
import hashlib
import secrets
try:
    import qrcode
    HAS_QRCODE = True
except ImportError:
    HAS_QRCODE = False
import io
import base64
from datetime import datetime, date
from functools import wraps
from flask import (Flask, render_template, request, jsonify, session,
                   redirect, url_for, send_from_directory, abort)
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB
ALLOWED_IMAGE = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}
ALLOWED_DOC = {'pdf'}
ALLOWED_VIDEO = {'mp4', 'webm', 'ogg'}

DB_PATH = os.path.join(BASE_DIR, 'database.db')

# ─── Database helpers ────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    with get_db() as db:
        with open('schema.sql') as f:
            db.executescript(f.read())
        # Seed default admin
        existing = db.execute("SELECT id FROM users LIMIT 1").fetchone()
        if not existing:
            db.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)",
                       ('admin', generate_password_hash('admin123')))
        # Seed default settings
        defaults = {
            'name': 'Harshil Sandip Khandhar',
            'tagline': 'Full Stack Developer | AI Enthusiast | Problem Solver',
            'bio': 'Passionate developer crafting innovative digital experiences with cutting-edge technology.',
            'email': 'harshil@example.com',
            'phone': '+91 98765 43210',
            'location': 'Gujarat, India',
            'profile_photo': '',
            'cover_image': '',
            'github': 'https://github.com/harshilkhandhar',
            'linkedin': 'https://linkedin.com/in/harshilkhandhar',
            'twitter': 'https://twitter.com/harshilkhandhar',
            'instagram': '',
            'primary_color': '#0a2540',
            'secondary_color': '#1a73e8',
            'accent_color': '#00d4ff',
            'bg_color': '#ffffff',
            'font_heading': 'Playfair Display',
            'font_body': 'DM Sans',
            'dark_mode': '0',
            'about_text': 'I am a passionate software developer with expertise in full-stack development and AI. I love turning complex problems into elegant solutions.',
            'years_experience': '3',
            'projects_completed': '25',
            'clients_served': '15',
            'footer_text': '© 2024 Harshil Sandip Khandhar. All rights reserved.',
            # Section visibility (1=visible, 0=hidden)
            'section_about': '1',
            'section_skills': '1',
            'section_portfolio': '1',
            'section_collaborations': '1',
            'section_experience': '1',
            'section_certifications': '1',
            'section_testimonials': '1',
            'section_gallery': '1',
            'section_resume': '1',
            'section_contact': '1',
        }
        for k, v in defaults.items():
            db.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v))
        db.commit()

def setting(key, default=''):
    with get_db() as db:
        row = db.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
        return row['value'] if row else default

def all_settings():
    with get_db() as db:
        rows = db.execute("SELECT key, value FROM settings").fetchall()
        return {r['key']: r['value'] for r in rows}

def allowed_file(filename, kinds):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in kinds

def save_upload(file, subfolder=''):
    if not file or not file.filename:
        return None
    folder = os.path.join(app.config['UPLOAD_FOLDER'], subfolder)
    os.makedirs(folder, exist_ok=True)
    ext = file.filename.rsplit('.', 1)[1].lower()
    fname = secrets.token_hex(8) + '.' + ext
    path = os.path.join(folder, fname)
    file.save(path)
    # Optimise images
    if ext in ALLOWED_IMAGE - {'svg', 'gif'}:
        try:
            img = Image.open(path)
            img.save(path, optimize=True, quality=85)
        except Exception:
            pass
    return f'uploads/{subfolder}/{fname}' if subfolder else f'uploads/{fname}'

def track_visit():
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    ua = request.headers.get('User-Agent', '')
    today = date.today().isoformat()
    with get_db() as db:
        db.execute("INSERT INTO visitors (ip, user_agent) VALUES (?,?)", (ip, ua))
        db.execute("""INSERT INTO analytics (date, total_visits, unique_visits)
                      VALUES (?,1,0) ON CONFLICT(date) DO UPDATE SET total_visits=total_visits+1""", (today,))
        unique = db.execute(
            "SELECT COUNT(DISTINCT ip) FROM visitors WHERE DATE(visited_at)=?", (today,)).fetchone()[0]
        db.execute("UPDATE analytics SET unique_visits=? WHERE date=?", (unique, today))
        db.commit()

# ─── Auth ────────────────────────────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin'):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

# ─── Public Routes ────────────────────────────────────────────────────────────

@app.route('/')
def index():
    track_visit()
    s = all_settings()
    with get_db() as db:
        projects = db.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
        skills = db.execute("SELECT * FROM skills ORDER BY category, level DESC").fetchall()
        experience = db.execute("SELECT * FROM experience ORDER BY sort_order, start_date DESC").fetchall()
        certifications = db.execute("SELECT * FROM certifications ORDER BY date DESC").fetchall()
        testimonials = db.execute("SELECT * FROM testimonials ORDER BY created_at DESC").fetchall()
        gallery = db.execute("SELECT * FROM gallery ORDER BY created_at DESC").fetchall()
        collaborations = db.execute("SELECT * FROM collaborations ORDER BY created_at DESC").fetchall()
        resume_row = db.execute("SELECT * FROM resume ORDER BY updated_at DESC LIMIT 1").fetchone()
    return render_template('index.html',
                           s=s, projects=projects, skills=skills, experience=experience,
                           certifications=certifications, testimonials=testimonials,
                           gallery=gallery, collaborations=collaborations, resume=resume_row)

@app.route('/admin')
def admin():
    if not session.get('admin'):
        return redirect('/?admin_login=1')
    s = all_settings()
    with get_db() as db:
        messages = db.execute("SELECT * FROM messages ORDER BY created_at DESC").fetchall()
        projects = db.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
        skills = db.execute("SELECT * FROM skills ORDER BY category").fetchall()
        experience = db.execute("SELECT * FROM experience ORDER BY sort_order").fetchall()
        certs = db.execute("SELECT * FROM certifications ORDER BY date DESC").fetchall()
        testimonials = db.execute("SELECT * FROM testimonials ORDER BY created_at DESC").fetchall()
        gallery = db.execute("SELECT * FROM gallery ORDER BY created_at DESC").fetchall()
        collabs = db.execute("SELECT * FROM collaborations ORDER BY created_at DESC").fetchall()
        resume_row = db.execute("SELECT * FROM resume ORDER BY updated_at DESC LIMIT 1").fetchone()
        analytics_rows = [dict(r) for r in db.execute(
            "SELECT * FROM analytics ORDER BY date DESC LIMIT 30").fetchall()]
        unread = db.execute("SELECT COUNT(*) as c FROM messages WHERE is_read=0").fetchone()['c']
        total_visits = db.execute("SELECT SUM(total_visits) as t FROM analytics").fetchone()['t'] or 0
        total_downloads = db.execute("SELECT SUM(resume_downloads) as t FROM analytics").fetchone()['t'] or 0
        top_project = db.execute("""SELECT p.title, COUNT(pv.id) as views FROM project_views pv
                                    JOIN projects p ON p.id=pv.project_id
                                    GROUP BY pv.project_id ORDER BY views DESC LIMIT 1""").fetchone()
    return render_template('admin.html', s=s, messages=messages, projects=projects,
                           skills=skills, experience=experience, certs=certs,
                           testimonials=testimonials, gallery=gallery, collabs=collabs,
                           resume=resume_row, analytics=analytics_rows,
                           unread=unread, total_visits=total_visits,
                           total_downloads=total_downloads, top_project=top_project)

# ─── Auth API ─────────────────────────────────────────────────────────────────

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    password = data.get('password', '')
    with get_db() as db:
        user = db.execute("SELECT * FROM users LIMIT 1").fetchone()
    if user and check_password_hash(user['password_hash'], password):
        session['admin'] = True
        session.permanent = True
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Invalid password'}), 401

@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/change-password', methods=['POST'])
@login_required
def change_password():
    data = request.get_json()
    new_hash = generate_password_hash(data.get('password', ''))
    with get_db() as db:
        db.execute("UPDATE users SET password_hash=? WHERE id=1", (new_hash,))
        db.commit()
    return jsonify({'success': True})

# ─── Settings API ─────────────────────────────────────────────────────────────

@app.route('/api/settings', methods=['GET'])
def get_settings():
    return jsonify(all_settings())

@app.route('/api/settings', methods=['POST'])
@login_required
def update_settings():
    data = request.get_json() or {}
    with get_db() as db:
        for k, v in data.items():
            db.execute("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?,?,CURRENT_TIMESTAMP)", (k, v))
        db.commit()
    return jsonify({'success': True})

@app.route('/api/upload-profile', methods=['POST'])
@login_required
def upload_profile():
    for field in ('profile_photo', 'cover_image'):
        f = request.files.get(field)
        if f and allowed_file(f.filename, ALLOWED_IMAGE):
            path = save_upload(f, 'profiles')
            with get_db() as db:
                db.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)", (field, path))
                db.commit()
    return jsonify({'success': True})

# ─── Projects API ─────────────────────────────────────────────────────────────

@app.route('/api/projects', methods=['GET'])
def get_projects():
    with get_db() as db:
        rows = db.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
        return jsonify([dict(r) for r in rows])

@app.route('/api/projects/<int:pid>', methods=['GET'])
def get_project(pid):
    with get_db() as db:
        row = db.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
        if not row:
            return jsonify({'error': 'Not found'}), 404
        images = db.execute("SELECT * FROM project_images WHERE project_id=?", (pid,)).fetchall()
        db.execute("INSERT INTO project_views (project_id) VALUES (?)", (pid,))
        db.commit()
        return jsonify({**dict(row), 'images': [dict(i) for i in images]})

@app.route('/api/projects', methods=['POST'])
@login_required
def create_project():
    d = request.form
    cover = request.files.get('cover_image')
    cover_path = save_upload(cover, 'projects') if cover else ''
    with get_db() as db:
        cur = db.execute("""INSERT INTO projects (title, description, technologies, github_link,
                             live_link, features, cover_image, status, date, category)
                             VALUES (?,?,?,?,?,?,?,?,?,?)""",
                         (d.get('title'), d.get('description'), d.get('technologies'),
                          d.get('github_link'), d.get('live_link'), d.get('features'),
                          cover_path, d.get('status', 'completed'), d.get('date'), d.get('category', 'web')))
        pid = cur.lastrowid
        db.commit()
    return jsonify({'success': True, 'id': pid})

@app.route('/api/projects/<int:pid>', methods=['PUT'])
@login_required
def update_project(pid):
    d = request.form
    cover = request.files.get('cover_image')
    with get_db() as db:
        row = db.execute("SELECT cover_image FROM projects WHERE id=?", (pid,)).fetchone()
        cover_path = row['cover_image'] if row else ''
        if cover and allowed_file(cover.filename, ALLOWED_IMAGE):
            cover_path = save_upload(cover, 'projects')
        db.execute("""UPDATE projects SET title=?, description=?, technologies=?, github_link=?,
                       live_link=?, features=?, cover_image=?, status=?, date=?, category=?
                       WHERE id=?""",
                   (d.get('title'), d.get('description'), d.get('technologies'),
                    d.get('github_link'), d.get('live_link'), d.get('features'),
                    cover_path, d.get('status'), d.get('date'), d.get('category'), pid))
        db.commit()
    return jsonify({'success': True})

@app.route('/api/projects/<int:pid>', methods=['DELETE'])
@login_required
def delete_project(pid):
    with get_db() as db:
        db.execute("DELETE FROM projects WHERE id=?", (pid,))
        db.commit()
    return jsonify({'success': True})

# ─── Skills API ───────────────────────────────────────────────────────────────

@app.route('/api/skills', methods=['GET'])
def get_skills():
    with get_db() as db:
        rows = db.execute("SELECT * FROM skills ORDER BY category, level DESC").fetchall()
        return jsonify([dict(r) for r in rows])

@app.route('/api/skills', methods=['POST'])
@login_required
def create_skill():
    d = request.get_json()
    with get_db() as db:
        cur = db.execute("INSERT INTO skills (name, level, category, icon) VALUES (?,?,?,?)",
                         (d.get('name'), d.get('level', 80), d.get('category', 'programming'), d.get('icon', '')))
        db.commit()
        return jsonify({'success': True, 'id': cur.lastrowid})

@app.route('/api/skills/<int:sid>', methods=['PUT'])
@login_required
def update_skill(sid):
    d = request.get_json()
    with get_db() as db:
        db.execute("UPDATE skills SET name=?, level=?, category=?, icon=? WHERE id=?",
                   (d.get('name'), d.get('level'), d.get('category'), d.get('icon'), sid))
        db.commit()
    return jsonify({'success': True})

@app.route('/api/skills/<int:sid>', methods=['DELETE'])
@login_required
def delete_skill(sid):
    with get_db() as db:
        db.execute("DELETE FROM skills WHERE id=?", (sid,))
        db.commit()
    return jsonify({'success': True})

# ─── Experience API ───────────────────────────────────────────────────────────

@app.route('/api/experience', methods=['GET'])
def get_experience():
    with get_db() as db:
        rows = db.execute("SELECT * FROM experience ORDER BY sort_order, start_date DESC").fetchall()
        return jsonify([dict(r) for r in rows])

@app.route('/api/experience', methods=['POST'])
@login_required
def create_experience():
    d = request.get_json()
    with get_db() as db:
        cur = db.execute("""INSERT INTO experience (position, company, duration, start_date,
                             end_date, description, location, sort_order) VALUES (?,?,?,?,?,?,?,?)""",
                         (d.get('position'), d.get('company'), d.get('duration'),
                          d.get('start_date'), d.get('end_date'), d.get('description'),
                          d.get('location'), d.get('sort_order', 0)))
        db.commit()
        return jsonify({'success': True, 'id': cur.lastrowid})

@app.route('/api/experience/<int:eid>', methods=['PUT'])
@login_required
def update_experience(eid):
    d = request.get_json()
    with get_db() as db:
        db.execute("""UPDATE experience SET position=?, company=?, duration=?, start_date=?,
                       end_date=?, description=?, location=?, sort_order=? WHERE id=?""",
                   (d.get('position'), d.get('company'), d.get('duration'),
                    d.get('start_date'), d.get('end_date'), d.get('description'),
                    d.get('location'), d.get('sort_order', 0), eid))
        db.commit()
    return jsonify({'success': True})

@app.route('/api/experience/<int:eid>', methods=['DELETE'])
@login_required
def delete_experience(eid):
    with get_db() as db:
        db.execute("DELETE FROM experience WHERE id=?", (eid,))
        db.commit()
    return jsonify({'success': True})

# ─── Certifications API ───────────────────────────────────────────────────────

@app.route('/api/certifications', methods=['GET'])
def get_certs():
    with get_db() as db:
        rows = db.execute("SELECT * FROM certifications ORDER BY date DESC").fetchall()
        return jsonify([dict(r) for r in rows])

@app.route('/api/certifications', methods=['POST'])
@login_required
def create_cert():
    d = request.form
    img = request.files.get('image')
    pdf = request.files.get('pdf')
    img_path = save_upload(img, 'certs') if img else ''
    pdf_path = save_upload(pdf, 'certs') if pdf else ''
    with get_db() as db:
        cur = db.execute("INSERT INTO certifications (title, organization, date, image, pdf, credential_url) VALUES (?,?,?,?,?,?)",
                         (d.get('title'), d.get('organization'), d.get('date'), img_path, pdf_path, d.get('credential_url')))
        db.commit()
        return jsonify({'success': True, 'id': cur.lastrowid})

@app.route('/api/certifications/<int:cid>', methods=['DELETE'])
@login_required
def delete_cert(cid):
    with get_db() as db:
        db.execute("DELETE FROM certifications WHERE id=?", (cid,))
        db.commit()
    return jsonify({'success': True})

# ─── Testimonials API ─────────────────────────────────────────────────────────

@app.route('/api/testimonials', methods=['GET'])
def get_testimonials():
    with get_db() as db:
        rows = db.execute("SELECT * FROM testimonials ORDER BY created_at DESC").fetchall()
        return jsonify([dict(r) for r in rows])

@app.route('/api/testimonials', methods=['POST'])
@login_required
def create_testimonial():
    d = request.form
    img = request.files.get('image')
    img_path = save_upload(img, 'testimonials') if img else ''
    with get_db() as db:
        cur = db.execute("INSERT INTO testimonials (name, position, company, message, rating, image) VALUES (?,?,?,?,?,?)",
                         (d.get('name'), d.get('position'), d.get('company'), d.get('message'), d.get('rating', 5), img_path))
        db.commit()
        return jsonify({'success': True, 'id': cur.lastrowid})

@app.route('/api/testimonials/<int:tid>', methods=['DELETE'])
@login_required
def delete_testimonial(tid):
    with get_db() as db:
        db.execute("DELETE FROM testimonials WHERE id=?", (tid,))
        db.commit()
    return jsonify({'success': True})

# ─── Gallery API ──────────────────────────────────────────────────────────────

@app.route('/api/gallery', methods=['GET'])
def get_gallery():
    with get_db() as db:
        rows = db.execute("SELECT * FROM gallery ORDER BY created_at DESC").fetchall()
        return jsonify([dict(r) for r in rows])

@app.route('/api/gallery', methods=['POST'])
@login_required
def upload_gallery():
    f = request.files.get('file')
    if not f:
        return jsonify({'error': 'No file'}), 400
    ext = f.filename.rsplit('.', 1)[1].lower() if '.' in f.filename else ''
    ftype = 'video' if ext in ALLOWED_VIDEO else 'image'
    path = save_upload(f, 'gallery')
    with get_db() as db:
        cur = db.execute("INSERT INTO gallery (title, file_path, file_type, category) VALUES (?,?,?,?)",
                         (request.form.get('title', ''), path, ftype, request.form.get('category', 'general')))
        db.commit()
        return jsonify({'success': True, 'id': cur.lastrowid})

@app.route('/api/gallery/<int:gid>', methods=['DELETE'])
@login_required
def delete_gallery(gid):
    with get_db() as db:
        db.execute("DELETE FROM gallery WHERE id=?", (gid,))
        db.commit()
    return jsonify({'success': True})

# ─── Collaborations API ───────────────────────────────────────────────────────

@app.route('/api/collaborations', methods=['GET'])
def get_collabs():
    with get_db() as db:
        rows = db.execute("SELECT * FROM collaborations ORDER BY created_at DESC").fetchall()
        return jsonify([dict(r) for r in rows])

@app.route('/api/collaborations', methods=['POST'])
@login_required
def create_collab():
    d = request.form
    logo = request.files.get('logo')
    cover = request.files.get('cover_image')
    logo_path = save_upload(logo, 'collabs') if logo else ''
    cover_path = save_upload(cover, 'collabs') if cover else ''
    with get_db() as db:
        cur = db.execute("INSERT INTO collaborations (type, name, description, logo, cover_image, website, social_links) VALUES (?,?,?,?,?,?,?)",
                         (d.get('type', 'company'), d.get('name'), d.get('description'),
                          logo_path, cover_path, d.get('website'), d.get('social_links')))
        db.commit()
        return jsonify({'success': True, 'id': cur.lastrowid})

@app.route('/api/collaborations/<int:cid>', methods=['DELETE'])
@login_required
def delete_collab(cid):
    with get_db() as db:
        db.execute("DELETE FROM collaborations WHERE id=?", (cid,))
        db.commit()
    return jsonify({'success': True})

# ─── Resume API ───────────────────────────────────────────────────────────────

@app.route('/api/resume/upload', methods=['POST'])
@login_required
def upload_resume():
    f = request.files.get('resume')
    if not f or not f.filename:
        return jsonify({'error': 'No file'}), 400
    ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else ''
    allowed_resume = ALLOWED_DOC | {'jpg', 'jpeg', 'png'}
    if ext not in allowed_resume:
        return jsonify({'error': 'Only PDF, JPG, PNG allowed'}), 400
    path = save_upload(f, 'resume')
    file_type = 'image' if ext in {'jpg', 'jpeg', 'png'} else 'pdf'
    with get_db() as db:
        db.execute("INSERT INTO resume (file_path, download_count, file_type) VALUES (?,0,?)", (path, file_type))
        db.commit()
    return jsonify({'success': True, 'path': path, 'file_type': file_type})

@app.route('/api/resume/download')
def download_resume():
    today = date.today().isoformat()
    with get_db() as db:
        row = db.execute("SELECT * FROM resume ORDER BY updated_at DESC LIMIT 1").fetchone()
        if not row:
            abort(404)
        db.execute("UPDATE resume SET download_count=download_count+1 WHERE id=?", (row['id'],))
        db.execute("""INSERT INTO analytics (date, resume_downloads) VALUES (?,1)
                      ON CONFLICT(date) DO UPDATE SET resume_downloads=resume_downloads+1""", (today,))
        db.commit()
    return redirect(url_for('static', filename=row['file_path']))

@app.route('/api/resume/qr')
def resume_qr():
    if not HAS_QRCODE:
        return jsonify({'qr': '', 'error': 'qrcode module not installed'}), 200
    base_url = request.host_url.rstrip('/')
    qr_url = f"{base_url}/api/resume/download"
    img = qrcode.make(qr_url)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    encoded = base64.b64encode(buf.getvalue()).decode()
    return jsonify({'qr': f'data:image/png;base64,{encoded}'})

# ─── Contact API ──────────────────────────────────────────────────────────────

@app.route('/api/contact', methods=['POST'])
def submit_contact():
    d = request.get_json()
    today = date.today().isoformat()
    with get_db() as db:
        db.execute("INSERT INTO messages (name, email, phone, subject, message) VALUES (?,?,?,?,?)",
                   (d.get('name'), d.get('email'), d.get('phone'), d.get('subject'), d.get('message')))
        db.execute("""INSERT INTO analytics (date, contact_submissions) VALUES (?,1)
                      ON CONFLICT(date) DO UPDATE SET contact_submissions=contact_submissions+1""", (today,))
        db.commit()
    return jsonify({'success': True})

@app.route('/api/messages/<int:mid>/read', methods=['POST'])
@login_required
def mark_read(mid):
    with get_db() as db:
        db.execute("UPDATE messages SET is_read=1 WHERE id=?", (mid,))
        db.commit()
    return jsonify({'success': True})

@app.route('/api/messages/<int:mid>', methods=['DELETE'])
@login_required
def delete_message(mid):
    with get_db() as db:
        db.execute("DELETE FROM messages WHERE id=?", (mid,))
        db.commit()
    return jsonify({'success': True})

# ─── Analytics API ────────────────────────────────────────────────────────────

@app.route('/api/analytics')
@login_required
def get_analytics():
    with get_db() as db:
        rows = db.execute("SELECT * FROM analytics ORDER BY date DESC LIMIT 30").fetchall()
        return jsonify([dict(r) for r in rows])

# ─── 404 Handler ──────────────────────────────────────────────────────────────

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

# ─── Run ──────────────────────────────────────────────────────────────────────

# ─── Startup ─────────────────────────────────────────────────────────────────
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
init_db()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV', 'development') != 'production'
    app.run(debug=debug, host='0.0.0.0', port=port)
