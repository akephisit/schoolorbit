import { neon } from '@neondatabase/serverless';
import argon2 from 'argon2';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Simple seeding script to insert test users and their profiles.
 * Uses direct SQL so it can run with plain Node (no ts-node/tsx needed).
 */

// Try to load .env if vars are missing when running via Node
function loadDotEnvFallback() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      // Strip surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  } catch {}
}

if (!process.env.DATABASE_URL) {
  loadDotEnvFallback();
}

const { DATABASE_URL, NATIONAL_ID_SALT } = process.env;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not defined');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

function hashNationalId(nationalId) {
  const salt = NATIONAL_ID_SALT ?? 'default_salt';
  const hasher = createHash('sha256');
  hasher.update(salt);
  hasher.update(String(nationalId));
  return hasher.digest('hex');
}

async function upsertUser({ email, displayName, passwordHash, status = 'active' }) {
  // Insert user if not exists; return id either way
  const res = await sql`
    INSERT INTO app_user (email, display_name, password_hash, status)
    VALUES (${email}, ${displayName}, ${passwordHash}, ${status})
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id, email;
  `;
  return res[0];
}

async function ensurePersonnelProfile({ userId, nationalId, firstName, lastName, position, department }) {
  const nationalIdHash = hashNationalId(nationalId);
  await sql`
    INSERT INTO personnel_profile (user_id, national_id_hash, first_name, last_name, position, department)
    VALUES (${userId}, ${nationalIdHash}, ${firstName}, ${lastName}, ${position}, ${department})
    ON CONFLICT (national_id_hash) DO NOTHING;
  `;
}

async function ensureStudentProfile({ userId, studentCode, firstName, lastName, grade, classroom }) {
  await sql`
    INSERT INTO student_profile (user_id, student_code, first_name, last_name, grade, classroom)
    VALUES (${userId}, ${studentCode}, ${firstName}, ${lastName}, ${grade}, ${classroom})
    ON CONFLICT (student_code) DO NOTHING;
  `;
}

async function ensureGuardianProfile({ userId, nationalId, firstName, lastName, phoneNumber, relation }) {
  const nationalIdHash = hashNationalId(nationalId);
  await sql`
    INSERT INTO guardian_profile (user_id, national_id_hash, first_name, last_name, phone_number, relation)
    VALUES (${userId}, ${nationalIdHash}, ${firstName}, ${lastName}, ${phoneNumber}, ${relation})
    ON CONFLICT (national_id_hash) DO NOTHING;
  `;
}

