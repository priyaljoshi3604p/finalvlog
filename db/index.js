import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Environment Setup
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isPlaceholderUrl = !supabaseUrl || 
  supabaseUrl.includes('your-project-ref') || 
  supabaseUrl.includes('your-supabase') || 
  supabaseUrl.includes('your_supabase');

const isPlaceholderKey = !supabaseKey || 
  supabaseKey.includes('your_supabase') || 
  supabaseKey.includes('your-key');

export const supabase = (!isPlaceholderUrl && !isPlaceholderKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (supabase) {
  console.log('⚡ Connected to Supabase PostgreSQL & Storage at:', supabaseUrl);
} else {
  console.log('ℹ Supabase environment variables not configured or using placeholders. Operating in local JSON fallback mode.');
}

// Local Fallback JSON Database Store Setup
const dataDir = process.env.VERCEL ? '/tmp/data' : path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch (e) {}
}
const jsonDbPath = path.join(dataDir, 'vlogger_store.json');

const localStore = {
  admin: [],
  enquiry: [],
  contact_message: [],
  website_visitor: [],
  video: [],
  destination: [],
  settings: [],
  article: [],
  activity_log: []
};

function loadLocalStore() {
  if (fs.existsSync(jsonDbPath)) {
    try {
      const raw = fs.readFileSync(jsonDbPath, 'utf8');
      const parsed = JSON.parse(raw);
      Object.assign(localStore, parsed);
    } catch (e) {}
  }
}

function saveLocalStore() {
  try {
    fs.writeFileSync(jsonDbPath, JSON.stringify(localStore, null, 2), 'utf8');
  } catch (e) {}
}

loadLocalStore();

let autoInc = {
  admin: localStore.admin.length ? Math.max(...localStore.admin.map(a => Number(a.id) || 0)) : 0,
  enquiry: localStore.enquiry.length ? Math.max(...localStore.enquiry.map(a => Number(a.id) || 0)) : 0,
  contact_message: localStore.contact_message.length ? Math.max(...localStore.contact_message.map(a => Number(a.id) || 0)) : 0,
  website_visitor: localStore.website_visitor.length ? Math.max(...localStore.website_visitor.map(a => Number(a.id) || 0)) : 0,
  activity_log: localStore.activity_log.length ? Math.max(...localStore.activity_log.map(a => Number(a.id) || 0)) : 0
};

/* ==========================================================================
   SUPABASE STORAGE HELPER
   ========================================================================== */
