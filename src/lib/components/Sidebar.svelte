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
		Settings,
		Building2,
		Briefcase,
		IdCard,
		Menu,
		X,
		LogOut
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';
    import { toast } from 'svelte-sonner';

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
		users: Users,
		settings: Settings,
		building: Building2,
		briefcase: Briefcase,
		idcard: IdCard
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
			await fetch('/auth/logout', { method: 'POST' });
			toast.success('ออกจากระบบสำเร็จ');
			goto('/login/personnel');
		} catch (error) {
			console.error('Logout failed:', error);
			toast.error('เกิดข้อผิดพลาดในการออกจากระบบ');
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
    <div class="flex flex-col flex-grow bg-sidebar text-sidebar-foreground border-r border-sidebar-border pt-5 pb-4 overflow-y-auto {mobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 w-64' : 'hidden'} lg:block lg:relative lg:z-0 shadow-sm">
        <div class="flex items-center flex-shrink-0 px-4">
            <h1 class="text-xl font-bold">
                {$page.data.branding?.name || 'SchoolOrbit'}
            </h1>
        </div>

		<nav class="mt-8 flex-1 flex flex-col justify-between">
            <div class="px-2 space-y-1 mt-4">
                {#each filteredItems as item (item.href)}
                    {@const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/')}
                    <a
                        href={item.href}
                        onclick={closeMobileMenu}
                        class="group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors {
                            isActive
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            }"
                    >
                        <svelte:component 
                            this={iconMap[item.icon] || Home} 
                            class="mr-3 flex-shrink-0 h-5 w-5 {isActive ? '' : 'opacity-60 group-hover:opacity-100'}"
                        />
                        {item.label}
                    </a>
                {/each}
            </div>

			<!-- User info and logout -->
            <div class="flex-shrink-0 px-2">
                <div class="border-t border-sidebar-border pt-4">
                    <div class="px-2 py-2">
                        <div class="text-sm font-medium">
                            {$page.data.user?.displayName || 'ผู้ใช้'}
                        </div>
                        <div class="text-xs opacity-70">
                            {#if $page.data.roles?.includes('staff')}
                                บุคลากร
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
                        class="w-full justify-start mt-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                        <LogOut class="mr-2 h-4 w-4" />
                        ออกจากระบบ
                    </Button>
                </div>
            </div>
        </nav>
    </div>
</div>
