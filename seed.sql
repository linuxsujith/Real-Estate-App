-- Insert default admin (password: admin123 - hashed with simple SHA-256 for demo)
-- In production, use proper bcrypt hashing
INSERT OR IGNORE INTO admins (email, password_hash, name) VALUES 
  ('admin@realestate.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Super Admin');

-- Insert sample properties
INSERT INTO properties (title, description, price, sqft, property_type, address, city, state, latitude, longitude, bedrooms, bathrooms, year_built, contact_name, contact_phone, contact_whatsapp, contact_email, is_featured, status) VALUES
('Luxury Ocean View Villa', 'Stunning 5-bedroom oceanfront villa with panoramic views, infinity pool, and private beach access. Features include gourmet kitchen, home theater, wine cellar, and smart home automation throughout. Perfect for luxury living.', 2850000, 6500, 'villa', '123 Oceanfront Drive', 'Malibu', 'CA', 34.0259, -118.7798, 5, 4, 2020, 'James Wilson', '+1-310-555-0101', '+13105550101', 'james@luxuryestates.com', 1, 'active'),

('Modern Downtown Penthouse', 'Breathtaking penthouse in the heart of downtown with floor-to-ceiling windows, private rooftop terrace, and unobstructed city skyline views. Two-story living space with custom Italian finishes.', 1950000, 3800, 'apartment', '500 High Rise Blvd, PH1', 'Los Angeles', 'CA', 34.0522, -118.2437, 3, 3, 2022, 'Sarah Chen', '+1-213-555-0202', '+12135550202', 'sarah@urbanlivingla.com', 1, 'active'),

('Charming Craftsman Home', 'Beautifully restored 1920s Craftsman with original hardwood floors, built-in cabinetry, and covered front porch. Updated kitchen and bathrooms while preserving historic character. Gorgeous landscaped yard.', 875000, 2200, 'house', '456 Oak Street', 'Pasadena', 'CA', 34.1478, -118.1445, 4, 2, 1925, 'Michael Torres', '+1-626-555-0303', '+16265550303', 'michael@pasadenahomes.com', 0, 'active'),

('Hillside Modern Retreat', 'Architectural masterpiece perched in the Hollywood Hills featuring cantilevered design, walls of glass, and seamless indoor-outdoor living. Heated lap pool with canyon views and private hiking trails.', 3400000, 4200, 'villa', '789 Skyline Terrace', 'Hollywood Hills', 'CA', 34.1341, -118.3215, 4, 5, 2023, 'Elena Rodriguez', '+1-323-555-0404', '+13235550404', 'elena@hillsidehomes.com', 1, 'active'),

('Beachfront Condo', 'Sleek 2-bedroom beachfront condo with direct sand access, wraparound balcony, and resort-style amenities including pool, spa, and fitness center. Recently renovated with designer finishes.', 1250000, 1800, 'condo', '200 Pacific Coast Highway #405', 'Santa Monica', 'CA', 34.0195, -118.4912, 2, 2, 2018, 'David Park', '+1-424-555-0505', '+14245550505', 'david@beachprops.com', 0, 'active'),

('Prime Development Land', 'Flat, buildable 2-acre parcel in prime location with approved plans for 12-unit residential development. All utilities at street, soil reports complete. Rare opportunity for developers.', 1800000, 87120, 'land', '1500 Development Ave', 'Irvine', 'CA', 33.6846, -117.8265, 0, 0, NULL, 'Robert Kim', '+1-949-555-0606', '+19495550606', 'robert@oclots.com', 0, 'active'),

('Spanish Colonial Estate', 'Magnificent Spanish Colonial estate on 1.5 acres with clay tile roof, arched doorways, hand-painted tiles, and central courtyard with fountain. Guest house, pool, and mature gardens.', 4200000, 7800, 'villa', '800 Hacienda Lane', 'Santa Barbara', 'CA', 34.4208, -119.6982, 6, 7, 2015, 'Isabella Martinez', '+1-805-555-0707', '+18055550707', 'isabella@sbhomes.com', 1, 'active'),

('Cozy Studio Apartment', 'Bright and modern studio in sought-after neighborhood with high ceilings, in-unit laundry, and large windows. Walking distance to restaurants, shops, and metro station. Ideal for young professionals.', 425000, 650, 'apartment', '350 Urban Way #201', 'Silver Lake', 'CA', 34.0869, -118.2702, 0, 1, 2021, 'Amy Nguyen', '+1-323-555-0808', '+13235550808', 'amy@silverlakeapts.com', 0, 'active'),

('Suburban Family Home', 'Spacious family home in top-rated school district with open floor plan, chef kitchen, large backyard with play area, and 3-car garage. Community pool, parks, and trails nearby.', 950000, 3200, 'house', '222 Maple Court', 'Thousand Oaks', 'CA', 34.1706, -118.8376, 5, 3, 2017, 'Karen Williams', '+1-805-555-0909', '+18055550909', 'karen@tokorealty.com', 0, 'active'),

('Industrial Loft Conversion', 'Unique live-work loft in converted warehouse with 16-foot ceilings, exposed brick and ductwork, polished concrete floors, and massive factory windows. Private roof deck with downtown views.', 780000, 2000, 'apartment', '100 Arts District Way #3B', 'Downtown LA', 'CA', 34.0407, -118.2352, 2, 2, 2019, 'Chris Blake', '+1-213-555-1010', '+12135551010', 'chris@artsdistrictlofts.com', 0, 'active');

-- Insert property images
INSERT INTO property_images (property_id, image_url, is_primary, sort_order) VALUES
(1, 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800', 1, 0),
(1, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 0, 1),
(1, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 0, 2),
(2, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 1, 0),
(2, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 0, 1),
(2, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', 0, 2),
(3, 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', 1, 0),
(3, 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800', 0, 1),
(4, 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800', 1, 0),
(4, 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800', 0, 1),
(4, 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800', 0, 2),
(5, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', 1, 0),
(5, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 0, 1),
(6, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800', 1, 0),
(6, 'https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=800', 0, 1),
(7, 'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800', 1, 0),
(7, 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800', 0, 1),
(7, 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800', 0, 2),
(8, 'https://images.unsplash.com/photo-1560448075-cbc16bb4af8e?w=800', 1, 0),
(9, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 1, 0),
(9, 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800', 0, 1),
(10, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', 1, 0),
(10, 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=800', 0, 1);

-- Insert amenities
INSERT INTO property_amenities (property_id, amenity) VALUES
(1, 'Pool'), (1, 'Gym'), (1, 'Garage'), (1, 'Garden'), (1, 'Smart Home'), (1, 'Beach Access'),
(2, 'Gym'), (2, 'Concierge'), (2, 'Rooftop'), (2, 'Parking'), (2, 'Smart Home'),
(3, 'Garden'), (3, 'Garage'), (3, 'Porch'), (3, 'Fireplace'),
(4, 'Pool'), (4, 'Garden'), (4, 'Smart Home'), (4, 'Home Theater'), (4, 'Hiking Trails'),
(5, 'Pool'), (5, 'Gym'), (5, 'Beach Access'), (5, 'Parking'), (5, 'Spa'),
(7, 'Pool'), (7, 'Garden'), (7, 'Guest House'), (7, 'Fountain'), (7, 'Garage'),
(8, 'Laundry'), (8, 'Metro Access'),
(9, 'Pool'), (9, 'Garage'), (9, 'Garden'), (9, 'Park Access'),
(10, 'Roof Deck'), (10, 'Parking'), (10, 'Gym');
