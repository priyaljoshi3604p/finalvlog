/* ==========================================================================
   VEYRA TRAILS - 3D INTERACTIVE CREATOR ENGINE (app.js)
   "Travel. Taste. Tell the Story."
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initVisitorTracking();
  initVeyraDBSync();
  initBackendAPISync();
  loadPublicVideos();
  initThreeJSGlobe();
  init3DTiltCards();
  initHeroParallax();
  initHeaderScroll();
  initActiveNavSpy();
  initCleanSectionRouting();
  initVlogFilters();
  initGalleryFilters();
  initArticleFilters();
  initVideoModal();
  initGalleryLightbox();
  initArticleModal();
  initDestinationExplorer();
  initReelsInteractions();
  initFormHandlers();
  initMobileMenu();
});

function initCleanSectionRouting() {
  try {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    const sectionRoutes = ['about', 'travel', 'food', 'vlogs', 'reels', 'gallery', 'articles', 'destinations', 'contact'];

    if (sectionRoutes.includes(path)) {
      const targetSection = document.getElementById(path);
      if (targetSection) {
        setTimeout(() => {
          targetSection.scrollIntoView({ behavior: 'smooth' });
        }, 200);
      }
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', () => {
        const targetId = anchor.getAttribute('href').replace('#', '');
        if (targetId && sectionRoutes.includes(targetId)) {
          if (window.history && window.history.pushState) {
            window.history.pushState(null, '', `/${targetId}`);
          }
        } else if (targetId === 'home') {
          if (window.history && window.history.pushState) {
            window.history.pushState(null, '', '/');
          }
        }
      });
    });

    window.addEventListener('popstate', () => {
      const currentPath = window.location.pathname.replace(/^\/+|\/+$/g, '');
      if (sectionRoutes.includes(currentPath)) {
        const sec = document.getElementById(currentPath);
        if (sec) sec.scrollIntoView({ behavior: 'smooth' });
      } else if (!currentPath) {
        const homeSec = document.getElementById('home');
        if (homeSec) homeSec.scrollIntoView({ behavior: 'smooth' });
      }
    });
  } catch (err) {
    console.warn('Clean routing notice:', err);
  }
}


function initVisitorTracking() {
  try {
    let sessionId = sessionStorage.getItem('veyra_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substring(2) + Date.now();
      sessionStorage.setItem('veyra_session_id', sessionId);
    }
    fetch('/api/visitors/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        pageVisited: window.location.pathname + (window.location.hash || '#home'),
        referrer: document.referrer || ''
      })
    }).catch(() => {});
  } catch (err) {}
}

async function initBackendAPISync() {
  try {
    const res = await fetch('/api/public/settings');
    const data = await res.json();
    if (data.success && data.settings) {
      const s = data.settings;
      if (s.contactEmail) {
        document.querySelectorAll('a[href^="mailto:"]').forEach(a => a.href = `mailto:${s.contactEmail}`);
        document.querySelectorAll('.contact-email-text').forEach(el => el.textContent = s.contactEmail);
      }
      if (s.contactPhone) {
        document.querySelectorAll('a[href^="tel:"]').forEach(a => a.href = `tel:${s.contactPhone.replace(/\s+/g, '')}`);
        document.querySelectorAll('.contact-phone-text').forEach(el => el.textContent = s.contactPhone);
      }
      if (s.youtubeUrl) document.querySelectorAll('a[aria-label="YouTube"]').forEach(a => a.href = s.youtubeUrl);
      if (s.instagramUrl) document.querySelectorAll('a[aria-label="Instagram"]').forEach(a => a.href = s.instagramUrl);
      if (s.seoTitle) document.title = s.seoTitle;
    }
  } catch (err) {}
}

function initVeyraDBSync() {
  if (!window.VeyraDB) return;
  try {
    const settings = window.VeyraDB.getSettings();
    if (settings) {
      // Brand Name & Tagline
      const brandTitles = document.querySelectorAll('.font-headline.tracking-\\[0\\.25em\\]');
      brandTitles.forEach(el => {
        if (settings.websiteName) el.textContent = settings.websiteName;
      });

      const taglineEls = document.querySelectorAll('.text-\\[9px\\].tracking-\\[0\\.2em\\]');
      taglineEls.forEach(el => {
        if (settings.tagline) el.textContent = settings.tagline;
      });

      // Social Links
      const ytLinks = document.querySelectorAll('a[aria-label="YouTube"]');
      ytLinks.forEach(el => { if (settings.youtubeUrl) el.href = settings.youtubeUrl; });

      const igLinks = document.querySelectorAll('a[aria-label="Instagram"]');
      igLinks.forEach(el => { if (settings.instagramUrl) el.href = settings.instagramUrl; });

      const emailLinks = document.querySelectorAll('a[aria-label="Email"]');
      emailLinks.forEach(el => { if (settings.contactEmail) el.href = `mailto:${settings.contactEmail}`; });

      // Dynamic SEO Title
      if (settings.seoTitle) {
        document.title = settings.seoTitle;
      }
    }

    // Profile Sync
    const profile = window.VeyraDB.getProfile();
    if (profile) {
      const bioEls = document.querySelectorAll('.vlogger-bio-text');
      bioEls.forEach(el => { if (profile.bio) el.textContent = profile.bio; });

      const nameEls = document.querySelectorAll('.vlogger-name-heading');
      nameEls.forEach(el => { if (profile.vloggerName) el.textContent = profile.vloggerName; });

      const imgEls = document.querySelectorAll('.vlogger-profile-img');
      imgEls.forEach(el => { if (profile.profileImage) el.src = profile.profileImage; });
    }

    // Filter Published vs Unpublished Videos
    const videos = window.VeyraDB.getAll('videos');
    const vlogCards = document.querySelectorAll('.vlog-card-item');
    vlogCards.forEach(card => {
      const vId = card.getAttribute('data-video-id');
      const item = videos.find(v => v.id === vId || v.youtubeUrl?.includes(vId));
      if (item && item.published === false) {
        card.style.display = 'none';
      }
    });

    // Filter Published vs Unpublished Destinations
    const destinations = window.VeyraDB.getAll('destinations');
    const destCards = document.querySelectorAll('.destination-card-item, [data-destination-id]');
    destCards.forEach(card => {
      const dId = card.getAttribute('data-destination-id') || card.getAttribute('id');
      const item = destinations.find(d => d.id === dId || d.name?.toLowerCase() === dId?.toLowerCase());
      if (item && item.published === false) {
        card.style.display = 'none';
      }
    });

    // Sync Published vs Unpublished Articles
    const articles = window.VeyraDB.getAll('articles');
    const artCards = document.querySelectorAll('.article-card-item');
    artCards.forEach(card => {
      const aId = card.getAttribute('data-article-id');
      const item = articles.find(a => a.id === aId);
      if (item && (item.published === false || item.status === 'draft')) {
        card.style.display = 'none';
      }
    });

    // Render newly created articles dynamically
    const articlesGrid = document.querySelector('#articles .grid');
    if (articlesGrid) {
      const publishedArticles = window.VeyraDB.getPublished('articles');
      publishedArticles.forEach(art => {
        const existing = articlesGrid.querySelector(`[data-article-id="${art.id}"]`);
        if (!existing) {
          const card = document.createElement('div');
          card.className = 'article-card-item flex flex-col group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all tilt-card cursor-pointer border border-outline-variant/30';
          card.setAttribute('data-article-id', art.id);
          card.setAttribute('data-category', (art.category || 'travel').toLowerCase());
          card.innerHTML = `
            <div class="relative w-full aspect-[16/9] overflow-hidden bg-surface-container-high">
              <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 tilt-card-img" alt="${art.title}" src="${art.image}">
              <span class="absolute top-4 left-4 px-3 py-1 bg-surface/90 backdrop-blur text-[10px] tracking-[0.2em] uppercase font-medium text-on-surface rounded">${art.category || 'Travel Guide'}</span>
            </div>
            <div class="p-6 flex flex-col justify-between flex-1 gap-4">
              <div class="flex items-center justify-between text-[10px] tracking-[0.2em] uppercase text-outline font-medium">
                <span>${art.date || 'Today'} • ${art.read_time || art.readTime || '5 min read'}</span>
                <span class="text-primary font-semibold">By Veyra Trails</span>
              </div>
              <h3 class="font-headline text-2xl font-light text-on-surface group-hover:text-primary transition-colors">
                ${art.title}
              </h3>
              <p class="text-xs text-on-surface-variant font-light leading-relaxed line-clamp-3">
                ${art.description}
              </p>
              <div class="read-article-btn inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase font-medium text-primary group-hover:text-primary-container transition-colors pt-2">
                <span>Read Full Article</span>
                <span class="material-symbols-outlined text-[16px]">menu_book</span>
              </div>
            </div>
          `;
          articlesGrid.appendChild(card);
        }
      });
    }

    // Filter Published vs Unpublished Reels
    const reels = window.VeyraDB.getAll('reels');
    const reelCards = document.querySelectorAll('.reel-card-item');
    reelCards.forEach(card => {
      const rId = card.getAttribute('data-reel-id');
      const item = reels.find(r => r.id === rId);
      if (item && item.published === false) {
        card.style.display = 'none';
      }
    });

  } catch (e) {
    console.warn('VeyraDB sync notice:', e);
  }
}

/* --------------------------------------------------------------------------
   1. THREE.JS 3D ROTATING GLOBE & AMBIENT CANVAS
   -------------------------------------------------------------------------- */
