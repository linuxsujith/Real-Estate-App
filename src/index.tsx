import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
}

type Variables = {
  admin?: { id: number; email: string; name: string }
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('/api/*', cors())

// ---- UTILITY: Simple SHA-256 hash ----
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ---- UTILITY: Simple JWT-like token ----
async function createToken(payload: object, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify({ ...payload, exp: Date.now() + 86400000 * 7 }))
  const signature = await sha256(`${header}.${body}.${secret}`)
  return `${header}.${body}.${signature}`
}

async function verifyToken(token: string, secret: string): Promise<any> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const expectedSig = await sha256(`${parts[0]}.${parts[1]}.${secret}`)
    if (expectedSig !== parts[2]) return null
    const payload = JSON.parse(atob(parts[1]))
    if (payload.exp && payload.exp < Date.now()) return null
    return payload
  } catch { return null }
}

const JWT_SECRET = 'realestate-admin-secret-key-2024'

// ---- MIDDLEWARE: Auth check ----
async function adminAuth(c: any, next: any) {
  const auth = c.req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = auth.substring(7)
  const payload = await verifyToken(token, JWT_SECRET)
  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
  c.set('admin', payload)
  return next()
}

// ============================================
// AUTH ROUTES
// ============================================
app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) {
    return c.json({ error: 'Email and password required' }, 400)
  }
  const hash = await sha256(password)
  const admin = await c.env.DB.prepare(
    'SELECT id, email, name FROM admins WHERE email = ? AND password_hash = ?'
  ).bind(email, hash).first()
  
  if (!admin) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }
  const token = await createToken({ id: admin.id, email: admin.email, name: admin.name }, JWT_SECRET)
  return c.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } })
})

app.get('/api/auth/me', adminAuth, async (c) => {
  const admin = c.get('admin')
  return c.json({ admin })
})

// ============================================
// PUBLIC PROPERTY ROUTES
// ============================================
app.get('/api/properties', async (c) => {
  const url = new URL(c.req.url)
  const search = url.searchParams.get('search') || ''
  const type = url.searchParams.get('type') || ''
  const minPrice = url.searchParams.get('minPrice') || ''
  const maxPrice = url.searchParams.get('maxPrice') || ''
  const minSqft = url.searchParams.get('minSqft') || ''
  const maxSqft = url.searchParams.get('maxSqft') || ''
  const bedrooms = url.searchParams.get('bedrooms') || ''
  const sort = url.searchParams.get('sort') || 'newest'
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '20')
  const featured = url.searchParams.get('featured') || ''
  const offset = (page - 1) * limit

  let where = ["p.status = 'active'"]
  let binds: any[] = []

  if (search) {
    where.push("(p.title LIKE ? OR p.city LIKE ? OR p.address LIKE ? OR p.state LIKE ?)")
    binds.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (type) {
    where.push("p.property_type = ?")
    binds.push(type)
  }
  if (minPrice) {
    where.push("p.price >= ?")
    binds.push(parseFloat(minPrice))
  }
  if (maxPrice) {
    where.push("p.price <= ?")
    binds.push(parseFloat(maxPrice))
  }
  if (minSqft) {
    where.push("p.sqft >= ?")
    binds.push(parseInt(minSqft))
  }
  if (maxSqft) {
    where.push("p.sqft <= ?")
    binds.push(parseInt(maxSqft))
  }
  if (bedrooms) {
    where.push("p.bedrooms >= ?")
    binds.push(parseInt(bedrooms))
  }
  if (featured === '1') {
    where.push("p.is_featured = 1")
  }

  let orderBy = 'p.created_at DESC'
  if (sort === 'price_asc') orderBy = 'p.price ASC'
  else if (sort === 'price_desc') orderBy = 'p.price DESC'
  else if (sort === 'sqft_desc') orderBy = 'p.sqft DESC'
  else if (sort === 'oldest') orderBy = 'p.created_at ASC'

  const whereClause = where.join(' AND ')

  // Get total count
  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM properties p WHERE ${whereClause}`
  ).bind(...binds).first()

  // Get properties with primary image
  const properties = await c.env.DB.prepare(
    `SELECT p.*, pi.image_url as primary_image 
     FROM properties p 
     LEFT JOIN property_images pi ON pi.property_id = p.id AND pi.is_primary = 1
     WHERE ${whereClause}
     ORDER BY p.is_featured DESC, ${orderBy}
     LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all()

  return c.json({
    properties: properties.results,
    total: (countResult as any)?.total || 0,
    page,
    limit,
    totalPages: Math.ceil(((countResult as any)?.total || 0) / limit)
  })
})

