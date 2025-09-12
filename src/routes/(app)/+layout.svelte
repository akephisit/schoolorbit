<script lang="ts">
	import { page } from '$app/stores';
	import Sidebar from '$lib/components/Sidebar.svelte';

	$: userPermissions = $page.data.perms || [];
</script>

<div class="h-screen flex overflow-hidden bg-gray-50">
	<Sidebar {userPermissions} />
	
	<div class="flex flex-col w-0 flex-1 overflow-hidden lg:ml-64">
		<main class="flex-1 relative overflow-y-auto focus:outline-none">
			<div class="py-6">
				<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<slot />
				</div>
			</div>
		</main>
	</div>
</div>