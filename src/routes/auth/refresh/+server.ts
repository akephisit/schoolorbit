import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getConfig } from '$lib/server/config';
import { JwtService } from '$lib/server/jwt';
import { RefreshService } from '$lib/server/refresh';
import { createCookieConfig, createAccessTokenCookie, createRefreshTokenCookie } from '$lib/server/cookies';

export const POST: RequestHandler = async ({ cookies }) => {
	const config = getConfig();
	const jwtService = new JwtService(config.jwtSecret);
	const refreshService = new RefreshService();

	const refreshToken = cookies.get('rt');
	if (!refreshToken) {
		return error(401, 'Unauthorized');
	}

	let userId: string;
	let newRefreshToken: string;
	
	try {
		[userId, newRefreshToken] = await refreshService.verifyAndRotate(refreshToken);
	} catch {
		return error(401, 'Unauthorized');
	}

	// TODO: Get updated user permissions from RBAC service
	const roles: string[] = [];
	const permissions: string[] = [];
	const context = null;


	// Create new JWT
	const claims = jwtService.createClaims(
		userId,
		roles,
		permissions,
		context
	);

	const accessToken = jwtService.createToken(claims);

	// Set new cookies
	const cookieConfig = createCookieConfig();
	const cookieHeaders = [
		createAccessTokenCookie(accessToken, cookieConfig),
		createRefreshTokenCookie(newRefreshToken, cookieConfig)
	];

	const response = new Response(null, { status: 204 });
	cookieHeaders.forEach(cookie => {
		response.headers.append('set-cookie', cookie);
	});

	return response;
};