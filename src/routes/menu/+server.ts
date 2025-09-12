import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface MenuItem {
	label: string;
	href: string;
	icon: string;
	requires?: string[];
}

interface MenuResponse {
	data: MenuItem[];
}

export const GET: RequestHandler = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.me?.data?.user?.id) {
		return error(401, 'Unauthorized');
	}

	const menuItems: MenuItem[] = [
		{
			label: 'Dashboard',
			href: '/dashboard',
			icon: 'home'
			// No requirements - accessible to all authenticated users
		},
		{
			label: 'Classes',
			href: '/classes',
			icon: 'book',
			requires: ['class:read']
		},
		{
			label: 'Attendance',
			href: '/attendance',
			icon: 'calendar',
			requires: ['attend:read']
		},
		{
			label: 'Record Attendance',
			href: '/attendance/mark',
			icon: 'check',
			requires: ['attend:write']
		},
		{
			label: 'Grades',
			href: '/grades',
			icon: 'award',
			requires: ['grade:read']
		},
		{
			label: 'Users',
			href: '/users',
			icon: 'users',
			requires: ['user:manage']
		}
	];

	// Filter menu items based on user permissions
	const userPermissions = locals.me.data.perms || [];
	const hasPermission = (perm: string) => userPermissions.includes(perm);

	const filteredItems = menuItems.filter(item => {
		if (!item.requires) {
			return true; // No specific permissions required
		}
		// User needs at least one of the required permissions
		return item.requires.some(perm => hasPermission(perm));
	});

	return json({
		data: filteredItems
	} satisfies MenuResponse);
};