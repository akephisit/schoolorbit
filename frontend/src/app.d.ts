// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			schoolId: string;
			me: {
				data: {
					user: {
						id: string;
						email: string | null;
						displayName: string;
					};
					roles: string[];
					perms: string[];
					ctx: any;
				}
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