function initThreeJSGlobe() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;

  // Check if THREE is available from CDN script
  if (typeof THREE === 'undefined') {
    initFallbackParticles(canvas);
    return;
  }

  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create 3D Wireframe / Particle Globe
    const globeGeometry = new THREE.SphereGeometry(2.8, 36, 36);
    const globeMaterial = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      wireframe: true,
      transparent: true,
      opacity: 0.15
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);

    // Create Starfield Points
    const particlesGeometry = new THREE.BufferGeometry();
    const count = 350;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 25;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.05,
      color: 0xf3e5ab,
      transparent: true,
      opacity: 0.6
    });

    const starField = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(starField);

    camera.position.z = 6;

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;

    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.5;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.5;
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    function animate() {
      requestAnimationFrame(animate);

      globe.rotation.y += 0.003;
      globe.rotation.x += 0.001;

      starField.rotation.y -= 0.0005;

      camera.position.x += (mouseX - camera.position.x) * 0.05;
      camera.position.y += (-mouseY - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    }

    animate();
  } catch (err) {
    console.warn('Three.js globe fallback:', err);
    initFallbackParticles(canvas);
  }
}

function initFallbackParticles(canvas) {
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.2,
      speedY: (Math.random() - 0.5) * 0.2,
      alpha: Math.random() * 0.5 + 0.2
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212, 175, 55, ${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* --------------------------------------------------------------------------
   2. HARDWARE-ACCELERATED 3D TILT EFFECT ON CARDS
   -------------------------------------------------------------------------- */
function init3DTiltCards() {
  const cards = document.querySelectorAll('.tilt-card');
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  if (isTouchDevice) return;

  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });
}

/* --------------------------------------------------------------------------
   3. HERO PARALLAX MOVEMENT
   -------------------------------------------------------------------------- */
function initHeroParallax() {
  const heroLayer = document.querySelector('.hero-background-layer');
  const heroContent = document.querySelector('.hero-content-depth');

  if (!heroLayer) return;

  window.addEventListener('mousemove', (e) => {
    const mouseX = (e.clientX / window.innerWidth - 0.5) * 25;
    const mouseY = (e.clientY / window.innerHeight - 0.5) * 25;

    heroLayer.style.transform = `translate3d(${mouseX * -0.4}px, ${mouseY * -0.4}px, 0px) scale(1.05)`;
    if (heroContent) {
      heroContent.style.transform = `translate3d(${mouseX * 0.3}px, ${mouseY * 0.3}px, 15px)`;
    }
  });
}

/* --------------------------------------------------------------------------
   4. STICKY HEADER & ACTIVE NAV SPY
   -------------------------------------------------------------------------- */
function initHeaderScroll() {
  const header = document.querySelector('.header-glass');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

function initActiveNavSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('nav a[href^="#"]');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove('active', 'text-on-surface', 'font-medium', 'underline', 'underline-offset-8', 'decoration-primary');
      link.classList.add('text-on-surface-variant');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active', 'text-on-surface', 'font-medium', 'underline', 'underline-offset-8', 'decoration-primary');
        link.classList.remove('text-on-surface-variant');
      }
    });
  });
}

/* --------------------------------------------------------------------------
   5. CATEGORY FILTERING (VIDEOS & GALLERY)
   -------------------------------------------------------------------------- */
function initVlogFilters() {
  const filterBtns = document.querySelectorAll('.vlog-filter-btn');
  const vlogCards = document.querySelectorAll('.vlog-card-item');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => {
        b.classList.remove('bg-primary', 'text-on-primary');
        b.classList.add('bg-surface-container-highest', 'text-on-surface-variant');
      });

      btn.classList.remove('bg-surface-container-highest', 'text-on-surface-variant');
      btn.classList.add('bg-primary', 'text-on-primary');

      const category = btn.getAttribute('data-category');

      vlogCards.forEach((card) => {
        const cardCategory = card.getAttribute('data-category');
        if (category === 'all' || cardCategory === category) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
          }, 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 300);
        }
      });
    });
  });
}

