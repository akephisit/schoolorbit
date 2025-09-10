import type { Handle } from '@sveltejs/kit';
import { getSchoolByDomain } from '$lib/tenant.js';
import { api } from '$lib/api.js';

export const handle: Handle = async ({ event, resolve }) => {
	const host = event.url.hostname;
	
	// Resolve tenant
	const tenant = getSchoolByDomain(host);
	event.locals.schoolId = tenant.schoolId;
	
	// Try to get current user
	let me: App.Locals['me'] = null;
	
	try {
		// Create a fetch function that includes cookies from the original request
		const fetchWithCookies = async (url: string, options: RequestInit = {}) => {
			return fetch(url, {
				...options,
				headers: {
					...options.headers,
					'Cookie': event.request.headers.get('Cookie') || '',
				},
			});
		};

		// First try to get user info
		const response = await fetchWithCookies(`http://localhost:8787/auth/me`);
		if (response.ok) {
			me = await response.json();
		}
	} catch (error) {
		// User is not authenticated
		me = null;
	}
	
	event.locals.me = me;
	
	const response = await resolve(event);
	
	// Set cache headers for static content
	if (event.url.pathname.startsWith('/static/') || event.url.pathname.includes('.')) {
		response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
	}
	
	return response;
};