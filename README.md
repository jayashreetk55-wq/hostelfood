# 🍽️ College Hostel Food Waste Tracker

A full-stack web app to track daily food waste and carbon emissions in a college hostel mess. Built with **Node.js + Express + SQLite + Vanilla JS + Chart.js**.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Seed the database (creates tables + sample data)
```bash
npm run seed
```

### 3. Start the server
```bash
npm run dev      # development (auto-restart with nodemon)
# OR
npm start        # production
```

### 4. Open in browser
```
http://localhost:3000
```
> **Note:** Sign-in is skipped by default — the app opens straight to the Dashboard with full administrative access.

- **Admin** — full access including food item management
- **Manager** — can create menus, log waste, generate reports
- **Viewer** — read-only access to dashboard and reports

---

## 📁 Project Structure

```
College-Hostel-Food-Waste-Tracker/
├── server/
│   ├── app.js              # Express app setup
│   ├── server.js           # HTTP server entry point
│   ├── config/database.js  # SQLite connection (sqlite3)
│   ├── db/
│   │   ├── schema.sql      # Table definitions
│   │   └── migrate.js      # Run schema
│   ├── models/             # All DB query functions
│   ├── controllers/        # Business logic
│   ├── routes/             # API route definitions
│   ├── middleware/         # Auth guard, error handler
│   └── utils/             # emissionCalculator, csvExporter, seedData
└── public/
    ├── index.html          # Login page
    ├── dashboard.html      # Charts & stats
    ├── menu.html           # Daily menus
    ├── waste-entry.html    # Log food waste
    ├── reports.html        # Reports & export
    ├── settings.html       # Food items management
    ├── css/               # All stylesheets
    └── js/                # All JavaScript modules
```

---

## 🧮 Calculation Formulas

**Waste Percentage:**
```
waste_pct = (quantity_wasted / quantity_planned) × 100
```

**Carbon Emission:**
```
carbon_kg = quantity_wasted × emission_factor
```

**Emission Factors (IPCC/FAO):**
| Food | kg CO₂ per kg wasted |
|------|----------------------|
| Beef/Mutton | 27.0 |
| Chicken | 6.9 |
| Eggs | 4.8 |
| Paneer/Dairy | 3.2 |
| Rice | 2.7 |
| Chapati | 1.4 |
| Dal | 0.9 |
| Vegetables | 0.4 |
| Fruits | 0.3 |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/dashboard/summary | Today's totals + CO₂ context |
| GET | /api/dashboard/weekly | Last 7 days chart data |
| GET | /api/dashboard/by-meal | Waste by meal type |
| GET | /api/dashboard/top-wasted | Top 5 most wasted items |
| GET | /api/dashboard/emissions-trend | 30-day CO₂ trend |
| GET/POST | /api/menus | List / create menus |
| POST | /api/menus/:id/items | Add item to menu |
| GET/POST | /api/waste | List / log waste entries |
| PUT | /api/waste/:id | Correct a waste entry |
| GET | /api/reports/daily | Daily waste report |
| GET | /api/reports/monthly | Monthly aggregation |
| GET | /api/reports/export/csv | Download CSV |
| GET/POST/PUT/DELETE | /api/settings/food-items | Food item CRUD |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3 (custom), Vanilla JS (ES6) |
| Charts | Chart.js (CDN) |
| Backend | Node.js + Express.js |
| Database | SQLite via `sqlite3` npm package |
| Auth | express-session + bcrypt |
| Calculations | Pure JS (emissionCalculator.js) |
