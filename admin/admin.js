/* ==========================================================================
   VEYRA TRAILS - PRIVATE OWNER CONTROL CENTER (admin.js)
   Full Functional Controller Connected to SQLite Backend API
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // State Management
  let currentRoute = 'dashboard';
  let activeUser = getStoredUser();

  // DOM Cache
  const loginSection = document.getElementById('admin-login-section');
  const appContainer = document.getElementById('admin-app-shell');
  const sidebarNav = document.getElementById('sidebar-nav');
  const mobileMenuToggle = document.getElementById('admin-mobile-toggle');
  const sidebarEl = document.querySelector('.admin-sidebar');
  const pageTitleEl = document.getElementById('page-title');
  const pageSubtitleEl = document.getElementById('page-subtitle');
  const userDisplayName = document.getElementById('user-display-name');
  const userRoleBadge = document.getElementById('user-role-badge');
  const userAvatar = document.getElementById('user-avatar');

  // Initialization
  initRouter();
  initAuthListeners();
  initGlobalEvents();

  /* --------------------------------------------------------------------------
     1. ROUTING & AUTHENTICATION GUARD
     -------------------------------------------------------------------------- */
  function getStoredUser() {
    try {
      const u = localStorage.getItem('veyra_admin_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  }

  function setStoredUser(user) {
    if (user) {
      localStorage.setItem('veyra_admin_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('veyra_admin_user');
    }
    activeUser = user;
  }

  function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  async function handleRoute() {
    let hash = window.location.hash.replace('#', '') || 'dashboard';
    if (hash === 'login') hash = 'login';

    // Verify session with server if token exists
    if (activeUser && hash !== 'login') {
      try {
        const res = await fetch('/api/admin/me');
        if (!res.ok) {
          setStoredUser(null);
          hash = 'login';
        }
      } catch (err) {
        // Continue with local user state if server connection ok
      }
    }

    if (!activeUser && hash !== 'login') {
      window.location.hash = '#login';
      return;
    }

    if (activeUser && hash === 'login') {
      window.location.hash = '#dashboard';
      return;
    }

    currentRoute = hash;

    if (!activeUser) {
      if (loginSection) loginSection.classList.remove('hidden');
      if (appContainer) appContainer.classList.add('hidden');
      return;
    }

    if (loginSection) loginSection.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');

    // Profile UI Update
    if (userDisplayName) userDisplayName.textContent = activeUser.name;
    if (userRoleBadge) {
      userRoleBadge.textContent = activeUser.role || 'OWNER';
      userRoleBadge.className = `badge-status badge-role-${(activeUser.role || 'owner').toLowerCase()}`;
    }

    // Active Sidebar Highlight
    if (sidebarNav) {
      const navLinks = sidebarNav.querySelectorAll('a[data-route]');
      navLinks.forEach(link => {
        if (link.getAttribute('data-route') === currentRoute) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }

    if (sidebarEl) sidebarEl.classList.remove('open');

    renderPageView(currentRoute);
  }

  function renderPageView(route) {
    const views = document.querySelectorAll('.admin-view');
    views.forEach(v => v.classList.add('hidden'));

    const targetView = document.getElementById(`view-${route}`);
    if (targetView) {
      targetView.classList.remove('hidden');
    } else {
      const dashView = document.getElementById('view-dashboard');
      if (dashView) dashView.classList.remove('hidden');
    }

    const routeTitles = {
      dashboard: { title: 'Veyra Trails Studio', sub: 'Overview of your stories, destinations, videos and enquiries' },
      enquiries: { title: 'Messages & Enquiries', sub: 'Review visitor inquiries and direct messages' },
      messages: { title: 'Messages Inbox', sub: 'Direct contact submissions from website visitors' },
      visitors: { title: 'Website Visitor Analytics', sub: 'Track real-time visitor sessions and top pages' },
      videos: { title: 'Video Management', sub: 'Publish and organize travel film vlogs' },
      destinations: { title: 'Destinations Manager', sub: 'Curate featured travel locations and experience guides' },
      articles: { title: 'Stories & Journal', sub: 'Write and edit travel essays and culinary reflections' },
      gallery: { title: 'Gallery Archive', sub: 'High-resolution travel photography gallery' },
      'contact-info': { title: 'Website Contact Info', sub: 'Configure public email and phone numbers' },
      social: { title: 'Social Media Channels', sub: 'Configure YouTube, Instagram, Twitter, Facebook links' },
      settings: { title: 'Studio Settings & SEO', sub: 'Configure website titles, meta tags, and brand identity' },
      activity: { title: 'Studio Activity Log', sub: 'Comprehensive audit log of system updates' }
    };

    const info = routeTitles[route] || routeTitles['dashboard'];
    if (pageTitleEl) pageTitleEl.textContent = info.title;
    if (pageSubtitleEl) pageSubtitleEl.textContent = info.sub;

    switch (route) {
      case 'dashboard': renderDashboard(); break;
      case 'enquiries': renderEnquiries(); break;
      case 'messages': renderMessages(); break;
      case 'visitors': renderVisitors(); break;
      case 'videos': renderVideos(); break;
      case 'destinations': renderDestinations(); break;
      case 'articles': renderArticles(); break;
      case 'contact-info':
      case 'social':
      case 'settings': renderSettingsForms(); break;
      case 'activity': renderActivityLog(); break;
    }
  }

  /* --------------------------------------------------------------------------
     2. AUTHENTICATION CONTROLLER
     -------------------------------------------------------------------------- */
  function initAuthListeners() {
    const loginForm = document.getElementById('admin-login-form');
    const togglePassBtn = document.getElementById('toggle-password-btn');
    const passInput = document.getElementById('login-password');
    const logoutBtn = document.getElementById('logout-btn');

    if (togglePassBtn && passInput) {
      togglePassBtn.addEventListener('click', () => {
        const type = passInput.type === 'password' ? 'text' : 'password';
        passInput.type = type;
        togglePassBtn.querySelector('.material-symbols-outlined').textContent = type === 'password' ? 'visibility' : 'visibility_off';
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = passInput.value;

        try {
          const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();

          if (res.ok && data.success) {
            setStoredUser(data.user);
            showToast(`Welcome back, ${data.user.name}!`, 'success');
            window.location.hash = '#dashboard';
            handleRoute();
          } else {
            showToast(data.error || 'Invalid credentials', 'error');
          }
        } catch (err) {
          showToast('Failed to connect to backend server.', 'error');
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await fetch('/api/admin/logout', { method: 'POST' });
        } catch (err) {}
        setStoredUser(null);
        showToast('Logged out successfully.', 'info');
        window.location.hash = '#login';
      });
    }
  }

  /* --------------------------------------------------------------------------
     3. DASHBOARD CONTROLLER (SQLITE DATA)
     -------------------------------------------------------------------------- */
  async function renderDashboard() {
    try {
      const res = await fetch('/api/admin/dashboard');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;

      const stats = data.stats;
      setElText('dash-stat-destinations', stats.totalDestinations || 0);
      setElText('dash-stat-videos', stats.totalVideos || 0);
      setElText('dash-stat-articles', stats.totalArticles || 3);
      setElText('dash-stat-messages', stats.totalEnquiries || 0);

      const hour = new Date().getHours();
      let greeting = 'Good Morning';
      if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
      else if (hour >= 17) greeting = 'Good Evening';

      const greetingEl = document.getElementById('dash-greeting');
      if (greetingEl && activeUser) {
        greetingEl.textContent = `${greeting}, ${activeUser.name.split(' ')[0]}`;
      }

      // Recent System Activity List
      const dashActivityList = document.getElementById('dash-recent-activity');
      if (dashActivityList) {
        if (!data.recentActivity || data.recentActivity.length === 0) {
          dashActivityList.innerHTML = `<p class="text-xs text-[#494551] font-light py-4 text-center">No recent activity logged.</p>`;
        } else {
          dashActivityList.innerHTML = data.recentActivity.slice(0, 6).map(act => `
            <div class="flex items-center justify-between p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 hover:border-[#4f378a]/30 transition-all text-xs">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-[#4f378a]/10 border border-[#4f378a]/20 text-[#4f378a] flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[16px]">${getActivityIcon(act.action)}</span>
                </div>
                <div>
                  <p class="font-semibold text-[#1d1b20]">${escapeHtml(act.action)}</p>
                  <p class="text-[#494551] text-[11px] truncate max-w-xs sm:max-w-md">${escapeHtml(act.description)}</p>
                </div>
              </div>
              <span class="text-[10px] text-[#79747e] shrink-0 font-mono">${formatDate(act.created_at)}</span>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }

  /* --------------------------------------------------------------------------
     4. ENQUIRIES CONTROLLER
     -------------------------------------------------------------------------- */
  let currentEnquiries = [];

  async function renderEnquiries() {
    const tableBody = document.getElementById('enquiries-table-body');
    const searchInput = document.getElementById('enquiry-search-input');
    const statusFilter = document.getElementById('enquiry-status-filter');

    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-xs text-[#494551]"><span class="material-symbols-outlined animate-spin align-middle mr-2">sync</span>Loading SQLite enquiries...</td></tr>`;

    try {
      const status = statusFilter ? statusFilter.value : 'All';
      const search = searchInput ? searchInput.value.trim() : '';

      const res = await fetch(`/api/admin/enquiries?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      currentEnquiries = data.enquiries || [];

      if (currentEnquiries.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-xs text-[#79747e]">No enquiries found matching filter criteria.</td></tr>`;
        return;
      }

      tableBody.innerHTML = currentEnquiries.map(item => `
        <tr class="border-b border-black/5 hover:bg-purple-50/40 transition-colors">
          <td class="p-3 font-mono text-[11px] text-[#79747e]">${formatDate(item.created_at)}</td>
          <td class="p-3">
            <div class="font-semibold text-[#1d1b20]">${escapeHtml(item.name)}</div>
            <div class="text-[11px] text-[#4f378a]">${escapeHtml(item.email)}</div>
            ${item.phone ? `<div class="text-[10px] text-[#79747e]">${escapeHtml(item.phone)}</div>` : ''}
          </td>
          <td class="p-3 font-medium text-[#1d1b20]">${escapeHtml(item.subject || 'N/A')}</td>
          <td class="p-3 text-[#494551] max-w-xs truncate">${escapeHtml(item.message)}</td>
          <td class="p-3">
            <span class="badge-status badge-${item.status ? item.status.toLowerCase() : 'new'}">${item.status || 'New'}</span>
          </td>
          <td class="p-3 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="updateEnquiryStatus(${item.id}, 'Read')" class="p-1 text-[#79747e] hover:text-[#4f378a]" title="Mark Read">
                <span class="material-symbols-outlined text-[18px]">mark_email_read</span>
              </button>
              <button onclick="updateEnquiryStatus(${item.id}, 'Contacted')" class="p-1 text-[#79747e] hover:text-emerald-600" title="Mark Contacted">
                <span class="material-symbols-outlined text-[18px]">call</span>
              </button>
              <button onclick="updateEnquiryStatus(${item.id}, 'Resolved')" class="p-1 text-[#79747e] hover:text-purple-600" title="Mark Resolved">
                <span class="material-symbols-outlined text-[18px]">task_alt</span>
              </button>
              <a href="mailto:${item.email}?subject=Re: ${encodeURIComponent(item.subject || 'Veyra Trails Enquiry')}" class="p-1 text-[#79747e] hover:text-[#4f378a]" title="Reply via Email">
                <span class="material-symbols-outlined text-[18px]">reply</span>
              </a>
              <button onclick="deleteEnquiry(${item.id})" class="p-1 text-[#79747e] hover:text-red-600" title="Delete">
                <span class="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      // Filter Event Listeners
      if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = 'true';
        searchInput.addEventListener('input', debounce(renderEnquiries, 300));
      }
      if (statusFilter && !statusFilter.dataset.bound) {
        statusFilter.dataset.bound = 'true';
        statusFilter.addEventListener('change', renderEnquiries);
      }
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-xs text-red-500">Error loading enquiries from database.</td></tr>`;
    }
  }

  window.updateEnquiryStatus = async function(id, status) {
    try {
      const res = await fetch(`/api/admin/enquiries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, 'success');
        renderEnquiries();
        renderDashboard();
      } else {
        showToast(data.error || 'Failed to update enquiry status', 'error');
      }
    } catch (err) {
      showToast('Network error updating enquiry status.', 'error');
    }
  };

  window.deleteEnquiry = function(id) {
    openConfirmModal(
      'Delete Enquiry',
      `Are you sure you want to delete enquiry #${id} from the database? This action cannot be undone.`,
      'Delete',
      async () => {
        try {
          const res = await fetch(`/api/admin/enquiries/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(`Enquiry #${id} deleted`, 'info');
            renderEnquiries();
            renderDashboard();
          } else {
            showToast(data.error || 'Failed to delete enquiry', 'error');
          }
        } catch (err) {
          showToast('Error deleting enquiry.', 'error');
        }
      }
    );
  };

  /* --------------------------------------------------------------------------
     5. CONTACT MESSAGES CONTROLLER
     -------------------------------------------------------------------------- */
  async function renderMessages() {
    const listContainer = document.getElementById('messages-list-container');
    const detailContainer = document.getElementById('message-detail-container');
    if (!listContainer || !detailContainer) return;

    try {
      const res = await fetch('/api/admin/messages');
      const data = await res.json();

      if (!data.success || !data.messages || data.messages.length === 0) {
        listContainer.innerHTML = `<p class="p-6 text-xs text-[#79747e] text-center">No contact messages received yet.</p>`;
        detailContainer.innerHTML = `<div class="p-10 text-center text-xs text-[#79747e]">Select a message to view full text.</div>`;
        return;
      }

      const messages = data.messages;
      listContainer.innerHTML = messages.map((m, idx) => `
        <div onclick="selectMessage(${m.id})" class="p-4 border-b border-black/5 hover:bg-purple-50/50 cursor-pointer transition-colors ${idx === 0 ? 'bg-purple-50/70 border-l-4 border-[#4f378a]' : ''}">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-bold text-[#1d1b20]">${escapeHtml(m.name)}</span>
            <span class="text-[10px] text-[#79747e]">${formatDate(m.created_at)}</span>
          </div>
          <p class="text-xs font-medium text-[#4f378a] truncate">${escapeHtml(m.subject || 'Message')}</p>
          <p class="text-[11px] text-[#494551] line-clamp-2 mt-1">${escapeHtml(m.message)}</p>
        </div>
      `).join('');

      // Auto select first message
      selectMessage(messages[0].id, messages);
    } catch (err) {
      listContainer.innerHTML = `<p class="p-6 text-xs text-red-500 text-center">Failed to load messages.</p>`;
    }
  }

  window.selectMessage = async function(id, messagesList) {
    const detailContainer = document.getElementById('message-detail-container');
    if (!detailContainer) return;

    let message;
    if (messagesList) {
      message = messagesList.find(m => m.id === id);
    } else {
      const res = await fetch('/api/admin/messages');
      const data = await res.json();
      message = (data.messages || []).find(m => m.id === id);
    }

    if (!message) return;

    detailContainer.innerHTML = `
      <div class="p-6 sm:p-8 space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
          <div>
            <span class="badge-status badge-${(message.status || 'new').toLowerCase()}">${message.status || 'New'}</span>
            <h2 class="text-xl font-bold text-[#1d1b20] font-headline mt-2">${escapeHtml(message.subject || 'General Inquiry')}</h2>
            <p class="text-xs text-[#79747e]">Received on ${formatDate(message.created_at)}</p>
          </div>
          <div class="flex items-center gap-2">
            <a href="mailto:${message.email}?subject=Re: ${encodeURIComponent(message.subject || 'Veyra Trails')}" class="btn-primary text-xs">
              <span class="material-symbols-outlined text-[16px]">reply</span>
              <span>Reply Email</span>
            </a>
            <button onclick="deleteMessage(${message.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-xl" title="Delete">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-black/10 space-y-3 text-xs">
          <div><strong class="text-[#1d1b20]">Sender Name:</strong> <span class="text-[#494551]">${escapeHtml(message.name)}</span></div>
          <div><strong class="text-[#1d1b20]">Email Address:</strong> <a href="mailto:${message.email}" class="text-[#4f378a] hover:underline">${escapeHtml(message.email)}</a></div>
          ${message.phone ? `<div><strong class="text-[#1d1b20]">Phone:</strong> <a href="tel:${message.phone}" class="text-[#494551]">${escapeHtml(message.phone)}</a></div>` : ''}
        </div>

        <div class="bg-white p-6 rounded-2xl border border-black/10 space-y-2">
          <h4 class="text-xs font-bold text-[#1d1b20] uppercase tracking-wider">Message Content</h4>
          <p class="text-xs text-[#1d1b20] leading-relaxed whitespace-pre-line font-light">${escapeHtml(message.message)}</p>
        </div>
      </div>
    `;
  };

  window.deleteMessage = function(id) {
    openConfirmModal(
      'Delete Message',
      `Delete message #${id}?`,
      'Delete',
      async () => {
        try {
          const res = await fetch(`/api/admin/messages/${id}`, { method: 'DELETE' });
          if (res.ok) {
            showToast('Message deleted', 'info');
            renderMessages();
          }
        } catch (err) {}
      }
    );
  };

  /* --------------------------------------------------------------------------
     6. VISITORS CONTROLLER
     -------------------------------------------------------------------------- */
  async function renderVisitors() {
    try {
      const res = await fetch('/api/admin/visitors');
      const data = await res.json();

      if (!data.success) return;

      setElText('visitor-stat-unique', data.stats.totalVisitors || 0);
      setElText('visitor-stat-views', data.stats.totalPageviews || 0);

      const tableBody = document.getElementById('visitors-table-body');
      if (tableBody) {
        if (!data.recentVisitors || data.recentVisitors.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-xs text-[#79747e]">No visitor sessions logged yet.</td></tr>`;
        } else {
          tableBody.innerHTML = data.recentVisitors.map(v => `
            <tr class="border-b border-black/5 text-xs hover:bg-purple-50/40">
              <td class="p-2.5 font-mono text-[11px] text-[#79747e]">${formatDate(v.visited_at)}</td>
              <td class="p-2.5 font-mono text-[11px] text-[#4f378a] truncate max-w-[120px]">${v.session_id}</td>
              <td class="p-2.5 font-medium text-[#1d1b20]">${escapeHtml(v.page_visited)}</td>
              <td class="p-2.5 font-mono text-[11px] text-[#79747e]">${v.ip_address || '127.0.0.1'}</td>
            </tr>
          `).join('');
        }
      }

      const topPagesList = document.getElementById('top-pages-list');
      if (topPagesList) {
        if (!data.topPages || data.topPages.length === 0) {
          topPagesList.innerHTML = `<p class="text-xs text-[#79747e]">No pageview data.</p>`;
        } else {
          topPagesList.innerHTML = data.topPages.map(p => `
            <div class="flex items-center justify-between p-3 bg-purple-50/50 rounded-xl border border-purple-100">
              <span class="font-medium text-[#1d1b20] truncate max-w-[180px]">${escapeHtml(p.page_visited)}</span>
              <span class="badge-status badge-success">${p.views} views</span>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Visitors error:', err);
    }
  }

  /* --------------------------------------------------------------------------
     7. VIDEO CRUD CONTROLLER
     -------------------------------------------------------------------------- */
  let currentVideos = [];

  async function renderVideos() {
    const container = document.getElementById('videos-list-container');
    const searchInput = document.getElementById('video-search-input');
    const catFilter = document.getElementById('video-cat-filter');

    if (!container) return;

    try {
      const res = await fetch('/api/admin/videos');
      const data = await res.json();

      if (!data.success) return;
      currentVideos = data.videos || [];

      const q = searchInput ? searchInput.value.toLowerCase() : '';
      const cat = catFilter ? catFilter.value : 'all';

      const filtered = currentVideos.filter(v => {
        const matchesQ = v.title.toLowerCase().includes(q) || (v.destination && v.destination.toLowerCase().includes(q));
        const matchesCat = cat === 'all' || v.category.toLowerCase() === cat.toLowerCase();
        return matchesQ && matchesCat;
      });

      if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full p-12 text-center text-xs text-[#79747e] bg-white rounded-3xl border border-black/10">No videos found matching your filters.</div>`;
        return;
      }

      container.innerHTML = filtered.map(v => `
        <div class="admin-glass rounded-2xl overflow-hidden bg-white flex flex-col justify-between border border-black/10 hover:border-[#4f378a]/40 transition-all">
          <div>
            <div class="relative aspect-video bg-black overflow-hidden group cursor-pointer" onclick="previewVideo('${v.id}')" title="Click to Preview Video">
              <img src="${v.thumbnail}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="${escapeHtml(v.title)}">
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <div class="w-12 h-12 rounded-full bg-white/90 text-[#4f378a] flex items-center justify-center shadow-lg">
                  <span class="material-symbols-outlined text-[28px] translate-x-0.5" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
                </div>
              </div>
              <span class="absolute top-3 left-3 px-2.5 py-1 bg-black/75 backdrop-blur text-white text-[10px] uppercase font-semibold rounded">${escapeHtml(v.category)}</span>
              <span class="absolute bottom-3 right-3 px-2 py-0.5 bg-black/80 text-white text-[10px] font-mono rounded">${v.duration || '12:00'}</span>
            </div>
            <div class="p-5 space-y-2">
              <h3 class="text-sm font-bold text-[#1d1b20] line-clamp-2 leading-snug cursor-pointer hover:text-[#4f378a]" onclick="previewVideo('${v.id}')">${escapeHtml(v.title)}</h3>
              <p class="text-xs text-[#494551] font-light line-clamp-2">${escapeHtml(v.description)}</p>
              ${v.destination ? `<span class="text-[10px] text-[#4f378a] font-medium block">📍 ${escapeHtml(v.destination)}</span>` : ''}
            </div>
          </div>
          <div class="p-4 bg-purple-50/50 border-t border-black/5 flex items-center justify-between">
            <span class="badge-status badge-${v.status === 'active' ? 'published' : 'draft'}">${v.status === 'active' ? 'Active' : 'Draft'}</span>
            <div class="flex items-center gap-1.5">
              <button onclick="previewVideo('${v.id}')" class="p-1.5 text-[#4f378a] hover:bg-purple-100 rounded-lg flex items-center gap-1 text-[11px] font-medium" title="Preview Play Video">
                <span class="material-symbols-outlined text-[18px]">play_circle</span>
                <span>Play</span>
              </button>
              <button onclick="editVideo('${v.id}')" class="p-1.5 text-[#4f378a] hover:bg-purple-100 rounded-lg" title="Edit">
                <span class="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button onclick="deleteVideo('${v.id}')" class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                <span class="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        </div>
      `).join('');

      // Add Video Modal Trigger
      const addBtn = document.getElementById('add-video-btn');
      if (addBtn && !addBtn.dataset.bound) {
        addBtn.dataset.bound = 'true';
        addBtn.addEventListener('click', () => openVideoModal());
      }
    } catch (err) {
      container.innerHTML = `<div class="col-span-full p-8 text-center text-xs text-red-500">Failed to load videos.</div>`;
    }
  }

  function openVideoModal(video = null) {
    const modal = document.getElementById('video-form-modal');
    if (!modal) return;

    const titleEl = document.getElementById('video-form-title');
    if (titleEl) titleEl.textContent = video ? 'Edit Travel Vlog' : 'Add Travel Vlog';

    document.getElementById('video-id-input').value = video ? video.id : '';
    document.getElementById('video-title-input').value = video ? video.title : '';
    document.getElementById('video-yt-input').value = video ? video.video_url : '';
    document.getElementById('video-cat-input').value = video ? video.category : 'Travel';
    document.getElementById('video-duration-input').value = video ? video.duration : '12:00';
    document.getElementById('video-location-input').value = video ? video.destination : '';
    document.getElementById('video-thumb-input').value = video ? video.thumbnail : '';
    document.getElementById('video-desc-input').value = video ? video.description : '';
    document.getElementById('video-published-input').checked = video ? video.status === 'active' : true;

    const videoFileInput = document.getElementById('video-file-input');
    const thumbFileInput = document.getElementById('video-thumb-file-input');
    if (videoFileInput) videoFileInput.value = '';
    if (thumbFileInput) thumbFileInput.value = '';

    modal.classList.add('active');
  }

  const videoForm = document.getElementById('video-modal-form');
  if (videoForm) {
    videoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('save-video-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[16px] align-middle mr-1">sync</span>Saving...`;
      }

      const id = document.getElementById('video-id-input').value;
      const title = document.getElementById('video-title-input').value.trim();
      let video_url = document.getElementById('video-yt-input').value.trim();
      const category = document.getElementById('video-cat-input').value;
      const duration = document.getElementById('video-duration-input').value.trim();
      const destination = document.getElementById('video-location-input').value.trim();
      let thumbnail = document.getElementById('video-thumb-input').value.trim();
      const description = document.getElementById('video-desc-input').value.trim();
      const status = document.getElementById('video-published-input').checked ? 'active' : 'draft';
      const featured = document.getElementById('video-featured-input') ? document.getElementById('video-featured-input').checked : false;

      const videoFileInput = document.getElementById('video-file-input');
      const thumbFileInput = document.getElementById('video-thumb-file-input');

      try {
        // Step 1: Upload video file or thumbnail image if selected
        if ((videoFileInput && videoFileInput.files.length > 0) || (thumbFileInput && thumbFileInput.files.length > 0)) {
          showToast('Uploading media file(s)...', 'info');
          const formData = new FormData();
          if (videoFileInput && videoFileInput.files.length > 0) {
            formData.append('video_file', videoFileInput.files[0]);
          }
          if (thumbFileInput && thumbFileInput.files.length > 0) {
            formData.append('thumbnail_file', thumbFileInput.files[0]);
          }

          const uploadRes = await fetch('/api/admin/upload', {
            method: 'POST',
            body: formData
          });
          const uploadData = await uploadRes.json();
          if (uploadRes.ok && uploadData.success) {
            if (uploadData.video_url) video_url = uploadData.video_url;
            if (uploadData.thumbnail) thumbnail = uploadData.thumbnail;
          } else {
            showToast(uploadData.error || 'Media file upload failed.', 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Video'; }
            return;
          }
        }

        if (!video_url) {
          showToast('Please select a video file to upload or enter a YouTube URL.', 'error');
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Video'; }
          return;
        }

        // Step 2: Save Video Record to Database
        const payload = { title, video_url, category, duration, destination, thumbnail, description, status, featured };

        let res;
        if (id) {
          res = await fetch(`/api/admin/videos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          res = await fetch('/api/admin/videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }

        const data = await res.json();
        if (res.ok && data.success) {
          showToast(id ? 'Video updated successfully!' : 'Video uploaded & published to website!', 'success');
          document.getElementById('video-form-modal').classList.remove('active');
          renderVideos();
          renderDashboard();
        } else {
          showToast(data.error || 'Failed to save video', 'error');
        }
      } catch (err) {
        console.error('Error saving video:', err);
        showToast('Server error saving video.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save Video';
        }
      }
    });
  }

  window.previewVideo = function(id) {
    const v = currentVideos.find(item => item.id === id);
    if (!v) return;

    const modal = document.getElementById('admin-video-modal');
    const iframe = document.getElementById('admin-video-iframe');
    const player = document.getElementById('admin-video-player');
    const titleEl = document.getElementById('admin-video-preview-title');
    const closeBtn = document.getElementById('close-admin-video-btn');

    if (!modal) return;

    if (titleEl) titleEl.textContent = `Preview: ${v.title}`;

    const rawUrl = v.video_url || '';
    const isUploaded = v.platform === 'Uploaded' || rawUrl.startsWith('/uploads/') || rawUrl.match(/\.(mp4|webm|mov|mkv)(\?.*)?$/i);

    if (isUploaded && player) {
      if (iframe) {
        iframe.src = '';
        iframe.classList.add('hidden');
      }
      player.src = rawUrl;
      player.classList.remove('hidden');
      player.load();
      player.play().catch(e => console.log('Autoplay deferred:', e));
    } else {
      let ytId = null;
      const match = rawUrl.match(/(?:embed\/|v=|vi\/|youtu\.be\/|\/v\/|shorts\/)([a-zA-Z0-9_-]{11})/);
      if (match) ytId = match[1];

      if (player) {
        player.pause();
        player.src = '';
        player.classList.add('hidden');
      }
      if (iframe) {
        iframe.src = ytId ? `https://www.youtube.com/embed/${ytId}?autoplay=1` : rawUrl;
        iframe.classList.remove('hidden');
      }
    }

    modal.classList.add('active');

    const closeModal = () => {
      modal.classList.remove('active');
      if (iframe) iframe.src = '';
      if (player) {
        player.pause();
        player.src = '';
      }
    };

    if (closeBtn) closeBtn.onclick = closeModal;
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  };

  window.editVideo = function(id) {
    const v = currentVideos.find(item => item.id === id);
    if (v) openVideoModal(v);
  };

  window.deleteVideo = function(id) {
    openConfirmModal('Delete Video', `Delete video ${id}?`, 'Delete', async () => {
      try {
        const res = await fetch(`/api/admin/videos/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Video deleted', 'info');
          renderVideos();
          renderDashboard();
        }
      } catch (err) {}
    });
  };

  /* --------------------------------------------------------------------------
     8. DESTINATION CRUD CONTROLLER
     -------------------------------------------------------------------------- */
  let currentDestinations = [];

  async function renderDestinations() {
    const container = document.getElementById('destinations-list-container');
    if (!container) return;

    try {
      const res = await fetch('/api/admin/destinations');
      const data = await res.json();
      if (!data.success) return;

      currentDestinations = data.destinations || [];

      if (currentDestinations.length === 0) {
        container.innerHTML = `<div class="col-span-full p-12 text-center text-xs text-[#79747e] bg-white rounded-3xl border border-black/10">No destinations found in database.</div>`;
        return;
      }

      container.innerHTML = currentDestinations.map(d => `
        <div class="admin-glass rounded-2xl overflow-hidden bg-white flex flex-col justify-between border border-black/10 hover:border-[#4f378a]/40 transition-all">
          <div>
            <div class="relative aspect-[16/10] overflow-hidden bg-black group">
              <img src="${d.image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="${escapeHtml(d.name)}">
              <span class="absolute top-3 left-3 px-2.5 py-1 bg-black/75 backdrop-blur text-white text-[10px] uppercase font-semibold rounded">${escapeHtml(d.name)}</span>
            </div>
            <div class="p-5 space-y-2">
              <h3 class="text-base font-bold text-[#1d1b20] leading-snug">${escapeHtml(d.name)}</h3>
              <p class="text-xs text-[#494551] font-light line-clamp-2">${escapeHtml(d.description)}</p>
              ${d.food ? `<p class="text-[11px] text-[#765b00]">🍽 <strong>Food:</strong> ${escapeHtml(d.food)}</p>` : ''}
              ${d.places ? `<p class="text-[11px] text-[#4f378a]">📍 <strong>Places:</strong> ${escapeHtml(d.places)}</p>` : ''}
            </div>
          </div>
          <div class="p-4 bg-purple-50/50 border-t border-black/5 flex items-center justify-between">
            <span class="badge-status badge-${d.status === 'active' ? 'published' : 'draft'}">${d.status === 'active' ? 'Active' : 'Draft'}</span>
            <div class="flex items-center gap-2">
              <button onclick="editDestination('${d.id}')" class="p-1.5 text-[#4f378a] hover:bg-purple-100 rounded-lg" title="Edit">
                <span class="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button onclick="deleteDestination('${d.id}')" class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                <span class="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        </div>
      `).join('');

      const addBtn = document.getElementById('add-dest-btn');
      if (addBtn && !addBtn.dataset.bound) {
        addBtn.dataset.bound = 'true';
        addBtn.addEventListener('click', () => openDestModal());
      }
    } catch (err) {
      container.innerHTML = `<div class="col-span-full p-8 text-center text-xs text-red-500">Failed to load destinations.</div>`;
    }
  }

  function openDestModal(dest = null) {
    const modal = document.getElementById('dest-form-modal');
    if (!modal) return;

    document.getElementById('dest-id-input').value = dest ? dest.id : '';
    document.getElementById('dest-name-input').value = dest ? dest.name : '';
    document.getElementById('dest-country-input').value = dest ? (dest.tag || '') : '';
    document.getElementById('dest-shortdesc-input').value = dest ? dest.description : '';
    document.getElementById('dest-longdesc-input').value = dest ? dest.description : '';
    document.getElementById('dest-heroimg-input').value = dest ? dest.image : '';
    document.getElementById('dest-food-input').value = dest ? dest.food : '';
    document.getElementById('dest-places-input').value = dest ? dest.places : '';
    document.getElementById('dest-exp-input').value = dest ? dest.experiences : '';
    document.getElementById('dest-videourl-input').value = dest ? dest.video_url : '';
    document.getElementById('dest-published-input').checked = dest ? dest.status === 'active' : true;

    modal.classList.add('active');
  }

  const destForm = document.getElementById('dest-modal-form');
  if (destForm) {
    destForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('dest-id-input').value;
      const name = document.getElementById('dest-name-input').value.trim();
      const tag = document.getElementById('dest-country-input').value.trim();
      const description = document.getElementById('dest-longdesc-input').value.trim() || document.getElementById('dest-shortdesc-input').value.trim();
      const image = document.getElementById('dest-heroimg-input').value.trim();
      const food = document.getElementById('dest-food-input').value.trim();
      const places = document.getElementById('dest-places-input').value.trim();
      const experiences = document.getElementById('dest-exp-input').value.trim();
      const video_url = document.getElementById('dest-videourl-input').value.trim();
      const status = document.getElementById('dest-published-input').checked ? 'active' : 'draft';

      const payload = { id, name, tag, description, image, food, places, experiences, video_url, status };

      try {
        let res;
        if (id) {
          res = await fetch(`/api/admin/destinations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          res = await fetch('/api/admin/destinations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(id ? 'Destination updated' : 'Destination added', 'success');
          document.getElementById('dest-form-modal').classList.remove('active');
          renderDestinations();
          renderDashboard();
        } else {
          showToast(data.error || 'Failed to save destination', 'error');
        }
      } catch (err) {
        showToast('Error saving destination.', 'error');
      }
    });
  }

  window.editDestination = function(id) {
    const d = currentDestinations.find(item => item.id === id);
    if (d) openDestModal(d);
  };

  window.deleteDestination = function(id) {
    openConfirmModal('Delete Destination', `Delete destination ${id}?`, 'Delete', async () => {
      try {
        const res = await fetch(`/api/admin/destinations/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Destination deleted', 'info');
          renderDestinations();
          renderDashboard();
        }
      } catch (err) {}
    });
  };

  /* --------------------------------------------------------------------------
     8.5 ARTICLES / BLOG CRUD CONTROLLER
     -------------------------------------------------------------------------- */
  let currentArticles = [];

  async function renderArticles() {
    const container = document.getElementById('articles-list-container');
    if (!container) return;

    try {
      const res = await fetch('/api/admin/articles');
      const data = await res.json();
      if (!data.success) return;

      currentArticles = data.articles || [];

      if (currentArticles.length === 0) {
        container.innerHTML = `<div class="p-12 text-center text-xs text-[#79747e] bg-white rounded-3xl border border-black/10">No blog posts found in database.</div>`;
        return;
      }

      container.innerHTML = currentArticles.map(a => `
        <div class="admin-glass p-5 rounded-2xl bg-white border border-black/10 hover:border-[#4f378a]/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <img src="${a.image}" class="w-16 h-16 rounded-xl object-cover shrink-0 border border-black/10" alt="${escapeHtml(a.title)}">
            <div>
              <span class="text-[10px] uppercase font-bold text-[#765b00]">${escapeHtml(a.category || 'Travel Essay')} • ${escapeHtml(a.date || 'Sept 2026')}</span>
              <h4 class="text-sm font-bold text-[#1d1b20] leading-tight mt-0.5">${escapeHtml(a.title)}</h4>
              <p class="text-xs text-[#494551] font-light line-clamp-1 mt-1">${escapeHtml(a.description)}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            <span class="badge-status badge-${a.status === 'published' ? 'published' : 'draft'}">${a.status === 'published' ? 'Published' : 'Draft'}</span>
            <button onclick="editArticle('${a.id}')" class="p-1.5 text-[#4f378a] hover:bg-purple-100 rounded-lg" title="Edit">
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button onclick="deleteArticle('${a.id}')" class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="p-8 text-center text-xs text-red-500">Failed to load articles.</div>`;
    }
  }

  window.editArticle = function(id) {
    const a = currentArticles.find(item => item.id === id);
    if (!a) return;
    const title = prompt('Edit Article Title:', a.title);
    if (title === null) return;
    const desc = prompt('Edit Description:', a.description);
    if (desc === null) return;

    fetch(`/api/admin/articles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...a, title, description: desc })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        showToast('Blog post updated', 'success');
        renderArticles();
      }
    });
  };

  window.deleteArticle = function(id) {
    openConfirmModal('Delete Article', `Delete blog post ${id}?`, 'Delete', async () => {
      try {
        const res = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Blog post deleted', 'info');
          renderArticles();
        }
      } catch (err) {}
    });
  };

  /* --------------------------------------------------------------------------
     9. SETTINGS & CONTACT FORMS CONTROLLER
     -------------------------------------------------------------------------- */
  async function renderSettingsForms() {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (!data.success || !data.settings) return;

      const s = data.settings;

      // Contact Info Form
      const infoEmail = document.getElementById('info-email');
      const infoPhone = document.getElementById('info-phone');
      if (infoEmail) infoEmail.value = s.contactEmail || '';
      if (infoPhone) infoPhone.value = s.contactPhone || '';

      // Social Handles Form
      const socYt = document.getElementById('soc-yt');
      const socIg = document.getElementById('soc-ig');
      const socTw = document.getElementById('soc-tw');
      const socFb = document.getElementById('soc-fb');
      if (socYt) socYt.value = s.youtubeUrl || '';
      if (socIg) socIg.value = s.instagramUrl || '';
      if (socTw) socTw.value = s.twitterUrl || '';
      if (socFb) socFb.value = s.facebookUrl || '';

      // General Site Settings
      const setName = document.getElementById('set-name');
      const setSeoTitle = document.getElementById('set-seo-title');
      const setSeoDesc = document.getElementById('set-seo-desc');
      if (setName) setName.value = s.websiteName || 'Veyra Trails';
      if (setSeoTitle) setSeoTitle.value = s.seoTitle || '';
      if (setSeoDesc) setSeoDesc.value = s.seoMetaDescription || '';
    } catch (err) {}
  }

  async function saveSettingsPayload(payload, successMsg) {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(successMsg || 'Settings saved to SQLite', 'success');
      } else {
        showToast(data.error || 'Failed to save settings', 'error');
      }
    } catch (err) {
      showToast('Network error saving settings.', 'error');
    }
  }

  const contactInfoForm = document.getElementById('contact-info-form');
  if (contactInfoForm) {
    contactInfoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveSettingsPayload({
        contactEmail: document.getElementById('info-email').value.trim(),
        contactPhone: document.getElementById('info-phone').value.trim()
      }, 'Contact info updated');
    });
  }

  const socialForm = document.getElementById('social-form');
  if (socialForm) {
    socialForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveSettingsPayload({
        youtubeUrl: document.getElementById('soc-yt').value.trim(),
        instagramUrl: document.getElementById('soc-ig').value.trim(),
        twitterUrl: document.getElementById('soc-tw').value.trim(),
        facebookUrl: document.getElementById('soc-fb').value.trim()
      }, 'Social media links updated');
    });
  }

  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveSettingsPayload({
        websiteName: document.getElementById('set-name').value.trim(),
        seoTitle: document.getElementById('set-seo-title').value.trim(),
        seoMetaDescription: document.getElementById('set-seo-desc').value.trim()
      }, 'Site & SEO configuration updated');
    });
  }

  /* --------------------------------------------------------------------------
     10. ACTIVITY LOG CONTROLLER
     -------------------------------------------------------------------------- */
  async function renderActivityLog() {
    const tableBody = document.getElementById('logs-table-body');
    if (!tableBody) return;

    try {
      const res = await fetch('/api/admin/activity');
      const data = await res.json();

      if (!data.success || !data.activities || data.activities.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-xs text-[#79747e]">No system activity logs found.</td></tr>`;
        return;
      }

      tableBody.innerHTML = data.activities.map(act => `
        <tr class="border-b border-black/5 text-xs hover:bg-purple-50/40">
          <td class="p-3 font-mono text-[11px] text-[#79747e]">${formatDate(act.created_at)}</td>
          <td class="p-3 font-semibold text-[#1d1b20]">${escapeHtml(act.entity || 'Admin')}</td>
          <td class="p-3"><span class="badge-status badge-[#4f378a] font-mono text-[10px]">${escapeHtml(act.action)}</span></td>
          <td class="p-3 text-[#494551] max-w-md truncate">${escapeHtml(act.description)}</td>
          <td class="p-3"><span class="badge-status badge-success">Success</span></td>
        </tr>
      `).join('');
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-xs text-red-500">Failed to load activity logs.</td></tr>`;
    }
  }

  /* --------------------------------------------------------------------------
     11. GLOBAL UTILITY & MODAL HELPERS
     -------------------------------------------------------------------------- */
  function initGlobalEvents() {
    if (mobileMenuToggle && sidebarEl) {
      mobileMenuToggle.addEventListener('click', () => {
        sidebarEl.classList.toggle('open');
      });
    }

    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    if (confirmCancelBtn) {
      confirmCancelBtn.addEventListener('click', () => {
        const modal = document.getElementById('confirm-modal');
        if (modal) modal.classList.remove('active');
      });
    }
  }

  function openConfirmModal(title, message, confirmText, callback) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const actionBtn = document.getElementById('confirm-action-btn');

    if (!modal) return;

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (actionBtn) {
      actionBtn.textContent = confirmText || 'Confirm';
      actionBtn.onclick = () => {
        modal.classList.remove('active');
        if (callback) callback();
      };
    }

    modal.classList.add('active');
  }

  function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colors = {
      success: 'bg-emerald-900 text-emerald-100 border-emerald-500/40',
      error: 'bg-red-900 text-red-100 border-red-500/40',
      info: 'bg-purple-900 text-purple-100 border-purple-500/40'
    };

    toast.className = `px-4 py-3 rounded-xl text-xs font-medium border shadow-xl flex items-center gap-2 pointer-events-auto transition-all duration-300 transform translate-y-2 opacity-0 ${colors[type] || colors.info}`;
    toast.innerHTML = `
      <span class="material-symbols-outlined text-[18px]">
        ${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}
      </span>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function setElText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
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

  function formatDate(dStr) {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dStr;
    }
  }

  function getActivityIcon(action) {
    if (!action) return 'edit_note';
    if (action.includes('LOGIN')) return 'key';
    if (action.includes('ENQUIRY')) return 'mail';
    if (action.includes('VIDEO')) return 'movie';
    if (action.includes('DESTINATION')) return 'location_on';
    if (action.includes('SETTINGS')) return 'settings';
    return 'edit_note';
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
});