function initGalleryFilters() {
  const filterBtns = document.querySelectorAll('.gallery-filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => {
        b.classList.remove('bg-primary', 'text-on-primary');
        b.classList.add('bg-surface-container-highest', 'text-on-surface-variant');
      });

      btn.classList.remove('bg-surface-container-highest', 'text-on-surface-variant');
      btn.classList.add('bg-primary', 'text-on-primary');

      const category = btn.getAttribute('data-category');

      galleryItems.forEach((item) => {
        const itemCategory = item.getAttribute('data-category');
        if (category === 'all' || itemCategory === category) {
          item.style.display = 'block';
          setTimeout(() => { item.style.opacity = '1'; }, 50);
        } else {
          item.style.opacity = '0';
          setTimeout(() => { item.style.display = 'none'; }, 300);
        }
      });
    });
  });
}

async function loadPublicVideos() {
  const container = document.getElementById('public-vlogs-grid') || document.querySelector('#vlogs .grid');
  if (!container) return;

  try {
    const res = await fetch('/api/public/videos');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.success || !data.videos || data.videos.length === 0) return;

    const videos = data.videos;

    // Update filter 'all' button label count
    const allBtn = document.querySelector('.vlog-filter-btn[data-category="all"]');
    if (allBtn) {
      allBtn.textContent = `All (${videos.length})`;
    }

    container.innerHTML = videos.map((v, index) => {
      let colSpan = 'md:col-span-6';
      if (index === 0) colSpan = 'md:col-span-8';
      else if (index === 1) colSpan = 'md:col-span-4';
      else colSpan = 'md:col-span-6';

      const catLower = (v.category || 'Travel').toLowerCase();
      const thumb = v.thumbnail || 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAYtyoRsmC4PQLqNIXgcdOZkyziFtgAP-SirvPjAdOIWogt2tQ50admxNCxrFzixktHDzw03edQIxc168p4Rv7NYbrGorpp-2d2fdb95be9e79830687d2d0d7e65404';
      const isUploaded = v.platform === 'Uploaded' || v.video_url.startsWith('/uploads/');
      const locationTag = v.destination ? v.destination : (v.category + ' Expedition');

      return `
        <div class="${colSpan} vlog-card-item flex flex-col group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all tilt-card cursor-pointer" 
             data-category="${escapeHtml(catLower)}" 
             data-video-id="${escapeHtml(v.id)}" 
             data-video-url="${escapeHtml(v.video_url)}"
             data-video-title="${escapeHtml(v.title)}" 
             data-video-desc="${escapeHtml(v.description || '')}">
          <div class="relative w-full aspect-[16/9] overflow-hidden bg-surface-container-high">
            <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 tilt-card-img" 
                 alt="${escapeHtml(v.title)}" 
                 src="${escapeHtml(thumb)}">
            <div class="absolute top-4 left-4 flex gap-2 z-10">
              <span class="px-2.5 py-1 bg-surface/90 backdrop-blur text-[10px] tracking-[0.2em] uppercase font-medium text-on-surface rounded">${escapeHtml(v.category || 'Travel')}</span>
              <span class="px-2.5 py-1 bg-black/60 text-[10px] tracking-[0.1em] font-mono text-white rounded">${escapeHtml(v.duration || '10:00')}</span>
            </div>
            <div class="absolute inset-0 flex items-center justify-center z-10">
              <div data-video-url="${escapeHtml(v.video_url)}" data-video-id="${escapeHtml(v.id)}" class="play-btn-3d play-btn-trigger w-14 h-14 rounded-full bg-white/90 text-on-surface flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                <span class="material-symbols-outlined text-[28px] translate-x-0.5" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
              </div>
            </div>
          </div>
          <div class="p-6 flex flex-col justify-between flex-1 gap-4">
            <div class="flex items-center justify-between text-[11px] tracking-[0.2em] uppercase text-on-surface-variant font-light">
              <span>${escapeHtml(locationTag)}</span>
              <span class="text-primary font-medium">${isUploaded ? 'Play Video ↗' : 'Play YouTube Video ↗'}</span>
            </div>
            <h3 class="font-headline text-2xl font-light text-on-surface group-hover:text-primary transition-colors">
              ${escapeHtml(v.title)}
            </h3>
            <p class="text-xs text-on-surface-variant font-light line-clamp-2">
              ${escapeHtml(v.description || '')}
            </p>
          </div>
        </div>
      `;
    }).join('');

    if (typeof init3DTiltCards === 'function') {
      init3DTiltCards();
    }
  } catch (err) {
    console.warn('Failed to load public videos from API:', err);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* --------------------------------------------------------------------------
   6. YOUTUBE & UPLOADED VIDEO LIGHTBOX MODAL (UNIVERSAL PLAY LISTENER)
   -------------------------------------------------------------------------- */
function initVideoModal() {
  const modal = document.getElementById('video-modal');
  const iframe = document.getElementById('modal-video-iframe');
  const videoPlayer = document.getElementById('modal-video-player');
  const closeBtn = document.getElementById('close-modal-btn');
  const closeFooterBtn = document.getElementById('close-modal-footer-btn');
  const titleEl = document.getElementById('modal-video-title');
  const descEl = document.getElementById('modal-video-desc');
  const ytLink = document.getElementById('modal-youtube-link');

  if (!modal) return;

  const defaultVideoId = '5D3cZ-6tGkY';

  // Event Delegation for All Video Cards & Triggers Across the Website
  document.addEventListener('click', (e) => {
    const cardOrTrigger = e.target.closest('[data-video-id], [data-video-url], .play-btn-trigger, .vlog-card-item, .tilt-card');
    
    if (!cardOrTrigger) return;

    if (e.target.closest('a') && !e.target.closest('[data-video-id], [data-video-url], .play-btn-trigger')) {
      return;
    }

    const dataHolder = e.target.closest('[data-video-id], [data-video-url]') || cardOrTrigger.querySelector('[data-video-id], [data-video-url]') || cardOrTrigger;

    const rawUrl = dataHolder.getAttribute('data-video-url') || '';
    let videoId = dataHolder.getAttribute('data-video-id');
    
    if (!videoId && rawUrl) {
      videoId = extractYouTubeId(rawUrl);
    }

    let videoTitle = dataHolder.getAttribute('data-video-title') || cardOrTrigger.getAttribute('data-video-title');
    if (!videoTitle) {
      const heading = cardOrTrigger.querySelector('h3, h2, .font-headline');
      videoTitle = heading ? heading.textContent.trim() : 'Veyra Trails Travel Video';
    }

    let videoDesc = dataHolder.getAttribute('data-video-desc') || cardOrTrigger.getAttribute('data-video-desc');
    if (!videoDesc) {
      const paragraph = cardOrTrigger.querySelector('p');
      videoDesc = paragraph ? paragraph.textContent.trim() : 'Explore authentic travel stories, regional gastronomy, and landscapes with Veyra Trails.';
    }

    e.preventDefault();
    e.stopPropagation();

    const ytId = extractYouTubeId(rawUrl) || (videoId && videoId.length === 11 ? videoId : null);
    const isUploadedFile = !ytId && (rawUrl.length > 0 || !videoId);

    if (isUploadedFile && videoPlayer) {
      if (iframe) {
        iframe.src = '';
        iframe.classList.add('hidden');
      }
      videoPlayer.src = rawUrl;
      videoPlayer.classList.remove('hidden');
      videoPlayer.load();
      videoPlayer.play().catch((err) => {
        console.log('Video autoplay deferred by browser policy:', err);
      });
      if (ytLink) {
        ytLink.href = rawUrl;
        const textSpan = ytLink.querySelector('span');
        if (textSpan) textSpan.textContent = 'Open Video File';
      }
    } else {
      const embedId = ytId || defaultVideoId;
      const embedUrl = `https://www.youtube.com/embed/${embedId}?autoplay=1&enablejsapi=1&rel=0`;
      const watchUrl = `https://www.youtube.com/watch?v=${embedId}`;

      if (videoPlayer) {
        videoPlayer.pause();
        videoPlayer.src = '';
        videoPlayer.classList.add('hidden');
      }
      if (iframe) {
        iframe.src = embedUrl;
        iframe.classList.remove('hidden');
      }
      if (ytLink) {
        ytLink.href = watchUrl;
        const textSpan = ytLink.querySelector('span');
        if (textSpan) textSpan.textContent = 'Watch on YouTube';
      }
    }

    if (titleEl) titleEl.textContent = videoTitle;
    if (descEl) descEl.textContent = videoDesc;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  const closeModal = () => {
    modal.classList.remove('active');
    if (iframe) iframe.src = '';
    if (videoPlayer) {
      videoPlayer.pause();
      videoPlayer.src = '';
    }
    document.body.style.overflow = '';
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (closeFooterBtn) closeFooterBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
  });
}

function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:embed\/|v=|vi\/|youtu\.be\/|\/v\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/* --------------------------------------------------------------------------
   7. GALLERY FULLSCREEN LIGHTBOX
   -------------------------------------------------------------------------- */
function initGalleryLightbox() {
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-image');
  const modalCap = document.getElementById('modal-caption');
  const closeBtn = document.getElementById('close-image-modal-btn');
  const galleryImgs = document.querySelectorAll('.gallery-zoom-trigger');

  if (!modal || !modalImg) return;

  galleryImgs.forEach((img) => {
    img.addEventListener('click', (e) => {
      e.preventDefault();
      modalImg.src = img.getAttribute('src');
      modalCap.textContent = img.getAttribute('alt') || 'Veyra Trails Photography';
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  const closeModal = () => {
    modal.classList.remove('active');
    modalImg.src = '';
    document.body.style.overflow = '';
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

/* --------------------------------------------------------------------------
   8. INTERACTIVE DESTINATION EXPLORER
   -------------------------------------------------------------------------- */
const destinationData = {
  kerala: {
    name: 'Kerala',
    title: 'Kerala, India',
    tag: 'Tropical Backwaters & Mist-Veiled Tea Peaks',
    desc: 'Known as God\'s Own Country, Kerala blends lush palm-lined backwaters, coconut groves, and high-altitude cardamom tea estates of Munnar.',
    food: 'Traditional Kerala Sadya, Karimeen Pollichathu, Woodfire Cardamom Chai',
    places: 'Munnar Tea Trails, Alleppey Houseboat Canals, Fort Kochi Spice Streets',
    exp: 'Overnight Houseboat Drift, Sunrise Cloud Inversion Trek, Spice Plantation Walk',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAYtyoRsmC4PQLqNIXgcdOZkyziFtgAP-SirvPjAdOIWogt2tQ50admxNCxrFzixktHDzw03edQIxc168p4Rv7NYbrGorpp-2d2fdb95be9e79830687d2d0d7e65404',
    videoId: '5D3cZ-6tGkY'
  },
  munnar: {
    name: 'Munnar',
    title: 'Munnar, Kerala',
    tag: 'High Altitude Tea Gardens & Mist-Veiled Ridge Peaks',
    desc: 'Nestled 1,600 meters above sea level in the Western Ghats, Munnar features sprawling green tea estates, exotic flora, and crisp mountain mist.',
    food: 'Woodfire Cardamom Chai, Kerala Fish Curry, Hot Parippu Vada, Munnar Fresh Spices',
    places: 'Lockhart Gap Viewpoint, Anamudi Peak, Eravikulam National Park, Mattupetty Dam',
    exp: 'Sunrise Tea Garden Walk, Cloud Inversion Trekking, Spice Plantation Tour',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuC3ktJ0r9ZmiMpAE1kJI_kCDkJIRlIpkwNdw54Hv2qlQazyVfRLsZiYo3DetM3TxYS8EYVEiD5LW-dqIi1FyZT3pntuV6JV-236acde6080bf3f770c98cca77aa020d',
    videoId: 'tCnc7fKwe-E'
  },
  goa: {
    name: 'Goa',
    title: 'Goa, India',
    tag: 'Portuguese Heritage Architecture & Coastal Sunset Trails',
    desc: 'Beyond the golden sands lies Old Goa\'s Latin quarters, vibrant night spice markets, and serene riverine estuaries.',
    food: 'Goan Fish Curry Rice, Pork Vindaloo, Bebinca Dessert',
    places: 'Fontainhas Heritage Quarter, Palolem Cliff Trails, Anjuna Flea Market',
    exp: 'Sunrise Paddleboarding, Colonial House Architectural Tour, Coastal Spice Tasting',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuA6oEBZ-KDnA9Dn3UWuBTH6PgoCxA2ZpWU1tTUdl7GcmuCaX6VLCh7IurnRGygSmWUXU9Flj8R_sCSQDQOyzheJX9t8ZajW-8cbc062d633ca04a5ae2a806a5947184',
    videoId: '3CznVyzPm_M'
  },
  rajasthan: {
    name: 'Rajasthan',
    title: 'Rajasthan, India',
    tag: 'Royal Forts, Desert Dunes & Cultural Heritage',
    desc: 'Journey through majestic hill forts, golden Thar desert dunes, grand palaces, and rich folk music traditions of Jaipur & Udaipur.',
    food: 'Dal Baati Churma, Laal Maas, Ghevar, Ker Sangri',
    places: 'Amber Fort Jaipur, City Palace Udaipur, Jaisalmer Sand Dunes',
    exp: 'Camel Desert Safari, Royal Palace Heritage Stay, Folk Dance Evening',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAshIJrQYd_jr0JyjDXKGNuu2-l3IMjWYz8RxX4Rn_bvK9d4vfW--LASyhU4yqbgsb4RLFL6fpq-Y8uq5WQ0NAGB4AUKdb5-c7bd87b3e0af2573df4614d99552590d',
    videoId: 'w8f2aYk57qU'
  },
  manali: {
    name: 'Manali',
    title: 'Manali, Himachal Pradesh',
    tag: 'Snow-Capped Himalayan Passes & Pine Valleys',
    desc: 'High-altitude Himalayan adventures in Solang Valley, Rohtang Pass, ancient wooden temples, and rushing Beas river trails.',
    food: 'Siddu, Trout Fish, Pahadi Kadhi, Fresh Apple Cider',
    places: 'Solang Valley Snow Point, Hadimba Temple, Old Manali Cafes',
    exp: 'Snow Paragliding, Atal Tunnel Drive, Riverside Camping',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuBMA8WwnX_pezkKJcxpZf1nN02-MUNpa6TqMzrvtasG8VAi0mZxmLgA0hS8tuuU4A-udD2q68-V6RYyjpcKGZaB-3w8rEAl-ddd3c9a6afc05624b9560d9cff5aa526',
    videoId: 'g92X1zO6R5w'
  },
  kashmir: {
    name: 'Kashmir',
    title: 'Kashmir, India',
    tag: 'Heaven on Earth — Dal Lake Shikarabu & Gulmarg Snow',
    desc: 'Serene houseboat stays on misty Dal Lake, snow-covered Gulmarg slopes, pine forests of Pahalgam, and saffron fields.',
    food: 'Kashmiri Wazwan, Rogan Josh, Kahwa Tea, Shufta',
    places: 'Dal Lake Srinagar, Gulmarg Gondola Cable Car, Betaab Valley Pahalgam',
    exp: 'Shikara Sunset Ride, Snow Skiing in Gulmarg, Saffron Harvest Walk',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuC3ktJ0r9ZmiMpAE1kJI_kCDkJIRlIpkwNdw54Hv2qlQazyVfRLsZiYo3DetM3TxYS8EYVEiD5LW-dqIi1FyZT3pntuV6JV-236acde6080bf3f770c98cca77aa020d',
    videoId: 'v64KOxKVLVg'
  },
  mumbai: {
    name: 'Mumbai',
    title: 'Mumbai, India',
    tag: 'The City of Dreams — Heritage Architecture & Iconic Street Food',
    desc: 'Bustling coastal metropolis featuring Colonial landmark architecture, Marine Drive sunsets, and famous street food trails.',
    food: 'Vada Pav, Mumbai Pav Bhaji, Chowpatty Bhel Puri, Irani Chai',
    places: 'Gateway of India, Marine Drive Promenade, Colaba Causeway',
    exp: 'Marine Drive Sunset Stroll, Heritage Art District Walk, Midnight Street Food Crawl',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCQaZah9USED6VtRLFcaESDDe1hhrhwnCe8XJ29ypZ4CsFxDAwGlLTXs1FC50oSjjvqkPuyBR5QFEjR1V6XBnsMjGn5KqVz-0a930619be67565aa64f3dd2a061d204',
    videoId: 'Pz3_O8h5rX4'
  },
  delhi: {
    name: 'Delhi',
    title: 'Delhi, India',
    tag: 'Ancient Monuments & Legendary Chandni Chowk Food Lanes',
    desc: 'Step through centuries of history at Red Fort and Humayun\'s Tomb, and savor legendary centuries-old culinary secret recipes in Old Delhi.',
    food: 'Chandni Chowk Paranthe, Butter Chicken, Chole Bhature, Rabri Jalebi',
    places: 'Red Fort, Qutub Minar, Humayun\'s Tomb, Chandni Chowk Spice Market',
    exp: 'Rickshaw Tour through Old Delhi, Heritage Garden Stroll, Night Food Trail',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAshIJrQYd_jr0JyjDXKGNuu2-l3IMjWYz8RxX4Rn_bvK9d4vfW--LASyhU4yqbgsb4RLFL6fpq-Y8uq5WQ0NAGB4AUKdb5-c7bd87b3e0af2573df4614d99552590d',
    videoId: '0aZ9a-O719A'
  },
  tamilnadu: {
    name: 'Tamil Nadu',
    title: 'Tamil Nadu, India',
    tag: 'Dravidian Temple Towers & Coastal Rock Sculptures',
    desc: 'Explore towering gopurams of Madurai Meenakshi Temple, UNESCO rock carvings of Mahabalipuram, and Chettinad royal cuisine.',
    food: 'Chettinad Pepper Chicken, Filter Coffee, Madurai Jigarthanda, Dosa',
    places: 'Meenakshi Temple Madurai, Shore Temple Mahabalipuram, Nilgiri Mountain Railway',
    exp: 'Sunrise Temple Chanting, Heritage Toy Train Ride in Ooty, Coastal Sculpture Tour',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCQaZah9USED6VtRLFcaESDDe1hhrhwnCe8XJ29ypZ4CsFxDAwGlLTXs1FC50oSjjvqkPuyBR5QFEjR1V6XBnsMjGn5KqVz-0a930619be67565aa64f3dd2a061d204',
    videoId: '76XW55n90w8'
  },
  bali: {
    name: 'Bali',
    title: 'Bali, Indonesia',
    tag: 'Sacred Temples, Emerald Rice Terraces & Coastal Swells',
    desc: 'An island of spiritual tranquility, dramatic volcanic ridges, cascading waterfalls, and world-class organic culinary cafes.',
    food: 'Nasi Goreng, Babi Guling, Fresh Dragonfruit Acai Bowls',
    places: 'Ubud Tegallalang Rice Terraces, Uluwatu Temple Cliffs, Canggu Coastal Trail',
    exp: 'Dawn Volcano Trek at Mount Batur, Waterfall Canyoning, Organic Farm Dining',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuBMA8WwnX_pezkKJcxpZf1nN02-MUNpa6TqMzrvtasG8VAi0mZxmLgA0hS8tuuU4A-udD2q68-V6RYyjpcKGZaB-3w8rEAl-ddd3c9a6afc05624b9560d9cff5aa526',
    videoId: 'lcU3p-6c6R0'
  },
  dubai: {
    name: 'Dubai',
    title: 'Dubai, UAE',
    tag: 'Futuristic Architecture & Golden Desert Dunes',
    desc: 'Where ultra-modern skyscrapers meet quiet Arabian desert dunes, aromatic spice souks, and international fine dining.',
    food: 'Al Machboos, Shawarma, Camel Milk Gelato, Kunafa',
    places: 'Old Dubai Deira Spice Souk, Desert Conservation Reserve, Museum of the Future',
    exp: 'Sunset Desert Safari, Dhow Dinner Cruise, Old Town Culinary Walk',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCXNOPI_dxPjVZx369fnolWt_YodLRcFg5o_XFJgyg9uKdOuzw-dwjcSMiynd6SWcptie-TsHq8US1SSOa2eRfrFGAqjIKS-9227465da0dc969f961ab80219cdad26',
    videoId: 'a7G6J0XvXJg'
  },
  tokyo: {
    name: 'Tokyo',
    title: 'Tokyo, Japan',
    tag: 'Neon Alleyways, Historic Shrines & Master Culinary Artistry',
    desc: 'A mesmerizing metropolis combining centuries-old tea ceremony traditions with high-speed bullet trains and Michelin ramen bars.',
    food: 'Tonkotsu Ramen, Tsukiji Fresh Sushi, Matcha Parfait, Yakitori',
    places: 'Shinjuku Omoide Yokocho Alleys, Senso-ji Temple, Shibuya Crossing',
    exp: 'Late Night Alleyway Food Safari, Traditional Tea Ceremony, Tsukiji Fish Market Dawn Walk',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCQaZah9USED6VtRLFcaESDDe1hhrhwnCe8XJ29ypZ4CsFxDAwGlLTXs1FC50oSjjvqkPuyBR5QFEjR1V6XBnsMjGn5KqVz-0a930619be67565aa64f3dd2a061d204',
    videoId: '406Wv-4a7b0'
  },
  paris: {
    name: 'Paris',
    title: 'Paris, France',
    tag: 'Haussmann Architecture, Seine Riverbank & Artisan Patisseries',
    desc: 'The global capital of art, gastronomy, and romance. Explore cozy corner bistros, world-class museums, and cobbled boulevards.',
    food: 'Fresh Butter Croissants, Escargots, Duck Confit, Artisan Macarons',
    places: 'Montmartre Artists Square, Seine River Promenade, Le Marais Cafes',
    exp: 'Sunset Seine River Walk, Artisan Pastry Workshop, Louvre Midnight View',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuAshIJrQYd_jr0JyjDXKGNuu2-l3IMjWYz8RxX4Rn_bvK9d4vfW--LASyhU4yqbgsb4RLFL6fpq-Y8uq5WQ0NAGB4AUKdb5-c7bd87b3e0af2573df4614d99552590d',
    videoId: 'AQ6GmpMu5C8'
  }
};

function getActiveDestinationData() {
  if (window.VeyraDB) {
    const publishedDests = window.VeyraDB.getPublished('destinations');
    if (publishedDests && publishedDests.length > 0) {
      const map = {};
      publishedDests.forEach(d => {
        map[d.id] = {
          name: d.name,
          title: d.title || `${d.name}, ${d.country || ''}`,
          tag: d.tag || d.shortDesc,
          desc: d.longDesc || d.shortDesc,
          food: d.food || 'Local authentic regional specialties',
          places: d.places || 'Top heritage sights & nature trails',
          exp: d.exp || 'Curated local experiences',
          img: d.heroImage || d.img,
          videoId: d.videoId || extractYouTubeId(d.videoUrl) || '5D3cZ-6tGkY'
        };
      });
      return map;
    }
  }
  return destinationData;
}

function initDestinationExplorer() {
  const destBtns = document.querySelectorAll('.dest-select-btn');
  if (!destBtns.length) return;

  destBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      destBtns.forEach((b) => {
        b.classList.remove('bg-primary', 'text-on-primary', 'font-semibold');
        b.classList.add('bg-surface-container-highest', 'text-on-surface-variant');
      });

      btn.classList.remove('bg-surface-container-highest', 'text-on-surface-variant');
      btn.classList.add('bg-primary', 'text-on-primary', 'font-semibold');

      const activeMap = getActiveDestinationData();
      const key = btn.getAttribute('data-dest');
      const data = activeMap[key] || Object.values(activeMap)[0] || destinationData['kerala'];

      const titleEl = document.getElementById('dest-display-title');
      const tagEl = document.getElementById('dest-display-tag');
      const descEl = document.getElementById('dest-display-desc');
      const foodEl = document.getElementById('dest-display-food');
      const placesEl = document.getElementById('dest-display-places');
      const expEl = document.getElementById('dest-display-exp');
      const imgEl = document.getElementById('dest-display-img');
      const videoBtn = document.getElementById('dest-display-video-btn');
      const imgCard = document.getElementById('dest-display-img-card');

      if (titleEl) titleEl.textContent = data.title;
      if (tagEl) tagEl.textContent = data.tag;
      if (descEl) descEl.textContent = data.desc;
      if (foodEl) foodEl.textContent = data.food;
      if (placesEl) placesEl.textContent = data.places;
      if (expEl) expEl.textContent = data.exp;
      if (imgEl) imgEl.src = data.img;

      if (videoBtn) {
        videoBtn.setAttribute('data-video-id', data.videoId);
        videoBtn.setAttribute('data-video-title', `${data.title} — Destination Film`);
        videoBtn.setAttribute('data-video-desc', data.desc);
      }
      if (imgCard) {
        imgCard.setAttribute('data-video-id', data.videoId);
        imgCard.setAttribute('data-video-title', `${data.title} — Destination Film`);
        imgCard.setAttribute('data-video-desc', data.desc);
      }
    });
  });
}

/* --------------------------------------------------------------------------
   9. REELS LIKE COUNTER INTERACTION
   -------------------------------------------------------------------------- */
function initReelsInteractions() {
  const likeBtns = document.querySelectorAll('.reel-like-btn');
  likeBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const countEl = btn.querySelector('.like-count');
      let count = parseInt(btn.getAttribute('data-likes') || '1200');
      const isLiked = btn.classList.contains('liked');

      if (isLiked) {
        count--;
        btn.classList.remove('liked');
        btn.querySelector('.material-symbols-outlined').style.color = '';
      } else {
        count++;
        btn.classList.add('liked');
        btn.querySelector('.material-symbols-outlined').style.color = '#e53935';
      }

      btn.setAttribute('data-likes', count);
      if (countEl) countEl.textContent = count.toLocaleString();
    });
  });
}

