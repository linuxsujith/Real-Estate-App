# EstateVue - Premium Real Estate PWA

A modern, production-ready real estate web application with a premium Airbnb/Zillow-inspired UI. Built as a Progressive Web App (PWA) that works beautifully on both Android and iOS devices.

## Live URLs

- **Main App**: [https://3000-im5al8gxyp85ma8je0xg3-5185f4aa.sandbox.novita.ai](https://3000-im5al8gxyp85ma8je0xg3-5185f4aa.sandbox.novita.ai)
- **Admin Dashboard**: [https://3000-im5al8gxyp85ma8je0xg3-5185f4aa.sandbox.novita.ai/admin/](https://3000-im5al8gxyp85ma8je0xg3-5185f4aa.sandbox.novita.ai/admin/)

## Admin Credentials

- **Email**: `admin@realestate.com`
- **Password**: `admin123`

## Features

### Public User Features
- **Home Screen**: Browse property listings with beautiful cards showing image, title, price, location, sqft
- **Search**: Full-text search by location, city, address
- **Filters**: Filter by property type (House, Apartment, Villa, Condo, Land, Townhouse), price range, size, bedrooms
- **Sorting**: Sort by Newest, Price Low/High, Largest
- **Property Details**: Full detail page with swipeable image gallery, description, stats, amenities, map
- **Contact Owner**: Hidden contact details revealed on button click (phone, WhatsApp, email)
- **Map View**: See all properties on a map with scrollable property cards
- **Wishlist**: Save/unsave properties (persisted in localStorage)
- **Share**: Share properties via WhatsApp, X (Twitter), Facebook, or copy link
- **Dark/Light Mode**: Toggle between themes with persistent preference
- **Skeleton Loading**: Beautiful loading states while data fetches
- **PWA**: Installable on mobile devices as a native-like app

### Admin Dashboard (Protected)
- **Secure Login**: Email + password authentication with JWT tokens
- **Dashboard**: Overview stats (total properties, active, sold, pending, views, featured)
- **Add Property**: Complete form with all fields - images (via URL), amenities, location, contact details
- **Edit Property**: Modify all fields with live updates
- **Delete Property**: Confirmation popup before deletion
- **Property Management**: View all listings in sortable table
- **Session Persistence**: Stay logged in across page refreshes
- **Route Protection**: All admin API routes protected by JWT middleware

### Security
- Admin routes protected by JWT authentication middleware
- Public users can ONLY read data - all write operations require valid admin token
- Input validation on all API endpoints
- Unauthorized access returns 401 errors
- Token expiration (7 days)

## Tech Stack

- **Backend**: Hono (TypeScript) on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vanilla JS with premium CSS (no framework overhead)
- **Styling**: Tailwind CSS (CDN) + Custom CSS variables
- **Icons**: Font Awesome 6
- **Font**: Inter (Google Fonts)
- **Maps**: OpenStreetMap (embeds) + Google Maps links
- **Auth**: Custom JWT implementation (SHA-256)
- **Deployment**: Cloudflare Pages

## Data Architecture

### Database Tables
- `admins` - Admin user accounts with hashed passwords
- `properties` - Main property listings (title, description, price, sqft, type, location, contact, etc.)
- `property_images` - Multiple images per property with primary flag
- `property_amenities` - Amenity tags per property
- `property_views` - View tracking for analytics

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/properties` | Public | List properties with search, filter, sort, pagination |
| GET | `/api/properties/:id` | Public | Get property details with images & amenities |
| GET | `/api/properties/:id/contact` | Public | Get contact details (revealed on click) |
| GET | `/api/properties/map/all` | Public | Get all properties with coordinates for map |
| GET | `/api/stats` | Public | Get property statistics |
| POST | `/api/auth/login` | Public | Admin login |
| GET | `/api/auth/me` | Admin | Verify admin session |
| GET | `/api/admin/properties` | Admin | List all properties with views count |
| POST | `/api/admin/properties` | Admin | Create new property |
| PUT | `/api/admin/properties/:id` | Admin | Update property |
| DELETE | `/api/admin/properties/:id` | Admin | Delete property |
| GET | `/api/admin/stats` | Admin | Dashboard statistics |

## Project Structure

```
webapp/
├── src/
│   └── index.tsx           # Hono backend (API + page serving)
├── public/static/
│   ├── app.css             # Main app styles (dark/light, animations)
│   ├── app.js              # Main app frontend (SPA router, components)
│   ├── admin.css           # Admin dashboard styles
│   ├── admin.js            # Admin dashboard frontend
│   └── manifest.json       # PWA manifest
├── migrations/
│   └── 0001_initial_schema.sql  # Database schema
├── seed.sql                # Sample data (10 properties)
├── ecosystem.config.cjs    # PM2 configuration
├── wrangler.jsonc          # Cloudflare configuration
├── vite.config.ts          # Vite build configuration
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## UI/UX Design

- **Premium, modern, minimal** design inspired by Airbnb and Zillow
- Rounded cards with smooth shadows
- Dark + Light mode with smooth transitions
- Color palette: Blue primary (#2563eb), Gold accent (#c9a84c), clean whites/grays
- Smooth animations (fade, slide, scale transitions)
- Mobile-first responsive design
- Bottom navigation bar for mobile
- Skeleton loading states
- Blur backdrop effects on overlays
- Touch-friendly gallery with swipe gestures

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Apply database migrations (local)
npm run db:migrate:local

# Seed sample data
npm run db:seed

# Start dev server
npm run dev:sandbox

# Reset database (wipe + migrate + seed)
npm run db:reset
```

## Deployment

```bash
# Build and deploy to Cloudflare Pages
npm run deploy
```

## Status
- **Platform**: Cloudflare Pages + D1
- **Status**: Active
- **Last Updated**: 2026-03-23
