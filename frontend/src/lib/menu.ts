import { api } from './api.js';

export interface MenuItem {
	label: string;
	href: string;
	icon: string;
	requires?: string[];
}

export async function fetchMenu(): Promise<MenuItem[]> {
	const response = await api.get<{ data: MenuItem[] }>('/menu');
	return response.data;
}

export function filterMenuByPermissions(items: MenuItem[], userPermissions: string[]): MenuItem[] {
	return items.filter(item => {
		if (!item.requires || item.requires.length === 0) {
			return true; // No permissions required
		}
		
		// User needs at least one of the required permissions
		return item.requires.some(perm => userPermissions.includes(perm));
	});
}