/* --------------------------------------------------------------------------
   10. FORM HANDLERS & TOAST NOTIFICATIONS
   -------------------------------------------------------------------------- */
function initFormHandlers() {
  const forms = document.querySelectorAll('form');
  forms.forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = form.querySelector('input[name="name"], input[placeholder*="Name"], input[type="text"]');
      const emailInput = form.querySelector('input[type="email"]');
      const msgInput = form.querySelector('textarea');
      const subjectInput = form.querySelector('input[name="subject"], input[placeholder*="Subject"]');

      const name = nameInput ? nameInput.value : 'Website Guest';
      const email = emailInput ? emailInput.value : 'visitor@veyratrails.com';
      const subject = subjectInput ? subjectInput.value : 'Public Website Contact Form';
      const message = msgInput ? msgInput.value : 'Inquiry sent from Veyra Trails contact form.';

      if (window.VeyraDB) {
        window.VeyraDB.addMessage({
          name: name,
          email: email,
          subject: subject,
          message: message
        });
      }

      showToast(`Thank you ${name}! Your message was sent to Veyra Trails.`);
      form.reset();
    });
  });
}

function showToast(message) {
  let toast = document.querySelector('.toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span class="material-symbols-outlined text-primary">check_circle</span><span>${message}</span>`;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

/* --------------------------------------------------------------------------
   11. MOBILE DRAWER MENU
   -------------------------------------------------------------------------- */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const drawer = document.getElementById('mobile-menu-drawer');
  const links = drawer ? drawer.querySelectorAll('a') : [];

  if (!toggleBtn || !drawer) return;

  toggleBtn.addEventListener('click', () => {
    drawer.classList.toggle('hidden');
  });

  links.forEach((link) => {
    link.addEventListener('click', () => {
      drawer.classList.add('hidden');
    });
  });
}

/* --------------------------------------------------------------------------
   12. VLOGGER JOURNAL ARTICLES & ARTICLE READER LIGHTBOX
   -------------------------------------------------------------------------- */
function initArticleFilters() {
  const filterBtns = document.querySelectorAll('.article-filter-btn');
  const articleCards = document.querySelectorAll('.article-card-item');

  if (!filterBtns.length) return;

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => {
        b.classList.remove('bg-primary', 'text-on-primary');
        b.classList.add('bg-surface-container-highest', 'text-on-surface-variant');
      });

      btn.classList.remove('bg-surface-container-highest', 'text-on-surface-variant');
      btn.classList.add('bg-primary', 'text-on-primary');

      const category = btn.getAttribute('data-category');

      articleCards.forEach((card) => {
        const cardCategory = card.getAttribute('data-category');
        if (category === 'all' || cardCategory === category) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
          }, 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 300);
        }
      });
    });
  });
}

