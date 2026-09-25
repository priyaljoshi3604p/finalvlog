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
import db, { initDatabase, uploadFileToSupabase } from './db/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'veyra_trails_fallback_secret_key_2026';

// Initialize DB schema & seeds asynchronously
initDatabase().catch(err => console.error('Database initialization error:', err));

// Configure Multer to use memory storage for Supabase Storage uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max limit
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Serve local upload fallbacks if present
const localUploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(localUploadsDir)) {
  app.use('/uploads', express.static(localUploadsDir));
}

// Logger Helper
async function logActivity(action, entity, description) {
  try {
    await db.logActivity(action, entity, description);
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

    const newEnquiry = await db.createEnquiry({
      name,
      email,
      phone: phone || '',
      subject: subject || 'General Inquiry',
      message,
      status: 'New',
      ip_address: ip
    });

    await db.createContactMessage({
      name,
      email,
      phone: phone || '',
      subject: subject || 'General Inquiry',
      message,
      status: 'New'
    });

    await logActivity('ENQUIRY_SUBMITTED', 'Enquiry', `New enquiry #${newEnquiry.id} submitted by ${name} (${email})`);

    // Asynchronously dispatch notification email
    sendNotificationEmail({ name, email, phone, subject, message });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your message has been received. We will get back to you soon.',
      enquiryId: newEnquiry.id
    });
  } catch (error) {
    console.error('Enquiry submission error:', error);
    res.status(500).json({ success: false, error: 'Failed to process enquiry.' });
  }
});

