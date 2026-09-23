import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import multer from 'multer';
import db, { initDatabase } from './db/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'veyra_trails_fallback_secret_key_2026';

// Initialize DB schema & seeds
initDatabase();

// Ensure upload directories exist. On Vercel the project's own files are
// read-only, so uploads must go to /tmp instead. Note: /tmp on Vercel is
// ephemeral (wiped between cold starts / deployments), so files uploaded
// through the admin panel there won't persist long-term — for production use,
// swap this out for a real storage service (Vercel Blob, S3, Cloudinary...).
const uploadsDir = process.env.VERCEL
  ? '/tmp/uploads'
  : path.join(__dirname, 'uploads');
const videosDir = path.join(uploadsDir, 'videos');
const thumbsDir = path.join(uploadsDir, 'thumbnails');

[uploadsDir, videosDir, thumbsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Multer Storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video_file' || (file.mimetype && file.mimetype.startsWith('video/'))) {
      cb(null, videosDir);
    } else {
      cb(null, thumbsDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.fieldname === 'video_file' ? '.mp4' : '.jpg');
    const safeName = Date.now() + '_' + Math.random().toString(36).substring(2, 8) + ext;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max limit
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadsDir));

// Logger Helper
function logActivity(action, entity, description) {
  try {
    db.prepare('INSERT INTO activity_log (action, entity, description) VALUES (?, ?, ?)')
      .run(action, entity, description);
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// Email Helper
async function sendNotificationEmail({ name, email, phone, subject, message }) {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user = process.env.EMAIL_USERNAME;
  const pass = process.env.EMAIL_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL || 'priyaljoshi3604@gmail.com';

  if (!host || !user || !pass || pass === 'your_app_password_here') {
    console.log('ℹ SMTP email configuration missing or mock. Skipping real email dispatch.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    const mailOptions = {
      from: `"Veyra Trails Notification" <${user}>`,
      to: adminEmail,
      subject: `[New Enquiry] ${subject || 'Website Inquiry from ' + name}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #120e18; color: #ece6ee; border-radius: 12px;">
          <h2 style="color: #c084fc; margin-top: 0;">New Enquiry Received on Veyra Trails</h2>
          <hr style="border-color: #332946;" />
          <p><strong>Visitor Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
          <p><strong>Message:</strong></p>
          <div style="background-color: #1c1626; padding: 15px; border-radius: 8px; border-left: 4px solid #c084fc;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <p style="font-size: 11px; color: #948ba3; margin-top: 20px;">Received on ${new Date().toLocaleString()}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Notification email sent to ${adminEmail}`);
  } catch (error) {
    console.error('Error sending notification email:', error);
  }
}

// Auth Middleware
function requireAuth(req, res, next) {
  let token = req.cookies.admin_token;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

/* ==========================================================================
   PUBLIC API ENDPOINTS
   ========================================================================== */

// 1. Submit Public Enquiry / Contact Form
app.post('/api/enquiries', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'Name, email, and message are required.' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const stmtEnquiry = db.prepare(`
      INSERT INTO enquiry (name, email, phone, subject, message, status, ip_address)
      VALUES (?, ?, ?, ?, ?, 'New', ?)
    `);
    const result = stmtEnquiry.run(name, email, phone || '', subject || 'General Inquiry', message, ip);

    // Also copy to contact_message table
    db.prepare(`
      INSERT INTO contact_message (name, email, phone, subject, message, status)
      VALUES (?, ?, ?, ?, ?, 'New')
    `).run(name, email, phone || '', subject || 'General Inquiry', message);

    logActivity('ENQUIRY_SUBMITTED', 'Enquiry', `New enquiry #${result.lastInsertRowid} submitted by ${name} (${email})`);

    // Asynchronously dispatch notification email
    sendNotificationEmail({ name, email, phone, subject, message });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your message has been received. We will get back to you soon.',
      enquiryId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Enquiry submission error:', error);
    res.status(500).json({ success: false, error: 'Failed to process enquiry.' });
  }
});

// 2. Track Website Visitors / Activity
app.post('/api/visitors/track', (req, res) => {
  try {
    const { sessionId, pageVisited, referrer } = req.body;
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!sessionId || !pageVisited) {
      return res.status(400).json({ success: false, error: 'sessionId and pageVisited required' });
    }

    db.prepare(`
      INSERT INTO website_visitor (session_id, page_visited, referrer, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, pageVisited, referrer || '', userAgent, ip);

    res.json({ success: true });
  } catch (error) {
    console.error('Visitor tracking error:', error);
    res.status(500).json({ success: false, error: 'Tracking failed' });
  }
});

// 3. Public Content Endpoints
app.get('/api/public/videos', (req, res) => {
  try {
    const videos = db.prepare(`SELECT * FROM video WHERE status = 'active' ORDER BY featured DESC, created_at DESC`).all();
    res.json({ success: true, videos });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load videos' });
  }
});

app.get('/api/public/destinations', (req, res) => {
  try {
    const destinations = db.prepare(`SELECT * FROM destination WHERE status = 'active' ORDER BY created_at DESC`).all();
    res.json({ success: true, destinations });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load destinations' });
  }
});

app.get('/api/public/articles', (req, res) => {
  try {
    const articles = db.prepare(`SELECT * FROM article WHERE status = 'published' ORDER BY created_at DESC`).all();
    res.json({ success: true, articles });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load articles' });
  }
});

app.get('/api/public/settings', (req, res) => {
  try {
    const rows = db.prepare(`SELECT key, value FROM settings`).all();
    const settings = {};
    rows.forEach(row => { settings[row.key] = row.value; });
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load settings' });
  }
});

/* ==========================================================================
   ADMIN AUTHENTICATION API
   ========================================================================== */

app.post('/api/admin/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email/username and password required' });
    }

    const admin = db.prepare('SELECT * FROM admin WHERE email = ? OR username = ?').get(email, email);
    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const match = bcrypt.compareSync(password, admin.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: false, // Local dev
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    logActivity('ADMIN_LOGIN', 'Auth', `Admin ${admin.name} logged into control center`);

    res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuC3ktJ0r9ZmiMpAE1kJI_kCDkJIRlIpkwNdw54Hv2qlQazyVfRLsZiYo3DetM3TxYS8EYVEiD5LW-dqIi1FyZT3pntuV6JV-236acde6080bf3f770c98cca77aa020d'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server authentication error' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/admin/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

/* ==========================================================================
   PROTECTED ADMIN DASHBOARD & CRUD APIs
   ========================================================================== */

// 1. Dashboard Overview Stats
app.get('/api/admin/dashboard', requireAuth, (req, res) => {
  try {
    const totalEnquiries = db.prepare('SELECT COUNT(*) as count FROM enquiry').get().count;
    const newEnquiries = db.prepare("SELECT COUNT(*) as count FROM enquiry WHERE status = 'New'").get().count;
    const totalVisitors = db.prepare('SELECT COUNT(DISTINCT session_id) as count FROM website_visitor').get().count;
    const totalPageviews = db.prepare('SELECT COUNT(*) as count FROM website_visitor').get().count;
    const contactMessages = db.prepare('SELECT COUNT(*) as count FROM contact_message').get().count;
    const totalVideos = db.prepare('SELECT COUNT(*) as count FROM video').get().count;
    const totalDestinations = db.prepare('SELECT COUNT(*) as count FROM destination').get().count;
    const totalArticles = db.prepare('SELECT COUNT(*) as count FROM article').get().count;

    const recentEnquiries = db.prepare('SELECT * FROM enquiry ORDER BY created_at DESC LIMIT 6').all();
    const recentVisitors = db.prepare('SELECT * FROM website_visitor ORDER BY visited_at DESC LIMIT 8').all();
    const recentActivity = db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 10').all();

    // Most viewed pages
    const topPages = db.prepare(`
      SELECT page_visited, COUNT(*) as views 
      FROM website_visitor 
      GROUP BY page_visited 
      ORDER BY views DESC 
      LIMIT 5
    `).all();

    res.json({
      success: true,
      stats: {
        totalEnquiries,
        newEnquiries,
        totalVisitors,
        totalPageviews,
        contactMessages,
        totalVideos,
        totalDestinations,
        totalArticles
      },
      recentEnquiries,
      recentVisitors,
      recentActivity,
      topPages
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

// 2. Enquiries Management
app.get('/api/admin/enquiries', requireAuth, (req, res) => {
  try {
    const { status, search } = req.query;
    let query = 'SELECT * FROM enquiry WHERE 1=1';
    const params = [];

    if (status && status !== 'All') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY created_at DESC';

    const enquiries = db.prepare(query).all(...params);
    res.json({ success: true, enquiries });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch enquiries' });
  }
});

app.put('/api/admin/enquiries/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['New', 'Read', 'Contacted', 'Resolved'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    db.prepare('UPDATE enquiry SET status = ? WHERE id = ?').run(status, id);
    logActivity('ENQUIRY_UPDATE', 'Enquiry', `Updated enquiry #${id} status to ${status}`);

    res.json({ success: true, message: `Enquiry #${id} marked as ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update enquiry' });
  }
});

app.delete('/api/admin/enquiries/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM enquiry WHERE id = ?').run(id);
    logActivity('ENQUIRY_DELETE', 'Enquiry', `Deleted enquiry #${id}`);

    res.json({ success: true, message: `Enquiry #${id} deleted` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete enquiry' });
  }
});

// 3. Contact Messages Management
app.get('/api/admin/messages', requireAuth, (req, res) => {
  try {
    const messages = db.prepare('SELECT * FROM contact_message ORDER BY created_at DESC').all();
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch contact messages' });
  }
});

app.put('/api/admin/messages/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    db.prepare('UPDATE contact_message SET status = ? WHERE id = ?').run(status, id);
    logActivity('MESSAGE_UPDATE', 'Message', `Updated message #${id} status to ${status}`);

    res.json({ success: true, message: `Message status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update message' });
  }
});

app.delete('/api/admin/messages/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM contact_message WHERE id = ?').run(id);
    logActivity('MESSAGE_DELETE', 'Message', `Deleted message #${id}`);

    res.json({ success: true, message: `Message #${id} deleted` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

// 4. Visitors & Traffic Analytics
app.get('/api/admin/visitors', requireAuth, (req, res) => {
  try {
    const totalVisitors = db.prepare('SELECT COUNT(DISTINCT session_id) as count FROM website_visitor').get().count;
    const totalPageviews = db.prepare('SELECT COUNT(*) as count FROM website_visitor').get().count;

    const recentVisitors = db.prepare('SELECT * FROM website_visitor ORDER BY visited_at DESC LIMIT 50').all();

    const topPages = db.prepare(`
      SELECT page_visited, COUNT(*) as views 
      FROM website_visitor 
      GROUP BY page_visited 
      ORDER BY views DESC
    `).all();

    res.json({
      success: true,
      stats: { totalVisitors, totalPageviews },
      recentVisitors,
      topPages
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch visitor analytics' });
  }
});

// 4.5 File Upload API for Videos & Thumbnails
app.post('/api/admin/upload', requireAuth, upload.fields([
  { name: 'video_file', maxCount: 1 },
  { name: 'thumbnail_file', maxCount: 1 }
]), (req, res) => {
  try {
    const response = { success: true };
    if (req.files) {
      if (req.files.video_file && req.files.video_file[0]) {
        const file = req.files.video_file[0];
        response.video_url = `/uploads/videos/${file.filename}`;
      }
      if (req.files.thumbnail_file && req.files.thumbnail_file[0]) {
        const file = req.files.thumbnail_file[0];
        response.thumbnail = `/uploads/thumbnails/${file.filename}`;
      }
    }
    res.json(response);
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ success: false, error: 'File upload failed' });
  }
});

// 5. Video CRUD
app.get('/api/admin/videos', requireAuth, (req, res) => {
  try {
    const videos = db.prepare('SELECT * FROM video ORDER BY created_at DESC').all();
    res.json({ success: true, videos });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch videos' });
  }
});

app.post('/api/admin/videos', requireAuth, (req, res) => {
  try {
    const { title, description, category, destination, thumbnail, video_url, duration, status, featured } = req.body;
    if (!title || !video_url) {
      return res.status(400).json({ success: false, error: 'Title and video_url required' });
    }

    const id = 'v_' + Date.now();
    let platform = 'YouTube';
    if (video_url.startsWith('/uploads/') || video_url.match(/\.(mp4|webm|mov|mkv)(\?.*)?$/i)) {
      platform = 'Uploaded';
    }

    let thumb = thumbnail;
    if (!thumb && platform === 'YouTube') {
      const match = video_url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
      if (match) {
        thumb = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
      }
    }

    const defaultThumb = '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAYtyoRsmC4PQLqNIXgcdOZkyziFtgAP-SirvPjAdOIWogt2tQ50admxNCxrFzixktHDzw03edQIxc168p4Rv7NYbrGorpp-2d2fdb95be9e79830687d2d0d7e65404';

    db.prepare(`
      INSERT INTO video (id, title, description, category, destination, thumbnail, video_url, platform, duration, status, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title,
      description || '',
      category || 'Travel',
      destination || '',
      thumb || defaultThumb,
      video_url,
      platform,
      duration || '10:00',
      status || 'active',
      featured ? 1 : 0
    );

    const newVideo = db.prepare('SELECT * FROM video WHERE id = ?').get(id);
    logActivity('VIDEO_ADD', 'Video', `Added new video "${title}" (${platform})`);

    res.status(201).json({ success: true, message: 'Video added successfully', videoId: id, video: newVideo });
  } catch (error) {
    console.error('Add video error:', error);
    res.status(500).json({ success: false, error: 'Failed to add video' });
  }
});

app.put('/api/admin/videos/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, destination, thumbnail, video_url, duration, status, featured } = req.body;

    let platform = 'YouTube';
    if (video_url && (video_url.startsWith('/uploads/') || video_url.match(/\.(mp4|webm|mov|mkv)(\?.*)?$/i))) {
      platform = 'Uploaded';
    }

    db.prepare(`
      UPDATE video 
      SET title = ?, description = ?, category = ?, destination = ?, thumbnail = ?, video_url = ?, platform = ?, duration = ?, status = ?, featured = ?
      WHERE id = ?
    `).run(
      title,
      description,
      category,
      destination,
      thumbnail,
      video_url,
      platform,
      duration,
      status,
      featured ? 1 : 0,
      id
    );

    const updatedVideo = db.prepare('SELECT * FROM video WHERE id = ?').get(id);
    logActivity('VIDEO_EDIT', 'Video', `Updated video #${id} ("${title}")`);

    res.json({ success: true, message: 'Video updated successfully', video: updatedVideo });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update video' });
  }
});

app.delete('/api/admin/videos/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM video WHERE id = ?').run(id);
    logActivity('VIDEO_DELETE', 'Video', `Deleted video #${id}`);

    res.json({ success: true, message: 'Video deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete video' });
  }
});

// 6. Destination CRUD
app.get('/api/admin/destinations', requireAuth, (req, res) => {
  try {
    const destinations = db.prepare('SELECT * FROM destination ORDER BY created_at DESC').all();
    res.json({ success: true, destinations });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch destinations' });
  }
});

app.post('/api/admin/destinations', requireAuth, (req, res) => {
  try {
    const { id, name, tag, description, image, video_url, video_id, food, places, experiences, status } = req.body;
    if (!name || !description) {
      return res.status(400).json({ success: false, error: 'Name and description required' });
    }

    const destId = id || name.toLowerCase().replace(/[^a-z0-9]/g, '');

    db.prepare(`
      INSERT INTO destination (id, name, tag, description, image, video_url, video_id, food, places, experiences, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      destId,
      name,
      tag || '',
      description,
      image || '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAYtyoRsmC4PQLqNIXgcdOZkyziFtgAP-SirvPjAdOIWogt2tQ50admxNCxrFzixktHDzw03edQIxc168p4Rv7NYbrGorpp-2d2fdb95be9e79830687d2d0d7e65404',
      video_url || '',
      video_id || '',
      food || '',
      places || '',
      experiences || '',
      status || 'active'
    );

    logActivity('DESTINATION_ADD', 'Destination', `Added new destination "${name}"`);

    res.status(201).json({ success: true, message: 'Destination added successfully', destinationId: destId });
  } catch (error) {
    console.error('Add destination error:', error);
    res.status(500).json({ success: false, error: 'Failed to add destination' });
  }
});

app.put('/api/admin/destinations/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { name, tag, description, image, video_url, video_id, food, places, experiences, status } = req.body;

    db.prepare(`
      UPDATE destination
      SET name = ?, tag = ?, description = ?, image = ?, video_url = ?, video_id = ?, food = ?, places = ?, experiences = ?, status = ?
      WHERE id = ?
    `).run(
      name,
      tag,
      description,
      image,
      video_url,
      video_id,
      food,
      places,
      experiences,
      status,
      id
    );

    logActivity('DESTINATION_EDIT', 'Destination', `Updated destination "${name}"`);

    res.json({ success: true, message: 'Destination updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update destination' });
  }
});

app.delete('/api/admin/destinations/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM destination WHERE id = ?').run(id);
    logActivity('DESTINATION_DELETE', 'Destination', `Deleted destination #${id}`);

    res.json({ success: true, message: 'Destination deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete destination' });
  }
});

// Article / Blog CRUD
app.get('/api/admin/articles', requireAuth, (req, res) => {
  try {
    const articles = db.prepare('SELECT * FROM article ORDER BY created_at DESC').all();
    res.json({ success: true, articles });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch articles' });
  }
});

app.post('/api/admin/articles', requireAuth, (req, res) => {
  try {
    const { id, title, description, content, image, category, read_time, date, video_id, quote, status } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content required' });
    }

    const artId = id || 'art_' + Date.now();

    db.prepare(`
      INSERT INTO article (id, title, description, content, image, category, read_time, date, video_id, quote, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      artId,
      title,
      description || '',
      content,
      image || '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAYtyoRsmC4PQLqNIXgcdOZkyziFtgAP-SirvPjAdOIWogt2tQ50admxNCxrFzixktHDzw03edQIxc168p4Rv7NYbrGorpp-2d2fdb95be9e79830687d2d0d7e65404',
      category || 'Travel Essay',
      read_time || '5 min read',
      date || 'Sept 2026',
      video_id || '',
      quote || '',
      status || 'published'
    );

    logActivity('ARTICLE_ADD', 'Article', `Added blog post "${title}"`);

    res.status(201).json({ success: true, message: 'Blog post created successfully', articleId: artId });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create blog post' });
  }
});

app.put('/api/admin/articles/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content, image, category, read_time, date, video_id, quote, status } = req.body;

    db.prepare(`
      UPDATE article
      SET title = ?, description = ?, content = ?, image = ?, category = ?, read_time = ?, date = ?, video_id = ?, quote = ?, status = ?
      WHERE id = ?
    `).run(
      title,
      description,
      content,
      image,
      category,
      read_time,
      date,
      video_id,
      quote,
      status,
      id
    );

    logActivity('ARTICLE_EDIT', 'Article', `Updated blog post "${title}"`);

    res.json({ success: true, message: 'Blog post updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update blog post' });
  }
});

app.delete('/api/admin/articles/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM article WHERE id = ?').run(id);
    logActivity('ARTICLE_DELETE', 'Article', `Deleted blog post #${id}`);

    res.json({ success: true, message: 'Blog post deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete blog post' });
  }
});

// 7. Settings Management
app.get('/api/admin/settings', requireAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

app.put('/api/admin/settings', requireAuth, (req, res) => {
  try {
    const settingsObj = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

    for (const [key, value] of Object.entries(settingsObj)) {
      stmt.run(key, String(value));
    }

    logActivity('SETTINGS_UPDATE', 'Settings', 'Updated global site settings');

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Settings save error:', error);
    res.status(500).json({ success: false, error: 'Failed to save settings' });
  }
});

// 8. Activity Logs
app.get('/api/admin/activity', requireAuth, (req, res) => {
  try {
    const activities = db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 100').all();
    res.json({ success: true, activities });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch activity logs' });
  }
});

/* ==========================================================================
   STATIC FILES & ROUTING
   ========================================================================== */

// Serve static assets from project root & admin directory with MIME type fallback for extensionless images
const assetStaticOptions = {
  setHeaders: (res, filePath) => {
    if (filePath.includes('stitch') || filePath.includes('AB6AXu') || filePath.includes('AEtjO1')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
  }
};

app.use('/assets', express.static(path.join(__dirname, 'assets'), assetStaticOptions));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use(express.static(__dirname, assetStaticOptions));

// Route /admin and /admin/* to admin/index.html
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('/admin/*splat', (req, res) => {
  if (req.params && req.params.splat && req.params.splat.includes('.')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Fallback to public index.html for all other routes
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Only bind to a port when running locally (`npm run dev` / `npm start`).
// On Vercel, the app itself is exported and invoked per-request as a
// serverless function instead of running a long-lived server.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Veyra Trails Server running on http://localhost:${PORT}`);
  });
}

export default app;
