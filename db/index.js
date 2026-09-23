import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = process.env.VERCEL
  ? '/tmp/data'
  : path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const jsonDbPath = path.join(dataDir, 'vlogger_store.json');

// In-Memory Database Store
const store = {
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

function loadStore() {
  if (fs.existsSync(jsonDbPath)) {
    try {
      const raw = fs.readFileSync(jsonDbPath, 'utf8');
      const parsed = JSON.parse(raw);
      Object.assign(store, parsed);
    } catch (e) {
      console.warn('Could not parse JSON database, starting fresh.', e);
    }
  }
}

function saveStore() {
  try {
    fs.writeFileSync(jsonDbPath, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving store to JSON file:', e);
  }
}

loadStore();

let autoInc = {
  admin: store.admin.length ? Math.max(...store.admin.map(a => Number(a.id) || 0)) : 0,
  enquiry: store.enquiry.length ? Math.max(...store.enquiry.map(a => Number(a.id) || 0)) : 0,
  contact_message: store.contact_message.length ? Math.max(...store.contact_message.map(a => Number(a.id) || 0)) : 0,
  website_visitor: store.website_visitor.length ? Math.max(...store.website_visitor.map(a => Number(a.id) || 0)) : 0,
  activity_log: store.activity_log.length ? Math.max(...store.activity_log.map(a => Number(a.id) || 0)) : 0
};

// Simple SQL Driver interface matching better-sqlite3
const db = {
  pragma: () => {},
  exec: (sql) => {
    // Schema creation - table arrays exist in `store`
  },
  prepare: (sql) => {
    const cleanSql = sql.trim();

    return {
      run: (...params) => {
        const flatParams = params.flat();
        let lastInsertRowid = null;
        let changes = 0;

        // INSERT INTO activity_log (action, entity, description) VALUES (?, ?, ?)
        if (/^INSERT INTO activity_log/i.test(cleanSql)) {
          autoInc.activity_log++;
          const newRow = {
            id: autoInc.activity_log,
            action: flatParams[0],
            entity: flatParams[1],
            description: flatParams[2],
            created_at: new Date().toISOString()
          };
          store.activity_log.push(newRow);
          lastInsertRowid = newRow.id;
          changes = 1;
        }
        // INSERT INTO enquiry
        else if (/^INSERT INTO enquiry/i.test(cleanSql)) {
          autoInc.enquiry++;
          const newRow = {
            id: autoInc.enquiry,
            name: flatParams[0],
            email: flatParams[1],
            phone: flatParams[2] || '',
            subject: flatParams[3] || 'General Inquiry',
            message: flatParams[4],
            status: flatParams[5] || 'New',
            ip_address: flatParams[6] || '127.0.0.1',
            created_at: new Date().toISOString()
          };
          store.enquiry.push(newRow);
          lastInsertRowid = newRow.id;
          changes = 1;
        }
        // INSERT INTO contact_message
        else if (/^INSERT INTO contact_message/i.test(cleanSql)) {
          autoInc.contact_message++;
          const newRow = {
            id: autoInc.contact_message,
            name: flatParams[0],
            email: flatParams[1],
            phone: flatParams[2] || '',
            subject: flatParams[3] || 'General Inquiry',
            message: flatParams[4],
            status: flatParams[5] || 'New',
            created_at: new Date().toISOString()
          };
          store.contact_message.push(newRow);
          lastInsertRowid = newRow.id;
          changes = 1;
        }
        // INSERT INTO website_visitor
        else if (/^INSERT INTO website_visitor/i.test(cleanSql)) {
          autoInc.website_visitor++;
          const newRow = {
            id: autoInc.website_visitor,
            session_id: flatParams[0],
            page_visited: flatParams[1],
            visited_at: new Date().toISOString(),
            referrer: flatParams[2] || '',
            user_agent: flatParams[3] || '',
            ip_address: flatParams[4] || '127.0.0.1'
          };
          store.website_visitor.push(newRow);
          lastInsertRowid = newRow.id;
          changes = 1;
        }
        // INSERT INTO admin
        else if (/^INSERT INTO admin/i.test(cleanSql)) {
          autoInc.admin++;
          const newRow = {
            id: autoInc.admin,
            username: flatParams[0],
            email: flatParams[1],
            password_hash: flatParams[2],
            name: flatParams[3],
            role: flatParams[4] || 'Owner',
            created_at: new Date().toISOString()
          };
          store.admin.push(newRow);
          lastInsertRowid = newRow.id;
          changes = 1;
        }
        // INSERT OR REPLACE INTO settings / INSERT OR IGNORE INTO settings
        else if (/settings/i.test(cleanSql) && /INSERT/i.test(cleanSql)) {
          const key = flatParams[0];
          const value = String(flatParams[1]);
          const existing = store.settings.find(s => s.key === key);
          if (existing) {
            if (/REPLACE/i.test(cleanSql)) {
              existing.value = value;
              changes = 1;
            }
          } else {
            store.settings.push({ key, value });
            changes = 1;
          }
        }
        // INSERT INTO video
        else if (/^INSERT INTO video/i.test(cleanSql)) {
          const newRow = {
            id: flatParams[0],
            title: flatParams[1],
            description: flatParams[2] || '',
            category: flatParams[3] || 'Travel',
            destination: flatParams[4] || '',
            thumbnail: flatParams[5],
            video_url: flatParams[6],
            platform: flatParams[7] || 'YouTube',
            duration: flatParams[8] || '10:00',
            status: flatParams[9] || 'active',
            featured: Number(flatParams[10]) || 0,
            created_at: new Date().toISOString()
          };
          store.video.push(newRow);
          changes = 1;
        }
        // UPDATE video
        else if (/^UPDATE video/i.test(cleanSql)) {
          const id = flatParams[10];
          const item = store.video.find(v => v.id === id);
          if (item) {
            item.title = flatParams[0];
            item.description = flatParams[1];
            item.category = flatParams[2];
            item.destination = flatParams[3];
            item.thumbnail = flatParams[4];
            item.video_url = flatParams[5];
            item.platform = flatParams[6];
            item.duration = flatParams[7];
            item.status = flatParams[8];
            item.featured = Number(flatParams[9]) || 0;
            changes = 1;
          }
        }
        // DELETE FROM video
        else if (/^DELETE FROM video/i.test(cleanSql)) {
          const id = flatParams[0];
          const idx = store.video.findIndex(v => v.id === id);
          if (idx !== -1) {
            store.video.splice(idx, 1);
            changes = 1;
          }
        }
        // INSERT INTO destination
        else if (/^INSERT INTO destination/i.test(cleanSql)) {
          const newRow = {
            id: flatParams[0],
            name: flatParams[1],
            tag: flatParams[2] || '',
            description: flatParams[3] || '',
            image: flatParams[4],
            video_url: flatParams[5] || '',
            video_id: flatParams[6] || '',
            food: flatParams[7] || '',
            places: flatParams[8] || '',
            experiences: flatParams[9] || '',
            status: flatParams[10] || 'active',
            created_at: new Date().toISOString()
          };
          store.destination.push(newRow);
          changes = 1;
        }
        // UPDATE destination
        else if (/^UPDATE destination/i.test(cleanSql)) {
          const id = flatParams[10];
          const item = store.destination.find(d => d.id === id);
          if (item) {
            item.name = flatParams[0];
            item.tag = flatParams[1];
            item.description = flatParams[2];
            item.image = flatParams[3];
            item.video_url = flatParams[4];
            item.video_id = flatParams[5];
            item.food = flatParams[6];
            item.places = flatParams[7];
            item.experiences = flatParams[8];
            item.status = flatParams[9];
            changes = 1;
          }
        }
        // DELETE FROM destination
        else if (/^DELETE FROM destination/i.test(cleanSql)) {
          const id = flatParams[0];
          const idx = store.destination.findIndex(d => d.id === id);
          if (idx !== -1) {
            store.destination.splice(idx, 1);
            changes = 1;
          }
        }
        // INSERT INTO article
        else if (/^INSERT INTO article/i.test(cleanSql)) {
          const newRow = {
            id: flatParams[0],
            title: flatParams[1],
            description: flatParams[2] || '',
            content: flatParams[3],
            image: flatParams[4],
            category: flatParams[5] || 'Travel Essay',
            read_time: flatParams[6] || '5 min read',
            date: flatParams[7] || 'Sept 2026',
            video_id: flatParams[8] || '',
            quote: flatParams[9] || '',
            status: flatParams[10] || 'published',
            created_at: new Date().toISOString()
          };
          store.article.push(newRow);
          changes = 1;
        }
        // UPDATE article
        else if (/^UPDATE article/i.test(cleanSql)) {
          const id = flatParams[10];
          const item = store.article.find(a => a.id === id);
          if (item) {
            item.title = flatParams[0];
            item.description = flatParams[1];
            item.content = flatParams[2];
            item.image = flatParams[3];
            item.category = flatParams[4];
            item.read_time = flatParams[5];
            item.date = flatParams[6];
            item.video_id = flatParams[7];
            item.quote = flatParams[8];
            item.status = flatParams[9];
            changes = 1;
          }
        }
        // DELETE FROM article
        else if (/^DELETE FROM article/i.test(cleanSql)) {
          const id = flatParams[0];
          const idx = store.article.findIndex(a => a.id === id);
          if (idx !== -1) {
            store.article.splice(idx, 1);
            changes = 1;
          }
        }
        // UPDATE enquiry SET status = ? WHERE id = ?
        else if (/^UPDATE enquiry SET status = \? WHERE id = \?/i.test(cleanSql)) {
          const status = flatParams[0];
          const id = Number(flatParams[1]);
          const item = store.enquiry.find(e => Number(e.id) === id);
          if (item) {
            item.status = status;
            changes = 1;
          }
        }
        // DELETE FROM enquiry WHERE id = ?
        else if (/^DELETE FROM enquiry WHERE id = \?/i.test(cleanSql)) {
          const id = Number(flatParams[0]);
          const idx = store.enquiry.findIndex(e => Number(e.id) === id);
          if (idx !== -1) {
            store.enquiry.splice(idx, 1);
            changes = 1;
          }
        }
        // UPDATE contact_message SET status = ? WHERE id = ?
        else if (/^UPDATE contact_message SET status = \? WHERE id = \?/i.test(cleanSql)) {
          const status = flatParams[0];
          const id = Number(flatParams[1]);
          const item = store.contact_message.find(m => Number(m.id) === id);
          if (item) {
            item.status = status;
            changes = 1;
          }
        }
        // DELETE FROM contact_message WHERE id = ?
        else if (/^DELETE FROM contact_message WHERE id = \?/i.test(cleanSql)) {
          const id = Number(flatParams[0]);
          const idx = store.contact_message.findIndex(m => Number(m.id) === id);
          if (idx !== -1) {
            store.contact_message.splice(idx, 1);
            changes = 1;
          }
        }

        saveStore();
        return { lastInsertRowid, changes };
      },

      get: (...params) => {
        const flatParams = params.flat();

        // COUNT queries
        if (/SELECT COUNT\(\*\)/i.test(cleanSql)) {
          if (/FROM admin/i.test(cleanSql)) return { count: store.admin.length };
          if (/FROM enquiry WHERE status = 'New'/i.test(cleanSql)) return { count: store.enquiry.filter(e => e.status === 'New').length };
          if (/FROM enquiry/i.test(cleanSql)) return { count: store.enquiry.length };
          if (/FROM contact_message/i.test(cleanSql)) return { count: store.contact_message.length };
          if (/FROM website_visitor/i.test(cleanSql)) return { count: store.website_visitor.length };
          if (/FROM video/i.test(cleanSql)) return { count: store.video.length };
          if (/FROM destination/i.test(cleanSql)) return { count: store.destination.length };
          if (/FROM article/i.test(cleanSql)) return { count: store.article.length };
          if (/FROM activity_log/i.test(cleanSql)) return { count: store.activity_log.length };
        }
        if (/SELECT COUNT\(DISTINCT session_id\)/i.test(cleanSql)) {
          const uniqueSessions = new Set(store.website_visitor.map(v => v.session_id));
          return { count: uniqueSessions.size };
        }

        // Admin lookup
        if (/FROM admin WHERE email = \? OR username = \?/i.test(cleanSql)) {
          const term = flatParams[0];
          return store.admin.find(a => a.email === term || a.username === term);
        }

        // Video lookup
        if (/FROM video WHERE id = \?/i.test(cleanSql)) {
          const id = flatParams[0];
          return store.video.find(v => v.id === id);
        }

        return undefined;
      },

      all: (...params) => {
        const flatParams = params.flat();

        // Settings query
        if (/FROM settings/i.test(cleanSql)) {
          return store.settings;
        }

        // Video queries
        if (/FROM video/i.test(cleanSql)) {
          let list = [...store.video];
          if (/status = 'active'/i.test(cleanSql)) {
            list = list.filter(v => v.status === 'active');
          }
          if (/ORDER BY featured DESC/i.test(cleanSql)) {
            list.sort((a, b) => (b.featured || 0) - (a.featured || 0));
          } else {
            list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          }
          return list;
        }

        // Destination queries
        if (/FROM destination/i.test(cleanSql)) {
          let list = [...store.destination];
          if (/status = 'active'/i.test(cleanSql)) {
            list = list.filter(d => d.status === 'active');
          }
          list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          return list;
        }

        // Article queries
        if (/FROM article/i.test(cleanSql)) {
          let list = [...store.article];
          if (/status = 'published'/i.test(cleanSql)) {
            list = list.filter(a => a.status === 'published');
          }
          list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          return list;
        }

        // Enquiry queries
        if (/FROM enquiry/i.test(cleanSql)) {
          let list = [...store.enquiry];
          if (flatParams.length > 0 && /WHERE 1=1 AND status = \?/i.test(cleanSql)) {
            const status = flatParams[0];
            list = list.filter(e => e.status === status);
          }
          if (flatParams.length > 0 && /LIKE \?/i.test(cleanSql)) {
            const term = (flatParams[flatParams.length - 1] || '').replace(/%/g, '').toLowerCase();
            list = list.filter(e =>
              (e.name || '').toLowerCase().includes(term) ||
              (e.email || '').toLowerCase().includes(term) ||
              (e.subject || '').toLowerCase().includes(term) ||
              (e.message || '').toLowerCase().includes(term)
            );
          }
          list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          if (/LIMIT 6/i.test(cleanSql)) return list.slice(0, 6);
          return list;
        }

        // Contact Message queries
        if (/FROM contact_message/i.test(cleanSql)) {
          let list = [...store.contact_message];
          list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          return list;
        }

        // Website Visitor queries
        if (/FROM website_visitor/i.test(cleanSql)) {
          if (/GROUP BY page_visited/i.test(cleanSql)) {
            const counts = {};
            store.website_visitor.forEach(v => {
              counts[v.page_visited] = (counts[v.page_visited] || 0) + 1;
            });
            let grouped = Object.keys(counts).map(p => ({ page_visited: p, views: counts[p] }));
            grouped.sort((a, b) => b.views - a.views);
            if (/LIMIT 5/i.test(cleanSql)) return grouped.slice(0, 5);
            return grouped;
          }

          let list = [...store.website_visitor];
          list.sort((a, b) => new Date(b.visited_at || 0) - new Date(a.visited_at || 0));
          if (/LIMIT 8/i.test(cleanSql)) return list.slice(0, 8);
          if (/LIMIT 50/i.test(cleanSql)) return list.slice(0, 50);
          return list;
        }

        // Activity Log queries
        if (/FROM activity_log/i.test(cleanSql)) {
          let list = [...store.activity_log];
          list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          if (/LIMIT 100/i.test(cleanSql)) return list.slice(0, 100);
          if (/LIMIT 10/i.test(cleanSql)) return list.slice(0, 10);
          return list;
        }

        return [];
      }
    };
  }
};

export function initDatabase() {
  db.exec();
  seedDefaultData();
}

function seedDefaultData() {
  // 1. Seed Admin
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin').get().count;
  if (adminCount === 0) {
    const defaultPassword = 'admin123';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPassword, salt);
    db.prepare(`
      INSERT INTO admin (username, email, password_hash, name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin', 'owner@veyratrails.com', hash, 'Veyra Trails Owner', 'Owner');
    console.log('Seeded default admin user: owner@veyratrails.com');
  }

  // 2. Seed Settings
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

  const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
  for (const [k, v] of Object.entries(defaultSettings)) {
    insertSetting.run(k, v);
  }

  // 3. Seed Initial Videos
  const videoCount = db.prepare('SELECT COUNT(*) as count FROM video').get().count;
  if (videoCount === 0) {
    const insertVideo = db.prepare(`
      INSERT INTO video (id, title, description, category, destination, thumbnail, video_url, platform, duration, status, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

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
      insertVideo.run(
        vid.id,
        vid.title,
        vid.description,
        vid.category,
        vid.destination,
        vid.thumbnail,
        vid.video_url,
        vid.platform,
        vid.duration,
        vid.status,
        vid.featured
      );
    }
    console.log('Seeded initial videos.');
  }

  // 4. Seed Initial Destinations
  const destCount = db.prepare('SELECT COUNT(*) as count FROM destination').get().count;
  if (destCount === 0) {
    const insertDest = db.prepare(`
      INSERT INTO destination (id, name, tag, description, image, video_url, video_id, food, places, experiences, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

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
      insertDest.run(
        dest.id,
        dest.name,
        dest.tag,
        dest.description,
        dest.image,
        dest.video_url,
        dest.video_id,
        dest.food,
        dest.places,
        dest.experiences,
        dest.status
      );
    }
    console.log('Seeded initial destinations.');
  }

  // 5. Seed Initial Articles
  const artCount = db.prepare('SELECT COUNT(*) as count FROM article').get().count;
  if (artCount === 0) {
    const insertArt = db.prepare(`
      INSERT INTO article (id, title, description, content, image, category, read_time, date, video_id, quote, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

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
      insertArt.run(art.id, art.title, art.description, art.content, art.image, art.category, art.read_time, art.date, art.video_id, art.quote, art.status);
    }
    console.log('Seeded initial articles.');
  }

  // 6. Seed Initial Sample Enquiry and Visitor if empty
  const enqCount = db.prepare('SELECT COUNT(*) as count FROM enquiry').get().count;
  if (enqCount === 0) {
    db.prepare(`
      INSERT INTO enquiry (name, email, phone, subject, message, status, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Aarav Sharma',
      'aarav.sharma@example.com',
      '+91 98123 45678',
      'Kerala Backwaters Collaboration',
      'Hi Veyra Trails team! We represent a heritage stay in Fort Kochi and would love to collaborate on a video feature for upcoming travel series.',
      'New',
      '127.0.0.1'
    );
  }

  const logCount = db.prepare('SELECT COUNT(*) as count FROM activity_log').get().count;
  if (logCount === 0) {
    db.prepare(`
      INSERT INTO activity_log (action, entity, description)
      VALUES (?, ?, ?)
    `).run('SYSTEM_INIT', 'System', 'Database initialized and seeded with default configuration and content.');
  }
}

export default db;
