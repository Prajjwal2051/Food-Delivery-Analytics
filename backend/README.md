# Food Delivery Analytics

A real-time food delivery analytics dashboard backed by PostgreSQL with Drizzle ORM, Express REST APIs, and JWT-based authentication.

---

## Tech Stack

| Layer      | Technology           |
| ---------- | -------------------- |
| Runtime    | Node.js + TypeScript |
| Framework  | Express.js           |
| ORM        | Drizzle ORM          |
| Database   | PostgreSQL           |
| Auth       | JWT + bcryptjs       |
| Validation | Zod                  |

---

## Project Structure

```
src/
├── db/
│   ├── index.ts               # Drizzle client + pool
│   └── schema/
│       ├── auth.ts            # Auth accounts table
│       ├── restaurants.ts
│       ├── delivery_agents.ts
│       ├── orders.ts
│       └── users.ts
├── middleware/
│   └── authenticate.ts        # JWT verification middleware
├── routes/
│   ├── auth.ts                # POST /api/auth/register, /login, GET /me
│   ├── mapData.ts             # GET /api/map-data
│   ├── restaurant.ts          # GET /api/restaurant/:id
│   └── deliveryPartner.ts     # GET /api/delivery-partner/:id
├── scripts/
│   └── createAdmin.ts         # Seed first admin account
└── index.ts                   # Express app entry point
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET
```

### 3. Push schema to DB

```bash
npm run db:push
```

### 4. Seed admin account

```bash
# Optional: set ADMIN_USERNAME / ADMIN_PASSWORD in .env first
npx ts-node src/scripts/createAdmin.ts
```

### 5. Start the server

```bash
npm run dev         # Development (ts-node)
npm run build && npm start  # Production
```

---

## API Reference

### Authentication

All data endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

#### `POST /api/auth/register`

Create a new account.

```json
// Request body
{ "username": "john", "password": "secret123", "role": "viewer" }

// Response 201
{ "message": "Account created successfully", "user": { "id": 1, "username": "john", "role": "viewer" } }
```

#### `POST /api/auth/login`

Obtain a JWT token.

```json
// Request body
{ "username": "admin", "password": "admin123" }

// Response 200
{ "message": "Login successful", "token": "<jwt>", "user": { ... } }
```

#### `GET /api/auth/me`

Decodes and returns the current authenticated user from the token.

---

### Dashboard Endpoints (All Protected)

#### `GET /api/map-data`

Fetches coordinates and basic details for all restaurants and delivery agents.

```json
{
  "restaurants": [
    { "id": "R001", "name": "...", "latitude": 12.97, "longitude": 77.59, "type": "restaurant", ... }
  ],
  "deliveryAgents": [
    { "id": "D001", "name": "...", "latitude": 12.98, "longitude": 77.60, "status": "Available", "type": "delivery_agent", ... }
  ]
}
```

#### `GET /api/restaurant/:id`

Fetches detailed restaurant info and its recent orders.

```json
{
  "restaurant": { "restaurantId": "R001", "name": "...", "rate": 4.2, ... },
  "currentOrders": [ { "orderId": "ORD001", ... } ],
  "totalOrdersFetched": 12
}
```

#### `GET /api/delivery-partner/:id`

Fetches delivery partner status and assigned orders.

```json
{
  "deliveryPartner": { "deliveryPersonId": "D001", "status": "On Delivery", "ratings": 4.7, ... },
  "assignedOrders": [ { "orderId": "ORD001", ... } ],
  "totalOrdersFetched": 8
}
```

---

## Phases

- ✅ **Phase 1** — Database schema design (Drizzle ORM + PostgreSQL)
- ✅ **Phase 2** — Data seeding and migrations
- ✅ **Phase 3** — Backend API Development (Express + JWT Auth)
- 🔜 **Phase 4** — Frontend Dashboard (Next.js + shadcn/ui + Leaflet map)