app.get('/api/properties/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const property = await c.env.DB.prepare(
    'SELECT * FROM properties WHERE id = ?'
  ).bind(id).first()
  
  if (!property) return c.json({ error: 'Property not found' }, 404)

  const images = await c.env.DB.prepare(
    'SELECT * FROM property_images WHERE property_id = ? ORDER BY sort_order'
  ).bind(id).all()

  const amenities = await c.env.DB.prepare(
    'SELECT amenity FROM property_amenities WHERE property_id = ?'
  ).bind(id).all()

  // Track view
  await c.env.DB.prepare(
    'INSERT INTO property_views (property_id) VALUES (?)'
  ).bind(id).run()

  return c.json({
    ...property,
    images: images.results,
    amenities: amenities.results.map((a: any) => a.amenity)
  })
})

app.get('/api/properties/:id/contact', async (c) => {
  const id = parseInt(c.req.param('id'))
  const contact = await c.env.DB.prepare(
    'SELECT contact_name, contact_phone, contact_whatsapp, contact_email FROM properties WHERE id = ?'
  ).bind(id).first()
  if (!contact) return c.json({ error: 'Not found' }, 404)
  return c.json(contact)
})

// Map data endpoint
app.get('/api/properties/map/all', async (c) => {
  const properties = await c.env.DB.prepare(
    `SELECT p.id, p.title, p.price, p.latitude, p.longitude, p.property_type, p.bedrooms, p.bathrooms, p.sqft, pi.image_url as primary_image
     FROM properties p
     LEFT JOIN property_images pi ON pi.property_id = p.id AND pi.is_primary = 1
     WHERE p.status = 'active' AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL`
  ).all()
  return c.json({ properties: properties.results })
})

// Stats for homepage
app.get('/api/stats', async (c) => {
  const total = await c.env.DB.prepare("SELECT COUNT(*) as count FROM properties WHERE status = 'active'").first()
  const cities = await c.env.DB.prepare("SELECT COUNT(DISTINCT city) as count FROM properties WHERE status = 'active'").first()
  const types = await c.env.DB.prepare("SELECT property_type, COUNT(*) as count FROM properties WHERE status = 'active' GROUP BY property_type").all()
  return c.json({
    totalProperties: (total as any)?.count || 0,
    totalCities: (cities as any)?.count || 0,
    propertyTypes: types.results
  })
})

// ============================================
// ADMIN ROUTES (Protected)
// ============================================
app.get('/api/admin/properties', adminAuth, async (c) => {
  const properties = await c.env.DB.prepare(
    `SELECT p.*, pi.image_url as primary_image,
     (SELECT COUNT(*) FROM property_views pv WHERE pv.property_id = p.id) as views
     FROM properties p
     LEFT JOIN property_images pi ON pi.property_id = p.id AND pi.is_primary = 1
     ORDER BY p.created_at DESC`
  ).all()
  return c.json({ properties: properties.results })
})

