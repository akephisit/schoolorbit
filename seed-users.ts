import { drizzle } from 'drizzle-orm/neon-serverless';
import { appUser, personnelProfile, studentProfile, guardianProfile } from './src/lib/server/schema/users';
import { hash } from 'argon2';
import { hashNationalId } from './src/lib/server/crypto';
import { eq } from 'drizzle-orm';

// Environment variable for database connection
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('DATABASE_URL is not defined');
	process.exit(1);
}

const db = drizzle(DATABASE_URL);

async function seedUsers() {
	console.log('Starting user seeding...');

	try {
		// Hash password for test users
		const testPassword = await hash('12345678');

		// Create test personnel user
		let personnelUser = await db.select().from(appUser).where(eq(appUser.email, 'teacher@school.test')).limit(1);
		if (personnelUser.length === 0) {
			[personnelUser] = await db.insert(appUser).values({
				email: 'teacher@school.test',
				displayName: 'อาจารย์สมชาย',
				passwordHash: testPassword,
				status: 'active'
			}).returning();
			
			await db.insert(personnelProfile).values({
				userId: personnelUser.id,
				nationalIdHash: hashNationalId('1234567890123'), // Mock national ID hash
				firstName: 'สมชาย',
				lastName: 'ใจดี',
				position: 'ครู',
				department: 'คณิตศาสตร์'
			});
			console.log('✅ Personnel user created:', personnelUser.email);
		} else {
			console.log('✅ Personnel user already exists:', personnelUser[0].email);
		}

		// Create test student user
		const [studentUser] = await db.insert(appUser).values({
			email: 'student@school.test',
			displayName: 'นักเรียนสมหญิง',
			passwordHash: testPassword,
			status: 'active'
		}).returning();

		await db.insert(studentProfile).values({
			userId: studentUser.id,
			studentCode: 'STU001',
			firstName: 'สมหญิง',
			lastName: 'เรียนดี',
			grade: 'ม.6',
			classroom: '6/1'
		});

		console.log('✅ Student user created:', studentUser.email);

		// Create test guardian user
		const [guardianUser] = await db.insert(appUser).values({
			email: 'parent@school.test',
			displayName: 'ผู้ปกครองสมศรี',
			passwordHash: testPassword,
			status: 'active'
		}).returning();

		await db.insert(guardianProfile).values({
			userId: guardianUser.id,
			nationalIdHash: hashNationalId('9876543210123'), // Mock national ID hash
			firstName: 'สมศรี',
			lastName: 'รักลูก',
			phoneNumber: '081-234-5678',
			relation: 'mother'
		});

		console.log('✅ Guardian user created:', guardianUser.email);

		// Create admin user
		const [adminUser] = await db.insert(appUser).values({
			email: 'admin@school.test',
			displayName: 'ผู้ดูแลระบบ',
			passwordHash: testPassword,
			status: 'active'
		}).returning();

		await db.insert(personnelProfile).values({
			userId: adminUser.id,
			nationalIdHash: hashNationalId('5555555555555'), // Mock national ID hash
			firstName: 'ผู้ดูแล',
			lastName: 'ระบบ',
			position: 'ผู้ดูแลระบบ',
			department: 'IT'
		});

		console.log('✅ Admin user created:', adminUser.email);

		console.log('\n🎉 All test users created successfully!');
		console.log('\nTest credentials:');
		console.log('Email: teacher@school.test | Password: password123');
		console.log('Email: student@school.test | Password: password123');
		console.log('Email: parent@school.test | Password: password123');
		console.log('Email: admin@school.test | Password: password123');

	} catch (error) {
		console.error('❌ Error seeding users:', error);
		process.exit(1);
	}
}

seedUsers();