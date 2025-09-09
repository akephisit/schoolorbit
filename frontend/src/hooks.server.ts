import type { Handle } from '@sveltejs/kit';
import { getSchoolByDomain } from '$lib/tenant.js';
import { api } from '$lib/api.js';

export const handle: Handle = async ({ event, resolve }) => {
	const host = event.url.hostname;
	
	// Resolve tenant
	const tenant = getSchoolByDomain(host);
	event.locals.schoolId = tenant.schoolId;
	
	// Try to get current user
	let me = null;
	
	try {
		// First try to get user info
		me = await api.get('/auth/me');
	} catch (error) {
		// If that fails, try to refresh the token
		try {
			await api.post('/auth/refresh');
			// Retry getting user info
			me = await api.get('/auth/me');
		} catch (refreshError) {
			// Both failed, user is not authenticated
			me = null;
		}
	}
	
	event.locals.me = me;
	
	const response = await resolve(event);
	
	// Set cache headers for static content
	if (event.url.pathname.startsWith('/static/') || event.url.pathname.includes('.')) {
		response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
	}
	
	return response;
};