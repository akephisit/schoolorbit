import { drizzle } from 'drizzle-orm/neon-serverless';
import { appUser, personnelProfile } from './src/lib/server/schema/users';
import { hashNationalId } from './src/lib/server/crypto';
import { eq, and } from 'drizzle-orm';

// Environment variable for database connection
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('DATABASE_URL is not defined');
	process.exit(1);
}

const db = drizzle(DATABASE_URL);

async function checkUsers() {
	console.log('Checking users in database...');

	try {
		// Check all app users
		const users = await db.select().from(appUser);
		console.log('Total users:', users.length);
		users.forEach(user => {
			console.log(`- ${user.email}: ${user.displayName} (${user.status})`);
		});

		// Check personnel profiles
		const personnel = await db.select().from(personnelProfile);
		console.log('\nTotal personnel profiles:', personnel.length);
		personnel.forEach(p => {
			console.log(`- User ID: ${p.userId}, Hash: ${p.nationalIdHash}`);
		});

		// Test the exact query from login
		const nationalIdHash = hashNationalId('1234567890123');
		console.log('\nTesting login query...');
		console.log('Looking for national ID hash:', nationalIdHash);
		
		const result = await db
			.select({
				id: appUser.id,
				passwordHash: appUser.passwordHash
			})
			.from(appUser)
			.innerJoin(personnelProfile, eq(appUser.id, personnelProfile.userId))
			.where(and(
				eq(personnelProfile.nationalIdHash, nationalIdHash),
				eq(appUser.status, 'active')
			))
			.limit(1);

		console.log('Query result:', result);

	} catch (error) {
		console.error('❌ Error:', error);
	}
}

checkUsers();