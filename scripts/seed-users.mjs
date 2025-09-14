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

  console.log('\n🎉 Done! Test accounts use password: 12345678');
}

main().catch((err) => {
  console.error('❌ Seeding failed');
  console.error(err);
  process.exit(1);
});
