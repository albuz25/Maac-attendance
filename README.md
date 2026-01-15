# MAAC Student Attendance Portal

A web-based attendance management system for MAAC (Maya Academy of Advanced Cinematics) centers. Built with Next.js 14, Tailwind CSS, Shadcn UI, and Supabase.

## Features

### Centre Manager
- **Batch Management**: Create and manage batches with MWF/TTS schedules
- **Student Management**: Add, edit, and assign students to batches
- **Reports**: View attendance reports with filtering and analytics

### Faculty
- **Daily Attendance**: Mark attendance for assigned batches
- **Smart Filtering**: Only shows batches scheduled for the current day
- **Mobile-Friendly**: Easy attendance marking from any device

### Admin (Coming Soon)
- Bulk student upload via CSV/Excel
- User management (Faculty & Managers)
- Multi-center dashboard

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Shadcn UI
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

3. Edit `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Database Setup

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and run the contents of `supabase/migrations/001_initial_schema.sql`
4. This will create all necessary tables, indexes, and RLS policies

### Creating Initial Users

1. Create a user through Supabase Auth (Dashboard > Authentication > Users)
2. Update the user's role in the database:
   ```sql
   -- For Admin
   UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
   
   -- For Centre Manager
   UPDATE users SET role = 'CENTRE_MANAGER', center_id = '<center_uuid>' WHERE email = 'manager@example.com';
   
   -- For Faculty (default role, but assign to center)
   UPDATE users SET center_id = '<center_uuid>' WHERE email = 'faculty@example.com';
   ```

### Running the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
maac/
├── app/
│   ├── (auth)/             # Authentication pages
│   │   └── login/
│   ├── (dashboard)/        # Protected dashboard pages
│   │   ├── admin/
│   │   ├── centre-manager/
│   │   └── faculty/
│   ├── auth/callback/      # OAuth callback
│   └── layout.tsx
├── components/
│   ├── ui/                 # Shadcn UI components
│   ├── attendance/         # Attendance-specific components
│   ├── batches/            # Batch-related components
│   ├── students/           # Student-related components
│   └── shared/             # Shared layout components
├── lib/
│   ├── supabase/           # Supabase client utilities
│   ├── actions/            # Server actions
│   ├── types.ts            # TypeScript types
│   └── utils.ts            # Utility functions
├── supabase/
│   └── migrations/         # SQL migration scripts
└── middleware.ts           # Auth & RBAC middleware
```

## Role-Based Access

| Role | Access |
|------|--------|
| Admin | All routes, system-wide management |
| Centre Manager | Batches, Students, Reports for their center |
| Faculty | Attendance marking for assigned batches |

## Schedule Types

- **MWF**: Monday, Wednesday, Friday
- **TTS**: Tuesday, Thursday, Saturday

Faculty will only see batches scheduled for the current day on their dashboard.

## License

Private - MAAC Animation Academy

