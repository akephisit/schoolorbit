import { json, error } from '@sveltejs/kit';
import { verify } from 'argon2';
import { eq, and, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { getConfig } from '$lib/server/config';
import { db } from '$lib/server/database';
import { appUser, role, userRole, rolePermission, permission } from '$lib/server/schema';
import { JwtService } from '$lib/server/jwt';
import { RefreshService } from '$lib/server/refresh';
import { hashNationalId, generateSecureToken } from '$lib/server/crypto';
import { createCookieConfig, createAccessTokenCookie, createRefreshTokenCookie, createCsrfCookie } from '$lib/server/cookies';
import { validationError } from '$lib/server/validators/core';
import { parseLoginInput } from '$lib/server/validators/auth';

interface LoginRequest {
    // Unified login by national ID
    id: string;
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

	let parsedBody: LoginRequest;
	try {
		parsedBody = await request.json();
	} catch {
		return error(400, 'Invalid JSON');
	}

	const parsedInput = parseLoginInput(parsedBody);
	if (!parsedInput.ok) {
		return validationError(parsedInput.error);
	}

	const { id, password: rawPassword, otp } = parsedInput.data;

	if (!rawPassword && otp) {
		return validationError({
			message: 'ขออภัย ระบบยังไม่รองรับการเข้าสู่ระบบด้วย OTP',
			fieldErrors: { otp: ['ระบบยังไม่รองรับการเข้าสู่ระบบด้วย OTP'] }
		});
	}

	if (!rawPassword) {
		return validationError({
			message: 'กรุณากรอกรหัสผ่าน',
			fieldErrors: { password: ['กรุณากรอกรหัสผ่าน'] }
		});
	}

	const rawId = id;
	const password = rawPassword;

    let userId: string;
    try {
        userId = await authenticateByNationalId(rawId, password);
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
        return validationError({
          message: msg,
          fieldErrors: { id: [msg] }
        });
    }

    // Load roles and permissions via RBAC tables
    const { roles, permissions } = await getUserRolesAndPerms(userId);
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

async function getUserRolesAndPerms(userId: string): Promise<{ roles: string[]; permissions: string[] }> {
    // roles
    const roleRows = await db
        .select({ code: role.code })
        .from(userRole)
        .innerJoin(role, eq(userRole.roleId, role.id))
        .where(eq(userRole.userId, userId));
    const roles = Array.from(new Set(roleRows.map(r => r.code)));

    if (roles.length === 0) {
        return { roles, permissions: [] };
    }
    // permissions via role -> role_permission -> permission
    const permRows = await db
        .select({ code: permission.code })
        .from(userRole)
        .innerJoin(role, eq(userRole.roleId, role.id))
        .innerJoin(rolePermission, eq(role.id, rolePermission.roleId))
        .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
        .where(eq(userRole.userId, userId));
    const permissions = Array.from(new Set(permRows.map(p => p.code)));
    return { roles, permissions };
}

async function authenticateByNationalId(nationalId: string, password?: string): Promise<string> {
    const digits = nationalId.replace(/\D/g, '');
    if (digits.length !== 13) {
        throw new Error('เลขบัตรประชาชนไม่ถูกต้อง');
    }
    if (!password) {
        throw new Error('กรุณากรอกรหัสผ่าน');
    }

    const hashValue = hashNationalId(digits);
    let result;
    try {
        result = await db
            .select({
                id: appUser.id,
                passwordHash: appUser.passwordHash
            })
            .from(appUser)
            .where(and(
                eq(appUser.nationalIdHash, hashValue),
                // Cross-env: enum/text
                sql`${appUser.status}::text = ${'active'}`
            ))
            .limit(1);
    } catch (err) {
        console.error('Auth query error:', err);
        throw new Error('เกิดข้อผิดพลาดในการยืนยันตัวตน');
    }

    const user = result[0];
    if (!user) {
        // Check if user exists but inactive for clearer message
        const probe = await db
            .select({ status: appUser.status })
            .from(appUser)
            .where(eq(appUser.nationalIdHash, hashValue))
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