// 2. Track Website Visitors / Activity
app.post('/api/visitors/track', async (req, res) => {
  try {
    const { sessionId, pageVisited, referrer } = req.body;
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!sessionId || !pageVisited) {
      return res.status(400).json({ success: false, error: 'sessionId and pageVisited required' });
    }

    await db.trackVisitor({
      session_id: sessionId,
      page_visited: pageVisited,
      referrer: referrer || '',
      user_agent: userAgent,
      ip_address: ip
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Visitor tracking error:', error);
    res.status(500).json({ success: false, error: 'Tracking failed' });
  }
});

// 3. Public Content Endpoints
app.get(['/api/public/videos', '/public/videos'], async (req, res) => {
  try {
    const videos = await db.getPublicVideos();
    res.json({ success: true, videos });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load videos' });
  }
});

app.get(['/api/public/destinations', '/public/destinations'], async (req, res) => {
  try {
    const destinations = await db.getPublicDestinations();
    res.json({ success: true, destinations });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load destinations' });
  }
});

app.get(['/api/public/articles', '/public/articles'], async (req, res) => {
  try {
    const articles = await db.getPublicArticles();
    res.json({ success: true, articles });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load articles' });
  }
});

app.get(['/api/public/settings', '/public/settings'], async (req, res) => {
  try {
    const settings = await db.getSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load settings' });
  }
});

/* ==========================================================================
   ADMIN AUTHENTICATION API
   ========================================================================== */

app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email/username and password required' });
    }

    const admin = await db.getAdminByEmailOrUsername(email);
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
      secure: false, // Local dev & Vercel HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await logActivity('ADMIN_LOGIN', 'Auth', `Admin ${admin.name} logged into control center`);

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
app.get('/api/admin/dashboard', requireAuth, async (req, res) => {
  try {
    const data = await db.getDashboardData();
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

// 2. Enquiries Management
app.get('/api/admin/enquiries', requireAuth, async (req, res) => {
  try {
    const { status, search } = req.query;
    const enquiries = await db.getEnquiries({ status, search });
    res.json({ success: true, enquiries });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch enquiries' });
  }
});

app.put('/api/admin/enquiries/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['New', 'Read', 'Contacted', 'Resolved'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    await db.updateEnquiryStatus(id, status);
    await logActivity('ENQUIRY_UPDATE', 'Enquiry', `Updated enquiry #${id} status to ${status}`);

    res.json({ success: true, message: `Enquiry #${id} marked as ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update enquiry' });
  }
});

app.delete('/api/admin/enquiries/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteEnquiry(id);
    await logActivity('ENQUIRY_DELETE', 'Enquiry', `Deleted enquiry #${id}`);

    res.json({ success: true, message: `Enquiry #${id} deleted` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete enquiry' });
  }
});

// 3. Contact Messages Management
app.get('/api/admin/messages', requireAuth, async (req, res) => {
  try {
    const messages = await db.getContactMessages();
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch contact messages' });
  }
});

app.put('/api/admin/messages/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db.updateContactMessageStatus(id, status);
    await logActivity('MESSAGE_UPDATE', 'Message', `Updated message #${id} status to ${status}`);

    res.json({ success: true, message: `Message status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update message' });
  }
});

app.delete('/api/admin/messages/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteContactMessage(id);
    await logActivity('MESSAGE_DELETE', 'Message', `Deleted message #${id}`);

    res.json({ success: true, message: `Message #${id} deleted` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

// 4. Visitors & Traffic Analytics
app.get('/api/admin/visitors', requireAuth, async (req, res) => {
  try {
    const analytics = await db.getVisitorAnalytics();
    res.json({
      success: true,
      stats: analytics.stats,
      recentVisitors: analytics.recentVisitors,
      topPages: analytics.topPages
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch visitor analytics' });
  }
});

// 4.5 File Upload API for Videos, Thumbnails & Article Images (Supabase Storage)
app.post('/api/admin/upload', requireAuth, upload.fields([
  { name: 'video_file', maxCount: 1 },
  { name: 'thumbnail_file', maxCount: 1 },
  { name: 'article_image', maxCount: 1 },
  { name: 'image_file', maxCount: 1 }
]), async (req, res) => {
  try {
    const response = { success: true };
    if (req.files) {
      if (req.files.video_file && req.files.video_file[0]) {
        const file = req.files.video_file[0];
        response.video_url = await uploadFileToSupabase(file.buffer, file.originalname, file.mimetype, 'videos');
      }
      if (req.files.thumbnail_file && req.files.thumbnail_file[0]) {
        const file = req.files.thumbnail_file[0];
        response.thumbnail = await uploadFileToSupabase(file.buffer, file.originalname, file.mimetype, 'thumbnails');
      }
      if (req.files.article_image && req.files.article_image[0]) {
        const file = req.files.article_image[0];
        response.image = await uploadFileToSupabase(file.buffer, file.originalname, file.mimetype, 'article-images');
      }
      if (req.files.image_file && req.files.image_file[0]) {
        const file = req.files.image_file[0];
        response.image = await uploadFileToSupabase(file.buffer, file.originalname, file.mimetype, 'article-images');
      }
    }
    res.json(response);
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ success: false, error: 'File upload failed: ' + (err.message || err) });
  }
});

// 5. Video CRUD
app.get('/api/admin/videos', requireAuth, async (req, res) => {
  try {
    const videos = await db.getAllVideos();
    res.json({ success: true, videos });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch videos' });
  }
});

app.post('/api/admin/videos', requireAuth, async (req, res) => {
  try {
    let { title, description, category, destination, thumbnail, video_url, duration, status, featured } = req.body;
    if (!title || !video_url) {
      return res.status(400).json({ success: false, error: 'Title and video_url required' });
    }

    const id = 'v_' + Date.now();
    let platform = 'YouTube';
    if (video_url.includes('/storage/v1/object/public/') || video_url.startsWith('/uploads/') || video_url.match(/\.(mp4|webm|mov|mkv)(\?.*)?$/i)) {
      platform = 'Uploaded';
    } else {
      const match = video_url.match(/(?:embed\/|v=|vi\/|youtu\.be\/|\/v\/|shorts\/|\/)([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        video_url = `https://www.youtube.com/embed/${match[1]}`;
        if (!thumbnail) {
          thumbnail = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
        }
      }
    }

    let thumb = thumbnail;
    const defaultThumb = '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAYtyoRsmC4PQLqNIXgcdOZkyziFtgAP-SirvPjAdOIWogt2tQ50admxNCxrFzixktHDzw03edQIxc168p4Rv7NYbrGorpp-2d2fdb95be9e79830687d2d0d7e65404';

    const videoObj = {
      id,
      title,
      description: description || '',
      category: category || 'Travel',
      destination: destination || '',
      thumbnail: thumb || defaultThumb,
      video_url,
      platform,
      duration: duration || '10:00',
      status: status || 'active',
      featured: featured ? 1 : 0
    };

    const newVideo = await db.addVideo(videoObj);
    await logActivity('VIDEO_ADD', 'Video', `Added new video "${title}" (${platform})`);

    res.status(201).json({ success: true, message: 'Video added successfully', videoId: id, video: newVideo });
  } catch (error) {
    console.error('Add video error:', error);
    res.status(500).json({ success: false, error: 'Failed to add video' });
  }
});

app.put('/api/admin/videos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    let { title, description, category, destination, thumbnail, video_url, duration, status, featured } = req.body;

    let platform = 'YouTube';
    if (video_url && (video_url.includes('/storage/v1/object/public/') || video_url.startsWith('/uploads/') || video_url.match(/\.(mp4|webm|mov|mkv)(\?.*)?$/i))) {
      platform = 'Uploaded';
    } else if (video_url) {
      const match = video_url.match(/(?:embed\/|v=|vi\/|youtu\.be\/|\/v\/|shorts\/|\/)([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        video_url = `https://www.youtube.com/embed/${match[1]}`;
        if (!thumbnail) {
          thumbnail = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
        }
      }
    }

    const updatedVideo = await db.updateVideo(id, {
      title,
      description,
      category,
      destination,
      thumbnail,
      video_url,
      platform,
      duration,
      status,
      featured: featured ? 1 : 0
    });

    await logActivity('VIDEO_EDIT', 'Video', `Updated video #${id} ("${title}")`);

    res.json({ success: true, message: 'Video updated successfully', video: updatedVideo });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update video' });
  }
});

app.delete('/api/admin/videos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteVideo(id);
    await logActivity('VIDEO_DELETE', 'Video', `Deleted video #${id}`);

    res.json({ success: true, message: 'Video deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete video' });
  }
});

// 6. Destination CRUD
app.get('/api/admin/destinations', requireAuth, async (req, res) => {
  try {
    const destinations = await db.getAllDestinations();
    res.json({ success: true, destinations });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch destinations' });
  }
});

app.post('/api/admin/destinations', requireAuth, async (req, res) => {
  try {
    const { id, name, tag, description, image, video_url, video_id, food, places, experiences, status } = req.body;
    if (!name || !description) {
      return res.status(400).json({ success: false, error: 'Name and description required' });
    }

    const destId = id || name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const destObj = {
      id: destId,
      name,
      tag: tag || '',
      description,
      image: image || '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAYtyoRsmC4PQLqNIXgcdOZkyziFtgAP-SirvPjAdOIWogt2tQ50admxNCxrFzixktHDzw03edQIxc168p4Rv7NYbrGorpp-2d2fdb95be9e79830687d2d0d7e65404',
      video_url: video_url || '',
      video_id: video_id || '',
      food: food || '',
      places: places || '',
      experiences: experiences || '',
      status: status || 'active'
    };

    await db.addDestination(destObj);
    await logActivity('DESTINATION_ADD', 'Destination', `Added new destination "${name}"`);

    res.status(201).json({ success: true, message: 'Destination added successfully', destinationId: destId });
  } catch (error) {
    console.error('Add destination error:', error);
    res.status(500).json({ success: false, error: 'Failed to add destination' });
  }
});

app.put('/api/admin/destinations/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, tag, description, image, video_url, video_id, food, places, experiences, status } = req.body;

    await db.updateDestination(id, {
      name,
      tag,
      description,
      image,
      video_url,
      video_id,
      food,
      places,
      experiences,
      status
    });

    await logActivity('DESTINATION_EDIT', 'Destination', `Updated destination "${name}"`);

    res.json({ success: true, message: 'Destination updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update destination' });
  }
});

app.delete('/api/admin/destinations/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteDestination(id);
    await logActivity('DESTINATION_DELETE', 'Destination', `Deleted destination #${id}`);

    res.json({ success: true, message: 'Destination deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete destination' });
  }
});

// Article / Blog CRUD
app.get('/api/admin/articles', requireAuth, async (req, res) => {
  try {
    const articles = await db.getAllArticles();
    res.json({ success: true, articles });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch articles' });
  }
});

app.post('/api/admin/articles', requireAuth, async (req, res) => {
  try {
    const { id, title, description, content, image, category, read_time, date, video_id, quote, status } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content required' });
    }

    const artId = id || 'art_' + Date.now();

    const artObj = {
      id: artId,
      title,
      description: description || '',
      content,
      image: image || '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAYtyoRsmC4PQLqNIXgcdOZkyziFtgAP-SirvPjAdOIWogt2tQ50admxNCxrFzixktHDzw03edQIxc168p4Rv7NYbrGorpp-2d2fdb95be9e79830687d2d0d7e65404',
      category: category || 'Travel Essay',
      read_time: read_time || '5 min read',
      date: date || 'Sept 2026',
      video_id: video_id || '',
      quote: quote || '',
      status: status || 'published'
    };

    await db.addArticle(artObj);
    await logActivity('ARTICLE_ADD', 'Article', `Added blog post "${title}"`);

    res.status(201).json({ success: true, message: 'Blog post created successfully', articleId: artId });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create blog post' });
  }
});

app.put('/api/admin/articles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content, image, category, read_time, date, video_id, quote, status } = req.body;

    await db.updateArticle(id, {
      title,
      description,
      content,
      image,
      category,
      read_time,
      date,
      video_id,
      quote,
      status
    });

    await logActivity('ARTICLE_EDIT', 'Article', `Updated blog post "${title}"`);

    res.json({ success: true, message: 'Blog post updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update blog post' });
  }
});

app.delete('/api/admin/articles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteArticle(id);
    await logActivity('ARTICLE_DELETE', 'Article', `Deleted blog post #${id}`);

    res.json({ success: true, message: 'Blog post deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete blog post' });
  }
});

// 7. Settings Management
app.get('/api/admin/settings', requireAuth, async (req, res) => {
  try {
    const settings = await db.getSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

app.put('/api/admin/settings', requireAuth, async (req, res) => {
  try {
    const settingsObj = req.body;
    await db.updateSettings(settingsObj);
    await logActivity('SETTINGS_UPDATE', 'Settings', 'Updated global site settings');

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Settings save error:', error);
    res.status(500).json({ success: false, error: 'Failed to save settings' });
  }
});

// 8. Activity Logs
app.get('/api/admin/activity', requireAuth, async (req, res) => {
  try {
    const activities = await db.getActivityLogs();
    res.json({ success: true, activities });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch activity logs' });
  }
});

// 9. Global Admin Search API
app.get('/api/admin/search', requireAuth, async (req, res) => {
  try {
    const q = req.query.q || '';
    const results = await db.searchAll(q);
    res.json({ success: true, query: q, results });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

/* ==========================================================================
   STATIC FILES & ROUTING
   ========================================================================== */

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
  if (req.params && req.params.splat && req.params.splat.includes('.')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Bind server for local execution
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Veyra Trails Server running on http://localhost:${PORT}`);
  });
}

export default app;
