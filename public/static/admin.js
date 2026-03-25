// ============================================
// EstateVue Admin Dashboard
// ============================================

const API = '';

// ---- STATE ----
const adminState = {
  isLoggedIn: !!localStorage.getItem('admin_token'),
  token: localStorage.getItem('admin_token') || '',
  admin: JSON.parse(localStorage.getItem('admin_info') || 'null'),
  currentPage: 'dashboard',
  properties: [],
  stats: null,
  editingProperty: null,
  showDeleteModal: false,
  deleteId: null,
  sidebarOpen: false,
  loading: false,
  formImages: [],
  formAmenities: [],
};

// ---- HELPERS ----
function formatPrice(p) {
  return '$' + Number(p).toLocaleString();
}

function showToast(msg, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

async function apiCall(url, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (adminState.token) headers['Authorization'] = `Bearer ${adminState.token}`;
  try {
    const res = await fetch(API + url, { ...options, headers: { ...headers, ...options.headers } });
    const data = await res.json();
    if (res.status === 401) { logout(); return null; }
    if (!res.ok) { showToast(data.error || 'An error occurred', 'error'); return null; }
    return data;
  } catch (e) { showToast('Network error', 'error'); return null; }
}

// ---- AUTH ----
async function login(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  if (!email || !password) { showToast('Please fill all fields', 'error'); return; }

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px"></div> Signing in...';

  const data = await apiCall('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password })
  });

  if (data) {
    adminState.isLoggedIn = true;
    adminState.token = data.token;
    adminState.admin = data.admin;
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_info', JSON.stringify(data.admin));
    showToast('Welcome back, ' + data.admin.name);
    await loadDashboard();
    renderAdmin();
  } else {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-right-to-bracket"></i> Sign In';
  }
}

function logout() {
  adminState.isLoggedIn = false;
  adminState.token = '';
  adminState.admin = null;
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_info');
  renderAdmin();
}

async function checkAuth() {
  if (!adminState.token) return;
  const data = await apiCall('/api/auth/me');
  if (!data) { logout(); return; }
  adminState.admin = data.admin;
}

// ---- DATA LOADING ----
async function loadDashboard() {
  adminState.loading = true;
  renderAdmin();
  const [stats, props] = await Promise.all([
    apiCall('/api/admin/stats'),
    apiCall('/api/admin/properties')
  ]);
  if (stats) adminState.stats = stats;
  if (props) adminState.properties = props.properties;
  adminState.loading = false;
  renderAdmin();
}

async function loadProperties() {
  adminState.loading = true;
  renderAdmin();
  const data = await apiCall('/api/admin/properties');
  if (data) adminState.properties = data.properties;
  adminState.loading = false;
  renderAdmin();
}

// ---- CRUD ----
async function saveProperty(e) {
  e.preventDefault();
  const form = document.getElementById('property-form');
  const formData = new FormData(form);

  const data = {
    title: formData.get('title'),
    description: formData.get('description'),
    price: parseFloat(formData.get('price')),
    sqft: parseInt(formData.get('sqft')),
    property_type: formData.get('property_type'),
    address: formData.get('address'),
    city: formData.get('city'),
    state: formData.get('state'),
    latitude: formData.get('latitude') ? parseFloat(formData.get('latitude')) : null,
    longitude: formData.get('longitude') ? parseFloat(formData.get('longitude')) : null,
    bedrooms: parseInt(formData.get('bedrooms')) || 0,
    bathrooms: parseInt(formData.get('bathrooms')) || 0,
    year_built: formData.get('year_built') ? parseInt(formData.get('year_built')) : null,
    contact_name: formData.get('contact_name'),
    contact_phone: formData.get('contact_phone'),
    contact_whatsapp: formData.get('contact_whatsapp'),
    contact_email: formData.get('contact_email'),
    is_featured: document.getElementById('is_featured')?.checked || false,
    status: formData.get('status') || 'active',
    images: adminState.formImages,
    amenities: adminState.formAmenities,
  };

  if (!data.title || !data.description || !data.price || !data.sqft || !data.property_type || !data.address) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px"></div> Saving...';

  let result;
  if (adminState.editingProperty) {
    result = await apiCall(`/api/admin/properties/${adminState.editingProperty.id}`, {
      method: 'PUT', body: JSON.stringify(data)
    });
  } else {
    result = await apiCall('/api/admin/properties', {
      method: 'POST', body: JSON.stringify(data)
    });
  }

  if (result) {
    showToast(adminState.editingProperty ? 'Property updated!' : 'Property created!');
    adminState.editingProperty = null;
    adminState.currentPage = 'properties';
    await loadProperties();
  } else {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save Property';
  }
}