async function main() {
  console.log('Starting test data seeding...');
  const passwordHash = await argon2.hash('12345678');

  // Teacher (personnel)
  const teacher = await upsertUser({
    email: 'teacher@school.test',
    displayName: 'อาจารย์สมชาย',
    passwordHash
  });
  await ensurePersonnelProfile({
    userId: teacher.id,
    nationalId: '1234567890123',
    firstName: 'สมชาย',
    lastName: 'ใจดี',
    position: 'ครู',
    department: 'คณิตศาสตร์'
  });
  console.log(`✅ Teacher ready: ${teacher.email}`);

  // Student
  const student = await upsertUser({
    email: 'student@school.test',
    displayName: 'นักเรียนสมหญิง',
    passwordHash
  });
  await ensureStudentProfile({
    userId: student.id,
    studentCode: 'STU001',
    firstName: 'สมหญิง',
    lastName: 'เรียนดี',
    grade: 'ม.6',
    classroom: '6/1'
  });
  console.log(`✅ Student ready: ${student.email}`);

  // Guardian
  const guardian = await upsertUser({
    email: 'parent@school.test',
    displayName: 'ผู้ปกครองสมศรี',
    passwordHash
  });
  await ensureGuardianProfile({
    userId: guardian.id,
    nationalId: '9876543210123',
    firstName: 'สมศรี',
    lastName: 'รักลูก',
    phoneNumber: '081-234-5678',
    relation: 'mother'
  });
  console.log(`✅ Guardian ready: ${guardian.email}`);

  // Admin (also personnel)
  const admin = await upsertUser({
    email: 'admin@school.test',
    displayName: 'ผู้ดูแลระบบ',
    passwordHash
  });
  await ensurePersonnelProfile({
    userId: admin.id,
    nationalId: '5555555555555',
    firstName: 'ผู้ดูแล',
    lastName: 'ระบบ',
    position: 'ผู้ดูแลระบบ',
    department: 'IT'
  });
  console.log(`✅ Admin ready: ${admin.email}`);

  // ---- RBAC ----
  console.log('\nSeeding RBAC (roles, permissions, mappings)...');

  // helper lookups/creations
  async function getRoleId(code, name) {
    const found = await sql`SELECT id FROM role WHERE code = ${code} LIMIT 1`;
    if (found.length) return found[0].id;
    const ins = await sql`INSERT INTO role (code, name) VALUES (${code}, ${name}) RETURNING id`;
    return ins[0].id;
  }
  async function getPermId(code, name) {
    const found = await sql`SELECT id FROM permission WHERE code = ${code} LIMIT 1`;
    if (found.length) return found[0].id;
    const ins = await sql`INSERT INTO permission (code, name) VALUES (${code}, ${name}) RETURNING id`;
    return ins[0].id;
  }
  async function ensureRolePerm(roleId, permId) {
    const exists = await sql`SELECT 1 FROM role_permission WHERE role_id = ${roleId} AND permission_id = ${permId} LIMIT 1`;
    if (!exists.length) {
      await sql`INSERT INTO role_permission (role_id, permission_id) VALUES (${roleId}, ${permId})`;
    }
  }
  async function ensureUserRole(userId, roleId) {
    const exists = await sql`SELECT 1 FROM user_role WHERE user_id = ${userId} AND role_id = ${roleId} LIMIT 1`;
    if (!exists.length) {
      await sql`INSERT INTO user_role (user_id, role_id) VALUES (${userId}, ${roleId})`;
    }
  }

  // Define roles and permissions
  const roleDefs = [
    ['admin', 'Administrator'],
    ['teacher', 'Teacher'],
    ['student', 'Student'],
    ['guardian', 'Guardian']
  ];
  const permDefs = [
    ['class:read', 'Read Classes'],
    ['attend:read', 'Read Attendance'],
    ['attend:write', 'Write Attendance'],
    ['grade:read', 'Read Grades'],
    ['user:manage', 'Manage Users']
  ];

  const roleIds = {};
  for (const [code, name] of roleDefs) {
    roleIds[code] = await getRoleId(code, name);
  }
  const permIds = {};
  for (const [code, name] of permDefs) {
    permIds[code] = await getPermId(code, name);
  }

  // Map role -> permissions
  const grants = {
    admin: permDefs.map(([c]) => c),
    teacher: ['class:read', 'attend:read', 'attend:write', 'grade:read'],
    student: ['class:read', 'grade:read'],
    guardian: ['class:read', 'grade:read']
  };
  for (const [rCode, perms] of Object.entries(grants)) {
    for (const pCode of perms) {
      await ensureRolePerm(roleIds[rCode], permIds[pCode]);
    }
  }

  // Assign roles to users
  await ensureUserRole(teacher.id, roleIds.teacher);
  await ensureUserRole(student.id, roleIds.student);
  await ensureUserRole(guardian.id, roleIds.guardian);
  await ensureUserRole(admin.id, roleIds.admin);
  console.log('✅ RBAC seeded');

  // ---- Menu items ----
  console.log('Seeding menu items...');
  const countRes = await sql`SELECT COUNT(*)::int AS c FROM menu_item`;
  const count = countRes[0]?.c ?? 0;
  if (count === 0) {
    const items = [
      { label: 'Dashboard', href: '/dashboard', icon: 'home', requires: null, sort: 0 },
      { label: 'Classes', href: '/classes', icon: 'book', requires: ['class:read'], sort: 10 },
      { label: 'Attendance', href: '/attendance', icon: 'calendar', requires: ['attend:read'], sort: 20 },
      { label: 'Record Attendance', href: '/attendance/mark', icon: 'check', requires: ['attend:write'], sort: 30 },
      { label: 'Grades', href: '/grades', icon: 'award', requires: ['grade:read'], sort: 40 },
      { label: 'Users', href: '/users', icon: 'users', requires: ['user:manage'], sort: 50 }
    ];
    for (const it of items) {
      await sql`
        INSERT INTO menu_item (label, href, icon, required_permissions, sort_order, is_active)
        VALUES (${it.label}, ${it.href}, ${it.icon}, ${it.requires ? JSON.stringify(it.requires) : null}, ${it.sort}, true)
      `;
    }
    console.log('✅ Menu items created');
  } else {
    console.log('ℹ️ Menu already has items; skipped');
  }

  console.log('\n🎉 Done! Test accounts use password: 12345678');
}

main().catch((err) => {
  console.error('❌ Seeding failed');
  console.error(err);
  process.exit(1);
});
