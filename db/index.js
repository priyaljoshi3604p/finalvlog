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
        id: 'v1',
        title: '4:30 AM Mist at Lockhart Gap, Munnar',
        description: 'Exploring mist-veiled tea gardens at sunrise in Munnar, Kerala. Cardamom chai stalls and mountain cloud inversions.',
        category: 'Travel',
        destination: 'Munnar',
        thumbnail: 'https://img.youtube.com/vi/5D3cZ-6tGkY/maxresdefault.jpg',
        video_url: 'https://www.youtube.com/watch?v=5D3cZ-6tGkY',
        platform: 'YouTube',
        duration: '14:20',
        status: 'active',
        featured: 1
      },
      {
        id: 'v2',
        title: 'Exploring Old Goa’s Latin Quarter & Spice Trails',
        description: 'Heritage walk through Fontainhas, Portuguese house architecture, street art, and legendary Goan fish curry rice.',
        category: 'Travel',
        destination: 'Goa',
        thumbnail: 'https://img.youtube.com/vi/3CznVyzPm_M/maxresdefault.jpg',
        video_url: 'https://www.youtube.com/watch?v=3CznVyzPm_M',
        platform: 'YouTube',
        duration: '18:45',
        status: 'active',
        featured: 1
      },
      {
        id: 'v3',
        title: 'Royal Jaipur Palaces & Thar Desert Dunes Expedition',
        description: 'Pink city architecture, Hawa Mahal sunrise views, and camping under Thar desert stars.',
        category: 'Documentary',
        destination: 'Rajasthan',
        thumbnail: 'https://img.youtube.com/vi/L_LUpnjgPso/maxresdefault.jpg',
        video_url: 'https://www.youtube.com/watch?v=L_LUpnjgPso',
        platform: 'YouTube',
        duration: '22:10',
        status: 'active',
        featured: 1
      },
      {
        id: 'v4',
        title: 'Bali Waterfalls & Ubud Cultural Rice Terraces',
        description: 'Hidden jungle waterfalls in Tegenungan, Tegallalang green terraces, and Balinese temple ceremony.',
        category: 'Travel',
        destination: 'Bali',
        thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/maxresdefault.jpg',
        video_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
        platform: 'YouTube',
        duration: '16:30',
        status: 'active',
        featured: 0
      },
      {
        id: 'v5',
        title: 'Tokyo Midnight Ramen Counters & Alleyway Eats',
        description: 'Midnight Tonkotsu ramen in Shinjuku, street yakitori, and Tsukiji morning fish markets.',
        category: 'Food',
        destination: 'Tokyo',
        thumbnail: 'https://img.youtube.com/vi/a7G6J0XvXJg/maxresdefault.jpg',
        video_url: 'https://www.youtube.com/watch?v=a7G6J0XvXJg',
        platform: 'YouTube',
        duration: '19:15',
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
        id: 'kerala',
        name: 'Kerala, India',
        tag: 'Tropical Backwaters & Mist-Veiled Tea Peaks',
        description: "Known as God's Own Country, Kerala blends lush palm-lined backwaters, coconut groves, and high-altitude cardamom tea estates of Munnar.",
        image: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAYtyoRsmC4PQLqNIXgcdOZkyziFtgAP-SirvPjAdOIWogt2tQ50admxNCxrFzixktHDzw03edQIxc168p4Rv7NYbrGorpp-2d2fdb95be9e79830687d2d0d7e65404',
        video_url: 'https://www.youtube.com/watch?v=5D3cZ-6tGkY',
        video_id: '5D3cZ-6tGkY',
        food: 'Traditional Kerala Sadya, Karimeen Pollichathu, Woodfire Cardamom Chai',
        places: 'Munnar Tea Trails, Alleppey Houseboat Canals, Fort Kochi Spice Streets',
        experiences: 'Overnight Houseboat Drift, Sunrise Cloud Inversion Trek, Spice Plantation Walk',
        status: 'active'
      },
      {
        id: 'goa',
        name: 'Goa, India',
        tag: 'Portuguese Heritage & Coastal Palm Trails',
        description: 'Beyond sunny beaches lies Fontainhas Latin Quarter, historic spice farms, and authentic Goan seafood heritage.',
        image: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuDTKlMUVJs5CW0qdr0i4g1b8GxNa705yFpSLaVwNe1vphO1xjqEymsWXsDYG-zbW184S4zI7doawe8-WynyRxFvtGvjLPsb-994da734d2052fe1ff35994a9d8d6a4b',
        video_url: 'https://www.youtube.com/watch?v=3CznVyzPm_M',
        video_id: '3CznVyzPm_M',
        food: 'Goan Fish Curry Rice, Bebinca Cake, Prawn Balchão, Cashew Feni',
        places: 'Fontainhas Heritage Quarter, Cabo de Rama Fort, Dudhsagar Waterfalls',
        experiences: 'Sunset Cliff Walk, Old Goa Latin Heritage Tour, Spice Garden Feast',
        status: 'active'
      },
      {
        id: 'rajasthan',
        name: 'Rajasthan, India',
        tag: 'Royal Fortresses & Golden Thar Desert Dunes',
        description: 'Immerse in grand sandstone palaces, vibrant folk music, desert dune safaris, and age-old royal culinary heritage.',
        image: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuBMA8WwnX_pezkKJcxpZf1nN02-MUNpa6TqMzrvtasG8VAi0mZxmLgA0hS8tuuU4A-udD2q68-V6RYyjpcKGZaB-3w8rEAl-ddd3c9a6afc05624b9560d9cff5aa526',
        video_url: 'https://www.youtube.com/watch?v=L_LUpnjgPso',
        video_id: 'L_LUpnjgPso',
        food: 'Dal Baati Churma, Laal Maas, Ker Sangri, Ghevar',
        places: 'Amer Fort Jaipur, Jaisalmer Sand Dunes, Mehrangarh Fort Jodhpur',
        experiences: 'Thar Desert Dune Camping, Sunrise Hot Air Ballooning, Palace Courtyard Concert',
        status: 'active'
      },
      {
        id: 'bali',
        name: 'Bali, Indonesia',
        tag: 'Sacred Temples & Emerald Jungle Terraces',
        description: 'Tropical sanctuary of lush volcanic ridges, terraced paddy fields, artisan villages, and calming ocean sunsets.',
        image: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuA6oEBZ-KDnA9Dn3UWuBTH6PgoCxA2ZpWU1tTUdl7GcmuCaX6VLCh7IurnRGygSmWUXU9Flj8R_sCSQDQOyzheJX9t8ZajW-8cbc062d633ca04a5ae2a806a5947184',
        video_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
        video_id: 'kJQP7kiw5Fk',
        food: 'Nasi Goreng, Babi Guling, Lawar, Fresh Young Coconut',
        places: 'Tegallalang Rice Terraces, Uluwatu Temple, Tegenungan Waterfall',
        experiences: 'Sunrise Mount Batur Hike, Jungle Waterfall Trek, Sunset Kecak Fire Dance',
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
        title: 'Chai, Clouds, & Silent Ridges: 48 Hours in Munnar’s Tea Estates',
        description: 'Waking up at 4:30 AM to catch cloud inversions over Lockhart Gap, sipping steaming cardamom tea from roadside wooden stalls.',
        content: 'Waking up at 4:30 AM to catch cloud inversions over Lockhart Gap, sipping steaming cardamom tea from roadside wooden stalls. The high-altitude tea gardens of Munnar stretch across rolling hills like emerald tapestry.',
        image: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAYtyoRsmC4PQLqNIXgcdOZkyziFtgAP-SirvPjAdOIWogt2tQ50admxNCxrFzixktHDzw03edQIxc168p4Rv7NYbrGorpp-2d2fdb95be9e79830687d2d0d7e65404',
        category: 'Travel Essay',
        read_time: '6 min read',
        date: 'Sept 2026',
        video_id: '5D3cZ-6tGkY',
        quote: '"Standing on Lockhart Gap at sunrise feels like watching earth being created anew out of morning mist."',
        status: 'published'
      },
      {
        id: 'goa-food',
        title: 'Beyond the Beaches: Fontainhas Latin Quarter & Goan Spice Trails',
        description: 'Past Portuguese heritage house facades, yellow stucco walls, and wooden shutters lies Fontainhas.',
        content: 'Past Portuguese heritage house facades, yellow stucco walls, and wooden shutters lies Fontainhas. Here, traditional Goan fish curry rice and coconut bebinca cakes carry centuries of colonial spice trade history.',
        image: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuDTKlMUVJs5CW0qdr0i4g1b8GxNa705yFpSLaVwNe1vphO1xjqEymsWXsDYG-zbW184S4zI7doawe8-WynyRxFvtGvjLPsb-994da734d2052fe1ff35994a9d8d6a4b',
        category: 'Food Guide',
        read_time: '8 min read',
        date: 'August 2026',
        video_id: '3CznVyzPm_M',
        quote: '"Goan spice gardens smell of cinnamon bark, nutmeg, and black pepper dried in salt sea breeze."',
        status: 'published'
      },
      {
        id: 'tokyo-ramen',
        title: 'Navigating Tokyo’s Yokocho Alleys: A Guide to Midnight Ramen Counters',
        description: 'Behind heavy red lanterns in Shinjuku’s Omoide Yokocho lie 6-seat wooden counters serving 16-hour simmered Tonkotsu broth.',
        content: 'Behind heavy red lanterns in Shinjuku’s Omoide Yokocho lie 6-seat wooden counters serving 16-hour simmered Tonkotsu broth. Steaming bowls of rich broth, springy hand-pulled noodles, and tender chashu pork belly.',
        image: '/assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCXNOPI_dxPjVZx369fnolWt_YodLRcFg5o_XFJgyg9uKdOuzw-dwjcSMiynd6SWcptie-TsHq8US1SSOa2eRfrFGAqjIKS-9227465da0dc969f961ab80219cdad26',
        category: 'Food Guide',
        read_time: '5 min read',
        date: 'July 2026',
        video_id: 'a7G6J0XvXJg',
        quote: '"In a 6-seat ramen alley, the only sound is slurping noodles and steam rising off hot bone broth."',
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