const articleData = {
  'munnar-fog': {
    title: 'The Art of Slow Travel in Munnar: How 4:30 AM Fog Taught Me Patience',
    category: 'Travel Reflection',
    date: 'Sept 2026',
    readTime: '6 min read',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuC3ktJ0r9ZmiMpAE1kJI_kCDkJIRlIpkwNdw54Hv2qlQazyVfRLsZiYo3DetM3TxYS8EYVEiD5LW-dqIi1FyZT3pntuV6JV-236acde6080bf3f770c98cca77aa020d',
    quote: '"Travel isn\'t about ticking off landmarks on a map—it is about surrendering your schedule to the morning mist."',
    videoId: 'tCnc7fKwe-E',
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
  'kerala-sadya': {
    title: 'Decoding the 24 Dishes of Kerala’s Banana Leaf Sadya',
    category: 'Culinary History',
    date: 'Aug 2026',
    readTime: '8 min read',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCQaZah9USED6VtRLFcaESDDe1hhrhwnCe8XJ29ypZ4CsFxDAwGlLTXs1FC50oSjjvqkPuyBR5QFEjR1V6XBnsMjGn5KqVz-0a930619be67565aa64f3dd2a061d204',
    quote: '"Every curry placement on a banana leaf follows ancient Ayurvedic geometry—sour at the narrow tip, sweet at the center, and savory at the base."',
    videoId: '9NH5EfKGqgQ',
    body: `
      <p class="font-headline text-lg text-amber-200 font-normal leading-relaxed">
        To eat a traditional Sadya is to partake in a living culinary ritual that spans centuries. Served on a vibrant green, freshly cut banana leaf, this plant-based feast brings together up to 28 distinct dishes.
      </p>
      <p>
        The leaf itself is laid with its tapered tip pointing to the left of the diner. Every dish has a precise geometric position ordained by Ayurvedic principles to aid digestion and harmonize the six fundamental tastes (*Shadrasa*).
      </p>
      <h3 class="font-headline text-xl text-white font-light mt-6 mb-2">Symphony of Flavors</h3>
      <p>
        The journey begins with crispy banana chips (*Upperi*) fried in golden unrefined coconut oil, followed by *Sharkara Varatti* (jaggery-coated banana chunks spiced with dried ginger). Next comes *Inji Puli*—a sweet, spicy, and sour ginger-tamarind reduction affectionately called the "100-curry equivalent" for its digestive punch.
      </p>
      <p>
        Rich red Matta rice is served with steaming *Parippu* ghee dal, followed by coconut-laden *Avial*, *Thoran*, and soothing white gourd *Olan*. The meal reaches its crescendo with rich *Ada Pradhaman* (rice pasta boiled in thick coconut milk and jaggery).
      </p>
      <h3 class="font-headline text-xl text-white font-light mt-6 mb-2">The Etiquette of Folding the Leaf</h3>
      <p>
        When you complete your meal, fold the banana leaf top-to-bottom toward yourself. This subtle gesture signals absolute satisfaction and respect to your hosts and cooks.
      </p>
    `
  },
  'tokyo-ramen': {
    title: 'Navigating Tokyo\'s Yokocho Alleys: A Guide to Midnight Ramen Counters',
    category: 'Food Guide',
    date: 'July 2026',
    readTime: '5 min read',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCXNOPI_dxPjVZx369fnolWt_YodLRcFg5o_XFJgyg9uKdOuzw-dwjcSMiynd6SWcptie-TsHq8US1SSOa2eRfrFGAqjIKS-9227465da0dc969f961ab80219cdad26',
    quote: '"Stepping through a red noren curtain into a 6-seat wooden alley counter is the ultimate Tokyo nocturnal ritual."',
    videoId: '406Wv-4a7b0',
    body: `
      <p class="font-headline text-lg text-amber-200 font-normal leading-relaxed">
        Underneath the shadow of Shinjuku\'s modern glass skyscrapers lies Omoide Yokocho ("Memory Lane")—a narrow labyrinth of glowing red paper lanterns, aromatic steam, and charcoal grills.
      </p>
      <p>
        Here, master chefs spent 40+ years perfecting single broth recipes inside counter stalls so intimate your elbows almost touch the customer next to you.
      </p>
      <h3 class="font-headline text-xl text-white font-light mt-6 mb-2">How to Order Like a Local</h3>
      <p>
        1. <strong>Ticket Machine Vending:</strong> Purchase your ramen ticket at the button machine outside before entering. Green buttons denote extra toppings like marinated soft egg (*Ajitsuke Tamago*) or melt-in-mouth *Chashu* pork.<br>
        2. <strong>Noodle Firmness:</strong> When handing your ticket to the chef, request *"Katame"* if you prefer your handcrafted ramen noodles firm and toothsome.<br>
        3. <strong>Slurp Loudly:</strong> Slurping air with your noodles cools the broth and releases volatile aromas. In Japan, it is the highest form of chef compliment!
      </p>
    `
  },
  'dubai-desert': {
    title: 'Desert Solitude: Sunset Camping Beyond Dubai\'s Skyline',
    category: 'Expedition Journal',
    date: 'June 2026',
    readTime: '7 min read',
    img: 'assets/stitch/priyal_editorial_creator_portfolio_stanzza_inspired/assets/AB6AXuCXNOPI_dxPjVZx369fnolWt_YodLRcFg5o_XFJgyg9uKdOuzw-dwjcSMiynd6SWcptie-TsHq8US1SSOa2eRfrFGAqjIKS-9227465da0dc969f961ab80219cdad26',
    quote: '"The desert silence at night in the Arabian dunes makes the buzzing metropolis feel lightyears away."',
    videoId: 'a7G6J0XvXJg',
    body: `
      <p class="font-headline text-lg text-amber-200 font-normal leading-relaxed">
        Driving just 45 minutes past Downtown Dubai\'s Burj Khalifa brings you into a vast expanse of shifting golden dunes where wind ripples shape the landscape continuously.
      </p>
      <p>
        As the sun sets over the horizon, the sand turns from warm amber to deep crimson, and the desert sky transforms into an endless sea of brilliant stars.
      </p>
      <h3 class="font-headline text-xl text-white font-light mt-6 mb-2">Bedouin Hospitality & Gahwa Coffee</h3>
      <p>
        Gathered around a open fire pit, local Bedouin hosts welcome travelers with traditional *Gahwa*—green coffee beans roasted with crushed cardamom and saffron, paired with sweet juicy dates.
      </p>
      <p>
        Sleeping under a blanket of desert stars away from city light pollution reminds us why ancient nomads navigated by the constellations for millennia.
      </p>
    `
  }
};

function initArticleModal() {
  const modal = document.getElementById('article-modal');
  const closeBtn = document.getElementById('close-article-modal-btn');
  const closeFooterBtn = document.getElementById('close-article-footer-btn');
  const titleEl = document.getElementById('modal-article-title');
  const catEl = document.getElementById('modal-article-category');
  const dateEl = document.getElementById('modal-article-date');
  const timeEl = document.getElementById('modal-article-readtime');
  const imgEl = document.getElementById('modal-article-img');
  const bodyEl = document.getElementById('modal-article-body');
  const quoteEl = document.getElementById('modal-article-quote');
  const videoCta = document.getElementById('modal-article-video-cta');

  if (!modal) return;

  // Event Listener for Article Cards
  document.addEventListener('click', (e) => {
    const articleCard = e.target.closest('.article-card-item, [data-article-id]');
    if (!articleCard) return;

    // Ignore clicks if user clicked video play button directly
    if (e.target.closest('[data-video-id], .play-btn-trigger')) return;

    const articleId = articleCard.getAttribute('data-article-id');
    let data = articleData[articleId];

    if (!data && window.VeyraDB) {
      const dbArt = window.VeyraDB.getById('articles', articleId);
      if (dbArt) {
        data = {
          title: dbArt.title,
          category: dbArt.category || 'Travel Essay',
          date: dbArt.date || 'Today',
          readTime: dbArt.read_time || dbArt.readTime || '5 min read',
          img: dbArt.image,
          quote: dbArt.quote || '',
          body: `<p class="font-headline text-lg text-amber-200 font-normal leading-relaxed">${dbArt.description}</p><div class="text-xs text-white/90 leading-relaxed font-light mt-4">${(dbArt.content || '').replace(/\n/g, '<br>')}</div>`
        };
      }
    }

    if (!data) return;

    e.preventDefault();

    if (titleEl) titleEl.textContent = data.title;
    if (catEl) catEl.textContent = data.category;
    if (dateEl) dateEl.textContent = data.date;
    if (timeEl) timeEl.textContent = data.readTime;
    if (imgEl) imgEl.src = data.img;
    if (bodyEl) bodyEl.innerHTML = data.body;
    if (quoteEl) quoteEl.textContent = data.quote;

    if (videoCta) {
      videoCta.setAttribute('data-video-id', data.videoId);
      videoCta.setAttribute('data-video-title', `${data.title} — Travel Film`);
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  // Handle Video CTA click inside article modal
  if (videoCta) {
    videoCta.addEventListener('click', () => {
      const vId = videoCta.getAttribute('data-video-id') || '5D3cZ-6tGkY';
      const vTitle = videoCta.getAttribute('data-video-title') || 'Veyra Trails Travel Vlog';

      // Close article modal
      modal.classList.remove('active');

      // Open video modal
      const videoModal = document.getElementById('video-modal');
      const iframe = document.getElementById('modal-video-iframe');
      const videoTitleEl = document.getElementById('modal-video-title');
      const ytLink = document.getElementById('modal-youtube-link');

      if (videoModal && iframe) {
        iframe.src = `https://www.youtube.com/embed/${vId}?autoplay=1&enablejsapi=1&rel=0`;
        if (videoTitleEl) videoTitleEl.textContent = vTitle;
        if (ytLink) ytLink.href = `https://www.youtube.com/watch?v=${vId}`;
        videoModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  }

  const closeModal = () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (closeFooterBtn) closeFooterBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
  });
}

function initFormHandlers() {
  const form = document.getElementById('public-contact-form');
  const statusMsg = document.getElementById('contact-status-msg');
  const submitBtn = document.getElementById('contact-submit-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('contact-name')?.value?.trim();
    const email = document.getElementById('contact-email')?.value?.trim();
    const phone = document.getElementById('contact-phone')?.value?.trim() || '';
    const subject = document.getElementById('contact-subject')?.value?.trim() || 'General Inquiry';
    const message = document.getElementById('contact-message')?.value?.trim();

    if (!name || !email || !message) {
      if (statusMsg) {
        statusMsg.className = 'text-xs py-3 px-4 rounded-lg font-medium bg-red-900/50 text-red-200 border border-red-500/30';
        statusMsg.textContent = 'Please fill in all required fields (Name, Email, Message).';
        statusMsg.classList.remove('hidden');
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.opacity = '0.7';
      submitBtn.innerHTML = `<span>Sending...</span><span class="material-symbols-outlined text-[16px] animate-spin">sync</span>`;
    }

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (statusMsg) {
          statusMsg.className = 'text-xs py-3 px-4 rounded-lg font-medium bg-emerald-900/60 text-emerald-200 border border-emerald-500/30';
          statusMsg.textContent = result.message || 'Thank you! Your enquiry has been received.';
          statusMsg.classList.remove('hidden');
        }
        form.reset();

        // Save to local VeyraDB fallback too
        if (window.VeyraDB && window.VeyraDB.addEnquiry) {
          window.VeyraDB.addEnquiry({ name, email, phone, subject, message });
        }
      } else {
        throw new Error(result.error || 'Failed to submit enquiry.');
      }
    } catch (err) {
      if (statusMsg) {
        statusMsg.className = 'text-xs py-3 px-4 rounded-lg font-medium bg-amber-900/60 text-amber-200 border border-amber-500/30';
        statusMsg.textContent = err.message || 'Connecting to backend... Saved locally.';
        statusMsg.classList.remove('hidden');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.opacity = '1';
        submitBtn.innerHTML = `<span>Send Message</span><span class="material-symbols-outlined text-[16px]">send</span>`;
      }
    }
  });
}