async function deleteProperty(id) {
  const result = await apiCall(`/api/admin/properties/${id}`, { method: 'DELETE' });
  if (result) {
    showToast('Property deleted');
    adminState.showDeleteModal = false;
    adminState.deleteId = null;
    await loadProperties();
  }
}

function editProperty(id) {
  const prop = adminState.properties.find(p => p.id === id);
  if (!prop) return;
  adminState.editingProperty = prop;
  adminState.formImages = [];
  adminState.formAmenities = [];
  adminState.currentPage = 'form';

  // Load images and amenities
  fetch(API + `/api/properties/${id}`, {
    headers: { 'Authorization': `Bearer ${adminState.token}` }
  }).then(r => r.json()).then(data => {
    if (data.images) adminState.formImages = data.images.map(i => i.image_url);
    if (data.amenities) adminState.formAmenities = [...data.amenities];
    renderAdmin();
  });

  renderAdmin();
}

function addNewProperty() {
  adminState.editingProperty = null;
  adminState.formImages = [];
  adminState.formAmenities = [];
  adminState.currentPage = 'form';
  renderAdmin();
}

// ---- IMAGE & AMENITY MANAGEMENT ----
function addImageUrl() {
  const input = document.getElementById('new-image-url');
  if (input && input.value.trim()) {
    adminState.formImages.push(input.value.trim());
    input.value = '';
    renderAdmin();
  }
}

function removeImage(index) {
  adminState.formImages.splice(index, 1);
  renderAdmin();
}

function addAmenity() {
  const input = document.getElementById('new-amenity');
  if (input && input.value.trim()) {
    adminState.formAmenities.push(input.value.trim());
    input.value = '';
    renderAdmin();
  }
}

function removeAmenity(index) {
  adminState.formAmenities.splice(index, 1);
  renderAdmin();
}

// ---- NAVIGATION ----
function navigateAdmin(page) {
  adminState.currentPage = page;
  adminState.editingProperty = null;
  adminState.sidebarOpen = false;
  if (page === 'dashboard') loadDashboard();
  else if (page === 'properties') loadProperties();
  else renderAdmin();
}

