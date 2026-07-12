# TransitOps — Smart Transport Operations Platform

TransitOps is a modern, unified Transport Operations Platform designed to digitize and streamline fleet, driver, trip, maintenance, fuel, and expense management. It contains two primary components:
1. A **Next.js & Express.js Full-Stack Web Application** featuring a premium real-time operations dashboard.
2. A **Native Odoo 17 Custom Module** (`transit_ops`) featuring robust workflows, RBAC groups, and views.

---

## 🛠️ Tech Stack

### Full-Stack Web App
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: SQLite (Default local setup) / PostgreSQL support via Prisma ORM

### Odoo Custom Module
- **Platform**: Odoo 17 (Community & Enterprise)
- **Backend**: Python (Odoo Framework)
- **Database**: PostgreSQL (Native Odoo)
- **Frontend**: XML Views, QWeb Reports

---

## 📂 Project Structure

```text
TransitOps/
├── frontend/        # Next.js Frontend Application
├── backend/         # Express.js API Server & Prisma Config
├── transit_ops/     # Odoo 17 Custom Module Addon
├── package.json     # Workspace configuration for concurrent running
└── README.md
```

---

## 🚀 Getting Started (Full-Stack Web App)

### 1. Clone the Repository
```bash
git clone https://github.com/udaymakhija07-bot/TransitOps.git
cd TransitOps
```

### 2. Configure Environment Variables
Create a `.env` file inside the `backend` directory:
```bash
cd backend
cp .env.example .env
```
Ensure your `backend/.env` contains the SQLite connection path:
```env
PORT=5005
JWT_SECRET=transitops_secret_key_123
DATABASE_URL="file:./dev.db"
```

### 3. Install Dependencies
Install packages for both backend and frontend:
* **For Backend**:
  ```bash
  cd backend
  npm install
  ```
* **For Frontend**:
  ```bash
  cd ../frontend
  npm install
  ```

### 4. Setup Local SQLite Database
Generate the database schema and seed default mock user accounts and logs:
```bash
cd ../backend
npx prisma db push
node prisma/seed.js
```

### 5. Run the Application
Run both the frontend and backend concurrently with a single command from the project root:
```bash
cd ..
npm run dev
```
- Open **Next.js Frontend**: `http://localhost:3000`
- **Express API Endpoint**: `http://localhost:5005`

---

## 🔐 Mock Users for Demo (Role-Based Access)

At the login screen (`http://localhost:3000/login`), you can log in as any of the following users (all passwords are `password123`):

| Role | Email | Password |
|---|---|---|
| **Fleet Manager** | `manager@transitops.com` | `password123` |
| **Dispatcher** | `driver@transitops.com` | `password123` |
| **Safety Officer** | `safety@transitops.com` | `password123` |
| **Financial Analyst** | `analyst@transitops.com` | `password123` |

*(Quick-login buttons are also provided on the UI for seamless role-switching during live demos)*

---

## 📦 Odoo 17 Module Installation

1. Copy the `transit_ops` folder into your Odoo custom addons directory.
2. Restart your Odoo server.
3. Enable **Developer Mode** in Odoo.
4. Go to **Apps**, click **Update Apps List**, search for `transit_ops`, and click **Activate**.
