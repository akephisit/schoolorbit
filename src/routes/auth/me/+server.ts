import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getConfig } from '$lib/server/config';
import { createPool, queryOne } from '$lib/server/db';

interface UserInfo {
	id: string;
	email?: string;
	displayName: string;
}

interface MeResponse {
	data: {
		user: UserInfo;
		roles: string[];
		perms: string[];
		ctx?: any;
	};
}

export const GET: RequestHandler = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.me?.data?.user?.id) {
		return error(401, 'Unauthorized');
	}

	const config = getConfig();
	const pool = createPool(config.databaseUrl);

	const user = await queryOne<{ id: string; email?: string; display_name: string }>(
		pool,
		`SELECT id, email, display_name
		 FROM app_user
		 WHERE id = $1 AND status = 'active'`,
		[locals.me.data.user.id]
	);

	if (!user) {
		return error(404, 'User not found');
	}

	return json({
		data: {
			user: {
				id: user.id,
				email: user.email,
				displayName: user.display_name
			},
			roles: locals.me.data.roles || [],
			perms: locals.me.data.perms || [],
			ctx: locals.me.data.ctx
		}
	} satisfies MeResponse);
};