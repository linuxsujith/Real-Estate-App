// ============================================
// EstateVue - Premium Real Estate PWA
// ============================================

const API = '';

// ---- STATE ----
const state = {
  currentPage: 'home',
  properties: [],
  featured: [],
  total: 0,
  page: 1,
  loading: false,
  filters: { search: '', type: '', minPrice: '', maxPrice: '', minSqft: '', maxSqft: '', bedrooms: '', sort: 'newest' },
  wishlist: JSON.parse(localStorage.getItem('wishlist') || '[]'),
  theme: localStorage.getItem('theme') || 'light',
  selectedProperty: null,
  showContact: false,
  showFilter: false,
  showShare: false,
  mapProperties: [],
};

// ---- HELPERS ----
function $(sel, parent) { return (parent || document).querySelector(sel); }
function $$(sel, parent) { return [...(parent || document).querySelectorAll(sel)]; }
function formatPrice(p) {
  if (p >= 1000000) return '$' + (p / 1000000).toFixed(p % 1000000 === 0 ? 0 : 1) + 'M';
  if (p >= 1000) return '$' + (p / 1000).toFixed(0) + 'K';
  return '$' + p.toLocaleString();
}
function formatSqft(s) { return s.toLocaleString() + ' sqft'; }
function typeIcon(t) {
  const m = { villa: 'fa-building-columns', house: 'fa-house', land: 'fa-mountain-sun', apartment: 'fa-building', condo: 'fa-city', townhouse: 'fa-house-chimney' };
  return m[t] || 'fa-house';
}
function typeLabel(t) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// ---- THEME ----
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('theme', state.theme);
}
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  render();
}

// ---- WISHLIST ----
function isWishlisted(id) { return state.wishlist.includes(id); }
function toggleWishlist(id, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  if (isWishlisted(id)) {
    state.wishlist = state.wishlist.filter(w => w !== id);
    showToast('Removed from saved');
  } else {
    state.wishlist.push(id);
    showToast('Saved to wishlist');
  }
  localStorage.setItem('wishlist', JSON.stringify(state.wishlist));
  render();
}

