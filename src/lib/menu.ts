
export interface MenuItem {
	label: string;
	href: string;
	icon: string;
	requires?: string[];
}

export async function fetchMenu(): Promise<MenuItem[]> {
	const response = await fetch('/menu');
	if (!response.ok) {
		throw new Error('Failed to fetch menu');
	}
	const data = await response.json();
	return data.data;
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