import type { Handle } from '@sveltejs/kit';
import { getConfig } from '$lib/server/config.js';
import { JwtService } from '$lib/server/jwt.js';

export const handle: Handle = async ({ event, resolve }) => {
	
	// Try to get current user from JWT token
	let me: App.Locals['me'] = null;
	
	try {
		const config = getConfig();
		const jwtService = new JwtService(config.jwtSecret);
		
		// Get access token from cookie
		const accessToken = event.cookies.get('at');
		
		if (accessToken) {
			// Verify and decode JWT
			const claims = jwtService.verifyToken(accessToken);
			
			// Build user info from JWT claims
			me = {
				data: {
					user: {
						id: claims.sub,
						email: null,
						displayName: 'User'
					},
					roles: claims.roles,
					perms: claims.perms,
					ctx: claims.ctx
				}
			};
		}
	} catch (error) {
		// Token is invalid or expired
		me = null;
	}
	
	event.locals.me = me;
	event.locals.features = null;
	event.locals.featureRuntime = null;
	
	const response = await resolve(event);
	
	// Set cache headers for static content
	if (event.url.pathname.startsWith('/static/') || event.url.pathname.includes('.')) {
		response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
	}
	
	return response;
};
