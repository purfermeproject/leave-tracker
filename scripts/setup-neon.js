import pg from 'pg';
const { Client } = pg;

// DNS can't resolve neon.tech on this machine, so we use the IP directly
// (resolved via: nslookup ep-fragrant-fog-am9udf2t.c-5.us-east-1.aws.neon.tech 8.8.8.8)
const NEON_HOST = 'ep-fragrant-fog-am9udf2t.c-5.us-east-1.aws.neon.tech';
const NEON_IP   = '54.209.204.248';

const client = new Client({
  host:     NEON_IP,
  port:     5432,
  database: 'neondb',
  user:     'neondb_owner',
  password: 'npg_c5QOSo0zMXRG',
  ssl: {
    rejectUnauthorized: false,
    servername: NEON_HOST, // SNI so Neon routes to the right compute
  },
});

const schema = `
  create table if not exists employees (
    id           uuid primary key default gen_random_uuid(),
    name         text        not null,
    email        text        not null unique,
    role         text        not null default 'Employee',
    joining_date date        not null default current_date,
    created_at   timestamptz not null default now()
  );

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

  create index if not exists idx_leave_requests_employee on leave_requests(employee_id);
  create index if not exists idx_leave_requests_status   on leave_requests(status);
`;

async function run() {
  console.log('Connecting to Neon via IP...');
  await client.connect();
  console.log('Connected! Running schema...');
  await client.query(schema);
  console.log('Done! Tables created successfully on Neon.');
  await client.end();
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
