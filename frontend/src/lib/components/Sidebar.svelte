<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { fetchMenu, type MenuItem } from '$lib/menu.js';
	import { Button } from '$lib/components/ui/button';
	import { 
		Home,
		Book,
		Calendar,
		CheckCircle,
		Award,
		Users,
		Menu,
		X,
		LogOut
	} from '@lucide/svelte';
	import { api } from '$lib/api.js';
	import { goto } from '$app/navigation';

	export let userPermissions: string[] = [];
	
	let menuItems: MenuItem[] = [];
	let mobileMenuOpen = false;
	let loading = false;

	const iconMap: Record<string, any> = {
		home: Home,
		book: Book,
		calendar: Calendar,
		check: CheckCircle,
		award: Award,
		users: Users
	};

	onMount(async () => {
		try {
			menuItems = await fetchMenu();
		} catch (error) {
			console.error('Failed to load menu:', error);
		}
	});

	async function handleLogout() {
		try {
			await api.post('/auth/logout');
			goto('/login/personnel');
		} catch (error) {
			console.error('Logout failed:', error);
			// Still redirect even if logout call fails
			goto('/login/personnel');
		}
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	$: filteredItems = menuItems.filter(item => {
		if (!item.requires || item.requires.length === 0) {
			return true; // No permissions required
		}
		return item.requires.some(perm => userPermissions.includes(perm));
	});

	$: currentPath = $page.url.pathname;
</script>

<!-- Mobile menu button -->
<div class="lg:hidden">
	<Button variant="ghost" size="icon" onclick={toggleMobileMenu} class="fixed top-4 left-4 z-50">
		{#if mobileMenuOpen}
			<X class="h-6 w-6" />
		{:else}
			<Menu class="h-6 w-6" />
		{/if}
	</Button>
</div>

<!-- Sidebar -->
<div class="lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
	<!-- Mobile menu overlay -->
	{#if mobileMenuOpen}
		<div class="fixed inset-0 z-40 lg:hidden">
			<div class="fixed inset-0 bg-gray-600 bg-opacity-75" onclick={closeMobileMenu} role="button" tabindex="0" onkeydown={(e) => e.key === 'Escape' && closeMobileMenu()}></div>
		</div>
	{/if}

	<!-- Sidebar component -->
	<div class="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto {mobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 w-64' : 'hidden'} lg:block lg:relative lg:z-0">
		<div class="flex items-center flex-shrink-0 px-4">
			<h1 class="text-xl font-bold text-gray-900">
				{$page.data.branding?.name || 'SchoolOrbit'}
			</h1>
		</div>

		<nav class="mt-8 flex-1 flex flex-col justify-between">
			<div class="px-2 space-y-1">
				{#each filteredItems as item (item.href)}
					{@const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/')}
					<a
						href={item.href}
						onclick={closeMobileMenu}
						class="group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors {
							isActive
								? 'bg-blue-50 border-r-2 border-blue-500 text-blue-700'
								: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
						}"
					>
						<svelte:component 
							this={iconMap[item.icon] || Home} 
							class="mr-3 flex-shrink-0 h-5 w-5 {isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}"
						/>
						{item.label}
					</a>
				{/each}
			</div>

			<!-- User info and logout -->
			<div class="flex-shrink-0 px-2">
				<div class="border-t border-gray-200 pt-4">
					<div class="px-2 py-2">
						<div class="text-sm font-medium text-gray-900">
							{$page.data.user?.displayName || 'ผู้ใช้'}
						</div>
						<div class="text-xs text-gray-500">
							{#if $page.data.roles?.includes('admin')}
								ผู้ดูแลระบบ
							{:else if $page.data.roles?.includes('teacher')}
								ครู
							{:else if $page.data.roles?.includes('student')}
								นักเรียน
							{:else if $page.data.roles?.includes('parent')}
								ผู้ปกครอง
							{:else}
								ผู้ใช้
							{/if}
						</div>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onclick={handleLogout}
						disabled={loading}
						class="w-full justify-start mt-2"
					>
						<LogOut class="mr-2 h-4 w-4" />
						ออกจากระบบ
					</Button>
				</div>
			</div>
		</nav>
	</div>
</div>