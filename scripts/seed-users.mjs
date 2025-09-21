import { neon } from '@neondatabase/serverless';
import argon2 from 'argon2';
import { createHash } from 'crypto';
import crypto from 'crypto';
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

function getEncKey() {
  const b64 = process.env.NATIONAL_ID_ENC_KEY;
  if (b64) {
    try {
      const buf = Buffer.from(b64, 'base64');
      if (buf.length === 32) return buf; // AES-256-GCM requires 32-byte key
    } catch {}
  }
  const h = createHash('sha256');
  h.update('enc-key');
  h.update(NATIONAL_ID_SALT ?? 'default_salt');
  return h.digest();
}

function encryptPII(plaintext) {
  const key = getEncKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), ct.toString('base64'), tag.toString('base64')].join('.');
}

async function upsertUser({ email, displayName, title, firstName, lastName, passwordHash, status = 'active', nationalId }) {
  const nationalIdHash = hashNationalId(nationalId);
  const nationalIdEnc = encryptPII(nationalId);
  const resolvedDisplayName = (displayName ?? '').trim() || [title, firstName, lastName].filter(Boolean).join(' ').trim();
  if (!resolvedDisplayName) {
    throw new Error('displayName or name parts must be provided for user seeding');
  }
  // Insert or update user with centralized national id fields
  const res = await sql`
    INSERT INTO app_user (email, display_name, title, first_name, last_name, password_hash, status, national_id_hash, national_id_enc)
    VALUES (${email}, ${resolvedDisplayName}, ${title ?? null}, ${firstName ?? null}, ${lastName ?? null}, ${passwordHash}, ${status}, ${nationalIdHash}, ${nationalIdEnc})
    ON CONFLICT (email) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      title = EXCLUDED.title,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      password_hash = EXCLUDED.password_hash,
      status = EXCLUDED.status,
      national_id_hash = EXCLUDED.national_id_hash,
      national_id_enc = EXCLUDED.national_id_enc
    RETURNING id, email;
  `;
  return res[0];
}

async function ensurePersonnelProfile({ userId, firstName, lastName, position, department }) {
  await sql`
    INSERT INTO personnel_profile (user_id, first_name, last_name, position, department)
    VALUES (${userId}, ${firstName}, ${lastName}, ${position}, ${department})
    ON CONFLICT (user_id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      position = EXCLUDED.position,
      department = EXCLUDED.department;
  `;
}

async function ensureStudentProfile({ userId, studentCode = null, firstName, lastName, grade, classroom }) {
  // Try update by user_id first (1:1 logical relationship)
  const updated = await sql`
    UPDATE student_profile
    SET first_name = ${firstName}, last_name = ${lastName}, grade = ${grade}, classroom = ${classroom}, student_code = ${studentCode}
    WHERE user_id = ${userId}
    RETURNING id
  `;
  if (!updated.length) {
    await sql`
      INSERT INTO student_profile (user_id, first_name, last_name, grade, classroom, student_code)
      VALUES (${userId}, ${firstName}, ${lastName}, ${grade}, ${classroom}, ${studentCode})
    `;
  }
}

async function ensureGuardianProfile({ userId, firstName, lastName, phoneNumber, relation }) {
  await sql`
    INSERT INTO guardian_profile (user_id, first_name, last_name, phone_number, relation)
    VALUES (${userId}, ${firstName}, ${lastName}, ${phoneNumber}, ${relation})
    ON CONFLICT (user_id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      phone_number = EXCLUDED.phone_number,
      relation = EXCLUDED.relation;
  `;
}

