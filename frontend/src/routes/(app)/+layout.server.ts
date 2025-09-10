import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Redirect to login if not authenticated
	if (!locals.me) {
		// Default to personnel login, but could be made smarter in the future
		throw redirect(302, '/login/personnel');
	}

	return {
		user: locals.me.data.user,
		roles: locals.me.data.roles,
		perms: locals.me.data.perms,
		ctx: locals.me.data.ctx
	};
};