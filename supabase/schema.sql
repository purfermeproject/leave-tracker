-- Leave Tracker — PostgreSQL Schema
-- Run this in your Supabase SQL Editor (https://app.supabase.com → SQL Editor)

-- ─── Employees ───────────────────────────────────────────────────────────────
create table if not exists employees (
  id           uuid primary key default gen_random_uuid(),
  name         text        not null,
  email        text        not null unique,
  role         text        not null default 'Employee',
  joining_date date        not null default current_date,
  created_at   timestamptz not null default now()
);

-- ─── Leave Requests ──────────────────────────────────────────────────────────
create table if not exists leave_requests (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid        not null references employees(id) on delete cascade,
  type        text        not null check (type in (
                'Annual','Sick','Menstrual','Casual',
                'Maternity','Paternity','Compassionate','Marriage'
              )),
  start_date  date        not null,
  end_date    date        not null check (end_date >= start_date),
  status      text        not null default 'Pending'
                          check (status in ('Pending','Approved','Rejected')),
  reason      text,
  applied_at  timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_leave_requests_employee on leave_requests(employee_id);
create index if not exists idx_leave_requests_status   on leave_requests(status);

-- ─── Row Level Security (optional but recommended) ───────────────────────────
-- Uncomment the lines below if you want RLS enabled.
-- alter table employees     enable row level security;
-- alter table leave_requests enable row level security;
-- create policy "Public read" on employees     for select using (true);
-- create policy "Public read" on leave_requests for select using (true);
-- create policy "Public insert" on employees     for insert with check (true);
-- create policy "Public insert" on leave_requests for insert with check (true);
