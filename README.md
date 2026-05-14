# RideShare / Food Delivery Analytics

A full-stack, real-time analytics dashboard for managing and visualizing a food delivery or rideshare network. This project features a robust Express.js backend with PostgreSQL, and a modern, high-performance Next.js frontend with live map visualizations.

![System Diagram](./Assets/diagram.png)

---

## 🚀 Tech Stack

### Frontend (`/frontend`)

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** Zustand
- **Map Visualization:** `@mapcn/map` (powered by MapLibre GL)
- **API Client:** Axios
- **Forms & Validation:** React Hook Form + Zod

### Backend (`/backend`)

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Authentication:** JWT (JSON Web Tokens) + bcryptjs

---

## 📂 Project Structure

```text
RideShare/
├── backend/                  # Express.js REST API & Database Models
│   ├── src/
│   │   ├── db/               # Drizzle ORM schema & client
│   │   ├── middleware/       # JWT Authentication middleware
│   │   ├── routes/           # API Endpoints (Auth, Map Data, etc.)
│   │   └── index.ts          # Server entry point
│   └── package.json
│
├── frontend/                 # Next.js Dashboard Application
│   ├── src/
│   │   ├── app/              # Next.js App Router (Auth & Dashboard pages)
│   │   ├── components/ui/    # shadcn/ui components (including Map)
│   │   └── lib/              # Zustand store & Axios API client
│   └── package.json
│
└── Assets/ & Blueprint/      # Project mockups and CSV data
```

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**
- **PostgreSQL** database server (running locally or remotely)

---

## ⚙️ Getting Started

Follow these steps to set up and run both the backend and frontend environments.

### 1. Backend Setup

Open a terminal and navigate to the `backend` directory:

```bash
cd backend
```

**Install Dependencies:**

```bash
npm install
```

**Configure Environment Variables:**

1. Copy the example `.env` file to a new `.env` file.
   ```bash
   cp .env.example .env
   ```
2. Open the `.env` file and update your PostgreSQL connection string (`DATABASE_URL`) to match your local database instance:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/food_delivery_analytics
   ```

**Initialize the Database:**
Push the Drizzle ORM schema to your PostgreSQL database.

```bash
npm run db:push
```

_(Optional)_ Seed an admin account:

```bash
npx ts-node src/scripts/createAdmin.ts
```

**Start the Backend Server:**

```bash
npm run dev
```

_The backend API will run on `http://localhost:4000`._

---

### 2. Frontend Setup

Open a **new** terminal and navigate to the `frontend` directory:

```bash
cd frontend
```

**Install Dependencies:**

```bash
npm install
```

**Configure Environment Variables:**
_(Optional)_ If you want to customize the backend URL, you can create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

**Start the Frontend Server:**

```bash
npm run dev
```

_The Next.js application will run on `http://localhost:4001`._

---

## 📖 Usage Guide

1. Ensure both the **Backend** and **Frontend** servers are running simultaneously.
2. Open your browser and navigate to the frontend URL (typically `http://localhost:4001`).
3. You will be redirected to the **Login** screen.
4. Click **"Register"** to create a new account (e.g., `username: admin`, `password: admin123`).
5. After successfully logging in, you will be directed to the **Map Dashboard**, where you can visualize live coordinates of your delivery network.
6. Click on any Restaurant or Delivery Agent marker on the map to access their detailed metric views and order history.

---

## ✨ Features

- **Live Tracking:** Interactive map featuring custom markers and popups for entities using `@mapcn/map`.
- **Deep Integrations:** Drill-down views into individual restaurant performance, active order status, and agent delivery histories.
- **Secure Authentication:** Complete end-to-end JWT integration with route protection.
- **Premium Aesthetics:** A cutting-edge dark mode interface designed with Tailwind CSS and `shadcn/ui`.
