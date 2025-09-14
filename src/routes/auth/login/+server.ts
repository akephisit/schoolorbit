import { json, error } from '@sveltejs/kit';
import { verify } from 'argon2';
import { eq, and, sql, inArray } from 'drizzle-orm';
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
		return error(400, 'กรุณากรอกข้อมูลให้ครบถ้วน');
	}

	// Normalize inputs
	const actorType = body.actorType.trim();
	let rawId = body.id.trim();
	let password = body.password?.toString();
	const otp = body.otp?.toString();

	if (password !== undefined && password.trim() === '') {
		return error(400, 'กรุณากรอกรหัสผ่าน');
	}

	if (!password && otp) {
		// OTP flow not implemented yet
		return error(400, 'ขออภัย ระบบยังไม่รองรับการเข้าสู่ระบบด้วย OTP');
	}

	
	let userId: string;
	try {
		switch (actorType) {
			case 'personnel':
				userId = await authenticatePersonnel(rawId, password);
				break;
			case 'student':
				userId = await authenticateStudent(rawId, password);
				break;
			case 'guardian':
				userId = await authenticateGuardian(rawId, password);
				break;
			default:
				return error(400, 'ประเภทผู้ใช้ไม่ถูกต้อง');
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
		return error(400, msg);
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
	// Input format: 13 digits
	const digits = nationalId.replace(/\D/g, '');
	if (digits.length !== 13) {
		throw new Error('เลขบัตรประชาชนไม่ถูกต้อง');
	}
	if (!password) {
		throw new Error('กรุณากรอกรหัสผ่าน');
	}

	// Support both env salt and legacy default salt to bridge deployments
	const hashPrimary = hashNationalId(digits);
	const hashLegacy = hashNationalId(digits, 'default_salt');
	const hashes = hashPrimary === hashLegacy ? [hashPrimary] : [hashPrimary, hashLegacy];

	let result;
	try {
		result = await db
			.select({
				id: appUser.id,
				passwordHash: appUser.passwordHash
			})
			.from(appUser)
			.innerJoin(personnelProfile, eq(appUser.id, personnelProfile.userId))
			.where(and(
				inArray(personnelProfile.nationalIdHash, hashes),
				// Cross-env: enum/text
				sql`${appUser.status}::text = ${'active'}`
			))
			.limit(1);
    } catch (err) {
        console.error('Personnel auth query error:', err);
        throw new Error('เกิดข้อผิดพลาดในการยืนยันตัวตน');
    }

	let user = result[0];
	if (!user) {
		// If not found as active, check if exists but inactive
		const probe = await db
			.select({ status: appUser.status })
			.from(appUser)
			.innerJoin(personnelProfile, eq(appUser.id, personnelProfile.userId))
			.where(inArray(personnelProfile.nationalIdHash, hashes))
			.limit(1);
		if (probe.length && String((probe[0] as any).status) !== 'active') {
			throw new Error('บัญชีถูกระงับหรือไม่พร้อมใช้งาน');
		}
		throw new Error('เลขบัตรหรือรหัสผ่านไม่ถูกต้อง');
	}

	if (!user.passwordHash) {
		throw new Error('บัญชีนี้ยังไม่ได้ตั้งค่ารหัสผ่าน');
	}
	try {
		if (!(await verify(user.passwordHash, password))) {
			throw new Error('เลขบัตรหรือรหัสผ่านไม่ถูกต้อง');
		}
	} catch {
		throw new Error('เลขบัตรหรือรหัสผ่านไม่ถูกต้อง');
	}
	return user.id;
}

async function authenticateStudent(studentCode: string, password?: string): Promise<string> {
	if (!password) {
		throw new Error('กรุณากรอกรหัสผ่าน');
	}
	const code = studentCode.trim();

    let result;
    try {
        result = await db
            .select({
                id: appUser.id,
                passwordHash: appUser.passwordHash
            })
            .from(appUser)
            .innerJoin(studentProfile, eq(appUser.id, studentProfile.userId))
            .where(and(
                eq(studentProfile.studentCode, code),
                sql`${appUser.status}::text = ${'active'}`
            ))
            .limit(1);
    } catch (err) {
        console.error('Student auth query error:', err);
        throw new Error('เกิดข้อผิดพลาดในการยืนยันตัวตน');
    }

	const user = result[0];

	if (!user) {
		// Probe inactive
		const probe = await db
			.select({ status: appUser.status })
			.from(appUser)
			.innerJoin(studentProfile, eq(appUser.id, studentProfile.userId))
			.where(eq(studentProfile.studentCode, code))
			.limit(1);
		if (probe.length && String((probe[0] as any).status) !== 'active') {
			throw new Error('บัญชีถูกระงับหรือไม่พร้อมใช้งาน');
		}
		throw new Error('รหัสนักเรียนหรือรหัสผ่านไม่ถูกต้อง');
	}

	if (!user.passwordHash) {
		throw new Error('บัญชีนี้ยังไม่ได้ตั้งค่ารหัสผ่าน');
	}

	try {
		if (!(await verify(user.passwordHash, password))) {
			throw new Error('รหัสนักเรียนหรือรหัสผ่านไม่ถูกต้อง');
		}
	} catch {
		throw new Error('รหัสนักเรียนหรือรหัสผ่านไม่ถูกต้อง');
	}

	return user.id;
}

async function authenticateGuardian(nationalId: string, password?: string): Promise<string> {
	const digits = nationalId.replace(/\D/g, '');
	if (digits.length !== 13) {
		throw new Error('เลขบัตรประชาชนไม่ถูกต้อง');
	}
	if (!password) {
		throw new Error('กรุณากรอกรหัสผ่าน');
	}

	const hashPrimary = hashNationalId(digits);
	const hashLegacy = hashNationalId(digits, 'default_salt');
	const hashes = hashPrimary === hashLegacy ? [hashPrimary] : [hashPrimary, hashLegacy];
	
    let result;
    try {
        result = await db
            .select({
                id: appUser.id,
                passwordHash: appUser.passwordHash
            })
            .from(appUser)
            .innerJoin(guardianProfile, eq(appUser.id, guardianProfile.userId))
            .where(and(
                inArray(guardianProfile.nationalIdHash, hashes),
                sql`${appUser.status}::text = ${'active'}`
            ))
            .limit(1);
    } catch (err) {
        console.error('Guardian auth query error:', err);
        throw new Error('เกิดข้อผิดพลาดในการยืนยันตัวตน');
    }

	const user = result[0];

	if (!user) {
		const probe = await db
			.select({ status: appUser.status })
			.from(appUser)
			.innerJoin(guardianProfile, eq(appUser.id, guardianProfile.userId))
			.where(inArray(guardianProfile.nationalIdHash, hashes))
			.limit(1);
		if (probe.length && String((probe[0] as any).status) !== 'active') {
			throw new Error('บัญชีถูกระงับหรือไม่พร้อมใช้งาน');
		}
		throw new Error('เลขบัตรหรือรหัสผ่านไม่ถูกต้อง');
	}

	if (!user.passwordHash) {
		throw new Error('บัญชีนี้ยังไม่ได้ตั้งค่ารหัสผ่าน');
	}

	try {
		if (!(await verify(user.passwordHash, password))) {
			throw new Error('เลขบัตรหรือรหัสผ่านไม่ถูกต้อง');
		}
	} catch {
		throw new Error('เลขบัตรหรือรหัสผ่านไม่ถูกต้อง');
	}

	return user.id;
}
