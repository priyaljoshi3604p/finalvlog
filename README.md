# 🎬 Veyra Trails — Premium 3D Vlogger Portfolio & CMS

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Framework](https://img.shields.io/badge/Express-5.2-lightgrey.svg)](https://expressjs.com/)
[![Deployment](https://img.shields.io/badge/Vercel-Ready-black.svg)](https://vercel.com/)

**Veyra Trails** is a modern, high-performance 3D Vlogger Portfolio and dynamic Content Management System (CMS). Built with a stunning dark glassmorphism design system, smooth micro-animations, and full 3D visuals, it provides content creators with an interactive showcase for video logs, travel journals, photography collections, gear setups, and direct client inquiries.

---

## ✨ Features

- **🌐 Dynamic 3D Vlogger Portfolio UI**:
  - Interactive hero canvas with fluid animations and responsive 3D elements.
  - Featured video gallery with modal player, filtering, and video view tracking.
  - Journal & travel blog section with detailed article views.
  - Interactive gear list & photo galleries.
  - Dedicated contact section with automatic email notifications.

- **🛡️ Integrated Admin Dashboard (`/admin`)**:
  - Comprehensive admin control panel (`/admin/login`).
  - Secure authentication via JSON Web Tokens (JWT) and `bcryptjs` password hashing.
  - CRUD management for Videos, Blogs, Photo Gallery, Gear Items, and Inquiries.
  - Real-time activity logs and server telemetry analytics.

- **⚡ Full-Featured Express Backend & Database**:
  - Powered by SQLite (`better-sqlite3`) with automatic schema initialization and mock seed data.
  - Multi-part file upload support for videos and thumbnails using `Multer`.
  - Automated SMTP email notifications via `Nodemaiier` upon contact submissions.

- **🔌 Google Stitch SDK Integration**:
  - Synchronizes project assets, content metadata, and dynamic components directly with Google Stitch API (`@google/stitch-sdk`).

- **🚀 Multi-Cloud Deployment Support**:
  - Native support for Vercel Serverless Functions (`vercel.json`) and ephemeral storage `/tmp/uploads`.
  - Production manifest for Render deployment (`render.yaml`).

---

## 🛠️ Tech Stack

- **Backend / Server**: Node.js, Express v5, Better-SQLite3, JWT (`jsonwebtoken`), `bcryptjs`, `multer`, `cookie-parser`, `cors`, `nodemailer`, `dotenv`
- **Frontend / Client**: HTML5, Vanilla JavaScript (ES Modules), CSS3 (Modern Glassmorphism, CSS Variables, Flexbox/Grid), SVG icons
- **Integrations**: `@google/stitch-sdk`

---

## 📂 Project Structure

```text
vloggerweb/
├── admin/                  # Admin portal interface
│   ├── login/              # Admin login page
│   └── admin.css           # Admin dashboard stylesheet
├── api/                    # Serverless API routes (Vercel integration)
├── assets/                 # Static visual assets and icons
├── data/                   # Initial datasets and dynamic configuration
├── db/                     # Database setup and SQLite migrations
│   └── index.js            # DB connection & table initializers
├── scripts/                # Utility scripts (e.g. sync-stitch.js)
├── uploads/                # Local storage for uploaded videos & thumbnails
├── .env.example            # Environment variables template
├── app.js                  # Frontend application logic & UI routing
├── index.html              # Main public landing page
├── package.json            # Dependencies & npm scripts
├── render.yaml             # Render deployment configuration
├── robots.txt              # Search engine crawling rules
├── server.js               # Node.js Express server & REST API
├── sitemap.xml             # SEO Sitemap structure
├── styles.css              # Main design system & global styles
└── vercel.json             # Vercel serverless configuration
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have installed:
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/vloggerweb.git
   cd vloggerweb
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file and update the values:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` to configure port, JWT secret, SMTP email credentials, and Google Stitch API key:
   ```env
   PORT=3000
   JWT_SECRET=your_jwt_secret_key_here

   # SMTP Configuration (Optional for emails)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USERNAME=your_email@gmail.com
   EMAIL_PASSWORD=your_email_app_password
   ADMIN_EMAIL=admin_notifications@example.com

   # Google Stitch Configuration
   STITCH_API_KEY=your_stitch_api_key
   STITCH_PROJECT_ID=your_stitch_project_id
   ```

---

## 💻 Usage & Development

- **Start Development Server**:
  ```bash
  npm run dev
  ```
  The app will start at `http://localhost:3000`.

- **Run Production Server**:
  ```bash
  npm start
  ```

- **Sync Google Stitch Content**:
  ```bash
  npm run sync
  ```

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/videos` | Fetch public video catalog | No |
| `GET` | `/api/blogs` | Fetch published blog posts | No |
| `POST` | `/api/contact` | Submit contact inquiry & trigger email | No |
| `POST` | `/api/admin/login` | Admin authentication & JWT issue | No |
| `GET` | `/api/admin/stats` | System telemetry & content counts | Yes |
| `POST` | `/api/admin/videos` | Create/Upload new video entry | Yes |
| `PUT` | `/api/admin/videos/:id` | Update existing video details | Yes |
| `DELETE`| `/api/admin/videos/:id` | Delete video entry | Yes |

---

## 🌐 Deployment

### Deploying on Vercel
This project includes pre-configured `vercel.json` routing.
1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Set your environment variables (`JWT_SECRET`, `EMAIL_*`, `STITCH_*`) in the Vercel Dashboard.
4. Deploy!

### Deploying on Render
Using `render.yaml`:
1. Connect your repository to [Render](https://render.com).
2. Render will automatically detect `render.yaml` and configure a Web Service running `npm start`.

---

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
