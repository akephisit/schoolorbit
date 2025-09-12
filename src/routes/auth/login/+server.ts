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
	const jwtService = new JwtService(config.jwtSecret);
	const refreshService = new RefreshService();

	let body: LoginRequest;
	try {
		body = await request.json();
	} catch {
		return error(400, 'Invalid JSON');
	}

	// Validate request
	if (!body.actorType || !body.id) {
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
				return error(400, 'Invalid actor type');
		}
	} catch (err) {
		return error(400, err instanceof Error ? err.message : 'Authentication failed');
	}

	// TODO: Get user permissions from RBAC service
	const roles: string[] = [];
	const permissions: string[] = [];
	const context = null;

	// Create JWT claims
	const claims = jwtService.createClaims(
		userId,
		roles,
		permissions,
		context
	);

	// Create tokens
	const accessToken = jwtService.createToken(claims);
	const [_sessionId, refreshToken] = await refreshService.createSession(
		userId,
		request.headers.get('user-agent') || undefined,
		getClientAddress()
	);
	const csrfToken = generateSecureToken();

	// Set cookies
	const cookieConfig = createCookieConfig();
	const cookies = [
		createAccessTokenCookie(accessToken, cookieConfig),
		createRefreshTokenCookie(refreshToken, cookieConfig),
		createCsrfCookie(csrfToken, cookieConfig)
	];

	const response = json({
		data: {
			userId,
			roles,
			perms: permissions,
			ctx: context
		}
	} satisfies LoginResponse);

	cookies.forEach(cookie => {
		response.headers.append('set-cookie', cookie);
	});

	return response;
};

async function authenticatePersonnel(nationalId: string, password?: string): Promise<string> {
	if (!password) {
		throw new Error('Password required for personnel');
	}

	const nationalIdHash = hashNationalId(nationalId);
	
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