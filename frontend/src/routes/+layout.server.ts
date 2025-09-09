import type { LayoutServerLoad } from './$types';
import { getBranding } from '$lib/tenant.js';

export const load: LayoutServerLoad = async ({ locals }) => {
	const branding = getBranding(locals.schoolId);
	
	return {
		schoolId: locals.schoolId,
		user: locals.me?.data?.user ?? null,
		roles: locals.me?.data?.roles ?? [],
		perms: locals.me?.data?.perms ?? [],
		ctx: locals.me?.data?.ctx ?? null,
		branding
	};
};