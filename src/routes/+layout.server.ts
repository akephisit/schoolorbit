import type { LayoutServerLoad } from './$types';
import { getEnabledFeatures } from '$lib/server/features';

const branding = {
	name: 'SchoolOrbit',
	logo: null,
	primaryColor: '#3b82f6',
	secondaryColor: '#64748b',
	theme: 'light'
};

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.me?.data?.user ?? null,
		roles: locals.me?.data?.roles ?? [],
		perms: locals.me?.data?.perms ?? [],
		ctx: locals.me?.data?.ctx ?? null,
		features: locals.me ? await getEnabledFeatures(locals) : [],
		branding
	};
};
