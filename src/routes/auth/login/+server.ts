import { json, error } from '@sveltejs/kit';
import { verify } from 'argon2';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { getConfig } from '$lib/server/config';
import { db } from '$lib/server/database';
import { appUser, personnelProfile, studentProfile, guardianProfile } from '$lib/server/schema';
import { JwtService } from '$lib/server/jwt';
import { RefreshService } from '$lib/server/refresh';
import { hashNationalId, generateSecureToken } from '$lib/server/crypto';
import { createCookieConfig, createAccessTokenCookie, createRefreshTokenCookie, createCsrfCookie } from '$lib/server/cookies';

interface LoginRequest {
	actorType: string; // "personnel", "student", "guardian"
	id: string; // national_id for personnel/guardian, student_code for student  
	password?: string;
	otp?: string;
}

interface LoginResponse {
	data: {
		userId: string;
		roles: string[];
		perms: string[];
		ctx?: any;
	};
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const config = getConfig();
	console.log('[DEBUG] Login - Environment variables loaded:', {
		databaseUrl: config.databaseUrl ? 'SET' : 'NOT SET',
		jwtSecret: config.jwtSecret ? 'SET' : 'NOT SET',
		corsAllowedOrigins: config.corsAllowedOrigins
	});
	
	const jwtService = new JwtService(config.jwtSecret);
	const refreshService = new RefreshService();

	let body: LoginRequest;
	try {
		body = await request.json();
		console.log('[DEBUG] Login - Request body:', {
			actorType: body.actorType,
			id: body.id ? `${body.id.substring(0, 3)}***` : 'NOT PROVIDED',
			hasPassword: !!body.password,
			hasOtp: !!body.otp
		});
	} catch {
		console.log('[DEBUG] Login - Invalid JSON received');
		return error(400, 'Invalid JSON');
	}

	// Validate request
	if (!body.actorType || !body.id) {
		console.log('[DEBUG] Login - Missing required fields:', {
			actorType: !!body.actorType,
			id: !!body.id
		});
		return error(400, 'Missing required fields');
	}

	if (body.password === '') {
		return error(400, 'Password cannot be empty');
	}

	if (!body.password && !body.otp) {
		return error(400, 'Either password or OTP is required');
	}

	
	let userId: string;
	try {
		console.log('[DEBUG] Login - Starting authentication for actor type:', body.actorType);
		
		switch (body.actorType) {
			case 'personnel':
				userId = await authenticatePersonnel(body.id, body.password);
				break;
			case 'student':
				userId = await authenticateStudent(body.id, body.password);
				break;
			case 'guardian':
				userId = await authenticateGuardian(body.id, body.password);
				break;
			default:
				console.log('[DEBUG] Login - Invalid actor type:', body.actorType);
				return error(400, 'Invalid actor type');
		}
		
		console.log('[DEBUG] Login - Authentication successful for userId:', userId);
	} catch (err) {
		console.log('[DEBUG] Login - Authentication failed:', err instanceof Error ? err.message : 'Unknown error');
		return error(400, err instanceof Error ? err.message : 'Authentication failed');
	}

	// TODO: Get user permissions from RBAC service
	const roles: string[] = [];
	const permissions: string[] = [];
	const context = null;

	// Create JWT claims
	console.log('[DEBUG] Login - Creating JWT claims for userId:', userId);
	const claims = jwtService.createClaims(
		userId,
		roles,
		permissions,
		context
	);

	// Create tokens
	console.log('[DEBUG] Login - Creating access token');
	const accessToken = jwtService.createToken(claims);
	console.log('[DEBUG] Login - Creating refresh token and session');
	const [_sessionId, refreshToken] = await refreshService.createSession(
		userId,
		request.headers.get('user-agent') || undefined,
		getClientAddress()
	);
	console.log('[DEBUG] Login - Generating CSRF token');
	const csrfToken = generateSecureToken();

