import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals, url }) => {
    // Redirect to login if not authenticated
    if (!locals.me) {
        throw redirect(302, '/login');
    }

	return {
		user: locals.me.data.user,
		roles: locals.me.data.roles,
		perms: locals.me.data.perms,
		ctx: locals.me.data.ctx
	};
};