app.post('/api/admin/properties', adminAuth, async (c) => {
  const data = await c.req.json()
  const { title, description, price, sqft, property_type, address, city, state,
    latitude, longitude, bedrooms, bathrooms, year_built,
    contact_name, contact_phone, contact_whatsapp, contact_email,
    is_featured, images, amenities } = data

  if (!title || !description || !price || !sqft || !property_type || !address) {
    return c.json({ error: 'Required fields missing' }, 400)
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO properties (title, description, price, sqft, property_type, address, city, state,
     latitude, longitude, bedrooms, bathrooms, year_built,
     contact_name, contact_phone, contact_whatsapp, contact_email, is_featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(title, description, price, sqft, property_type, address, city || '', state || '',
    latitude || null, longitude || null, bedrooms || 0, bathrooms || 0, year_built || null,
    contact_name || '', contact_phone || '', contact_whatsapp || '', contact_email || '',
    is_featured ? 1 : 0).run()

  const propertyId = result.meta.last_row_id

  // Insert images
  if (images && images.length > 0) {
    for (let i = 0; i < images.length; i++) {
      await c.env.DB.prepare(
        'INSERT INTO property_images (property_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)'
      ).bind(propertyId, images[i], i === 0 ? 1 : 0, i).run()
    }
  }

  // Insert amenities
  if (amenities && amenities.length > 0) {
    for (const amenity of amenities) {
      await c.env.DB.prepare(
        'INSERT INTO property_amenities (property_id, amenity) VALUES (?, ?)'
      ).bind(propertyId, amenity).run()
    }
  }

  return c.json({ id: propertyId, message: 'Property created' }, 201)
})

app.put('/api/admin/properties/:id', adminAuth, async (c) => {
  const id = parseInt(c.req.param('id'))
  const data = await c.req.json()
  const { title, description, price, sqft, property_type, address, city, state,
    latitude, longitude, bedrooms, bathrooms, year_built,
    contact_name, contact_phone, contact_whatsapp, contact_email,
    is_featured, status, images, amenities } = data

  await c.env.DB.prepare(
    `UPDATE properties SET title=?, description=?, price=?, sqft=?, property_type=?, address=?, city=?, state=?,
     latitude=?, longitude=?, bedrooms=?, bathrooms=?, year_built=?,
     contact_name=?, contact_phone=?, contact_whatsapp=?, contact_email=?,
     is_featured=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).bind(title, description, price, sqft, property_type, address, city || '', state || '',
    latitude || null, longitude || null, bedrooms || 0, bathrooms || 0, year_built || null,
    contact_name || '', contact_phone || '', contact_whatsapp || '', contact_email || '',
    is_featured ? 1 : 0, status || 'active', id).run()

  // Update images
  if (images !== undefined) {
    await c.env.DB.prepare('DELETE FROM property_images WHERE property_id = ?').bind(id).run()
    for (let i = 0; i < images.length; i++) {
      await c.env.DB.prepare(
        'INSERT INTO property_images (property_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)'
      ).bind(id, images[i], i === 0 ? 1 : 0, i).run()
    }
  }

  // Update amenities
  if (amenities !== undefined) {
    await c.env.DB.prepare('DELETE FROM property_amenities WHERE property_id = ?').bind(id).run()
    for (const amenity of amenities) {
      await c.env.DB.prepare(
        'INSERT INTO property_amenities (property_id, amenity) VALUES (?, ?)'
      ).bind(id, amenity).run()
    }
  }

  return c.json({ message: 'Property updated' })
})

app.delete('/api/admin/properties/:id', adminAuth, async (c) => {
  const id = parseInt(c.req.param('id'))
  await c.env.DB.prepare('DELETE FROM property_images WHERE property_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM property_amenities WHERE property_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM property_views WHERE property_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM properties WHERE id = ?').bind(id).run()
  return c.json({ message: 'Property deleted' })
})

// Admin stats
app.get('/api/admin/stats', adminAuth, async (c) => {
  const total = await c.env.DB.prepare("SELECT COUNT(*) as count FROM properties").first()
  const active = await c.env.DB.prepare("SELECT COUNT(*) as count FROM properties WHERE status='active'").first()
  const sold = await c.env.DB.prepare("SELECT COUNT(*) as count FROM properties WHERE status='sold'").first()
  const pending = await c.env.DB.prepare("SELECT COUNT(*) as count FROM properties WHERE status='pending'").first()
  const views = await c.env.DB.prepare("SELECT COUNT(*) as count FROM property_views").first()
  const featured = await c.env.DB.prepare("SELECT COUNT(*) as count FROM properties WHERE is_featured=1").first()
  return c.json({
    total: (total as any)?.count || 0,
    active: (active as any)?.count || 0,
    sold: (sold as any)?.count || 0,
    pending: (pending as any)?.count || 0,
    totalViews: (views as any)?.count || 0,
    featured: (featured as any)?.count || 0
  })
})

// ============================================
// SERVE FRONTEND PAGES
// ============================================

// Admin page
app.get('/admin', (c) => c.redirect('/admin/'))
app.get('/admin/*', async (c) => {
  const html = adminHTML
  return c.html(html)
})

// Property detail page
app.get('/property/:id', async (c) => {
  return c.html(mainAppHTML)
})

// Map page
app.get('/map', async (c) => {
  return c.html(mainAppHTML)
})

// Main app (all other routes)
app.get('/', async (c) => {
  return c.html(mainAppHTML)
})

app.get('/*', async (c) => {
  return c.html(mainAppHTML)
})

// ============================================
// HTML TEMPLATES
// ============================================

const mainAppHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#0f172a">
  <title>EstateVue - Premium Real Estate</title>
  <link rel="manifest" href="/static/manifest.json">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="/static/app.css" rel="stylesheet">
</head>
<body class="font-inter">
  <div id="app"></div>
  <script src="/static/app.js"></script>
</body>
</html>`

const adminHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EstateVue Admin Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="/static/admin.css" rel="stylesheet">
</head>
<body class="font-inter">
  <div id="admin-app"></div>
  <script src="/static/admin.js"></script>
</body>
</html>`

export default app