	// Set cookies
	console.log('[DEBUG] Login - Creating cookie configuration');
	const cookieConfig = createCookieConfig();
	const cookies = [
		createAccessTokenCookie(accessToken, cookieConfig),
		createRefreshTokenCookie(refreshToken, cookieConfig),
		createCsrfCookie(csrfToken, cookieConfig)
	];

	console.log('[DEBUG] Login - Creating response with user data');
	const response = json({
		data: {
			userId,
			roles,
			perms: permissions,
			ctx: context
		}
	} satisfies LoginResponse);

	console.log('[DEBUG] Login - Setting cookies in response headers');
	cookies.forEach(cookie => {
		response.headers.append('set-cookie', cookie);
	});

	console.log('[DEBUG] Login - Login process completed successfully');
	return response;
};

async function authenticatePersonnel(nationalId: string, password?: string): Promise<string> {
	console.log('[DEBUG] authenticatePersonnel - Starting authentication for personnel');
	
	if (!password) {
		console.log('[DEBUG] authenticatePersonnel - No password provided');
		throw new Error('Password required for personnel');
	}

	const nationalIdHash = hashNationalId(nationalId);
	console.log('[DEBUG] authenticatePersonnel - National ID hash created');
	
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

	console.log('[DEBUG] authenticatePersonnel - Database query completed, found users:', result.length);
	const user = result[0];

	if (!user) {
		console.log('[DEBUG] authenticatePersonnel - No user found with provided credentials');
		throw new Error('Invalid credentials');
	}

	if (!user.passwordHash) {
		console.log('[DEBUG] authenticatePersonnel - User found but no password hash configured');
		throw new Error('Account not configured for password login');
	}

	console.log('[DEBUG] authenticatePersonnel - Verifying password hash');
	try {
		if (!(await verify(user.passwordHash, password))) {
			console.log('[DEBUG] authenticatePersonnel - Password verification failed');
			throw new Error('Invalid credentials');
		}
		console.log('[DEBUG] authenticatePersonnel - Password verification successful');
	} catch {
		console.log('[DEBUG] authenticatePersonnel - Password verification threw exception');
		throw new Error('Invalid credentials');
	}

	console.log('[DEBUG] authenticatePersonnel - Authentication completed successfully');
	return user.id;
}

async function authenticateStudent(studentCode: string, password?: string): Promise<string> {
	if (!password) {
		throw new Error('Password required for student');
	}

	const result = await db
		.select({
			id: appUser.id,
			passwordHash: appUser.passwordHash
		})
		.from(appUser)
		.innerJoin(studentProfile, eq(appUser.id, studentProfile.userId))
		.where(and(
			eq(studentProfile.studentCode, studentCode),
			eq(appUser.status, 'active')
		))
		.limit(1);

	const user = result[0];

	if (!user) {
		throw new Error('Invalid credentials');
	}

	if (!user.passwordHash) {
		throw new Error('Account not configured for password login');
	}

	try {
		if (!(await verify(user.passwordHash, password))) {
			throw new Error('Invalid credentials');
		}
	} catch {
		throw new Error('Invalid credentials');
	}

	return user.id;
}

async function authenticateGuardian(nationalId: string, password?: string): Promise<string> {
	if (!password) {
		throw new Error('Password required for guardian');
	}

	const nationalIdHash = hashNationalId(nationalId);
	
	const result = await db
		.select({
			id: appUser.id,
			passwordHash: appUser.passwordHash
		})
		.from(appUser)
		.innerJoin(guardianProfile, eq(appUser.id, guardianProfile.userId))
		.where(and(
			eq(guardianProfile.nationalIdHash, nationalIdHash),
			eq(appUser.status, 'active')
		))
		.limit(1);

	const user = result[0];

	if (!user) {
		throw new Error('Invalid credentials');
	}

	if (!user.passwordHash) {
		throw new Error('Account not configured for password login');
	}

	try {
		if (!(await verify(user.passwordHash, password))) {
			throw new Error('Invalid credentials');
		}
	} catch {
		throw new Error('Invalid credentials');
	}

	return user.id;
}