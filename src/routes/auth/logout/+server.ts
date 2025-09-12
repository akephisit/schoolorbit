import type { RequestHandler } from './$types';
import { getConfig } from '$lib/server/config';
import { RefreshService } from '$lib/server/refresh';
import { createCookieConfig, clearAuthCookies } from '$lib/server/cookies';

export const POST: RequestHandler = async ({ locals }) => {
	const config = getConfig();
	const refreshService = new RefreshService();

	// Revoke user sessions if user is authenticated
	if (locals.me?.data?.user?.id) {
		await refreshService.revokeUserSessions(locals.me.data.user.id);
	}

	// Clear cookies
	const cookieConfig = createCookieConfig(config.cookieDomain);
	const clearCookies = clearAuthCookies(cookieConfig);
	
	const response = new Response(null, { status: 204 });
	clearCookies.forEach(cookie => {
		response.headers.append('set-cookie', cookie);
	});

	return response;
};