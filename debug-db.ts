import { drizzle } from 'drizzle-orm/neon-serverless';
import { appUser, personnelProfile } from './src/lib/server/schema/users.js';
import { hashNationalId } from './src/lib/server/crypto.js';
import { eq, and } from 'drizzle-orm';

// Environment variable for database connection
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('DATABASE_URL is not defined');
	process.exit(1);
}

console.log('Database URL:', DATABASE_URL.substring(0, 50) + '...');

const db = drizzle(DATABASE_URL);

async function debugDatabase() {
	console.log('🔍 Starting database debugging...\n');

	try {
		// 1. Check if tables exist by counting records
		console.log('1. Checking table existence and record counts:');
		
		const userCount = await db.select().from(appUser);
		console.log(`   - app_user table: ${userCount.length} records`);
		
		const personnelCount = await db.select().from(personnelProfile);
		console.log(`   - personnel_profile table: ${personnelCount.length} records`);

		// 2. List all users
		console.log('\n2. All users in app_user:');
		userCount.forEach((user, index) => {
			console.log(`   ${index + 1}. ID: ${user.id}, Email: ${user.email}, Status: ${user.status}`);
		});

		// 3. List all personnel profiles
		console.log('\n3. All personnel profiles:');
		personnelCount.forEach((profile, index) => {
			console.log(`   ${index + 1}. UserID: ${profile.userId}, Hash: ${profile.nationalIdHash}`);
		});

		// 4. Test the exact query that fails
		console.log('\n4. Testing the exact login query:');
		const testNationalId = '1234567890123';
		const nationalIdHash = hashNationalId(testNationalId);
		console.log(`   - Testing with National ID: ${testNationalId}`);
		console.log(`   - Generated hash: ${nationalIdHash}`);
		
		const result = await db
			.select({
				id: appUser.id,
				email: appUser.email,
				passwordHash: appUser.passwordHash,
				status: appUser.status
			})
			.from(appUser)
			.innerJoin(personnelProfile, eq(appUser.id, personnelProfile.userId))
			.where(and(
				eq(personnelProfile.nationalIdHash, nationalIdHash),
				eq(appUser.status, 'active')
			));

		console.log(`   - Query result: ${result.length} records found`);
		if (result.length > 0) {
			console.log('   - Found user:', result[0]);
		}

		// 5. Check for hash mismatches
		console.log('\n5. Checking for hash mismatches:');
		for (const profile of personnelCount) {
			console.log(`   - Profile hash: ${profile.nationalIdHash}`);
			console.log(`   - Expected hash: ${nationalIdHash}`);
			console.log(`   - Match: ${profile.nationalIdHash === nationalIdHash ? '✅' : '❌'}`);
		}

		console.log('\n✅ Database debugging completed successfully!');

	} catch (error) {
		console.error('❌ Error during database debugging:', error);
		
		// If it's a connection error, provide more details
		if (error instanceof Error) {
			console.error('Error message:', error.message);
			console.error('Error stack:', error.stack);
		}
	}
}

debugDatabase();