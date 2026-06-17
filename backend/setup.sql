-- ============================================================
-- UNOM Result Analyzer — Supabase Setup Script
-- Run this ENTIRE script in Supabase SQL Editor (one-shot)
-- ============================================================

-- 1. PROFILES TABLE (linked to Supabase Auth users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  role text default 'teacher',
  department text not null
);

-- 2. BATCHES TABLE
create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  department text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  total_students int default 0
);

-- 3. STUDENTS TABLE
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references batches(id) on delete cascade,
  regno text,
  name text,
  dob text,
  overall text
);

-- 4. SUBJECTS TABLE
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  subject_code text,
  ue text,
  ia text,
  total text,
  result text,
  remark text
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Profiles: user can only read/update their own profile
alter table profiles enable row level security;
create policy "Own profile" on profiles for select using (auth.uid() = id);
create policy "Own profile update" on profiles for update using (auth.uid() = id);
-- Allow service role to manage all profiles (admin endpoints)
create policy "Service role full access" on profiles for all using (auth.role() = 'service_role');

-- Batches: teachers see only their department's batches
alter table batches enable row level security;
create policy "Department batches select" on batches for select
  using (department = (select department from profiles where id = auth.uid()));
create policy "Department batches insert" on batches for insert
  with check (department = (select department from profiles where id = auth.uid()));
create policy "Department batches delete" on batches for delete
  using (department = (select department from profiles where id = auth.uid()));
create policy "Service batches" on batches for all using (auth.role() = 'service_role');

-- Students: accessible if batch is in user's department
alter table students enable row level security;
create policy "Students via dept batch" on students for select
  using (batch_id in (
    select id from batches
    where department = (select department from profiles where id = auth.uid())
  ));
create policy "Students insert" on students for insert
  with check (batch_id in (
    select id from batches
    where department = (select department from profiles where id = auth.uid())
  ));
create policy "Students delete" on students for delete
  using (batch_id in (
    select id from batches
    where department = (select department from profiles where id = auth.uid())
  ));
create policy "Service students" on students for all using (auth.role() = 'service_role');

-- Subjects: accessible via student → batch → department chain
alter table subjects enable row level security;
create policy "Subjects via dept" on subjects for select
  using (student_id in (
    select s.id from students s
    join batches b on s.batch_id = b.id
    where b.department = (select department from profiles where id = auth.uid())
  ));
create policy "Subjects insert" on subjects for insert
  with check (student_id in (
    select s.id from students s
    join batches b on s.batch_id = b.id
    where b.department = (select department from profiles where id = auth.uid())
  ));
create policy "Subjects delete" on subjects for delete
  using (student_id in (
    select s.id from students s
    join batches b on s.batch_id = b.id
    where b.department = (select department from profiles where id = auth.uid())
  ));
create policy "Service subjects" on subjects for all using (auth.role() = 'service_role');