export async function uploadFileToSupabase(fileBuffer, originalName, mimeType, bucketName = 'thumbnails') {
  if (!supabase) {
    // Fallback: save to /tmp or return data URI / mock path if local
    const ext = path.extname(originalName) || (bucketName === 'videos' ? '.mp4' : '.jpg');
    const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const uploadDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads');
    const targetDir = path.join(uploadDir, bucketName);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, safeName);
    fs.writeFileSync(targetPath, fileBuffer);
    return `/uploads/${bucketName}/${safeName}`;
  }

  const ext = path.extname(originalName) || (bucketName === 'videos' ? '.mp4' : '.jpg');
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;

  // Ensure file is uploaded to the appropriate bucket
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, fileBuffer, {
      contentType: mimeType || 'application/octet-stream',
      upsert: true
    });

  if (error) {
    console.error(`Supabase Storage Upload Error [${bucketName}]:`, error);
    throw new Error(error.message || 'Storage upload failed');
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

/* ==========================================================================
   DATABASE REPOSITORY METHODS
   ========================================================================== */

export const db = {
  // 1. Admin Auth
  async getAdminByEmailOrUsername(term) {
    if (supabase) {
      const { data, error } = await supabase
        .from('admin')
        .select('*')
        .or(`email.eq.${term},username.eq.${term}`)
        .maybeSingle();
      if (error) console.error('Supabase error (getAdmin):', error);
      return data;
    }
    return localStore.admin.find(a => a.email === term || a.username === term);
  },

  // 2. Public Videos
  async getPublicVideos() {
    if (supabase) {
      const { data, error } = await supabase
        .from('video')
        .select('*')
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return localStore.video
      .filter(v => v.status === 'active')
      .sort((a, b) => (b.featured || 0) - (a.featured || 0) || new Date(b.created_at || 0) - new Date(a.created_at || 0));
  },

  // Admin Videos
  async getAllVideos() {
    if (supabase) {
      const { data, error } = await supabase
        .from('video')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return [...localStore.video].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  },

  async getVideoById(id) {
    if (supabase) {
      const { data } = await supabase.from('video').select('*').eq('id', id).maybeSingle();
      return data;
    }
    return localStore.video.find(v => v.id === id);
  },

  async addVideo(videoData) {
    if (supabase) {
      const { data, error } = await supabase.from('video').insert(videoData).select().single();
      if (error) throw error;
      return data;
    }
    localStore.video.push(videoData);
    saveLocalStore();
    return videoData;
  },

  async updateVideo(id, videoData) {
    if (supabase) {
      const { data, error } = await supabase.from('video').update(videoData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const idx = localStore.video.findIndex(v => v.id === id);
    if (idx !== -1) {
      localStore.video[idx] = { ...localStore.video[idx], ...videoData };
      saveLocalStore();
      return localStore.video[idx];
    }
    return null;
  },

  async deleteVideo(id) {
    if (supabase) {
      const { error } = await supabase.from('video').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    const idx = localStore.video.findIndex(v => v.id === id);
    if (idx !== -1) {
      localStore.video.splice(idx, 1);
      saveLocalStore();
    }
    return true;
  },

  // 3. Destinations
  async getPublicDestinations() {
    if (supabase) {
      const { data, error } = await supabase
        .from('destination')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return localStore.destination
      .filter(d => d.status === 'active')
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  },

  async getAllDestinations() {
    if (supabase) {
      const { data, error } = await supabase
        .from('destination')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return [...localStore.destination].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  },

  async addDestination(destData) {
    if (supabase) {
      const { data, error } = await supabase.from('destination').insert(destData).select().single();
      if (error) throw error;
      return data;
    }
    localStore.destination.push(destData);
    saveLocalStore();
    return destData;
  },

  async updateDestination(id, destData) {
    if (supabase) {
      const { data, error } = await supabase.from('destination').update(destData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const idx = localStore.destination.findIndex(d => d.id === id);
    if (idx !== -1) {
      localStore.destination[idx] = { ...localStore.destination[idx], ...destData };
      saveLocalStore();
      return localStore.destination[idx];
    }
    return null;
  },

  async deleteDestination(id) {
    if (supabase) {
      const { error } = await supabase.from('destination').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    const idx = localStore.destination.findIndex(d => d.id === id);
    if (idx !== -1) {
      localStore.destination.splice(idx, 1);
      saveLocalStore();
    }
    return true;
  },

  // 4. Articles
  async getPublicArticles() {
    if (supabase) {
      const { data, error } = await supabase
        .from('article')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return localStore.article
      .filter(a => a.status === 'published')
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  },

  async getAllArticles() {
    if (supabase) {
      const { data, error } = await supabase
        .from('article')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return [...localStore.article].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  },

  async addArticle(artData) {
    if (supabase) {
      const { data, error } = await supabase.from('article').insert(artData).select().single();
      if (error) throw error;
      return data;
    }
    localStore.article.push(artData);
    saveLocalStore();
    return artData;
  },

  async updateArticle(id, artData) {
    if (supabase) {
      const { data, error } = await supabase.from('article').update(artData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const idx = localStore.article.findIndex(a => a.id === id);
    if (idx !== -1) {
      localStore.article[idx] = { ...localStore.article[idx], ...artData };
      saveLocalStore();
      return localStore.article[idx];
    }
    return null;
  },

  async deleteArticle(id) {
    if (supabase) {
      const { error } = await supabase.from('article').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    const idx = localStore.article.findIndex(a => a.id === id);
    if (idx !== -1) {
      localStore.article.splice(idx, 1);
      saveLocalStore();
    }
    return true;
  },

  // 5. Settings
  async getSettings() {
    if (supabase) {
      const { data, error } = await supabase.from('settings').select('*');
      if (!error && data) {
        const obj = {};
        data.forEach(row => { obj[row.key] = row.value; });
        return obj;
      }
    }
    const obj = {};
    localStore.settings.forEach(row => { obj[row.key] = row.value; });
    return obj;
  },

  async updateSettings(settingsObj) {
    if (supabase) {
      const records = Object.entries(settingsObj).map(([key, value]) => ({ key, value: String(value) }));
      const { error } = await supabase.from('settings').upsert(records);
      if (error) throw error;
      return true;
    }
    for (const [key, value] of Object.entries(settingsObj)) {
      const existing = localStore.settings.find(s => s.key === key);
      if (existing) {
        existing.value = String(value);
      } else {
        localStore.settings.push({ key, value: String(value) });
      }
    }
    saveLocalStore();
    return true;
  },

  // 6. Enquiries & Messages
  async createEnquiry(enquiryData) {
    if (supabase) {
      const { data, error } = await supabase.from('enquiry').insert(enquiryData).select().single();
      if (error) console.error('Supabase error (createEnquiry):', error);
      if (data) return data;
    }
    autoInc.enquiry++;
    const row = { id: autoInc.enquiry, ...enquiryData, status: enquiryData.status || 'New', created_at: new Date().toISOString() };
    localStore.enquiry.push(row);
    saveLocalStore();
    return row;
  },

  async createContactMessage(msgData) {
    if (supabase) {
      const { data, error } = await supabase.from('contact_message').insert(msgData).select().single();
      if (error) console.error('Supabase error (createContactMessage):', error);
      if (data) return data;
    }
    autoInc.contact_message++;
    const row = { id: autoInc.contact_message, ...msgData, status: msgData.status || 'New', created_at: new Date().toISOString() };
    localStore.contact_message.push(row);
    saveLocalStore();
    return row;
  },

  async getEnquiries({ status, search }) {
    if (supabase) {
      let query = supabase.from('enquiry').select('*');
      if (status && status !== 'All') query = query.eq('status', status);
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,subject.ilike.%${search}%,message.ilike.%${search}%`);
      }
      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (!error && data) return data;
    }
    let list = [...localStore.enquiry];
    if (status && status !== 'All') list = list.filter(e => e.status === status);
    if (search) {
      const term = search.toLowerCase();
      list = list.filter(e =>
        (e.name || '').toLowerCase().includes(term) ||
        (e.email || '').toLowerCase().includes(term) ||
        (e.subject || '').toLowerCase().includes(term) ||
        (e.message || '').toLowerCase().includes(term)
      );
    }
    return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  },

  async updateEnquiryStatus(id, status) {
    if (supabase) {
      const { error } = await supabase.from('enquiry').update({ status }).eq('id', id);
      if (error) throw error;
      return true;
    }
    const item = localStore.enquiry.find(e => String(e.id) === String(id));
    if (item) {
      item.status = status;
      saveLocalStore();
    }
    return true;
  },

  async deleteEnquiry(id) {
    if (supabase) {
      const { error } = await supabase.from('enquiry').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    const idx = localStore.enquiry.findIndex(e => String(e.id) === String(id));
    if (idx !== -1) {
      localStore.enquiry.splice(idx, 1);
      saveLocalStore();
    }
    return true;
  },

  async getContactMessages() {
    if (supabase) {
      const { data, error } = await supabase.from('contact_message').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return [...localStore.contact_message].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  },

  async updateContactMessageStatus(id, status) {
    if (supabase) {
      const { error } = await supabase.from('contact_message').update({ status }).eq('id', id);
      if (error) throw error;
      return true;
    }
    const item = localStore.contact_message.find(m => String(m.id) === String(id));
    if (item) {
      item.status = status;
      saveLocalStore();
    }
    return true;
  },

  async deleteContactMessage(id) {
    if (supabase) {
      const { error } = await supabase.from('contact_message').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    const idx = localStore.contact_message.findIndex(m => String(m.id) === String(id));
    if (idx !== -1) {
      localStore.contact_message.splice(idx, 1);
      saveLocalStore();
    }
    return true;
  },

  // 7. Visitor Tracking & Traffic Analytics
  async trackVisitor(visitorData) {
    if (supabase) {
      const { error } = await supabase.from('website_visitor').insert(visitorData);
      if (error) console.error('Supabase error (trackVisitor):', error);
      return;
    }
    autoInc.website_visitor++;
    localStore.website_visitor.push({ id: autoInc.website_visitor, ...visitorData, visited_at: new Date().toISOString() });
    saveLocalStore();
  },

  async getVisitorAnalytics() {
    if (supabase) {
      const { data: allVisitors } = await supabase.from('website_visitor').select('*').order('visited_at', { ascending: false });
      if (allVisitors) {
        const uniqueSessions = new Set(allVisitors.map(v => v.session_id)).size;
        const totalPageviews = allVisitors.length;
        const recentVisitors = allVisitors.slice(0, 50);

        const pageCounts = {};
        allVisitors.forEach(v => {
          pageCounts[v.page_visited] = (pageCounts[v.page_visited] || 0) + 1;
        });
        const topPages = Object.keys(pageCounts)
          .map(p => ({ page_visited: p, views: pageCounts[p] }))
          .sort((a, b) => b.views - a.views);

        return {
          stats: { totalVisitors: uniqueSessions, totalPageviews },
          recentVisitors,
          topPages
        };
      }
    }
    const uniqueSessions = new Set(localStore.website_visitor.map(v => v.session_id)).size;
    const totalPageviews = localStore.website_visitor.length;
    const recentVisitors = [...localStore.website_visitor]
      .sort((a, b) => new Date(b.visited_at || 0) - new Date(a.visited_at || 0))
      .slice(0, 50);

    const pageCounts = {};
    localStore.website_visitor.forEach(v => {
      pageCounts[v.page_visited] = (pageCounts[v.page_visited] || 0) + 1;
    });
    const topPages = Object.keys(pageCounts)
      .map(p => ({ page_visited: p, views: pageCounts[p] }))
      .sort((a, b) => b.views - a.views);

    return {
      stats: { totalVisitors: uniqueSessions, totalPageviews },
      recentVisitors,
      topPages
    };
  },

  // 8. Activity Log
  async logActivity(action, entity, description) {
    if (supabase) {
      const { error } = await supabase.from('activity_log').insert({ action, entity, description });
      if (error) console.error('Supabase error (logActivity):', error);
      return;
    }
    autoInc.activity_log++;
    localStore.activity_log.push({ id: autoInc.activity_log, action, entity, description, created_at: new Date().toISOString() });
    saveLocalStore();
  },

  async getActivityLogs() {
    if (supabase) {
      const { data, error } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(100);
      if (!error && data) return data;
    }
    return [...localStore.activity_log].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 100);
  },

  // 9. Dashboard Complete Stats
  async getDashboardData() {
    const enquiries = await this.getEnquiries({});
    const newEnquiriesCount = enquiries.filter(e => e.status === 'New').length;
    const analytics = await this.getVisitorAnalytics();
    const messages = await this.getContactMessages();
    const videos = await this.getAllVideos();
    const destinations = await this.getAllDestinations();
    const articles = await this.getAllArticles();
    const recentActivity = await this.getActivityLogs();

    return {
      stats: {
        totalEnquiries: enquiries.length,
        newEnquiries: newEnquiriesCount,
        totalVisitors: analytics.stats.totalVisitors,
        totalPageviews: analytics.stats.totalPageviews,
        contactMessages: messages.length,
        totalVideos: videos.length,
        totalDestinations: destinations.length,
        totalArticles: articles.length
      },
      recentEnquiries: enquiries.slice(0, 6),
      recentVisitors: analytics.recentVisitors.slice(0, 8),
      recentActivity: recentActivity.slice(0, 10),
      topPages: analytics.topPages.slice(0, 5)
    };
  },

  // 10. Global Search
  async searchAll(q) {
    const term = (q || '').trim().toLowerCase();
    if (!term) return { destinations: [], videos: [], articles: [], messages: [] };

    const destinations = (await this.getAllDestinations()).filter(d => (d.name || '').toLowerCase().includes(term) || (d.description || '').toLowerCase().includes(term));
    const videos = (await this.getAllVideos()).filter(v => (v.title || '').toLowerCase().includes(term) || (v.description || '').toLowerCase().includes(term) || (v.destination || '').toLowerCase().includes(term));
    const articles = (await this.getAllArticles()).filter(a => (a.title || '').toLowerCase().includes(term) || (a.description || '').toLowerCase().includes(term) || (a.content || '').toLowerCase().includes(term));
    const messages = (await this.getEnquiries({})).filter(m => (m.name || '').toLowerCase().includes(term) || (m.email || '').toLowerCase().includes(term) || (m.subject || '').toLowerCase().includes(term) || (m.message || '').toLowerCase().includes(term));

    return { destinations, videos, articles, messages };
  }
};

/* ==========================================================================
   INITIAL SEEDING & SETUP
   ========================================================================== */

export async function initDatabase() {
  try {
    const adminUser = await db.getAdminByEmailOrUsername('admin');
    if (!adminUser) {
      const defaultPassword = 'admin123';
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(defaultPassword, salt);
      const adminData = {
        username: 'admin',
        email: 'owner@veyratrails.com',
        password_hash: hash,
        name: 'Veyra Trails Owner',
        role: 'Owner'
      };
      if (supabase) {
        await supabase.from('admin').insert(adminData);
      } else {
        autoInc.admin++;
        localStore.admin.push({ id: autoInc.admin, ...adminData, created_at: new Date().toISOString() });
        saveLocalStore();
      }
      console.log('✅ Seeded default admin user: owner@veyratrails.com');
    }

    // Seed Settings
    const existingSettings = await db.getSettings();
    if (!existingSettings || Object.keys(existingSettings).length === 0) {
      const defaultSettings = {
        websiteName: 'Veyra Trails',
        tagline: 'Travel. Taste. Tell the Story.',
        description: 'Official portfolio & travel + food journal of Veyra Trails. Exploring hidden places, unforgettable flavors and stories worth sharing.',
        contactEmail: 'priyaljoshi3604@gmail.com',
        contactPhone: '+91 98765 43210',
        youtubeUrl: 'https://youtube.com',
        instagramUrl: 'https://instagram.com',
        twitterUrl: 'https://x.com',
        facebookUrl: 'https://facebook.com',
        seoTitle: 'Veyra Trails — Travel. Taste. Tell the Story.',
        seoMetaDescription: 'Immersive travel, culinary exploration, and documentary vlogs by Veyra Trails.'
      };
      await db.updateSettings(defaultSettings);
      console.log('✅ Seeded default site settings.');
    }

    // Seed Initial Videos
    const videos = await db.getAllVideos();
    if (videos.length === 0) {
      const initialVideos = [
        {
          id: 'z_8Gzjx3s_Q',
          title: 'Exploring Goa',
          description: 'Exploring the sunny beaches, Latin Quarter Fontainhas heritage, and coastal palm trails of Goa, India.',
          category: 'Travel',
          destination: 'Goa, India',
          thumbnail: 'https://img.youtube.com/vi/z_8Gzjx3s_Q/hqdefault.jpg',
          video_url: 'https://www.youtube.com/embed/z_8Gzjx3s_Q',
          platform: 'YouTube',
          duration: '01:00',
          status: 'active',
          featured: 1
        },
        {
          id: '0l0pGB0jiyc',
          title: 'Exploring Munnar',
          description: 'Discovering misty hills, tea estate valleys, and serene cloud inversions in Munnar, Kerala.',
          category: 'Travel',
          destination: 'Munnar, Kerala',
          thumbnail: 'https://img.youtube.com/vi/0l0pGB0jiyc/hqdefault.jpg',
          video_url: 'https://www.youtube.com/embed/0l0pGB0jiyc',
          platform: 'YouTube',
          duration: '03:45',
          status: 'active',
          featured: 1
        },
        {
          id: 'k8hmpz2tVEg',
          title: 'Kerala Sadhya',
          description: 'Experiencing traditional 24+ item Kerala banana leaf Sadhya feast cooked over woodfire.',
          category: 'Food',
          destination: 'Kerala, India',
          thumbnail: 'https://img.youtube.com/vi/k8hmpz2tVEg/hqdefault.jpg',
          video_url: 'https://www.youtube.com/embed/k8hmpz2tVEg',
          platform: 'YouTube',
          duration: '02:30',
          status: 'active',
          featured: 1
        },
        {
          id: 'v1',
          title: 'Munnar – The Misty Hills of Kerala',
          description: 'Nestled in the Western Ghats of Kerala at around 1,600 metres above sea level, Munnar is famous for mist-covered mountains, tea plantations, waterfalls and peaceful valleys.',
          category: 'Travel',
          destination: 'Munnar',
          thumbnail: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuC3ktJ0r9ZmiMpAE1kJI_kCDkJIRlIpkwNdw54Hv2qlQazyVfRLsZiYo3DetM3TxYS8EYVEiD5LW-dqIi1FyZT3pntuV6JV-236acde6080bf3f770c98cca77aa020d',
          video_url: 'https://www.youtube.com/embed/okQ2Wr6GPXg',
          platform: 'YouTube',
          duration: '12:45',
          status: 'active',
          featured: 1
        },
        {
          id: 'v2',
          title: 'Food Hunt in Kochi | Culinary Heritage & Backwater Recipes',
          description: 'Uncovering 100-year-old spice blends in Fort Kochi backlanes and sharing a traditional Sadya feast.',
          category: 'Food',
          destination: 'Kochi',
          thumbnail: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCQaZah9USED6VtRLFcaESDDe1hhrhwnCe8XJ29ypZ4CsFxDAwGlLTXs1FC50oSjjvqkPuyBR5QFEjR1V6XBnsMjGn5KqVz-0a930619be67565aa64f3dd2a061d204',
          video_url: 'https://www.youtube.com/embed/Pj15eX2yL-0',
          platform: 'YouTube',
          duration: '08:20',
          status: 'active',
          featured: 1
        },
        {
          id: 'v3',
          title: 'Golden Dune Sunset Safari & Old Dubai Spice Trails',
          description: 'Crossing golden sand dunes at twilight and exploring Deira historic spice souks.',
          category: 'Adventure',
          destination: 'Dubai',
          thumbnail: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCXNOPI_dxPjVZx369fnolWt_YodLRcFg5o_XFJgyg9uKdOuzw-dwjcSMiynd6SWcptie-TsHq8US1SSOa2eRfrFGAqjIKS-9227465da0dc969f961ab80219cdad26',
          video_url: 'https://www.youtube.com/embed/a7G6J0XvXJg',
          platform: 'YouTube',
          duration: '10:32',
          status: 'active',
          featured: 1
        },
        {
          id: 'v4',
          title: 'Alleppey Houseboat Serenity | Solitary Morning Drift',
          description: 'Slow living along Vembanad lake, observing riverine life unfold at dawn from a traditional Kettuvallam.',
          category: 'Travel',
          destination: 'Kerala',
          thumbnail: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCGpMrj02jB5oZ8woDp1pDG1KYzKZnUksg0jPmxZAg-ZuhekRvLjZ_ySpK9Y067sfnHkzNkdg3qJPv4bnRFf-zicUpB8_pj-7a11c56d8eaa116b93cd26d5efbf5e9f',
          video_url: 'https://www.youtube.com/embed/MhLpHW_0KBA',
          platform: 'YouTube',
          duration: '14:50',
          status: 'active',
          featured: 1
        },
        {
          id: 'v5',
          title: 'Traditional Kerala Banana Leaf Sadya Feast',
          description: '24+ vegetarian delicacies cooked over woodfire with fragrant red rice and coconut milk.',
          category: 'Food',
          destination: 'Fort Kochi',
          thumbnail: 'https://img.youtube.com/vi/9NH5EfKGqgQ/maxresdefault.jpg',
          video_url: 'https://www.youtube.com/watch?v=9NH5EfKGqgQ',
          platform: 'YouTube',
          duration: '11:15',
          status: 'active',
          featured: 0
        },
        {
          id: 'v6',
          title: 'Woodfire Cardamom Chai in Munnar High Ranges',
          description: 'Piping hot cardamom tea brewed with freshly crushed green pods in small glass tumblers.',
          category: 'Food',
          destination: 'Munnar',
          thumbnail: 'https://img.youtube.com/vi/tCnc7fKwe-E/maxresdefault.jpg',
          video_url: 'https://www.youtube.com/watch?v=tCnc7fKwe-E',
          platform: 'YouTube',
          duration: '06:40',
          status: 'active',
          featured: 0
        },
        {
          id: 'v7',
          title: 'Exploring Old Goa’s Latin Quarter & Spice Trails',
          description: 'Heritage walk through Fontainhas, Portuguese house architecture, street art, and legendary Goan fish curry rice.',
          category: 'Travel',
          destination: 'Goa',
          thumbnail: 'https://img.youtube.com/vi/z_8Gzjx3s_Q/maxresdefault.jpg',
          video_url: 'https://www.youtube.com/shorts/z_8Gzjx3s_Q',
          platform: 'YouTube',
          duration: '00:59',
          status: 'active',
          featured: 0
        },
        {
          id: 'v8',
          title: 'Royal Jaipur Palaces & Thar Desert Dunes Expedition',
          description: 'Pink city architecture, Hawa Mahal sunrise views, and camping under Thar desert stars.',
          category: 'Adventure',
          destination: 'Rajasthan',
          thumbnail: 'https://img.youtube.com/vi/w8f2aYk57qU/maxresdefault.jpg',
          video_url: 'https://www.youtube.com/watch?v=w8f2aYk57qU',
          platform: 'YouTube',
          duration: '22:10',
          status: 'active',
          featured: 0
        },
        {
          id: 'v9',
          title: 'Manali Snow Passes & High Himalayan Pine Valleys',
          description: 'High altitude Himalayan adventures in Solang Valley, Rohtang Pass, ancient wooden temples, and Beas river trails.',
          category: 'Adventure',
          destination: 'Manali',
          thumbnail: 'https://img.youtube.com/vi/g92X1zO6R5w/maxresdefault.jpg',
          video_url: 'https://www.youtube.com/watch?v=g92X1zO6R5w',
          platform: 'YouTube',
          duration: '15:30',
          status: 'active',
          featured: 0
        },
        {
          id: 'v10',
          title: 'Kashmir Serenity | Dal Lake Shikara & Gulmarg Snow',
          description: 'Serene houseboat stays on misty Dal Lake, snow-covered Gulmarg slopes, pine forests of Pahalgam, and saffron fields.',
          category: 'Travel',
          destination: 'Kashmir',
          thumbnail: 'https://img.youtube.com/vi/v64KOxKVLVg/maxresdefault.jpg',
          video_url: 'https://www.youtube.com/watch?v=v64KOxKVLVg',
          platform: 'YouTube',
          duration: '17:05',
          status: 'active',
          featured: 0
        },
        {
          id: 'v11',
          title: 'Tokyo Midnight Ramen Counters & Alleyway Eats',
          description: 'Midnight Tonkotsu ramen in Shinjuku, street yakitori, and Tsukiji morning fish markets.',
          category: 'Food',
          destination: 'Tokyo',
          thumbnail: 'https://img.youtube.com/vi/406Wv-4a7b0/maxresdefault.jpg',
          video_url: 'https://www.youtube.com/watch?v=406Wv-4a7b0',
          platform: 'YouTube',
          duration: '19:15',
          status: 'active',
          featured: 0
        },
        {
          id: 'v12',
          title: 'Bali Waterfalls & Ubud Cultural Rice Terraces',
          description: 'Hidden jungle waterfalls in Tegenungan, Tegallalang green terraces, and Balinese temple ceremony.',
          category: 'Travel',
          destination: 'Bali',
          thumbnail: 'https://img.youtube.com/vi/lcU3p-6c6R0/maxresdefault.jpg',
          video_url: 'https://www.youtube.com/watch?v=lcU3p-6c6R0',
          platform: 'YouTube',
          duration: '16:30',
          status: 'active',
          featured: 0
        }
      ];

      for (const vid of initialVideos) {
        await db.addVideo(vid);
      }
      console.log('✅ Seeded initial videos.');
    }

    // Seed Initial Destinations
    const dests = await db.getAllDestinations();
    if (dests.length === 0) {
      const initialDests = [
        {
          id: 'munnar',
          name: 'Munnar — The Misty Hills of Kerala',
          tag: 'Misty Western Ghats & Tea Estates',
          description: 'Nestled in the Western Ghats of Kerala at around 1,600 metres above sea level, Munnar is famous for mist-covered mountains, tea plantations, waterfalls and peaceful valleys.',
          image: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuC3ktJ0r9ZmiMpAE1kJI_kCDkJIRlIpkwNdw54Hv2qlQazyVfRLsZiYo3DetM3TxYS8EYVEiD5LW-dqIi1FyZT3pntuV6JV-236acde6080bf3f770c98cca77aa020d',
          video_url: 'https://youtube.com/shorts/Z4yM3xERGvA',
          video_id: 'Z4yM3xERGvA',
          food: 'Woodfire Cardamom Chai, Kerala Fish Curry, Hot Parippu Vada, Munnar Fresh Spices',
          places: 'Tea Museum, Eravikulam National Park, Mattupetty Dam, Echo Point, Top Station, Anayirangal',
          experiences: 'Sunrise Tea Garden Walk, Neelakurinji Flower Trails, Forest & Waterfall Hikes',
          status: 'active'
        },
        {
          id: 'goa',
          name: 'Goa — Beaches & Coastal Heritage',
          tag: 'Portuguese Heritage & Coastal Palm Trails',
          description: 'Goa is known for its beautiful coastline, beaches, Portuguese-influenced architecture, local food, colourful markets and relaxed atmosphere.',
          image: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuDTKlMUVJs5CW0qdr0i4g1b8GxNa705yFpSLaVwNe1vphO1xjqEymsWXsDYG-zbW184S4zI7doawe8-WynyRxFvtGvjLPsb-994da734d2052fe1ff35994a9d8d6a4b',
          video_url: 'https://www.youtube.com/shorts/z_8Gzjx3s_Q',
          video_id: 'z_8Gzjx3s_Q',
          food: 'Goan Fish Curry Rice, Bebinca Cake, Prawn Balchão, Cashew Feni',
          places: 'Fontainhas Heritage Quarter, Cabo de Rama Fort, Dudhsagar Waterfalls',
          experiences: 'Sunset Cliff Walk, Old Goa Latin Heritage Tour, Spice Garden Feast',
          status: 'active'
        },
        {
          id: 'wayanad',
          name: 'Wayanad — Rainforests & Ancient Caves',
          tag: 'Lush Spice Plantations & Mist-Clad Valleys',
          description: 'Wayanad captivates travellers with dense mist-clad forests, ancient Edakkal caves, spice plantations and scenic mountain lakes.',
          image: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAYtyoRsmC4PQLqNIXgcdOZkyziFtgAP-SirvPjAdOIWogt2tQ50admxNCxrFzixktHDzw03edQIxc168p4Rv7NYbrGorpp-2d2fdb95be9e79830687d2d0d7e65404',
          video_url: 'https://www.youtube.com/watch?v=Pj15eX2yL-0',
          video_id: 'Pj15eX2yL-0',
          food: 'Bamboo Rice Payasam, Malabar Parotta with Pepper Chicken, Herbal Spiced Teas',
          places: 'Edakkal Caves, Chembra Peak, Banasura Sagar Dam, Kuruva Island',
          experiences: 'Spice Plantation Walk, Heart Lake Trek, Rainforest Zip Lining',
          status: 'active'
        },
        {
          id: 'alleppey',
          name: 'Alleppey — Venice of the East',
          tag: 'Emerald Backwater Lagoons & Houseboats',
          description: 'Alleppey is world-renowned for its tranquil backwaters, traditional Kettuvallam houseboats, coconut palm fringes and paddy fields.',
          image: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCGpMrj02jB5oZ8woDp1pDG1KYzKZnUksg0jPmxZAg-ZuhekRvLjZ_ySpK9Y067sfnHkzNkdg3qJPv4bnRFf-zicUpB8_pj-7a11c56d8eaa116b93cd26d5efbf5e9f',
          video_url: 'https://www.youtube.com/watch?v=MhLpHW_0KBA',
          video_id: 'MhLpHW_0KBA',
          food: 'Karimeen Pollichathu, Toddy Shop Fish Curry, Puttu & Kadala Curry',
          places: 'Vembanad Lake, Punnamada Kayal, Alleppey Beach, Marari Beach',
          experiences: 'Overnight Houseboat Cruise, Village Canoe Tour, Sunset Lake Kayaking',
          status: 'active'
        },
        {
          id: 'kochi',
          name: 'Kochi — Queen of the Arabian Sea',
          tag: 'Historic Port City & Culinary Crossroads',
          description: 'Fort Kochi blends Chinese fishing nets, Portuguese churches, Dutch heritage palaces, and modern art spaces in a vibrant coastal setting.',
          image: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCQaZah9USED6VtRLFcaESDDe1hhrhwnCe8XJ29ypZ4CsFxDAwGlLTXs1FC50oSjjvqkPuyBR5QFEjR1V6XBnsMjGn5KqVz-0a930619be67565aa64f3dd2a061d204',
          video_url: 'https://www.youtube.com/watch?v=okQ2Wr6GPXg',
          video_id: 'okQ2Wr6GPXg',
          food: 'Kerala Sadya, Fort Kochi Seafood Fry, Sulaimani Tea, Mattancherry Sweets',
          places: 'Chinese Fishing Nets, St. Francis Church, Mattancherry Palace, Jew Town',
          experiences: 'Sunset Promenade Walk, Heritage Bike Tour, Spice Market Exploration',
          status: 'active'
        },
        {
          id: 'kerala',
          name: 'Kerala — God\'s Own Country',
          tag: 'Tropical Backwaters & Mist-Veiled Tea Peaks',
          description: 'Known as God\'s Own Country, Kerala blends lush palm-lined backwaters, coconut groves, and high-altitude cardamom tea estates of Munnar.',
          image: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAYtyoRsmC4PQLqNIXgcdOZkyziFtgAP-SirvPjAdOIWogt2tQ50admxNCxrFzixktHDzw03edQIxc168p4Rv7NYbrGorpp-2d2fdb95be9e79830687d2d0d7e65404',
          video_url: 'https://youtube.com/shorts/9NH5EfKGqgQ',
          video_id: '9NH5EfKGqgQ',
          food: 'Traditional Kerala Sadya, Karimeen Pollichathu, Woodfire Cardamom Chai',
          places: 'Munnar Tea Trails, Alleppey Houseboat Canals, Fort Kochi Spice Streets',
          experiences: 'Overnight Houseboat Drift, Sunrise Cloud Inversion Trek, Spice Plantation Walk',
          status: 'active'
        }
      ];

      for (const dest of initialDests) {
        await db.addDestination(dest);
      }
      console.log('✅ Seeded initial destinations.');
    }

    // Seed Initial Articles
    const articles = await db.getAllArticles();
    if (articles.length === 0) {
      const initialArticles = [
        {
          id: 'munnar-fog',
          title: 'Munnar – The Misty Hills of Kerala',
          description: 'Nestled in the Western Ghats of Kerala, Munnar is famous for mist-covered mountains, tea plantations, waterfalls and peaceful valleys.',
          content: `Nestled in the Western Ghats of Kerala, Munnar is one of South India's most beautiful hill destinations. Famous for its mist-covered mountains, endless tea plantations, waterfalls and peaceful valleys, Munnar offers travellers a refreshing escape into nature.\n\nThe tea gardens stretching across the hills are one of Munnar's most recognizable sights. Visitors can explore tea plantations, enjoy mountain viewpoints and discover the region's rich natural environment.\n\nPopular attractions around Munnar include Eravikulam National Park, Mattupetty Dam, Echo Point, Top Station and Chinnakanal.\n\nMunnar is a perfect destination for travellers looking for scenic landscapes, cool mountain air and peaceful experiences.`,
          image: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuC3ktJ0r9ZmiMpAE1kJI_kCDkJIRlIpkwNdw54Hv2qlQazyVfRLsZiYo3DetM3TxYS8EYVEiD5LW-dqIi1FyZT3pntuV6JV-236acde6080bf3f770c98cca77aa020d',
          category: 'Travel',
          read_time: '5 min read',
          date: 'Sept 2026',
          video_id: 'Z4yM3xERGvA',
          quote: '"Munnar offers travellers a refreshing escape into nature with mist-covered mountains and endless tea plantations."',
          status: 'published'
        },
        {
          id: 'kerala-sadya',
          title: 'Kerala Sadya – A Feast of Flavours',
          description: 'Kerala Sadya is a vegetarian feast traditionally served on a fresh banana leaf during festivals and celebrations.',
          content: `Kerala Sadya is one of the most celebrated traditional feasts of Kerala. It is a vegetarian feast traditionally served on a fresh banana leaf and is especially associated with festivals, weddings and celebrations.\n\nA traditional Sadya can include dishes such as Parippu, Sambar, Avial, Thoran, Olan, Kaalan, Pachadi, Kichadi, pickles, banana chips and Pappadam.\n\nOne of the highlights of Sadya is Payasam, with varieties such as Palada Payasam, Ada Pradhaman and Parippu Payasam.\n\nSadya is particularly important during Onam and represents celebration, hospitality and togetherness.`,
          image: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCQaZah9USED6VtRLFcaESDDe1hhrhwnCe8XJ29ypZ4CsFxDAwGlLTXs1FC50oSjjvqkPuyBR5QFEjR1V6XBnsMjGn5KqVz-0a930619be67565aa64f3dd2a061d204',
          category: 'Food / Kerala Cuisine',
          read_time: '6 min read',
          date: 'Aug 2026',
          video_id: '9NH5EfKGqgQ',
          quote: '"Sadya represents celebration, hospitality and togetherness served on a fresh banana leaf."',
          status: 'published'
        },
        {
          id: 'goa-coastal',
          title: 'Goa – Beaches, Culture and Coastal Adventures',
          description: 'Goa is known for its beautiful coastline, beaches, Portuguese-influenced architecture, local food and relaxed atmosphere.',
          content: `Goa is known for its beautiful coastline, beaches, Portuguese-influenced architecture, local food and relaxed atmosphere.\n\nVisitors can explore beaches, historic churches, colourful markets and coastal villages while experiencing Goa's unique blend of Indian and Portuguese influences.`,
          image: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuDTKlMUVJs5CW0qdr0i4g1b8GxNa705yFpSLaVwNe1vphO1xjqEymsWXsDYG-zbW184S4zI7doawe8-WynyRxFvtGvjLPsb-994da734d2052fe1ff35994a9d8d6a4b',
          category: 'Travel',
          read_time: '5 min read',
          date: 'July 2026',
          video_id: 'z_8Gzjx3s_Q',
          quote: '"Experience Goa\'s unique blend of Indian and Portuguese influences, sunlit beaches, and coastal heritage."',
          status: 'published'
        }
      ];

      for (const art of initialArticles) {
        await db.addArticle(art);
      }
      console.log('✅ Seeded initial articles.');
    }

    // Seed Sample Enquiry & Activity Log
    const enquiries = await db.getEnquiries({});
    if (enquiries.length === 0) {
      await db.createEnquiry({
        name: 'Aarav Sharma',
        email: 'aarav.sharma@example.com',
        phone: '+91 98123 45678',
        subject: 'Kerala Backwaters Collaboration',
        message: 'Hi Veyra Trails team! We represent a heritage stay in Fort Kochi and would love to collaborate on a video feature for upcoming travel series.',
        status: 'New',
        ip_address: '127.0.0.1'
      });
    }

    const logs = await db.getActivityLogs();
    if (logs.length === 0) {
      await db.logActivity('SYSTEM_INIT', 'System', 'Database initialized and seeded with default configuration and content.');
    }
  } catch (err) {
    console.error('Error during database initialization/seeding:', err);
  }
}

export default db;
