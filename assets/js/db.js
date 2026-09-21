/* ==========================================================================
   VEYRA TRAILS - UNIFIED DATA ENGINE & CMS PERSISTENCE LAYER (db.js)
   Single Source of Truth for Admin Portal & Public Website
   ========================================================================== */

(function (window) {
  'use strict';

  const STORAGE_KEY_PREFIX = 'veyra_cms_v1_';

  // Seed Data Initializer
  const DEFAULT_SETTINGS = {
    websiteName: 'Veyra Trails',
    tagline: 'Travel. Taste. Tell the Story.',
    description: 'Official portfolio & travel + food journal of Veyra Trails. Exploring hidden places, unforgettable flavors and stories worth sharing.',
    contactEmail: 'hello@veyratrails.com',
    contactPhone: '+91 98765 43210',
    youtubeUrl: 'https://youtube.com/@veyratrails',
    instagramUrl: 'https://instagram.com/veyratrails',
    twitterUrl: 'https://x.com/veyratrails',
    facebookUrl: 'https://facebook.com/veyratrails',
    seoTitle: 'Veyra Trails — Travel. Taste. Tell the Story.',
    seoMetaDescription: 'Immersive travel, culinary exploration, and documentary vlogs by Veyra Trails.',
    seoShareImage: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuC3ktJ0r9ZmiMpAE1kJI_kCDkJIRlIpkwNdw54Hv2qlQazyVfRLsZiYo3DetM3TxYS8EYVEiD5LW-dqIi1FyZT3pntuV6JV-236acde6080bf3f770c98cca77aa020d',
    featuredVideoId: 'v1',
    featuredDestinationId: 'kerala',
    featuredArticleId: 'munnar-fog',
    featuredReelId: 'r1'
  };

  const DEFAULT_VIDEOS = [
    {
      id: 'v1',
      title: '4:30 AM Mist at Lockhart Gap, Munnar',
      description: 'Exploring mist-veiled tea gardens at sunrise in Munnar, Kerala. Cardamom chai stalls and mountain cloud inversions.',
      category: 'Travel',
      thumbnail: 'https://img.youtube.com/vi/5D3cZ-6tGkY/maxresdefault.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=5D3cZ-6tGkY',
      duration: '14:20',
      location: 'Munnar, Kerala',
      date: '2026-09-10',
      featured: true,
      published: true
    },
    {
      id: 'v2',
      title: 'Exploring Old Goa’s Latin Quarter & Spice Trails',
      description: 'Heritage walk through Fontainhas, Portuguese house architecture, street art, and legendary Goan fish curry rice.',
      category: 'Travel',
      thumbnail: 'https://img.youtube.com/vi/3CznVyzPm_M/maxresdefault.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=3CznVyzPm_M',
      duration: '18:45',
      location: 'Goa, India',
      date: '2026-08-28',
      featured: true,
      published: true
    },
    {
      id: 'v3',
      title: 'Royal Jaipur Palaces & Thar Desert Dunes Expedition',
      description: 'Camel safari in Jaisalmer sand dunes and royal fort architecture across Rajasthan’s pink city.',
      category: 'Adventure',
      thumbnail: 'https://img.youtube.com/vi/w8f2aYk57qU/maxresdefault.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=w8f2aYk57qU',
      duration: '22:15',
      location: 'Rajasthan, India',
      date: '2026-08-15',
      featured: true,
      published: true
    },
    {
      id: 'v4',
      title: 'Tokyo Yokocho Alleyway Midnight Ramen Trail',
      description: 'Exploring 6-seat nocturnal ramen stalls in Shinjuku Omoide Yokocho and morning sushi in Tsukiji.',
      category: 'Food',
      thumbnail: 'https://img.youtube.com/vi/406Wv-4a7b0/maxresdefault.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=406Wv-4a7b0',
      duration: '16:05',
      location: 'Tokyo, Japan',
      date: '2026-07-20',
      featured: true,
      published: true
    },
    {
      id: 'v5',
      title: 'Dubai Desert Sunset & Bedouin Gahwa Coffee Ritual',
      description: 'Dune bashing at dusk, Arabian camel trails, and cardamom saffron tea under desert constellations.',
      category: 'Lifestyle',
      thumbnail: 'https://img.youtube.com/vi/a7G6J0XvXJg/maxresdefault.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=a7G6J0XvXJg',
      duration: '12:50',
      location: 'Dubai, UAE',
      date: '2026-06-18',
      featured: false,
      published: true
    },
    {
      id: 'v6',
      title: 'Ubud Rice Terraces & Dawn Mount Batur Volcano Trek',
      description: 'Chasing morning light across Bali’s Tegallalang terraced fields and climbing active volcanic ridges.',
      category: 'Adventure',
      thumbnail: 'https://img.youtube.com/vi/lcU3p-6c6R0/maxresdefault.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=lcU3p-6c6R0',
      duration: '19:30',
      location: 'Bali, Indonesia',
      date: '2026-05-30',
      featured: false,
      published: true
    }
  ];

  const DEFAULT_DESTINATIONS = [
    {
      id: 'kerala',
      name: 'Kerala',
      country: 'India',
      title: 'Kerala, India',
      tag: 'Tropical Backwaters & Mist-Veiled Tea Peaks',
      shortDesc: 'Known as God’s Own Country, Kerala blends lush palm-lined backwaters, coconut groves, and high-altitude tea estates.',
      longDesc: 'From the peaceful houseboats of Alleppey to the cloud-capped hills of Munnar, Kerala offers a rare harmony of nature, heritage, and rich spices.',
      food: 'Traditional Kerala Sadya, Karimeen Pollichathu, Woodfire Cardamom Chai',
      places: 'Munnar Tea Trails, Alleppey Houseboat Canals, Fort Kochi Spice Streets',
      exp: 'Overnight Houseboat Drift, Sunrise Cloud Inversion Trek, Spice Plantation Walk',
      heroImage: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAYtyoRsmC4PQLqNIXgcdOZkyziFtgAP-SirvPjAdOIWogt2tQ50admxNCxrFzixktHDzw03edQIxc168p4Rv7NYbrGorpp-2d2fdb95be9e79830687d2d0d7e65404',
      galleryImages: [
        'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAYtyoRsmC4PQLqNIXgcdOZkyziFtgAP-SirvPjAdOIWogt2tQ50admxNCxrFzixktHDzw03edQIxc168p4Rv7NYbrGorpp-2d2fdb95be9e79830687d2d0d7e65404',
        'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuC3ktJ0r9ZmiMpAE1kJI_kCDkJIRlIpkwNdw54Hv2qlQazyVfRLsZiYo3DetM3TxYS8EYVEiD5LW-dqIi1FyZT3pntuV6JV-236acde6080bf3f770c98cca77aa020d'
      ],
      bestTime: 'October to March',
      videoId: '5D3cZ-6tGkY',
      videoUrl: 'https://www.youtube.com/watch?v=5D3cZ-6tGkY',
      instagramUrl: 'https://instagram.com/p/kerala_vlog',
      featured: true,
      published: true
    },
    {
      id: 'munnar',
      name: 'Munnar',
      country: 'India',
      title: 'Munnar, Kerala',
      tag: 'High Altitude Tea Gardens & Mist-Veiled Ridge Peaks',
      shortDesc: 'Nestled 1,600 meters above sea level in the Western Ghats, Munnar features sprawling green tea estates.',
      longDesc: 'Munnar is the crown jewel of South India’s hill stations, famed for crisp mountain air, rare Nilgiri Tahr wildlife, and sprawling tea canopy valleys.',
      food: 'Woodfire Cardamom Chai, Kerala Fish Curry, Hot Parippu Vada, Fresh Spices',
      places: 'Lockhart Gap Viewpoint, Anamudi Peak, Eravikulam National Park, Mattupetty Dam',
      exp: 'Sunrise Tea Garden Walk, Cloud Inversion Trekking, Spice Plantation Tour',
      heroImage: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuC3ktJ0r9ZmiMpAE1kJI_kCDkJIRlIpkwNdw54Hv2qlQazyVfRLsZiYo3DetM3TxYS8EYVEiD5LW-dqIi1FyZT3pntuV6JV-236acde6080bf3f770c98cca77aa020d',
      galleryImages: [],
      bestTime: 'September to May',
      videoId: 'tCnc7fKwe-E',
      videoUrl: 'https://www.youtube.com/watch?v=tCnc7fKwe-E',
      instagramUrl: 'https://instagram.com/p/munnar_vlog',
      featured: true,
      published: true
    },
    {
      id: 'goa',
      name: 'Goa',
      country: 'India',
      title: 'Goa, India',
      tag: 'Portuguese Heritage Architecture & Coastal Sunset Trails',
      shortDesc: 'Beyond the golden sands lies Old Goa’s Latin quarters, vibrant night spice markets, and serene riverine estuaries.',
      longDesc: 'A rich fusion of Portuguese colonial architecture, palm-fringed coastal beaches, and flavorful Goan seafood gastronomy.',
      food: 'Goan Fish Curry Rice, Pork Vindaloo, Bebinca Dessert',
      places: 'Fontainhas Heritage Quarter, Palolem Cliff Trails, Anjuna Flea Market',
      exp: 'Sunrise Paddleboarding, Colonial House Architectural Tour, Coastal Spice Tasting',
      heroImage: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuA6oEBZ-KDnA9Dn3UWuBTH6PgoCxA2ZpWU1tTUdl7GcmuCaX6VLCh7IurnRGygSmWUXU9Flj8R_sCSQDQOyzheJX9t8ZajW-8cbc062d633ca04a5ae2a806a5947184',
      galleryImages: [],
      bestTime: 'November to February',
      videoId: '3CznVyzPm_M',
      videoUrl: 'https://www.youtube.com/watch?v=3CznVyzPm_M',
      instagramUrl: '',
      featured: true,
      published: true
    },
    {
      id: 'bali',
      name: 'Bali',
      country: 'Indonesia',
      title: 'Bali, Indonesia',
      tag: 'Sacred Temples, Emerald Rice Terraces & Coastal Swells',
      shortDesc: 'An island of spiritual tranquility, dramatic volcanic ridges, cascading waterfalls, and world-class organic culinary cafes.',
      longDesc: 'Discover Ubud’s artist communities, dawn hikes up Mount Batur volcano, and pristine cliffside beach spots.',
      food: 'Nasi Goreng, Babi Guling, Fresh Dragonfruit Acai Bowls',
      places: 'Ubud Tegallalang Rice Terraces, Uluwatu Temple Cliffs, Canggu Coastal Trail',
      exp: 'Dawn Volcano Trek at Mount Batur, Waterfall Canyoning, Organic Farm Dining',
      heroImage: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuBMA8WwnX_pezkKJcxpZf1nN02-MUNpa6TqMzrvtasG8VAi0mZxmLgA0hS8tuuU4A-udD2q68-V6RYyjpcKGZaB-3w8rEAl-ddd3c9a6afc05624b9560d9cff5aa526',
      galleryImages: [],
      bestTime: 'April to October',
      videoId: 'lcU3p-6c6R0',
      videoUrl: 'https://www.youtube.com/watch?v=lcU3p-6c6R0',
      instagramUrl: '',
      featured: true,
      published: true
    },
    {
      id: 'dubai',
      name: 'Dubai',
      country: 'UAE',
      title: 'Dubai, UAE',
      tag: 'Futuristic Architecture & Golden Desert Dunes',
      shortDesc: 'Where ultra-modern skyscrapers meet quiet Arabian desert dunes, aromatic spice souks, and international fine dining.',
      longDesc: 'Experience contrast between Old Dubai’s historic creek souks and cutting-edge architectural wonders.',
      food: 'Al Machboos, Shawarma, Camel Milk Gelato, Kunafa',
      places: 'Old Dubai Deira Spice Souk, Desert Conservation Reserve, Museum of the Future',
      exp: 'Sunset Desert Safari, Dhow Dinner Cruise, Old Town Culinary Walk',
      heroImage: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCXNOPI_dxPjVZx369fnolWt_YodLRcFg5o_XFJgyg9uKdOuzw-dwjcSMiynd6SWcptie-TsHq8US1SSOa2eRfrFGAqjIKS-9227465da0dc969f961ab80219cdad26',
      galleryImages: [],
      bestTime: 'November to March',
      videoId: 'a7G6J0XvXJg',
      videoUrl: 'https://www.youtube.com/watch?v=a7G6J0XvXJg',
      instagramUrl: '',
      featured: true,
      published: true
    },
    {
      id: 'tokyo',
      name: 'Tokyo',
      country: 'Japan',
      title: 'Tokyo, Japan',
      tag: 'Neon Alleyways, Historic Shrines & Master Culinary Artistry',
      shortDesc: 'A mesmerizing metropolis combining centuries-old tea ceremony traditions with high-speed bullet trains.',
      longDesc: 'Immerse yourself in Tokyo’s food alleys, serene Meiji Shrine grounds, and vibrant neon neighborhoods.',
      food: 'Tonkotsu Ramen, Tsukiji Fresh Sushi, Matcha Parfait, Yakitori',
      places: 'Shinjuku Omoide Yokocho Alleys, Senso-ji Temple, Shibuya Crossing',
      exp: 'Late Night Alleyway Food Safari, Traditional Tea Ceremony, Tsukiji Fish Market Dawn Walk',
      heroImage: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCQaZah9USED6VtRLFcaESDDe1hhrhwnCe8XJ29ypZ4CsFxDAwGlLTXs1FC50oSjjvqkPuyBR5QFEjR1V6XBnsMjGn5KqVz-0a930619be67565aa64f3dd2a061d204',
      galleryImages: [],
      bestTime: 'March to May & Sept to Nov',
      videoId: '406Wv-4a7b0',
      videoUrl: 'https://www.youtube.com/watch?v=406Wv-4a7b0',
      instagramUrl: '',
      featured: false,
      published: true
    }
  ];

  const DEFAULT_ARTICLES = [
    {
      id: 'munnar-fog',
      title: 'The Art of Slow Travel in Munnar: How 4:30 AM Fog Taught Me Patience',
      subtitle: 'Surrendering your schedule to mountain cloud inversions and roadside tea stalls.',
      category: 'Travel Reflection',
      date: 'Sept 2026',
      publishDate: '2026-09-05',
      readTime: '6 min read',
      author: 'Priyal Joshi',
      img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuC3ktJ0r9ZmiMpAE1kJI_kCDkJIRlIpkwNdw54Hv2qlQazyVfRLsZiYo3DetM3TxYS8EYVEiD5LW-dqIi1FyZT3pntuV6JV-236acde6080bf3f770c98cca77aa020d',
      quote: '"Travel isn\'t about ticking off landmarks on a map—it is about surrendering your schedule to the morning mist."',
      videoId: 'tCnc7fKwe-E',
      relatedDestinationId: 'munnar',
      featured: true,
      status: 'published',
      published: true,
      body: `
        <p class="font-headline text-lg text-amber-200 font-normal leading-relaxed">
          The air in Munnar at 4:30 AM smells of damp eucalyptus, woodsmoke, and bruised cardamom leaves. Standing at Lockhart Gap, waiting for dawn, you don't see the mountain range right away. You feel it.
        </p>
        <p>
          In modern travel culture, we are trained to chase instant views: snap the sunset, film the drone shot, move to the next pin on Google Maps. But the tea mountains of Kerala refuse to operate on human schedules. Here, clouds drift on their own terms.
        </p>
        <h3 class="font-headline text-xl text-white font-light mt-6 mb-2">The Silence of Lockhart Gap</h3>
        <p>
          As the first golden light breaks through the mountain gap, local estate workers move rhythmically along the terraced tea slopes with woven baskets strapped across their foreheads. Watching them work with precise grace brought me a deep sense of calm that no hotel resort could ever replicate.
        </p>
        <p>
          At a small roadside tea stall constructed from bamboo and iron sheets, an elderly man named Kuttan Chettan poured fresh cardamom chai between two glass tumblers. He crushed green cardamom pods grown just 20 meters down the hill right into the boiling kettle.
        </p>
        <h3 class="font-headline text-xl text-white font-light mt-6 mb-2">Veyra Trails Advice for Slow Travelers</h3>
        <p>
          If you visit Munnar, skip the crowded viewpoint parking lots. Wake up while the stars are still sharp in the sky, walk down the old British colonial bridle trails, and sit softly with a steaming glass of chai. The mist will speak to you if you give it time.
        </p>
      `
    },
    {
      id: 'kerala-sadya',
      title: 'Decoding the 24 Dishes of Kerala’s Banana Leaf Sadya',
      subtitle: 'Ancient Ayurvedic flavor geometry and centuries-old culinary heritage.',
      category: 'Culinary History',
      date: 'Aug 2026',
      publishDate: '2026-08-20',
      readTime: '8 min read',
      author: 'Priyal Joshi',
      img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCQaZah9USED6VtRLFcaESDDe1hhrhwnCe8XJ29ypZ4CsFxDAwGlLTXs1FC50oSjjvqkPuyBR5QFEjR1V6XBnsMjGn5KqVz-0a930619be67565aa64f3dd2a061d204',
      quote: '"Every curry placement on a banana leaf follows ancient Ayurvedic geometry—sour at the narrow tip, sweet at the center, and savory at the base."',
      videoId: '5D3cZ-6tGkY',
      relatedDestinationId: 'kerala',
      featured: true,
      status: 'published',
      published: true,
      body: `
        <p class="font-headline text-lg text-amber-200 font-normal leading-relaxed">
          To eat a traditional Sadya is to partake in a living culinary ritual that spans centuries. Served on a vibrant green, freshly cut banana leaf, this plant-based feast brings together up to 28 distinct dishes.
        </p>
        <p>
          The leaf itself is laid with its tapered tip pointing to the left of the diner. Every dish has a precise geometric position ordained by Ayurvedic principles to aid digestion and harmonize the six fundamental tastes.
        </p>
        <h3 class="font-headline text-xl text-white font-light mt-6 mb-2">Symphony of Flavors</h3>
        <p>
          The journey begins with crispy banana chips fried in golden unrefined coconut oil, followed by jaggery-coated banana chunks spiced with dried ginger. Next comes Inji Puli—a sweet, spicy, and sour ginger-tamarind reduction affectionately called the 100-curry equivalent.
        </p>
      `
    },
    {
      id: 'tokyo-ramen',
      title: 'Navigating Tokyo\'s Yokocho Alleys: A Guide to Midnight Ramen Counters',
      subtitle: 'Stepping through red noren curtains into 6-seat nocturnal food counters.',
      category: 'Food Guide',
      date: 'July 2026',
      publishDate: '2026-07-15',
      readTime: '5 min read',
      author: 'Priyal Joshi',
      img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCXNOPI_dxPjVZx369fnolWt_YodLRcFg5o_XFJgyg9uKdOuzw-dwjcSMiynd6SWcptie-TsHq8US1SSOa2eRfrFGAqjIKS-9227465da0dc969f961ab80219cdad26',
      quote: '"Stepping through a red noren curtain into a 6-seat wooden alley counter is the ultimate Tokyo nocturnal ritual."',
      videoId: '406Wv-4a7b0',
      relatedDestinationId: 'tokyo',
      featured: false,
      status: 'published',
      published: true,
      body: `
        <p class="font-headline text-lg text-amber-200 font-normal leading-relaxed">
          Underneath the shadow of Shinjuku's modern glass skyscrapers lies Omoide Yokocho—a narrow labyrinth of glowing red paper lanterns, aromatic steam, and charcoal grills.
        </p>
      `
    },
    {
      id: 'dubai-desert',
      title: 'Desert Solitude: Sunset Camping Beyond Dubai\'s Skyline',
      subtitle: 'Bedouin fires, saffron tea, and sleeping under golden Arabian dune stars.',
      category: 'Expedition Journal',
      date: 'June 2026',
      publishDate: '2026-06-10',
      readTime: '7 min read',
      author: 'Priyal Joshi',
      img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCXNOPI_dxPjVZx369fnolWt_YodLRcFg5o_XFJgyg9uKdOuzw-dwjcSMiynd6SWcptie-TsHq8US1SSOa2eRfrFGAqjIKS-9227465da0dc969f961ab80219cdad26',
      quote: '"The desert silence at night in the Arabian dunes makes the buzzing metropolis feel lightyears away."',
      videoId: 'a7G6J0XvXJg',
      relatedDestinationId: 'dubai',
      featured: false,
      status: 'published',
      published: true,
      body: `
        <p class="font-headline text-lg text-amber-200 font-normal leading-relaxed">
          Driving just 45 minutes past Downtown Dubai's Burj Khalifa brings you into a vast expanse of shifting golden dunes where wind ripples shape the landscape continuously.
        </p>
      `
    }
  ];

  const DEFAULT_GALLERY = [
    {
      id: 'g1',
      title: 'Munnar Tea Valley Dawn',
      caption: 'Mist-veiled rolling hills in Lockhart Gap tea estate at 5:00 AM.',
      category: 'Nature',
      location: 'Munnar, Kerala',
      date: '2026-09-08',
      image: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuC3ktJ0r9ZmiMpAE1kJI_kCDkJIRlIpkwNdw54Hv2qlQazyVfRLsZiYo3DetM3TxYS8EYVEiD5LW-dqIi1FyZT3pntuV6JV-236acde6080bf3f770c98cca77aa020d',
      featured: true,
      published: true
    },
    {
      id: 'g2',
      title: 'Traditional Kerala Sadya',
      caption: '24 plant-based dishes served on a fresh banana leaf in Fort Kochi.',
      category: 'Food',
      location: 'Fort Kochi, India',
      date: '2026-08-25',
      image: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCQaZah9USED6VtRLFcaESDDe1hhrhwnCe8XJ29ypZ4CsFxDAwGlLTXs1FC50oSjjvqkPuyBR5QFEjR1V6XBnsMjGn5KqVz-0a930619be67565aa64f3dd2a061d204',
      featured: true,
      published: true
    },
    {
      id: 'g3',
      title: 'Fontainhas Portuguese Balcony',
      caption: 'Vibrant yellow colonial house architecture in Old Goa.',
      category: 'Travel',
      location: 'Goa, India',
      date: '2026-08-18',
      image: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuA6oEBZ-KDnA9Dn3UWuBTH6PgoCxA2ZpWU1tTUdl7GcmuCaX6VLCh7IurnRGygSmWUXU9Flj8R_sCSQDQOyzheJX9t8ZajW-8cbc062d633ca04a5ae2a806a5947184',
      featured: true,
      published: true
    },
    {
      id: 'g4',
      title: 'Thar Desert Camel Trail',
      caption: 'Sunset shadows across golden dunes in Jaisalmer.',
      category: 'Adventure',
      location: 'Rajasthan, India',
      date: '2026-08-10',
      image: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAshIJrQYd_jr0JyjDXKGNuu2-l3IMjWYz8RxX4Rn_bvK9d4vfW--LASyhU4yqbgsb4RLFL6fpq-Y8uq5WQ0NAGB4AUKdb5-c7bd87b3e0af2573df4614d99552590d',
      featured: true,
      published: true
    },
    {
      id: 'g5',
      title: 'Tokyo Red Noren Lanterns',
      caption: 'Nocturnal food stalls tucked inside Omoide Yokocho.',
      category: 'City',
      location: 'Tokyo, Japan',
      date: '2026-07-22',
      image: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCXNOPI_dxPjVZx369fnolWt_YodLRcFg5o_XFJgyg9uKdOuzw-dwjcSMiynd6SWcptie-TsHq8US1SSOa2eRfrFGAqjIKS-9227465da0dc969f961ab80219cdad26',
      featured: false,
      published: true
    },
    {
      id: 'g6',
      title: 'Behind the Camera in Bali',
      caption: 'Setting up 3D camera rig for volcano dawn trek.',
      category: 'Behind the Scenes',
      location: 'Mount Batur, Bali',
      date: '2026-05-28',
      image: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuBMA8WwnX_pezkKJcxpZf1nN02-MUNpa6TqMzrvtasG8VAi0mZxmLgA0hS8tuuU4A-udD2q68-V6RYyjpcKGZaB-3w8rEAl-ddd3c9a6afc05624b9560d9cff5aa526',
      featured: false,
      published: true
    }
  ];

  const DEFAULT_REELS = [
    {
      id: 'r1',
      title: 'Steaming Cardamom Chai at 4:30 AM in Munnar ☕️',
      description: 'Nothing beats freshly crushed green cardamom chai in high altitude mist.',
      instagramUrl: 'https://instagram.com/reel/C1234567890/',
      thumbnail: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuC3ktJ0r9ZmiMpAE1kJI_kCDkJIRlIpkwNdw54Hv2qlQazyVfRLsZiYo3DetM3TxYS8EYVEiD5LW-dqIi1FyZT3pntuV6JV-236acde6080bf3f770c98cca77aa020d',
      category: 'Travel',
      location: 'Munnar, Kerala',
      duration: '0:35',
      likes: 18450,
      featured: true,
      published: true
    },
    {
      id: 'r2',
      title: '24 Dishes Banana Leaf Sadya Challenge 🍌',
      description: 'Which curry placement is your favorite on the banana leaf?',
      instagramUrl: 'https://instagram.com/reel/C2345678901/',
      thumbnail: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCQaZah9USED6VtRLFcaESDDe1hhrhwnCe8XJ29ypZ4CsFxDAwGlLTXs1FC50oSjjvqkPuyBR5QFEjR1V6XBnsMjGn5KqVz-0a930619be67565aa64f3dd2a061d204',
      category: 'Food',
      location: 'Kochi, Kerala',
      duration: '0:48',
      likes: 24100,
      featured: true,
      published: true
    },
    {
      id: 'r3',
      title: 'Old Goa Colonial Street Art Walk 🎨',
      description: 'Exploring vibrant yellow Latin houses in Fontainhas quarter.',
      instagramUrl: 'https://instagram.com/reel/C3456789012/',
      thumbnail: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuA6oEBZ-KDnA9Dn3UWuBTH6PgoCxA2ZpWU1tTUdl7GcmuCaX6VLCh7IurnRGygSmWUXU9Flj8R_sCSQDQOyzheJX9t8ZajW-8cbc062d633ca04a5ae2a806a5947184',
      category: 'Travel',
      location: 'Goa, India',
      duration: '0:30',
      likes: 15200,
      featured: true,
      published: true
    },
    {
      id: 'r4',
      title: 'Tokyo Midnight Alleyway Ramen Sound 🍜',
      description: 'Sensory slurp sounds inside Shinjuku Omoide Yokocho.',
      instagramUrl: 'https://instagram.com/reel/C4567890123/',
      thumbnail: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCXNOPI_dxPjVZx369fnolWt_YodLRcFg5o_XFJgyg9uKdOuzw-dwjcSMiynd6SWcptie-TsHq8US1SSOa2eRfrFGAqjIKS-9227465da0dc969f961ab80219cdad26',
      category: 'Food',
      location: 'Tokyo, Japan',
      duration: '0:42',
      likes: 31900,
      featured: false,
      published: true
    }
  ];

  const DEFAULT_MESSAGES = [
    {
      id: 'm1',
      name: 'Elena Rostova',
      email: 'elena.rostova@travelmag.com',
      subject: 'Feature Collaboration Request — Winter Travel Journal Issue',
      message: 'Hi Priyal! We love your Veyra Trails series on Munnar and Kerala. We would love to invite you to contribute a 4-page photo essay and article for our upcoming Travel Magazine winter edition.',
      date: '2026-09-17 14:32',
      status: 'unread'
    },
    {
      id: 'm2',
      name: 'Vikramaditya Singh',
      email: 'vikram@rajasthantourism.org',
      subject: 'Invitation: Heritage Trail Documentary in Udaipur',
      message: 'Greetings from Rajasthan Tourism. We watched your Thar Desert expedition and would be honored to host you for a 5-day creator documentary covering Udaipur palace restorations.',
      date: '2026-09-16 09:15',
      status: 'unread'
    },
    {
      id: 'm3',
      name: 'Sarah Chen',
      email: 'sarah.chen@wanderlust.co',
      subject: 'Question regarding Munnar tea plantation homestays',
      message: 'Hello! I am planning a 2-week solo trip based on your Munnar vlog. Could you share the name of the eco-lodge near Lockhart Gap featured at 08:30 in the video?',
      date: '2026-09-14 18:40',
      status: 'read'
    },
    {
      id: 'm4',
      name: 'David Miller',
      email: 'dmiller@gearreview.tv',
      subject: 'Camera Equipment sponsorship for 2027 expeditions',
      message: 'Hi Veyra Trails team, we are eager to sponsor your 3D WebGL video production gear for next year. Let us know if you are open to a quick call.',
      date: '2026-09-10 11:05',
      status: 'replied'
    }
  ];

  const DEFAULT_TEAM = [
    {
      id: 'u1',
      name: 'Priyal Joshi',
      email: 'owner@veyratrails.com',
      password: 'admin123',
      role: 'OWNER',
      active: true,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      createdAt: '2026-01-01'
    },
    {
      id: 'u2',
      name: 'Aarav Sharma',
      email: 'editor@veyratrails.com',
      password: 'editor123',
      role: 'EDITOR',
      active: true,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      createdAt: '2026-03-15'
    },
    {
      id: 'u3',
      name: 'Maya Patel',
      email: 'manager@veyratrails.com',
      password: 'manager123',
      role: 'MANAGER',
      active: true,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      createdAt: '2026-05-10'
    },
    {
      id: 'u4',
      name: 'Rohan Verma',
      email: 'viewer@veyratrails.com',
      password: 'viewer123',
      role: 'VIEWER',
      active: true,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      createdAt: '2026-07-01'
    }
  ];

  const DEFAULT_LOGS = [
    {
      id: 'l1',
      date: '2026-09-18',
      time: '08:30:15',
      adminName: 'Priyal Joshi (Owner)',
      action: 'Admin Login',
      content: 'Authenticated successfully into Admin Portal',
      category: 'Auth',
      status: 'Success'
    },
    {
      id: 'l2',
      date: '2026-09-17',
      time: '16:45:00',
      adminName: 'Aarav Sharma (Editor)',
      action: 'Article Published',
      content: 'Published article: The Art of Slow Travel in Munnar',
      category: 'Articles',
      status: 'Published'
    },
    {
      id: 'l3',
      date: '2026-09-16',
      time: '11:20:10',
      adminName: 'Priyal Joshi (Owner)',
      action: 'Video Added',
      content: 'Added video: 4:30 AM mist at Lockhart Gap, Munnar',
      category: 'Videos',
      status: 'Success'
    },
    {
      id: 'l4',
      date: '2026-09-15',
      time: '14:10:05',
      adminName: 'Maya Patel (Manager)',
      action: 'Destination Updated',
      content: 'Updated destination details for Kerala & Goa',
      category: 'Destinations',
      status: 'Updated'
    },
    {
      id: 'l5',
      date: '2026-09-14',
      time: '09:05:40',
      adminName: 'Priyal Joshi (Owner)',
      action: 'Settings Updated',
      content: 'Saved homepage featured content and SEO metadata',
      category: 'Settings',
      status: 'Saved'
    }
  ];

  const DEFAULT_ANALYTICS = {
    totalVisitors: 48250,
    pageViews: 142800,
    videoViews: 96400,
    articleViews: 31200,
    destinationViews: 54100,
    reelEngagement: 89600,
    messagesReceived: 4,
    dailyVisitors: [
      { day: 'Mon', visitors: 1420, views: 4200 },
      { day: 'Tue', visitors: 1680, views: 4900 },
      { day: 'Wed', visitors: 1950, views: 5600 },
      { day: 'Thu', visitors: 2100, views: 6200 },
      { day: 'Fri', visitors: 2850, views: 8400 },
      { day: 'Sat', visitors: 3400, views: 9800 },
      { day: 'Sun', visitors: 3100, views: 9100 }
    ],
    weeklyVisitors: [
      { week: 'Week 1', visitors: 9800 },
      { week: 'Week 2', visitors: 11400 },
      { week: 'Week 3', visitors: 12900 },
      { week: 'Week 4', visitors: 14150 }
    ],
    monthlyVisitors: [
      { month: 'May', visitors: 32000 },
      { month: 'Jun', visitors: 38500 },
      { month: 'Jul', visitors: 42100 },
      { month: 'Aug', visitors: 46800 },
      { month: 'Sep', visitors: 48250 }
    ],
    topVideos: [
      { title: '4:30 AM Mist at Lockhart Gap', views: 34200 },
      { title: 'Tokyo Yokocho Ramen Trail', views: 28900 },
      { title: 'Exploring Old Goa Latin Quarter', views: 18400 },
      { title: 'Royal Jaipur Palaces & Thar Desert', views: 14900 }
    ],
    topDestinations: [
      { name: 'Kerala', views: 18200 },
      { name: 'Munnar', views: 14600 },
      { name: 'Goa', views: 11800 },
      { name: 'Tokyo', views: 9500 }
    ]
  };

  const DEFAULT_PROMOTIONS = [
    {
      id: 'p1',
      brandName: 'Fujifilm India',
      campaignTitle: 'X-T5 Cinematic Color Expedition',
      description: 'Filming high-dynamic range 4K vlog footage across Western Ghats tea valleys and coastal spice ports.',
      image: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuC3ktJ0r9ZmiMpAE1kJI_kCDkJIRlIpkwNdw54Hv2qlQazyVfRLsZiYo3DetM3TxYS8EYVEiD5LW-dqIi1FyZT3pntuV6JV-236acde6080bf3f770c98cca77aa020d',
      campaignUrl: 'https://fujifilm.com',
      status: 'active',
      date: '2026-09-01'
    },
    {
      id: 'p2',
      brandName: 'Peak Design',
      campaignTitle: 'Travel Backpack 45L Ecosystem',
      description: 'Field testing weatherproof camera carry gear through volcanic hikes in Bali and Thar Desert expeditions.',
      image: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuBMA8WwnX_pezkKJcxpZf1nN02-MUNpa6TqMzrvtasG8VAi0mZxmLgA0hS8tuuU4A-udD2q68-V6RYyjpcKGZaB-3w8rEAl-ddd3c9a6afc05624b9560d9cff5aa526',
      campaignUrl: 'https://peakdesign.com',
      status: 'active',
      date: '2026-08-15'
    }
  ];

  const DEFAULT_PROFILE = {
    vloggerName: 'Priyal Joshi',
    tagline: 'Travel. Taste. Tell the Story.',
    bio: 'Independent travel filmmaker, culinary explorer, and visual storyteller documenting hidden trails, regional food cultures, and mountain inversions across the globe.',
    location: 'Kerala & Mumbai, India',
    profileImage: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuC3ktJ0r9ZmiMpAE1kJI_kCDkJIRlIpkwNdw54Hv2qlQazyVfRLsZiYo3DetM3TxYS8EYVEiD5LW-dqIi1FyZT3pntuV6JV-236acde6080bf3f770c98cca77aa020d',
    email: 'hello@veyratrails.com',
    phone: '+91 98765 43210',
    youtubeUrl: 'https://youtube.com/@veyratrails',
    instagramUrl: 'https://instagram.com/veyratrails',
    twitterUrl: 'https://x.com/veyratrails',
    facebookUrl: 'https://facebook.com/veyratrails'
  };

  // Helper Methods for LocalStorage
  function getItem(key, defaultValue) {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.warn('VeyraDB read error for key ' + key, e);
      return defaultValue;
    }
  }

  function setItem(key, value) {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('VeyraDB write error for key ' + key, e);
    }
  }

  // Core VeyraDB Engine
  const VeyraDB = {
    // Initialization: ensure default seed data exists
    init() {
      if (!getItem('initialized', false)) {
        setItem('settings', DEFAULT_SETTINGS);
        setItem('videos', DEFAULT_VIDEOS);
        setItem('destinations', DEFAULT_DESTINATIONS);
        setItem('articles', DEFAULT_ARTICLES);
        setItem('gallery', DEFAULT_GALLERY);
        setItem('reels', DEFAULT_REELS);
        setItem('messages', DEFAULT_MESSAGES);
        setItem('team', DEFAULT_TEAM);
        setItem('logs', DEFAULT_LOGS);
        setItem('analytics', DEFAULT_ANALYTICS);
        setItem('promotions', DEFAULT_PROMOTIONS);
        setItem('profile', DEFAULT_PROFILE);
        setItem('initialized', true);
        console.log('⚡ VeyraDB initialized with rich seed data!');
      } else {
        if (!getItem('promotions', null)) setItem('promotions', DEFAULT_PROMOTIONS);
        if (!getItem('profile', null)) setItem('profile', DEFAULT_PROFILE);
      }
    },

    getProfile() {
      return getItem('profile', DEFAULT_PROFILE);
    },

    saveProfile(prof) {
      const current = this.getProfile();
      const updated = { ...current, ...prof };
      setItem('profile', updated);
      this.logActivity('Profile Saved', 'Updated vlogger bio & contact info', 'PROFILE', 'Saved');
      return updated;
    },

    // Generic CRUD
    getAll(entity) {
      return getItem(entity, []);
    },

    getPublished(entity) {
      const items = getItem(entity, []);
      return items.filter(item => item.published !== false && item.status !== 'draft');
    },

    getById(entity, id) {
      const items = getItem(entity, []);
      return items.find(item => item.id === id) || null;
    },

    save(entity, item) {
      const items = getItem(entity, []);
      if (!item.id) {
        item.id = entity.charAt(0) + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
      }
      const existingIdx = items.findIndex(i => i.id === item.id);
      if (existingIdx >= 0) {
        items[existingIdx] = { ...items[existingIdx], ...item };
      } else {
        items.unshift(item);
      }
      setItem(entity, items);

      // Auto Activity Log
      const actionName = existingIdx >= 0 ? `${entity.slice(0, -1).toUpperCase()} Updated` : `${entity.slice(0, -1).toUpperCase()} Created`;
      this.logActivity(actionName, item.title || item.name || item.subject || item.id, entity.toUpperCase(), 'Success');

      return item;
    },

    delete(entity, id) {
      let items = getItem(entity, []);
      const itemToDelete = items.find(i => i.id === id);
      items = items.filter(i => i.id !== id);
      setItem(entity, items);

      if (itemToDelete) {
        this.logActivity(`${entity.slice(0, -1).toUpperCase()} Deleted`, itemToDelete.title || itemToDelete.name || id, entity.toUpperCase(), 'Deleted');
      }
      return true;
    },

    // Settings
    getSettings() {
      return getItem('settings', DEFAULT_SETTINGS);
    },

    saveSettings(newSettings) {
      const current = this.getSettings();
      const updated = { ...current, ...newSettings };
      setItem('settings', updated);
      this.logActivity('Settings Saved', 'Updated website configuration & homepage controls', 'SETTINGS', 'Saved');
      return updated;
    },

    // Messages
    addMessage(msg) {
      const messages = getItem('messages', DEFAULT_MESSAGES);
      const newMsg = {
        id: 'm_' + Date.now().toString(36),
        name: msg.name || 'Anonymous',
        email: msg.email || 'no-email@provided.com',
        subject: msg.subject || 'Website Inquiry',
        message: msg.message || '',
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'unread'
      };
      messages.unshift(newMsg);
      setItem('messages', messages);
      this.logActivity('New Contact Message', `From: ${newMsg.name} (${newMsg.subject})`, 'MESSAGES', 'Unread');
      return newMsg;
    },

    // Activity Log
    getLogs() {
      return getItem('logs', DEFAULT_LOGS);
    },

    logActivity(action, content, category = 'SYSTEM', status = 'Success') {
      const logs = getItem('logs', DEFAULT_LOGS);
      const authUser = this.getAuthUser();
      const adminName = authUser ? `${authUser.name} (${authUser.role})` : 'System';
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];

      const newLog = {
        id: 'l_' + Date.now().toString(36),
        date: dateStr,
        time: timeStr,
        adminName: adminName,
        action: action,
        content: content,
        category: category,
        status: status
      };

      logs.unshift(newLog);
      setItem('logs', logs.slice(0, 100));
    },

    // Analytics Data
    getAnalytics() {
      return getItem('analytics', DEFAULT_ANALYTICS);
    },

    // Authentication Layer
    getAuthUser() {
      return getItem('auth_session', null);
    },

    login(email, password) {
      const team = getItem('team', DEFAULT_TEAM);
      const user = team.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

      if (user) {
        if (!user.active) {
          return { success: false, error: 'Account is deactivated. Please contact the Owner.' };
        }
        const session = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          loggedInAt: new Date().toISOString()
        };
        setItem('auth_session', session);
        this.logActivity('Admin Login', `${user.name} logged into Admin Portal`, 'AUTH', 'Success');
        return { success: true, user: session };
      }
      return { success: false, error: 'Invalid email or password.' };
    },

    logout() {
      const user = this.getAuthUser();
      if (user) {
        this.logActivity('Admin Logout', `${user.name} logged out`, 'AUTH', 'Logged Out');
      }
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'auth_session');
    },

    // Reset Data to Factory Defaults
    resetToDefaults() {
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'initialized');
      this.init();
      console.log('🔄 VeyraDB reset to factory defaults.');
    }
  };

  // Initialize DB on script load
  VeyraDB.init();

  // Export to global scope
  window.VeyraDB = VeyraDB;

})(window);