function toggleSidebar() {
  adminState.sidebarOpen = !adminState.sidebarOpen;
  renderAdmin();
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderLogin() {
  return `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <h1><i class="fas fa-building"></i> EstateVue</h1>
          <p>Admin Dashboard</p>
        </div>
        <form onsubmit="login(event)">
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" id="email" placeholder="admin@realestate.com" value="admin@realestate.com" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="password" placeholder="Enter password" value="admin123" required>
          </div>
          <button type="submit" id="login-btn" class="btn btn-primary btn-full" style="padding:14px">
            <i class="fas fa-right-to-bracket"></i> Sign In
          </button>
        </form>
        <p style="text-align:center;margin-top:16px;font-size:12px;color:var(--text-muted)">
          Default: admin@realestate.com / admin123
        </p>
      </div>
    </div>
  `;
}

function renderSidebar() {
  const items = [
    { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
    { id: 'properties', icon: 'fa-building', label: 'Properties' },
    { id: 'form', icon: 'fa-plus-circle', label: 'Add Property' },
  ];
  const a = adminState.admin || {};
  return `
    <button class="mobile-toggle" onclick="toggleSidebar()"><i class="fas fa-bars"></i></button>
    <div class="sidebar-backdrop ${adminState.sidebarOpen ? 'open' : ''}" onclick="toggleSidebar()"></div>
    <div class="sidebar ${adminState.sidebarOpen ? 'open' : ''}">
      <div class="sidebar-logo">
        <h2><i class="fas fa-building"></i> EstateVue</h2>
        <span>Admin Panel</span>
      </div>
      <div class="sidebar-nav">
        ${items.map(i => `
          <div class="nav-link ${adminState.currentPage === i.id ? 'active' : ''}" onclick="navigateAdmin('${i.id}')">
            <i class="fas ${i.icon}"></i> ${i.label}
          </div>
        `).join('')}
        <div class="nav-link" onclick="window.open('/','_blank')">
          <i class="fas fa-external-link"></i> View Site
        </div>
      </div>
      <div class="sidebar-footer">
        <div class="admin-info">
          <div class="admin-avatar">${(a.name || 'A').charAt(0)}</div>
          <div>
            <div class="admin-name">${a.name || 'Admin'}</div>
            <div class="admin-email">${a.email || ''}</div>
          </div>
        </div>
        <button class="btn btn-outline btn-sm btn-full" onclick="logout()">
          <i class="fas fa-right-from-bracket"></i> Logout
        </button>
      </div>
    </div>
  `;
}

function renderDashboard() {
  const s = adminState.stats || {};
  return `
    <div class="page-header">
      <h1>Dashboard</h1>
      <button class="btn btn-primary" onclick="addNewProperty()"><i class="fas fa-plus"></i> Add Property</button>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background:#dbeafe;color:var(--primary)"><i class="fas fa-building"></i></div>
        <div class="stat-value">${s.total || 0}</div>
        <div class="stat-label">Total Properties</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#dcfce7;color:#16a34a"><i class="fas fa-check-circle"></i></div>
        <div class="stat-value">${s.active || 0}</div>
        <div class="stat-label">Active Listings</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fef3c7;color:#d97706"><i class="fas fa-star"></i></div>
        <div class="stat-value">${s.featured || 0}</div>
        <div class="stat-label">Featured</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fce7f3;color:#db2777"><i class="fas fa-eye"></i></div>
        <div class="stat-value">${s.totalViews || 0}</div>
        <div class="stat-label">Total Views</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fee2e2;color:#dc2626"><i class="fas fa-tag"></i></div>
        <div class="stat-value">${s.sold || 0}</div>
        <div class="stat-label">Sold</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fed7aa;color:#ea580c"><i class="fas fa-clock"></i></div>
        <div class="stat-value">${s.pending || 0}</div>
        <div class="stat-label">Pending</div>
      </div>
    </div>

    <!-- Recent Properties -->
    <div class="table-container">
      <div class="table-header">
        <h3><i class="fas fa-clock" style="color:var(--primary);margin-right:8px"></i> Recent Properties</h3>
        <button class="btn btn-outline btn-sm" onclick="navigateAdmin('properties')">View All</button>
      </div>
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Property</th><th>Price</th><th>Type</th><th>Status</th><th>Views</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${adminState.properties.slice(0, 5).map(p => `
              <tr>
                <td>
                  <div class="property-cell">
                    <img src="${p.primary_image || 'https://via.placeholder.com/56x42'}" alt="${p.title}" onerror="this.src='https://via.placeholder.com/56x42'">
                    <div>
                      <div class="title">${p.title}</div>
                      <div class="subtitle">${p.city || p.address}</div>
                    </div>
                  </div>
                </td>
                <td style="font-weight:600;color:var(--primary)">${formatPrice(p.price)}</td>
                <td>${p.property_type}</td>
                <td><span class="status-badge ${p.status}">${p.status}</span> ${p.is_featured ? '<span class="status-badge featured"><i class="fas fa-star" style="font-size:10px"></i> Featured</span>' : ''}</td>
                <td>${p.views || 0}</td>
                <td>
                  <div class="action-btns">
                    <button class="action-btn edit" onclick="editProperty(${p.id})" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="action-btn delete" onclick="adminState.deleteId=${p.id};adminState.showDeleteModal=true;renderAdmin()" title="Delete"><i class="fas fa-trash"></i></button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderProperties() {
  return `
    <div class="page-header">
      <h1>All Properties (${adminState.properties.length})</h1>
      <button class="btn btn-primary" onclick="addNewProperty()"><i class="fas fa-plus"></i> Add Property</button>
    </div>
    <div class="table-container">
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Property</th><th>Price</th><th>Type</th><th>Beds/Baths</th><th>Status</th><th>Views</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${adminState.properties.map(p => `
              <tr class="animate-fade">
                <td>
                  <div class="property-cell">
                    <img src="${p.primary_image || 'https://via.placeholder.com/56x42'}" alt="${p.title}" onerror="this.src='https://via.placeholder.com/56x42'">
                    <div>
                      <div class="title">${p.title}</div>
                      <div class="subtitle">${p.address}${p.city ? ', ' + p.city : ''}</div>
                    </div>
                  </div>
                </td>
                <td style="font-weight:600;color:var(--primary)">${formatPrice(p.price)}</td>
                <td><span style="text-transform:capitalize">${p.property_type}</span></td>
                <td>${p.bedrooms}bd / ${p.bathrooms}ba</td>
                <td>
                  <span class="status-badge ${p.status}">${p.status}</span>
                  ${p.is_featured ? '<span class="status-badge featured" style="margin-left:4px"><i class="fas fa-star" style="font-size:10px"></i></span>' : ''}
                </td>
                <td>${p.views || 0}</td>
                <td>
                  <div class="action-btns">
                    <button class="action-btn edit" onclick="editProperty(${p.id})" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="action-btn delete" onclick="adminState.deleteId=${p.id};adminState.showDeleteModal=true;renderAdmin()" title="Delete"><i class="fas fa-trash"></i></button>
                  </div>
                </td>
              </tr>
            `).join('')}
            ${adminState.properties.length === 0 ? `
              <tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">
                <i class="fas fa-building" style="font-size:32px;margin-bottom:12px;display:block;opacity:0.3"></i>
                No properties yet. Click "Add Property" to get started.
              </td></tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderForm() {
  const p = adminState.editingProperty || {};
  const isEdit = !!adminState.editingProperty;
  return `
    <div class="page-header">
      <h1>${isEdit ? 'Edit Property' : 'Add New Property'}</h1>
      <button class="btn btn-outline" onclick="navigateAdmin('properties')"><i class="fas fa-arrow-left"></i> Back</button>
    </div>

    <form id="property-form" onsubmit="saveProperty(event)">
      <!-- Basic Info -->
      <div class="form-card">
        <h3><i class="fas fa-info-circle"></i> Basic Information</h3>
        <div class="form-group">
          <label>Title *</label>
          <input type="text" name="title" value="${p.title || ''}" placeholder="e.g., Luxury Ocean View Villa" required>
        </div>
        <div class="form-group">
          <label>Description *</label>
          <textarea name="description" placeholder="Detailed property description..." required>${p.description || ''}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Price ($) *</label>
            <input type="number" name="price" value="${p.price || ''}" placeholder="e.g., 850000" required>
          </div>
          <div class="form-group">
            <label>Square Feet *</label>
            <input type="number" name="sqft" value="${p.sqft || ''}" placeholder="e.g., 2500" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Property Type *</label>
            <select name="property_type" required>
              <option value="">Select type...</option>
              <option value="house" ${p.property_type==='house'?'selected':''}>House</option>
              <option value="apartment" ${p.property_type==='apartment'?'selected':''}>Apartment</option>
              <option value="villa" ${p.property_type==='villa'?'selected':''}>Villa</option>
              <option value="condo" ${p.property_type==='condo'?'selected':''}>Condo</option>
              <option value="land" ${p.property_type==='land'?'selected':''}>Land</option>
              <option value="townhouse" ${p.property_type==='townhouse'?'selected':''}>Townhouse</option>
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status">
              <option value="active" ${p.status==='active'?'selected':''}>Active</option>
              <option value="pending" ${p.status==='pending'?'selected':''}>Pending</option>
              <option value="sold" ${p.status==='sold'?'selected':''}>Sold</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Bedrooms</label>
            <input type="number" name="bedrooms" value="${p.bedrooms || 0}" min="0">
          </div>
          <div class="form-group">
            <label>Bathrooms</label>
            <input type="number" name="bathrooms" value="${p.bathrooms || 0}" min="0">
          </div>
        </div>
        <div class="form-group">
          <label>Year Built</label>
          <input type="number" name="year_built" value="${p.year_built || ''}" placeholder="e.g., 2020">
        </div>
        <div class="form-group" style="display:flex;align-items:center;gap:10px;margin-top:4px">
          <input type="checkbox" id="is_featured" ${p.is_featured ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--primary)">
          <label for="is_featured" style="margin:0;text-transform:none;font-size:14px;cursor:pointer"><i class="fas fa-star" style="color:var(--accent);margin-right:4px"></i> Featured Property</label>
        </div>
      </div>

      <!-- Location -->
      <div class="form-card">
        <h3><i class="fas fa-location-dot"></i> Location</h3>
        <div class="form-group">
          <label>Address *</label>
          <input type="text" name="address" value="${p.address || ''}" placeholder="e.g., 123 Main Street" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>City</label>
            <input type="text" name="city" value="${p.city || ''}" placeholder="e.g., Los Angeles">
          </div>
          <div class="form-group">
            <label>State</label>
            <input type="text" name="state" value="${p.state || ''}" placeholder="e.g., CA">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Latitude</label>
            <input type="number" step="any" name="latitude" value="${p.latitude || ''}" placeholder="e.g., 34.0522">
          </div>
          <div class="form-group">
            <label>Longitude</label>
            <input type="number" step="any" name="longitude" value="${p.longitude || ''}" placeholder="e.g., -118.2437">
          </div>
        </div>
      </div>

      <!-- Images -->
      <div class="form-card">
        <h3><i class="fas fa-images"></i> Images</h3>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Add image URLs. First image will be the primary/cover image.</p>
        <div class="image-list">
          ${adminState.formImages.map((url, i) => `
            <div class="image-preview">
              <img src="${url}" alt="Image ${i+1}" onerror="this.src='https://via.placeholder.com/100x75'">
              <button type="button" class="remove-img" onclick="removeImage(${i})"><i class="fas fa-xmark"></i></button>
              ${i === 0 ? '<div style="position:absolute;bottom:2px;left:2px;background:var(--primary);color:white;font-size:8px;padding:2px 4px;border-radius:3px">Primary</div>' : ''}
            </div>
          `).join('')}
        </div>
        <div class="add-image-input" style="margin-top:10px">
          <i class="fas fa-link" style="color:var(--text-muted)"></i>
          <input type="text" id="new-image-url" placeholder="Paste image URL and press Add..." onkeydown="if(event.key==='Enter'){event.preventDefault();addImageUrl()}">
          <button type="button" class="btn btn-primary btn-sm" onclick="addImageUrl()">Add</button>
        </div>
      </div>

      <!-- Amenities -->
      <div class="form-card">
        <h3><i class="fas fa-sparkles"></i> Amenities</h3>
        <div class="amenity-tags">
          ${adminState.formAmenities.map((a, i) => `
            <span class="amenity-tag">${a} <button type="button" class="remove-amenity" onclick="removeAmenity(${i})"><i class="fas fa-xmark"></i></button></span>
          `).join('')}
        </div>
        <div class="add-image-input" style="margin-top:10px">
          <i class="fas fa-plus" style="color:var(--text-muted)"></i>
          <input type="text" id="new-amenity" placeholder="Add amenity (e.g., Pool, Gym)..." onkeydown="if(event.key==='Enter'){event.preventDefault();addAmenity()}">
          <button type="button" class="btn btn-primary btn-sm" onclick="addAmenity()">Add</button>
        </div>
        <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">
          ${['Pool','Gym','Garage','Garden','Smart Home','Parking','Fireplace','Laundry','AC','Rooftop','Beach Access','Spa'].map(a => `
            <button type="button" class="btn btn-outline btn-sm" style="padding:6px 10px;font-size:12px" 
              onclick="if(!adminState.formAmenities.includes('${a}')){adminState.formAmenities.push('${a}');renderAdmin()}">${a}</button>
          `).join('')}
        </div>
      </div>

      <!-- Contact -->
      <div class="form-card">
        <h3><i class="fas fa-address-book"></i> Contact Details</h3>
        <div class="form-group">
          <label>Contact Name</label>
          <input type="text" name="contact_name" value="${p.contact_name || ''}" placeholder="e.g., John Smith">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Phone</label>
            <input type="text" name="contact_phone" value="${p.contact_phone || ''}" placeholder="e.g., +1-555-0100">
          </div>
          <div class="form-group">
            <label>WhatsApp</label>
            <input type="text" name="contact_whatsapp" value="${p.contact_whatsapp || ''}" placeholder="e.g., +15550100">
          </div>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="contact_email" value="${p.contact_email || ''}" placeholder="e.g., contact@example.com">
        </div>
      </div>

      <!-- Submit -->
      <div style="display:flex;gap:10px;margin-top:8px;margin-bottom:32px">
        <button type="button" class="btn btn-outline" onclick="navigateAdmin('properties')" style="flex:1">Cancel</button>
        <button type="submit" id="save-btn" class="btn btn-primary" style="flex:2">
          <i class="fas fa-save"></i> ${isEdit ? 'Update Property' : 'Publish Property'}
        </button>
      </div>
    </form>
  `;
}

function renderDeleteModal() {
  if (!adminState.showDeleteModal) return '';
  return `
    <div class="modal-overlay" onclick="adminState.showDeleteModal=false;renderAdmin()">
      <div class="modal-box" onclick="event.stopPropagation()">
        <div class="icon" style="color:var(--danger)"><i class="fas fa-trash-can"></i></div>
        <h3>Delete Property?</h3>
        <p>This action cannot be undone. The property and all its images will be permanently removed.</p>
        <div class="actions">
          <button class="btn btn-outline" onclick="adminState.showDeleteModal=false;renderAdmin()">Cancel</button>
          <button class="btn btn-danger" onclick="deleteProperty(${adminState.deleteId})">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    </div>
  `;
}

// ---- MAIN RENDER ----
function renderAdmin() {
  const app = document.getElementById('admin-app');
  if (!app) return;

  if (!adminState.isLoggedIn) {
    app.innerHTML = renderLogin();
    return;
  }

  let content = '';
  if (adminState.loading) {
    content = '<div style="display:flex;align-items:center;justify-content:center;height:300px"><div class="spinner"></div></div>';
  } else {
    switch (adminState.currentPage) {
      case 'dashboard': content = renderDashboard(); break;
      case 'properties': content = renderProperties(); break;
      case 'form': content = renderForm(); break;
      default: content = renderDashboard();
    }
  }

  app.innerHTML = `
    ${renderSidebar()}
    <div class="dashboard">
      <div class="main-panel">
        ${content}
      </div>
    </div>
    ${renderDeleteModal()}
  `;
}

// ---- INIT ----
(async () => {
  if (adminState.isLoggedIn) {
    await checkAuth();
    if (adminState.isLoggedIn) {
      await loadDashboard();
    }
  }
  renderAdmin();
})();
