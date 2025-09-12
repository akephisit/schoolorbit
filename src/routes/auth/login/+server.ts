import { json, error } from '@sveltejs/kit';
import { verify } from 'argon2';
import type { RequestHandler } from './$types';
import { getConfig } from '$lib/server/config';
import { createPool, queryOne } from '$lib/server/db';
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
	const pool = createPool(config.databaseUrl);
	const jwtService = new JwtService(config.jwtSecret);
	const refreshService = new RefreshService(pool);

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
				userId = await authenticatePersonnel(pool, body.id, body.password);
				break;
			case 'student':
				userId = await authenticateStudent(pool, body.id, body.password);
				break;
			case 'guardian':
				userId = await authenticateGuardian(pool, body.id, body.password);
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
	const cookieConfig = createCookieConfig(config.cookieDomain);
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

async function authenticatePersonnel(pool: any, nationalId: string, password?: string): Promise<string> {
	if (!password) {
		throw new Error('Password required for personnel');
	}

	const nationalIdHash = hashNationalId(nationalId);
	
	const user = await queryOne<{ id: string; password_hash?: string }>(
		pool,
		`SELECT au.id, au.password_hash
		 FROM app_user au
		 JOIN personnel_profile pp ON au.id = pp.user_id
		 WHERE pp.national_id_hash = $1 AND au.status = 'active'`,
		[nationalIdHash]
	);

	if (!user) {
		throw new Error('Invalid credentials');
	}

	if (!user.password_hash) {
		throw new Error('Account not configured for password login');
	}

	try {
		if (!(await verify(user.password_hash, password))) {
			throw new Error('Invalid credentials');
		}
	} catch {
		throw new Error('Invalid credentials');
	}

	return user.id;
}

async function authenticateStudent(pool: any, studentCode: string, password?: string): Promise<string> {
	if (!password) {
		throw new Error('Password required for student');
	}

	const user = await queryOne<{ id: string; password_hash?: string }>(
		pool,
		`SELECT au.id, au.password_hash
		 FROM app_user au
		 JOIN student_profile sp ON au.id = sp.user_id
		 WHERE sp.student_code = $1 AND au.status = 'active'`,
		[studentCode]
	);

	if (!user) {
		throw new Error('Invalid credentials');
	}

	if (!user.password_hash) {
		throw new Error('Account not configured for password login');
	}

	try {
		if (!(await verify(user.password_hash, password))) {
			throw new Error('Invalid credentials');
		}
	} catch {
		throw new Error('Invalid credentials');
	}

	return user.id;
}

async function authenticateGuardian(pool: any, nationalId: string, password?: string): Promise<string> {
	if (!password) {
		throw new Error('Password required for guardian');
	}

	const nationalIdHash = hashNationalId(nationalId);
	
	const user = await queryOne<{ id: string; password_hash?: string }>(
		pool,
		`SELECT au.id, au.password_hash
		 FROM app_user au
		 JOIN guardian_profile gp ON au.id = gp.user_id
		 WHERE gp.national_id_hash = $1 AND au.status = 'active'`,
		[nationalIdHash]
	);

	if (!user) {
		throw new Error('Invalid credentials');
	}

	if (!user.password_hash) {
		throw new Error('Account not configured for password login');
	}

	try {
		if (!(await verify(user.password_hash, password))) {
			throw new Error('Invalid credentials');
		}
	} catch {
		throw new Error('Invalid credentials');
	}

	return user.id;
}