import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { appUser } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

interface UserInfo {
	id: string;
	email?: string;
	displayName: string;
	title?: string | null;
	firstName?: string | null;
	lastName?: string | null;
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

	const user = await db.select({
		id: appUser.id,
		email: appUser.email,
		displayName: appUser.displayName,
		title: appUser.title,
		firstName: appUser.firstName,
		lastName: appUser.lastName
	})
	.from(appUser)
	.where(eq(appUser.id, locals.me.data.user.id))
	.limit(1);

	if (!user.length) {
		return error(404, 'User not found');
	}

	const userData = user[0];
	return json({
		data: {
			user: {
				id: userData.id,
				email: userData.email ?? undefined,
				displayName: userData.displayName,
				title: userData.title,
				firstName: userData.firstName,
				lastName: userData.lastName
			},
			roles: locals.me.data.roles || [],
			perms: locals.me.data.perms || [],
			ctx: locals.me.data.ctx
		}
	} satisfies MeResponse);
};