// ---- TOAST ----
function showToast(msg) {
  const existing = $('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ---- API CALLS ----
async function fetchProperties(append = false) {
  state.loading = true;
  if (!append) render();
  const params = new URLSearchParams();
  if (state.filters.search) params.set('search', state.filters.search);
  if (state.filters.type) params.set('type', state.filters.type);
  if (state.filters.minPrice) params.set('minPrice', state.filters.minPrice);
  if (state.filters.maxPrice) params.set('maxPrice', state.filters.maxPrice);
  if (state.filters.minSqft) params.set('minSqft', state.filters.minSqft);
  if (state.filters.maxSqft) params.set('maxSqft', state.filters.maxSqft);
  if (state.filters.bedrooms) params.set('bedrooms', state.filters.bedrooms);
  if (state.filters.sort) params.set('sort', state.filters.sort);
  params.set('page', state.page);
  params.set('limit', '20');

  try {
    const res = await fetch(`${API}/api/properties?${params}`);
    const data = await res.json();
    state.properties = append ? [...state.properties, ...data.properties] : data.properties;
    state.total = data.total;
  } catch (e) { console.error('Fetch error:', e); }
  state.loading = false;
  render();
}

async function fetchFeatured() {
  try {
    const res = await fetch(`${API}/api/properties?featured=1&limit=6`);
    const data = await res.json();
    state.featured = data.properties;
  } catch (e) { console.error(e); }
}

async function fetchPropertyDetail(id) {
  try {
    const res = await fetch(`${API}/api/properties/${id}`);
    state.selectedProperty = await res.json();
    render();
  } catch (e) { console.error(e); }
}

async function fetchContact(id) {
  try {
    const res = await fetch(`${API}/api/properties/${id}/contact`);
    return await res.json();
  } catch (e) { console.error(e); return null; }
}

async function fetchMapProperties() {
  try {
    const res = await fetch(`${API}/api/properties/map/all`);
    const data = await res.json();
    state.mapProperties = data.properties;
    render();
  } catch (e) { console.error(e); }
}

// ---- NAVIGATION ----
function navigate(page) {
  state.currentPage = page;
  state.selectedProperty = null;
  state.showContact = false;
  state.showFilter = false;
  state.showShare = false;
  window.scrollTo(0, 0);
  
  if (page === 'home') { fetchProperties(); fetchFeatured(); }
  if (page === 'map') { fetchMapProperties(); }
  render();
}

function openProperty(id) {
  state.currentPage = 'detail';
  fetchPropertyDetail(id);
  window.history.pushState({ page: 'detail', id }, '', `/property/${id}`);
}

// ---- RENDER FUNCTIONS ----

function renderSkeleton(count = 4) {
  return Array(count).fill('').map(() => `
    <div class="property-card">
      <div class="card-image-container"><div class="skeleton" style="width:100%;height:100%"></div></div>
      <div class="card-content">
        <div class="skeleton" style="height:24px;width:40%;margin-bottom:8px"></div>
        <div class="skeleton" style="height:16px;width:80%;margin-bottom:6px"></div>
        <div class="skeleton" style="height:14px;width:60%;margin-bottom:12px"></div>
        <div style="display:flex;gap:12px;padding-top:10px;border-top:1px solid var(--border)">
          <div class="skeleton" style="height:14px;width:50px"></div>
          <div class="skeleton" style="height:14px;width:50px"></div>
          <div class="skeleton" style="height:14px;width:60px"></div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderPropertyCard(p, index = 0) {
  const wishlisted = isWishlisted(p.id);
  return `
    <div class="property-card" onclick="openProperty(${p.id})" style="animation-delay:${index * 0.05}s">
      <div class="card-image-container">
        <img src="${p.primary_image || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'}" 
             alt="${p.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400'">
        ${p.is_featured ? '<span class="card-badge featured"><i class="fas fa-star"></i> Featured</span>' : 
          `<span class="card-badge">${typeLabel(p.property_type)}</span>`}
        <button class="card-wishlist ${wishlisted ? 'active' : ''}" onclick="toggleWishlist(${p.id}, event)">
          <i class="fa${wishlisted ? 's' : 'r'} fa-heart"></i>
        </button>
      </div>
      <div class="card-content">
        <div class="card-price">${formatPrice(p.price)}</div>
        <div class="card-title">${p.title}</div>
        <div class="card-location"><i class="fas fa-location-dot"></i> ${p.city || p.address}${p.state ? ', ' + p.state : ''}</div>
        <div class="card-meta">
          ${p.bedrooms ? `<div class="card-meta-item"><i class="fas fa-bed"></i> ${p.bedrooms} ${p.bedrooms === 1 ? 'Bed' : 'Beds'}</div>` : ''}
          ${p.bathrooms ? `<div class="card-meta-item"><i class="fas fa-bath"></i> ${p.bathrooms} ${p.bathrooms === 1 ? 'Bath' : 'Baths'}</div>` : ''}
          <div class="card-meta-item"><i class="fas fa-expand"></i> ${formatSqft(p.sqft)}</div>
        </div>
      </div>
    </div>
  `;
}

function renderTopNav() {
  return `
    <div class="top-nav">
      <div class="logo" onclick="navigate('home')" style="cursor:pointer">
        <i class="fas fa-building" style="margin-right:4px"></i> EstateVue
      </div>
      <div style="flex:1"></div>
      <button class="theme-toggle" onclick="toggleTheme()">
        <i class="fas fa-${state.theme === 'dark' ? 'sun' : 'moon'}"></i>
      </button>
    </div>
  `;
}

function renderBottomNav() {
  const items = [
    { id: 'home', icon: 'fa-house', label: 'Home' },
    { id: 'search', icon: 'fa-magnifying-glass', label: 'Search' },
    { id: 'map', icon: 'fa-map-location-dot', label: 'Map' },
    { id: 'wishlist', icon: 'fa-heart', label: 'Saved' },
  ];
  return `
    <div class="bottom-nav">
      ${items.map(i => `
        <div class="nav-item ${state.currentPage === i.id ? 'active' : ''}" onclick="navigate('${i.id}')">
          <i class="fas ${i.icon}"></i>
          <span>${i.label}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderHome() {
  return `
    ${renderTopNav()}
    <div class="main-content">
      <!-- Hero Search -->
      <div class="search-container">
        <div class="search-bar">
          <i class="fas fa-magnifying-glass"></i>
          <input type="text" placeholder="Search by location, city..." 
                 value="${state.filters.search}" 
                 oninput="handleSearch(this.value)">
          <div style="width:1px;height:24px;background:var(--border)"></div>
          <i class="fas fa-sliders" style="cursor:pointer;color:var(--primary)" onclick="state.showFilter=true;render()"></i>
        </div>
      </div>

      <!-- Type Filters -->
      <div class="filter-chips">
        <div class="chip ${!state.filters.type ? 'active' : ''}" onclick="filterType('')">
          <i class="fas fa-border-all"></i> All
        </div>
        <div class="chip ${state.filters.type === 'house' ? 'active' : ''}" onclick="filterType('house')">
          <i class="fas fa-house"></i> House
        </div>
        <div class="chip ${state.filters.type === 'apartment' ? 'active' : ''}" onclick="filterType('apartment')">
          <i class="fas fa-building"></i> Apartment
        </div>
        <div class="chip ${state.filters.type === 'villa' ? 'active' : ''}" onclick="filterType('villa')">
          <i class="fas fa-building-columns"></i> Villa
        </div>
        <div class="chip ${state.filters.type === 'condo' ? 'active' : ''}" onclick="filterType('condo')">
          <i class="fas fa-city"></i> Condo
        </div>
        <div class="chip ${state.filters.type === 'land' ? 'active' : ''}" onclick="filterType('land')">
          <i class="fas fa-mountain-sun"></i> Land
        </div>
        <div class="chip ${state.filters.type === 'townhouse' ? 'active' : ''}" onclick="filterType('townhouse')">
          <i class="fas fa-house-chimney"></i> Townhouse
        </div>
      </div>

      <!-- Featured -->
      ${state.featured.length > 0 ? `
        <div class="section-title">
          <span><i class="fas fa-star" style="color:var(--accent);margin-right:6px"></i> Featured Properties</span>
          <span class="see-all" onclick="navigate('search')">See All <i class="fas fa-chevron-right"></i></span>
        </div>
        <div class="horizontal-scroll">
          ${state.featured.map((p, i) => renderPropertyCard(p, i)).join('')}
        </div>
      ` : ''}

      <!-- All Properties -->
      <div class="section-title">
        <span>All Properties ${state.total > 0 ? `<span style="font-weight:400;font-size:14px;color:var(--text-muted)">(${state.total})</span>` : ''}</span>
        <div style="display:flex;gap:4px">
          <select onchange="handleSort(this.value)" style="font-size:12px;padding:6px 10px;border-radius:20px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text);outline:none;font-family:Inter,sans-serif;cursor:pointer">
            <option value="newest" ${state.filters.sort === 'newest' ? 'selected' : ''}>Newest</option>
            <option value="price_asc" ${state.filters.sort === 'price_asc' ? 'selected' : ''}>Price: Low</option>
            <option value="price_desc" ${state.filters.sort === 'price_desc' ? 'selected' : ''}>Price: High</option>
            <option value="sqft_desc" ${state.filters.sort === 'sqft_desc' ? 'selected' : ''}>Largest</option>
          </select>
        </div>
      </div>

      <div class="property-grid">
        ${state.loading && state.properties.length === 0 ? renderSkeleton(6) :
          state.properties.map((p, i) => renderPropertyCard(p, i)).join('')}
      </div>

      ${state.properties.length === 0 && !state.loading ? `
        <div class="empty-state">
          <i class="fas fa-house-circle-xmark"></i>
          <h3>No properties found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      ` : ''}

      ${state.properties.length < state.total ? `
        <div style="padding:16px;text-align:center">
          <button class="btn btn-outline" onclick="loadMore()" ${state.loading ? 'disabled' : ''}>
            ${state.loading ? '<div class="spinner" style="width:20px;height:20px;margin:0 auto"></div>' : 'Load More Properties'}
          </button>
        </div>
      ` : ''}
    </div>
    ${renderBottomNav()}
    ${state.showFilter ? renderFilterPanel() : ''}
  `;
}

function renderSearch() {
  return `
    ${renderTopNav()}
    <div class="main-content">
      <div class="search-container">
        <div class="search-bar">
          <i class="fas fa-magnifying-glass"></i>
          <input type="text" placeholder="Search properties..." value="${state.filters.search}" oninput="handleSearch(this.value)" autofocus>
          <i class="fas fa-sliders" style="cursor:pointer;color:var(--primary)" onclick="state.showFilter=true;render()"></i>
        </div>
      </div>
      <div class="filter-chips">
        <div class="chip ${!state.filters.type ? 'active' : ''}" onclick="filterType('')"><i class="fas fa-border-all"></i> All</div>
        <div class="chip ${state.filters.type === 'house' ? 'active' : ''}" onclick="filterType('house')"><i class="fas fa-house"></i> House</div>
        <div class="chip ${state.filters.type === 'apartment' ? 'active' : ''}" onclick="filterType('apartment')"><i class="fas fa-building"></i> Apt</div>
        <div class="chip ${state.filters.type === 'villa' ? 'active' : ''}" onclick="filterType('villa')"><i class="fas fa-building-columns"></i> Villa</div>
        <div class="chip ${state.filters.type === 'condo' ? 'active' : ''}" onclick="filterType('condo')"><i class="fas fa-city"></i> Condo</div>
        <div class="chip ${state.filters.type === 'land' ? 'active' : ''}" onclick="filterType('land')"><i class="fas fa-mountain-sun"></i> Land</div>
      </div>
      <div class="property-grid">
        ${state.loading && state.properties.length === 0 ? renderSkeleton(6) :
          state.properties.map((p, i) => renderPropertyCard(p, i)).join('')}
      </div>
      ${state.properties.length === 0 && !state.loading ? `
        <div class="empty-state"><i class="fas fa-magnifying-glass"></i><h3>No results</h3><p>Try different keywords or filters</p></div>
      ` : ''}
      ${state.properties.length < state.total ? `
        <div style="padding:16px;text-align:center">
          <button class="btn btn-outline" onclick="loadMore()">Load More</button>
        </div>
      ` : ''}
    </div>
    ${renderBottomNav()}
    ${state.showFilter ? renderFilterPanel() : ''}
  `;
}

function renderDetail() {
  const p = state.selectedProperty;
  if (!p) return `<div style="padding:40px;text-align:center"><div class="spinner"></div></div>`;

  const images = p.images || [];
  const hasImages = images.length > 0;
  
  return `
    <div class="detail-page" id="detail-page">
      <div class="detail-header">
        <button onclick="goBack()"><i class="fas fa-arrow-left"></i></button>
        <div style="display:flex;gap:8px">
          <button onclick="toggleWishlist(${p.id})"><i class="fa${isWishlisted(p.id)?'s':'r'} fa-heart" style="color:${isWishlisted(p.id)?'#ef4444':'var(--text)'}"></i></button>
          <button onclick="state.showShare=true;render()"><i class="fas fa-share-nodes"></i></button>
        </div>
      </div>

      <!-- Gallery -->
      <div class="gallery-container" id="gallery">
        <div class="gallery-track" id="gallery-track" style="width:${hasImages ? images.length * 100 : 100}%">
          ${hasImages ? images.map(img => `<img src="${img.image_url}" alt="${p.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'">`).join('') :
            `<img src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800" alt="${p.title}">`}
        </div>
        ${hasImages && images.length > 1 ? `
          <div class="gallery-dots">${images.map((_, i) => `<div class="gallery-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`).join('')}</div>
          <div class="gallery-counter">1 / ${images.length}</div>
        ` : ''}
      </div>

      <div class="detail-content">
        <div class="detail-price">${formatPrice(p.price)}</div>
        <div class="detail-title">${p.title}</div>
        <div class="detail-location"><i class="fas fa-location-dot" style="color:var(--primary)"></i> ${p.address}${p.city ? ', ' + p.city : ''}${p.state ? ', ' + p.state : ''}</div>

        <!-- Stats -->
        <div class="detail-stats">
          ${p.bedrooms ? `<div class="stat-item"><i class="fas fa-bed"></i><div class="stat-value">${p.bedrooms}</div><div class="stat-label">Beds</div></div>` : ''}
          ${p.bathrooms ? `<div class="stat-item"><i class="fas fa-bath"></i><div class="stat-value">${p.bathrooms}</div><div class="stat-label">Baths</div></div>` : ''}
          <div class="stat-item"><i class="fas fa-expand"></i><div class="stat-value">${p.sqft.toLocaleString()}</div><div class="stat-label">Sq Ft</div></div>
          <div class="stat-item"><i class="fas ${typeIcon(p.property_type)}"></i><div class="stat-value" style="font-size:13px">${typeLabel(p.property_type)}</div><div class="stat-label">Type</div></div>
          ${p.year_built ? `<div class="stat-item"><i class="fas fa-calendar"></i><div class="stat-value">${p.year_built}</div><div class="stat-label">Built</div></div>` : ''}
        </div>

        <!-- Description -->
        <div class="detail-section">
          <h3><i class="fas fa-align-left"></i> Description</h3>
          <p>${p.description}</p>
        </div>

        <!-- Amenities -->
        ${p.amenities && p.amenities.length > 0 ? `
          <div class="detail-section">
            <h3><i class="fas fa-sparkles"></i> Amenities</h3>
            <div class="amenities-grid">
              ${p.amenities.map(a => `<span class="amenity-tag"><i class="fas fa-check" style="color:var(--primary);margin-right:4px"></i> ${a}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Map -->
        ${p.latitude && p.longitude ? `
          <div class="detail-section">
            <h3><i class="fas fa-map-location-dot"></i> Location</h3>
            <div class="map-container">
              <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${p.longitude-0.01},${p.latitude-0.005},${p.longitude+0.01},${p.latitude+0.005}&layer=mapnik&marker=${p.latitude},${p.longitude}" loading="lazy"></iframe>
            </div>
            <a href="https://www.google.com/maps?q=${p.latitude},${p.longitude}" target="_blank" rel="noopener"
               style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:13px;color:var(--primary);font-weight:500;text-decoration:none">
              <i class="fas fa-external-link"></i> Open in Google Maps
            </a>
          </div>
        ` : ''}
      </div>

      <!-- Contact Bar -->
      <div class="contact-bar">
        <button class="btn-contact secondary" onclick="toggleWishlist(${p.id})">
          <i class="fa${isWishlisted(p.id)?'s':'r'} fa-heart" style="color:${isWishlisted(p.id)?'#ef4444':'inherit'}"></i>
          Save
        </button>
        <button class="btn-contact primary" onclick="showContactModal(${p.id})">
          <i class="fas fa-phone"></i> Contact Owner
        </button>
      </div>
    </div>

    ${state.showContact ? renderContactModal() : ''}
    ${state.showShare ? renderShareModal() : ''}
  `;
}

function renderContactModal() {
  const p = state.selectedProperty;
  if (!p) return '';
  return `
    <div class="modal-overlay" onclick="closeModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-handle"></div>
        <div class="modal-title"><i class="fas fa-address-book" style="color:var(--primary);margin-right:8px"></i> Contact Information</div>
        ${p.contact_name ? `
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:12px;background:var(--bg-secondary);border-radius:var(--radius-sm)">
            <div style="width:48px;height:48px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700">${p.contact_name.charAt(0)}</div>
            <div><div style="font-weight:600;font-size:16px">${p.contact_name}</div><div style="font-size:13px;color:var(--text-muted)">Property Owner</div></div>
          </div>
        ` : ''}
        ${p.contact_phone ? `
          <a href="tel:${p.contact_phone}" class="contact-item">
            <div class="contact-icon phone"><i class="fas fa-phone"></i></div>
            <div class="contact-info"><div class="label">Phone</div><div class="value">${p.contact_phone}</div></div>
            <i class="fas fa-chevron-right" style="color:var(--text-muted)"></i>
          </a>
        ` : ''}
        ${p.contact_whatsapp ? `
          <a href="https://wa.me/${p.contact_whatsapp.replace(/[^0-9]/g, '')}" target="_blank" class="contact-item">
            <div class="contact-icon whatsapp"><i class="fab fa-whatsapp"></i></div>
            <div class="contact-info"><div class="label">WhatsApp</div><div class="value">${p.contact_whatsapp}</div></div>
            <i class="fas fa-chevron-right" style="color:var(--text-muted)"></i>
          </a>
        ` : ''}
        ${p.contact_email ? `
          <a href="mailto:${p.contact_email}" class="contact-item">
            <div class="contact-icon email"><i class="fas fa-envelope"></i></div>
            <div class="contact-info"><div class="label">Email</div><div class="value">${p.contact_email}</div></div>
            <i class="fas fa-chevron-right" style="color:var(--text-muted)"></i>
          </a>
        ` : ''}
      </div>
    </div>
  `;
}

function renderShareModal() {
  const p = state.selectedProperty;
  if (!p) return '';
  const url = window.location.origin + '/property/' + p.id;
  const text = `Check out: ${p.title} - ${formatPrice(p.price)}`;
  return `
    <div class="modal-overlay" onclick="closeModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-handle"></div>
        <div class="modal-title"><i class="fas fa-share-nodes" style="color:var(--primary);margin-right:8px"></i> Share Property</div>
        <div class="share-options">
          <div class="share-option" onclick="window.open('https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}','_blank')">
            <i class="fab fa-whatsapp" style="color:#25d366"></i><span>WhatsApp</span>
          </div>
          <div class="share-option" onclick="window.open('https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}','_blank')">
            <i class="fab fa-x-twitter"></i><span>X</span>
          </div>
          <div class="share-option" onclick="window.open('https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}','_blank')">
            <i class="fab fa-facebook" style="color:#1877f2"></i><span>Facebook</span>
          </div>
          <div class="share-option" onclick="copyLink('${url}')">
            <i class="fas fa-link" style="color:var(--primary)"></i><span>Copy Link</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFilterPanel() {
  return `
    <div class="filter-panel animate-slide-up">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2><i class="fas fa-sliders" style="color:var(--primary);margin-right:8px"></i> Filters</h2>
        <button onclick="state.showFilter=false;render()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text)"><i class="fas fa-xmark"></i></button>
      </div>
      
      <div class="filter-group">
        <label>Property Type</label>
        <select id="filter-type" value="${state.filters.type}">
          <option value="">All Types</option>
          <option value="house" ${state.filters.type==='house'?'selected':''}>House</option>
          <option value="apartment" ${state.filters.type==='apartment'?'selected':''}>Apartment</option>
          <option value="villa" ${state.filters.type==='villa'?'selected':''}>Villa</option>
          <option value="condo" ${state.filters.type==='condo'?'selected':''}>Condo</option>
          <option value="land" ${state.filters.type==='land'?'selected':''}>Land</option>
          <option value="townhouse" ${state.filters.type==='townhouse'?'selected':''}>Townhouse</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Price Range</label>
        <div class="filter-row">
          <input type="number" placeholder="Min Price" id="filter-minPrice" value="${state.filters.minPrice}">
          <input type="number" placeholder="Max Price" id="filter-maxPrice" value="${state.filters.maxPrice}">
        </div>
      </div>

      <div class="filter-group">
        <label>Size (sqft)</label>
        <div class="filter-row">
          <input type="number" placeholder="Min sqft" id="filter-minSqft" value="${state.filters.minSqft}">
          <input type="number" placeholder="Max sqft" id="filter-maxSqft" value="${state.filters.maxSqft}">
        </div>
      </div>

      <div class="filter-group">
        <label>Bedrooms</label>
        <select id="filter-bedrooms">
          <option value="">Any</option>
          <option value="1" ${state.filters.bedrooms==='1'?'selected':''}>1+</option>
          <option value="2" ${state.filters.bedrooms==='2'?'selected':''}>2+</option>
          <option value="3" ${state.filters.bedrooms==='3'?'selected':''}>3+</option>
          <option value="4" ${state.filters.bedrooms==='4'?'selected':''}>4+</option>
          <option value="5" ${state.filters.bedrooms==='5'?'selected':''}>5+</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Sort By</label>
        <select id="filter-sort">
          <option value="newest" ${state.filters.sort==='newest'?'selected':''}>Newest First</option>
          <option value="price_asc" ${state.filters.sort==='price_asc'?'selected':''}>Price: Low to High</option>
          <option value="price_desc" ${state.filters.sort==='price_desc'?'selected':''}>Price: High to Low</option>
          <option value="sqft_desc" ${state.filters.sort==='sqft_desc'?'selected':''}>Size: Largest</option>
        </select>
      </div>

      <div style="display:flex;gap:10px;margin-top:24px">
        <button class="btn btn-outline" onclick="clearFilters()" style="flex:1">Clear All</button>
        <button class="btn btn-primary" onclick="applyFilters()" style="flex:2">Apply Filters</button>
      </div>
    </div>
  `;
}

function renderMap() {
  return `
    ${renderTopNav()}
    <div class="map-view-container" id="map-view-area">
      <div id="map-view" style="width:100%;height:100%;background:var(--bg-secondary);display:flex;align-items:center;justify-content:center">
        ${state.mapProperties.length === 0 ? '<div class="spinner"></div>' : `
          <iframe 
            id="map-frame"
            style="width:100%;height:100%;border:none" 
            src="https://www.openstreetmap.org/export/embed.html?bbox=-119.5,33.5,-117.5,34.5&layer=mapnik"
            loading="lazy">
          </iframe>
        `}
      </div>
    </div>
    <!-- Property list below map -->
    ${state.mapProperties.length > 0 ? `
      <div style="position:fixed;bottom:calc(var(--bottom-nav-height) + 8px);left:0;right:0;z-index:60;padding:0 12px">
        <div class="horizontal-scroll" style="padding:0">
          ${state.mapProperties.map(p => `
            <div style="flex-shrink:0;width:260px;background:var(--bg-card);border-radius:var(--radius);box-shadow:var(--shadow-lg);display:flex;overflow:hidden;cursor:pointer;border:1px solid var(--border)" onclick="openProperty(${p.id})">
              <img src="${p.primary_image || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400'}" style="width:100px;height:90px;object-fit:cover;flex-shrink:0" onerror="this.src='https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400'">
              <div style="padding:10px;flex:1;min-width:0">
                <div style="font-size:16px;font-weight:700;color:var(--primary)">${formatPrice(p.price)}</div>
                <div style="font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.title}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${p.bedrooms ? p.bedrooms+'bd' : ''} ${p.bathrooms ? p.bathrooms+'ba' : ''} ${p.sqft.toLocaleString()} sqft</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    ${renderBottomNav()}
  `;
}

function renderWishlist() {
  const wishlisted = state.properties.filter(p => isWishlisted(p.id));
  return `
    ${renderTopNav()}
    <div class="main-content">
      <div class="section-title" style="padding-top:16px">
        <span><i class="fas fa-heart" style="color:#ef4444;margin-right:6px"></i> Saved Properties (${state.wishlist.length})</span>
      </div>
      ${wishlisted.length > 0 ? `
        <div class="property-grid">
          ${wishlisted.map((p, i) => renderPropertyCard(p, i)).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <i class="far fa-heart"></i>
          <h3>No saved properties</h3>
          <p>Tap the heart icon on any property to save it here</p>
          <button class="btn btn-primary" style="margin-top:16px;width:auto;display:inline-block" onclick="navigate('home')">Browse Properties</button>
        </div>
      `}
    </div>
    ${renderBottomNav()}
  `;
}

// ---- EVENT HANDLERS ----
const handleSearch = debounce((value) => {
  state.filters.search = value;
  state.page = 1;
  fetchProperties();
}, 400);

function filterType(type) {
  state.filters.type = type;
  state.page = 1;
  fetchProperties();
}

function handleSort(sort) {
  state.filters.sort = sort;
  state.page = 1;
  fetchProperties();
}

function loadMore() {
  state.page++;
  fetchProperties(true);
}

function applyFilters() {
  state.filters.type = document.getElementById('filter-type')?.value || '';
  state.filters.minPrice = document.getElementById('filter-minPrice')?.value || '';
  state.filters.maxPrice = document.getElementById('filter-maxPrice')?.value || '';
  state.filters.minSqft = document.getElementById('filter-minSqft')?.value || '';
  state.filters.maxSqft = document.getElementById('filter-maxSqft')?.value || '';
  state.filters.bedrooms = document.getElementById('filter-bedrooms')?.value || '';
  state.filters.sort = document.getElementById('filter-sort')?.value || 'newest';
  state.showFilter = false;
  state.page = 1;
  fetchProperties();
}

function clearFilters() {
  state.filters = { search: '', type: '', minPrice: '', maxPrice: '', minSqft: '', maxSqft: '', bedrooms: '', sort: 'newest' };
  state.showFilter = false;
  state.page = 1;
  fetchProperties();
}

function goBack() {
  state.selectedProperty = null;
  state.showContact = false;
  state.showShare = false;
  state.currentPage = 'home';
  window.history.back();
  render();
}

function closeModal(e) {
  if (e.target === e.currentTarget) {
    state.showContact = false;
    state.showShare = false;
    render();
  }
}

async function showContactModal(id) {
  const contact = await fetchContact(id);
  if (contact && state.selectedProperty) {
    state.selectedProperty.contact_name = contact.contact_name;
    state.selectedProperty.contact_phone = contact.contact_phone;
    state.selectedProperty.contact_whatsapp = contact.contact_whatsapp;
    state.selectedProperty.contact_email = contact.contact_email;
  }
  state.showContact = true;
  render();
}

function copyLink(url) {
  navigator.clipboard.writeText(url).then(() => showToast('Link copied!')).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = url; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast('Link copied!');
  });
}

// ---- GALLERY SWIPE ----
let galleryIndex = 0;
let touchStartX = 0, touchEndX = 0;

function setupGallery() {
  const gallery = document.getElementById('gallery');
  if (!gallery) return;
  galleryIndex = 0;

  gallery.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  gallery.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    const images = state.selectedProperty?.images || [];
    if (Math.abs(diff) > 50) {
      if (diff > 0 && galleryIndex < images.length - 1) galleryIndex++;
      else if (diff < 0 && galleryIndex > 0) galleryIndex--;
      updateGallery(images.length);
    }
  }, { passive: true });
}

function updateGallery(total) {
  const track = document.getElementById('gallery-track');
  if (track) track.style.transform = `translateX(-${galleryIndex * (100 / total)}%)`;
  const dots = document.querySelectorAll('.gallery-dot');
  dots.forEach((d, i) => d.classList.toggle('active', i === galleryIndex));
  const counter = document.querySelector('.gallery-counter');
  if (counter) counter.textContent = `${galleryIndex + 1} / ${total}`;
}

// ---- MAIN RENDER ----
function render() {
  const app = document.getElementById('app');
  if (!app) return;

  switch (state.currentPage) {
    case 'home': app.innerHTML = renderHome(); break;
    case 'search': app.innerHTML = renderSearch(); break;
    case 'detail': app.innerHTML = renderDetail(); break;
    case 'map': app.innerHTML = renderMap(); break;
    case 'wishlist': app.innerHTML = renderWishlist(); break;
    default: app.innerHTML = renderHome();
  }

  if (state.currentPage === 'detail') {
    setTimeout(setupGallery, 100);
  }
}

// ---- BROWSER HISTORY ----
window.addEventListener('popstate', (e) => {
  if (state.currentPage === 'detail') {
    state.selectedProperty = null;
    state.showContact = false;
    state.showShare = false;
    state.currentPage = 'home';
    render();
  }
});

// ---- INIT ----
applyTheme();
fetchProperties();
fetchFeatured();
render();

// URL routing
const path = window.location.pathname;
if (path.startsWith('/property/')) {
  const id = parseInt(path.split('/')[2]);
  if (id) openProperty(id);
} else if (path === '/map') {
  navigate('map');
}
