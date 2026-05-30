# Harshil Sandip Khandhar – Portfolio

A premium, production-ready single-page portfolio website built with Python Flask, SQLite, and vanilla HTML/CSS/JS.

---

## 🚀 Features

- ✅ Single-page layout with smooth scroll navigation
- ✅ Hero with typing effect, animated counters, social links
- ✅ About, Skills (animated bars), Portfolio (filterable cards + modals)
- ✅ Collaborations, Experience Timeline, Certifications grid
- ✅ Testimonials carousel, Masonry Gallery with lightbox
- ✅ Resume section with QR code generator and download counter
- ✅ Contact form with database storage
- ✅ Secret admin trigger (click footer name 5× in 10 sec)
- ✅ Full Admin Dashboard – manage everything without touching code
- ✅ Theme Customizer (colors, fonts)
- ✅ Dark Mode / Light Mode toggle
- ✅ Analytics (visitors, downloads, submissions)
- ✅ PWA support (installable on mobile)
- ✅ Scroll reveal animations, back-to-top, lazy loading
- ✅ Fully responsive – mobile, tablet, desktop
- ✅ Custom 404 page
- ✅ SEO meta tags

---

## 🗂 Project Structure

```
portfolio/
├── app.py              # Flask application & all routes
├── schema.sql          # Database schema
├── database.db         # SQLite database (auto-created)
├── requirements.txt
├── render.yaml         # Render deployment config
├── templates/
│   ├── index.html      # Main single-page portfolio
│   ├── admin.html      # Admin dashboard
│   └── 404.html        # Custom 404 page
└── static/
    ├── css/
    │   ├── main.css    # Portfolio styles
    │   └── admin.css   # Admin dashboard styles
    ├── js/
    │   ├── main.js     # Portfolio JavaScript
    │   └── admin.js    # Admin JavaScript
    ├── uploads/        # All uploaded media (auto-created)
    ├── images/         # Static images (icons, etc.)
    ├── manifest.json   # PWA manifest
    └── sw.js           # Service Worker
```

---

## ⚙️ Local Setup

```bash
# 1. Clone / extract the project
cd portfolio

# 2. Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the app
python app.py
```

Open http://localhost:5000 in your browser.

**Default admin password:** `admin123`

To access admin: scroll to the footer and click **"Harshil Sandip Khandhar"** 5 times within 10 seconds.  
Or go directly to `/admin` (redirects to login modal).

---

## 🌐 Deploy on Render

1. Push this project to a GitHub repository
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml` and configure everything
5. Set environment variable `SECRET_KEY` to a long random string
6. Deploy!

The `render.yaml` includes a persistent disk mount for uploads.

---

## 🔐 Admin Dashboard

Access the admin panel at `/admin` or via the secret footer trigger.

**Default credentials:**
- Password: `admin123`
- ⚠️ Change this immediately after first login via Settings → Security

**What you can manage:**
| Section | Actions |
|---------|---------|
| Profile | Name, bio, photo, cover image, social links |
| Projects | Add/edit/delete with images, links, features |
| Skills | Add/edit/delete with animated progress bars |
| Experience | Full timeline with company, duration, description |
| Certifications | Images + PDFs + verification links |
| Testimonials | Photos, ratings, quotes |
| Gallery | Images and videos with masonry layout |
| Collaborations | Companies and individuals with logos |
| Resume | Upload PDF, track downloads, generate QR |
| Messages | View and manage contact form submissions |
| Theme | Colors, fonts, customization |
| Analytics | Visitor charts, download counts |

---

## 🗄 Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Admin credentials |
| `settings` | All site settings & theme |
| `projects` | Portfolio projects |
| `project_images` | Additional project images |
| `skills` | Skills with levels & categories |
| `experience` | Work experience timeline |
| `certifications` | Certificates with images/PDFs |
| `testimonials` | Client testimonials & ratings |
| `gallery` | Image/video gallery |
| `collaborations` | Companies & individuals |
| `resume` | CV file with download counter |
| `messages` | Contact form submissions |
| `analytics` | Daily visitor & download stats |
| `visitors` | Individual visit logs |
| `project_views` | Per-project view tracking |

---

## 🛠 Tech Stack

- **Backend:** Python 3.10+, Flask 3.x
- **Database:** SQLite (via Python's built-in `sqlite3`)
- **Frontend:** HTML5, CSS3 (custom, no framework), Vanilla JavaScript
- **Icons:** Font Awesome 6.5
- **Fonts:** Google Fonts (Playfair Display, DM Sans, JetBrains Mono)
- **Deployment:** Render (with persistent disk for uploads)

---

## 📄 License

MIT License — Free to use and modify for personal and commercial projects.

---

Built with ❤️ for **Harshil Sandip Khandhar**
