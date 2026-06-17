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
|-------|------------|
| Frontend | React + Vite |
| Backend | Python FastAPI |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + RLS |
| Styling | Vanilla CSS (dark theme) |

## Setup

### 1. Supabase

- Create a [Supabase](https://supabase.com) project
- Run `backend/setup.sql` in the SQL Editor to create tables and RLS policies
- Create an admin user in Supabase Auth dashboard

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in your Supabase credentials in .env
pip install -r requirements.txt
python main.py
```

#### Environment Variables

Create a `.env` file in the `backend/` directory (see `.env.example`):

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

> ⚠️ **Never commit your `.env` file.** The `.gitignore` is configured to exclude it.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend connects to the backend API. Set the `VITE_API_URL` environment variable if your backend runs on a different host:

```bash
# Optional: defaults to http://localhost:10000
VITE_API_URL=https://your-backend-url.com
```

### 4. CSV Format

Upload a CSV file with the following format:

```csv
regno,dob,name
123456789,01/01/2000,STUDENT NAME
987654321,15/06/2001,ANOTHER STUDENT
```

| Column | Description | Example |
|--------|-------------|---------|
| `regno` | Student register number | `123456789` |
| `dob` | Date of birth (DD/MM/YYYY) | `01/01/2000` |
| `name` | Student full name | `STUDENT NAME` |

See [`sample.csv`](sample.csv) for a working example.

## Default Accounts

After running `backend/create_admin.py`, you can create accounts via the Admin Panel:

| Username | Password | Role | Department |
|----------|----------|------|------------|
| `your_admin` | `your_password` | admin | admin |
| `teacher1` | `teacher_pass` | teacher | BCA |

> 🔒 **Change default passwords immediately after first login.**

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI server
│   ├── auth.py              # Auth middleware
│   ├── scraper.py           # UNOM result scraper
│   ├── supabase_client.py   # Supabase client factory
│   ├── create_admin.py      # Admin account setup
│   ├── setup.sql            # Database schema & RLS
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment template
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # Auth context
│   │   ├── App.jsx          # Main app
│   │   └── index.css        # Global styles
│   └── index.html           # Entry point
├── sample.csv               # Example CSV upload
└── README.md
```

## License

MIT