async function main() {
  console.log('Starting test data seeding...');
  const passwordHash = await argon2.hash('12345678');

  // Staff (personnel)
  const staff = await upsertUser({
    email: 'staff@school.test',
    displayName: 'เจ้าหน้าที่สมชาย',
    title: 'นาย',
    firstName: 'สมชาย',
    lastName: 'ใจดี',
    passwordHash,
    nationalId: '1234567890123'
  });
  await ensurePersonnelProfile({
    userId: staff.id,
    firstName: 'สมชาย',
    lastName: 'ใจดี',
    position: 'เจ้าหน้าที่',
    department: 'วิชาการ'
  });
  console.log(`✅ Staff ready: ${staff.email}`);

  // Student
  const student = await upsertUser({
    email: 'student@school.test',
    displayName: 'นักเรียนสมหญิง',
    title: 'นางสาว',
    firstName: 'สมหญิง',
    lastName: 'เรียนดี',
    passwordHash,
    nationalId: '2345678901234'
  });
  await ensureStudentProfile({
    userId: student.id,
    studentCode: null,
    firstName: 'สมหญิง',
    lastName: 'เรียนดี',
    grade: 'ม.6',
    classroom: '6/1'
  });
  console.log(`✅ Student ready: ${student.email}`);

  // Parent (guardian)
  const parent = await upsertUser({
    email: 'parent@school.test',
    displayName: 'ผู้ปกครองสมศรี',
    title: 'นาง',
    firstName: 'สมศรี',
    lastName: 'รักลูก',
    passwordHash,
    nationalId: '9876543210123'
  });
  await ensureGuardianProfile({
    userId: parent.id,
    firstName: 'สมศรี',
    lastName: 'รักลูก',
    phoneNumber: '081-234-5678',
    relation: 'mother'
  });
  console.log(`✅ Parent ready: ${parent.email}`);

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
    ['staff', 'บุคลากร'],
    ['student', 'นักเรียน'],
    ['parent', 'ผู้ปกครอง']
  ];
  const permDefs = [
    ['class:read', 'Read Classes'],
    ['attend:read', 'Read Attendance'],
    ['attend:write', 'Write Attendance'],
    ['grade:read', 'Read Grades'],
    ['user:manage', 'Manage Users'],
    ['feature:manage', 'Manage Feature Toggles'],
    ['pii:view', 'View Sensitive PII']
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
    staff: permDefs.map(([c]) => c), // staff gets all default perms in dev seed
    student: ['class:read', 'grade:read', 'attend:read'],
    parent: ['class:read', 'grade:read']
  };
  for (const [rCode, perms] of Object.entries(grants)) {
    for (const pCode of perms) {
      await ensureRolePerm(roleIds[rCode], permIds[pCode]);
    }
  }

  // Assign roles to users
  await ensureUserRole(staff.id, roleIds.staff);
  await ensureUserRole(student.id, roleIds.student);
  await ensureUserRole(parent.id, roleIds.parent);
  console.log('✅ RBAC seeded');

  // ---- Menu items ----
  console.log('Seeding menu items...');
  const countRes = await sql`SELECT COUNT(*)::int AS c FROM menu_item`;
  const count = countRes[0]?.c ?? 0;
  if (count === 0) {
    // Seed default menu in Thai
    const items = [
      { label: 'แดชบอร์ด', href: '/dashboard', icon: 'home', requires: null, features: null, sort: 0 },
      { label: 'ชั้นเรียน', href: '/classes', icon: 'book', requires: ['class:read'], features: null, sort: 10 },
      { label: 'การเข้าเรียน', href: '/attendance', icon: 'calendar', requires: ['attend:read'], features: ['attendance'], sort: 20 },
      { label: 'บันทึกการเข้าเรียน', href: '/attendance/mark', icon: 'check', requires: ['attend:write'], features: ['attendance-mark'], sort: 30 },
      { label: 'ผลการเรียน', href: '/grades', icon: 'award', requires: ['grade:read'], features: ['grades'], sort: 40 },
      { label: 'ผู้ใช้', href: '/users', icon: 'users', requires: ['user:manage'], features: ['user-management'], sort: 50 },
      { label: 'บทบาทและสิทธิ์', href: '/roles', icon: 'settings', requires: ['user:manage'], features: ['role-management'], sort: 55 },
      { label: 'หน่วยงาน/ฝ่าย', href: '/org', icon: 'building', requires: ['user:manage'], features: ['org-management'], sort: 60 },
      { label: 'ตำแหน่ง', href: '/positions', icon: 'briefcase', requires: ['user:manage'], features: ['position-management'], sort: 70 },
      { label: 'ครูประจำชั้น', href: '/homeroom', icon: 'idcard', requires: ['user:manage'], features: ['homeroom'], sort: 80 },
      { label: 'ตั้งค่าระบบ', href: '/settings/features', icon: 'toggle-left', requires: ['feature:manage'], features: null, sort: 110 }
    ];
    for (const it of items) {
      await sql`
        INSERT INTO menu_item (label, href, icon, required_permissions, required_features, sort_order, is_active)
        VALUES (
          ${it.label},
          ${it.href},
          ${it.icon},
          ${it.requires ? JSON.stringify(it.requires) : null},
          ${it.features ? JSON.stringify(it.features) : null},
          ${it.sort},
          true
        )
      `;
    }
    console.log('✅ Menu items created (Thai)');
  } else {
    // Attempt to localize existing default items to Thai by href
    console.log('ℹ️ Menu already has items; applying Thai labels where applicable');
    const updates = [
      { th: 'แดชบอร์ด', href: '/dashboard' },
      { th: 'ชั้นเรียน', href: '/classes' },
      { th: 'การเข้าเรียน', href: '/attendance' },
      { th: 'บันทึกการเข้าเรียน', href: '/attendance/mark' },
      { th: 'ผลการเรียน', href: '/grades' },
      { th: 'ผู้ใช้', href: '/users' },
      { th: 'บทบาทและสิทธิ์', href: '/roles' },
      { th: 'หน่วยงาน/ฝ่าย', href: '/org' },
      { th: 'ตำแหน่ง', href: '/positions' },
      { th: 'ครูประจำชั้น', href: '/homeroom' }
    ];
    for (const u of updates) {
      await sql`UPDATE menu_item SET label = ${u.th} WHERE href = ${u.href}`;
    }
    const dashboardHref = '/dashboard';
    await sql`DELETE FROM menu_item WHERE href <> ${dashboardHref}`;
    const [dashExists] = await sql`SELECT id FROM menu_item WHERE href = ${dashboardHref} LIMIT 1`;
    if (!dashExists) {
      await sql`
        INSERT INTO menu_item (label, href, icon, required_permissions, required_features, sort_order, is_active)
        VALUES ('แดชบอร์ด', ${dashboardHref}, 'home', ${JSON.stringify([])}, ${null}, 0, true)
      `;
    } else {
      await sql`
        UPDATE menu_item
        SET label = 'แดชบอร์ด', icon = 'home', required_permissions = ${JSON.stringify([])}, required_features = ${null}, sort_order = 0, is_active = true
        WHERE href = ${dashboardHref}
      `;
    }
    console.log('✅ Thai labels applied to existing menu items');
  }

  // ---- Feature toggles ----
  try {
    console.log('\nSeeding feature toggles...');
    const featureToggles = [
      { code: 'attendance', name: 'ระบบการเข้าเรียน', description: 'เปิดให้ดูข้อมูลการเข้าเรียน' },
      { code: 'attendance-mark', name: 'บันทึกการเข้าเรียน', description: 'เปิดให้ครูบันทึกการเข้าเรียน' },
      { code: 'grades', name: 'ระบบผลการเรียน', description: 'เปิดให้ใช้งานข้อมูลคะแนน/ผลการเรียน' }
    ];

    for (const feature of featureToggles) {
      await sql`
        INSERT INTO feature_toggle (code, name, description)
        VALUES (${feature.code}, ${feature.name}, ${feature.description})
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      `;
    }
    const existingFeatureRows = await sql`SELECT code FROM feature_toggle`;
    const validFeatureCodes = new Set(featureToggles.map((f) => f.code));
    for (const row of existingFeatureRows) {
      if (!validFeatureCodes.has(row.code)) {
        await sql`DELETE FROM feature_toggle WHERE code = ${row.code}`;
      }
    }

    const featureStates = [
      { featureCode: 'attendance', stateCode: 'open', value: false },
      { featureCode: 'grades', stateCode: 'entry-open', value: false }
    ];

    for (const state of featureStates) {
      await sql`
        INSERT INTO feature_state (feature_code, state_code, value)
        VALUES (${state.featureCode}, ${state.stateCode}, ${state.value})
        ON CONFLICT (feature_code, state_code)
        DO UPDATE SET value = EXCLUDED.value
      `;
    }

    const stateRows = await sql`SELECT feature_code, state_code FROM feature_state`;
    const validPairs = new Set(featureStates.map((s) => `${s.featureCode}:${s.stateCode}`));
    for (const row of stateRows) {
      const key = `${row.feature_code}:${row.state_code}`;
      if (!validPairs.has(key)) {
        await sql`
          DELETE FROM feature_state
          WHERE feature_code = ${row.feature_code} AND state_code = ${row.state_code}
        `;
      }
    }
    console.log('✅ Feature toggles seeded');
  } catch (err) {
    console.warn('⚠️  Skipped seeding feature toggles (table missing?)', err?.message ?? err);
  }

  // ---- Org Units & Positions ----
  console.log('\nSeeding org units and positions...');
  // Org units
  const orgUnits = [
    { code: 'ACADEMIC', nameTh: 'ฝ่ายบริหารวิชาการ', type: 'division' },
    { code: 'HR', nameTh: 'ฝ่ายบริหารงานบุคคล', type: 'division' },
    { code: 'GENERAL', nameTh: 'ฝ่ายบริหารงานทั่วไป', type: 'division' },
    { code: 'ADMIN', nameTh: 'ฝ่ายธุรการ', type: 'division' },
    { code: 'FINANCE', nameTh: 'ฝ่ายการเงิน', type: 'division' }
  ];
  for (const u of orgUnits) {
    await sql`INSERT INTO org_unit (code, name_th, type) VALUES (${u.code}, ${u.nameTh}, ${u.type}) ON CONFLICT (code) DO UPDATE SET name_th = EXCLUDED.name_th, type = EXCLUDED.type`;
  }

  // Positions
  const positions = [
    { code: 'DIRECTOR', titleTh: 'ผู้อำนวยการโรงเรียน', category: 'management' },
    { code: 'VICE_DIRECTOR', titleTh: 'รองผู้อำนวยการ', category: 'management' },
    { code: 'TEACHER', titleTh: 'ครู', category: 'teacher' },
    { code: 'STAFF', titleTh: 'เจ้าหน้าที่', category: 'staff' }
  ];
  for (const p of positions) {
    await sql`INSERT INTO position (code, title_th, category) VALUES (${p.code}, ${p.titleTh}, ${p.category}) ON CONFLICT (code) DO UPDATE SET title_th = EXCLUDED.title_th, category = EXCLUDED.category`;
  }

  // Lookups
  const unitRows = await sql`SELECT id, code FROM org_unit`;
  const unitIdByCode = Object.fromEntries(unitRows.map(r => [r.code, r.id]));
  const posRows = await sql`SELECT id, code FROM position`;
  const posIdByCode = Object.fromEntries(posRows.map(r => [r.code, r.id]));

  // Org memberships (no period)
  const insMembership = async (email, unitCode, role) => {
    const u = await sql`SELECT id FROM app_user WHERE email = ${email} LIMIT 1`;
    if (!u.length) return;
    const uid = u[0].id;
    const oid = unitIdByCode[unitCode];
    if (!oid) return;
    // unique on (org_unit_id, user_id)
    await sql`INSERT INTO org_membership (user_id, org_unit_id, role_in_unit) VALUES (${uid}, ${oid}, ${role}) ON CONFLICT (org_unit_id, user_id) DO UPDATE SET role_in_unit = EXCLUDED.role_in_unit`;
  };
  await insMembership('staff@school.test', 'ACADEMIC', 'member');

  // Position assignments (no period)
  const insPosition = async (email, posCode) => {
    const u = await sql`SELECT id FROM app_user WHERE email = ${email} LIMIT 1`;
    if (!u.length) return;
    const uid = u[0].id;
    const pid = posIdByCode[posCode];
    if (!pid) return;
    await sql`INSERT INTO position_assignment (user_id, position_id) VALUES (${uid}, ${pid}) ON CONFLICT (user_id, position_id) DO NOTHING`;
  };
  await insPosition('staff@school.test', 'STAFF');

  // Homeroom assignment (no period)
  const insHomeroom = async (email, classCode) => {
    const u = await sql`SELECT id FROM app_user WHERE email = ${email} LIMIT 1`;
    if (!u.length) return;
    const uid = u[0].id;
    // one homeroom per class (class_code unique)
    await sql`INSERT INTO homeroom_assignment (teacher_id, class_code) VALUES (${uid}, ${classCode}) ON CONFLICT (class_code) DO UPDATE SET teacher_id = EXCLUDED.teacher_id`;
  };
  await insHomeroom('staff@school.test', 'ม.6/1');

  console.log('✅ Seeded org units, positions, and sample assignments');

  console.log('\n🎉 Done! Test accounts use password: 12345678');
}

main().catch((err) => {
  console.error('❌ Seeding failed');
  console.error(err);
  process.exit(1);
});
