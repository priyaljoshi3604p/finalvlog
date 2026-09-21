import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'vlogger.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'Owner',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS enquiry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      subject TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'New',
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contact_message (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      subject TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'New',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS website_visitor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      page_visited TEXT NOT NULL,
      visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      referrer TEXT,
      user_agent TEXT,
      ip_address TEXT
    );

    CREATE TABLE IF NOT EXISTS video (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'Travel',
      destination TEXT,
      thumbnail TEXT,
      video_url TEXT NOT NULL,
      platform TEXT DEFAULT 'YouTube',
      duration TEXT DEFAULT '12:00',
      status TEXT DEFAULT 'active',
      featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS destination (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tag TEXT,
      description TEXT NOT NULL,
      image TEXT NOT NULL,
      video_url TEXT,
      video_id TEXT,
      food TEXT,
      places TEXT,
      experiences TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS article (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT NOT NULL,
      image TEXT NOT NULL,
      category TEXT DEFAULT 'Travel Essay',
      read_time TEXT DEFAULT '5 min read',
      date TEXT DEFAULT 'Sept 2026',
      date_iso TEXT,
      video_id TEXT,
      quote TEXT,
      status TEXT DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.exec(`ALTER TABLE article ADD COLUMN date_iso TEXT;`);
  } catch (e) {}

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
        image: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAYtyoRsmC4PQLqNIXgcdOZkyziFtgAP-SirvPjAdOIWogt2tQ50admxNCxrFzixktHDzw03edQIxc168p4Rv7NYbrGorpp-2d2fdb95be9e79830687d2d0d7e65404',
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
        image: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuDTKlMUVJs5CW0qdr0i4g1b8GxNa705yFpSLaVwNe1vphO1xjqEymsWXsDYG-zbW184S4zI7doawe8-WynyRxFvtGvjLPsb-994da734d2052fe1ff35994a9d8d6a4b',
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
        image: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuBMA8WwnX_pezkKJcxpZf1nN02-MUNpa6TqMzrvtasG8VAi0mZxmLgA0hS8tuuU4A-udD2q68-V6RYyjpcKGZaB-3w8rEAl-ddd3c9a6afc05624b9560d9cff5aa526',
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
        image: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuA6oEBZ-KDnA9Dn3UWuBTH6PgoCxA2ZpWU1tTUdl7GcmuCaX6VLCh7IurnRGygSmWUXU9Flj8R_sCSQDQOyzheJX9t8ZajW-8cbc062d633ca04a5ae2a806a5947184',
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
        image: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAYtyoRsmC4PQLqNIXgcdOZkyziFtgAP-SirvPjAdOIWogt2tQ50admxNCxrFzixktHDzw03edQIxc168p4Rv7NYbrGorpp-2d2fdb95be9e79830687d2d0d7e65404',
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
        image: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuDTKlMUVJs5CW0qdr0i4g1b8GxNa705yFpSLaVwNe1vphO1xjqEymsWXsDYG-zbW184S4zI7doawe8-WynyRxFvtGvjLPsb-994da734d2052fe1ff35994a9d8d6a4b',
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
        image: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCXNOPI_dxPjVZx369fnolWt_YodLRcFg5o_XFJgyg9uKdOuzw-dwjcSMiynd6SWcptie-TsHq8US1SSOa2eRfrFGAqjIKS-9227465da0dc969f961ab80219cdad26',
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
