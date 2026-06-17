# UNOM Result Analyzer

A full-stack web application to scrape, analyze, and compare Madras University (UNOM) examination results.

## Features

- 🔐 **Authentication** — Supabase Auth with role-based access (admin/teacher)
- 📊 **Dashboard** — View results with pass/fail stats, subject-wise breakdown (UE/IA/Total)
- 📁 **Multi-Semester** — Store and browse multiple exam batches
- 🔄 **Compare** — Side-by-side pass rate comparison between batches
- 📥 **Excel Export** — Download results as formatted `.xlsx` files
- 👥 **Admin Panel** — Create/delete teacher accounts, reset passwords
- 🏢 **Department Isolation** — Row-Level Security ensures teachers see only their department's data

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Python FastAPI |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + RLS |
| Styling | Vanilla CSS (dark theme) |

## Setup

### 1. Supabase

- Create a Supabase project
- Run `backend/setup.sql` in the SQL Editor
- Create an admin user in Supabase Auth dashboard

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in your Supabase credentials in .env
pip install -r requirements.txt
python main.py
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. CSV Format

```
regno,dob,name
422400294,12/10/2005,DEEPAK PASWAN
```

## Test Accounts

| Username | Password | Role | Department |
|----------|----------|------|------------|
| admin | admin123 | admin | admin |
| deepak | deepak123 | teacher | BCA |

## License

MIT
