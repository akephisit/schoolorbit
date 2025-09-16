<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { cn } from '$lib/utils';
  import { mode, setMode } from 'mode-watcher';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { fetchMenu, type MenuItem } from '$lib/menu';
  import { toast } from 'svelte-sonner';
  import {
    Home,
    Book,
    Calendar,
    CheckCircle,
    Award,
    Users,
    Menu as IconMenu,
    X as IconX,
    LogOut as IconLogout,
    Sun as IconSun,
    Moon as IconMoon,
    Shield as IconShield,
    Settings as IconSettings
  } from '@lucide/svelte';

  interface NavItem {
    title: string;
    href: string;
    icon: any;
    exact?: boolean;
  }

  export let appTitle: string = 'SchoolOrbit';
  export let appSubtitle: string = '';
  export let showLogo: boolean = true;
  export let bottomNavItems: NavItem[] = [];
  export let showAccountSettings: boolean = false;
  export let accountSettingsHref: string = '/profile/settings';

  let mobileMenuOpen = false;
  let user = $page.data.user;

  const iconMap: Record<string, any> = {
    home: Home,
    book: Book,
    calendar: Calendar,
    check: CheckCircle,
    award: Award,
    users: Users
  };

  let navigationItems: NavItem[] = [];
  onMount(async () => {
    try {
      const items: MenuItem[] = await fetchMenu();
      navigationItems = items.map((it) => ({
        title: it.label,
        href: it.href,
        icon: iconMap[it.icon] ?? Home
      }));
    } catch (e) {
      // ignore
    }
  });

  function toggleTheme() {
    setMode(mode.current === 'light' ? 'dark' : 'light');
  }

  async function handleLogout() {
    try {
      await fetch('/auth/logout', { method: 'POST' });
      toast.success('ออกจากระบบสำเร็จ');
    } finally {
      goto('/login');
    }
  }

  function isActiveRoute(href: string, exact: boolean = false): boolean {
    const currentPath = $page.url.pathname;
    return exact ? currentPath === href : currentPath.startsWith(href);
  }

  function onToggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }
  function onCloseMobileMenu() {
    mobileMenuOpen = false;
  }
</script>

<div class="min-h-screen bg-background">
  <header class="sticky top-0 z-40 border-b bg-card lg:hidden">
    <div class="flex items-center justify-between px-4 py-3">
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="sm" onclick={onToggleMobileMenu} class="p-2">
          {#if mobileMenuOpen}
            <IconX class="size-5" />
          {:else}
            <IconMenu class="size-5" />
          {/if}
        </Button>
        <h1 class="text-lg font-semibold">{appTitle}</h1>
      </div>

      {#if user}
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground">{user.displayName}</span>
          <Button variant="ghost" size="sm" onclick={toggleTheme} class="p-2">
            {#if mode.current === 'light'}
              <IconMoon class="size-4" />
            {:else}
              <IconSun class="size-4" />
            {/if}
          </Button>
          <Button variant="ghost" size="sm" onclick={handleLogout} class="p-2">
            <IconLogout class="size-4" />
          </Button>
        </div>
      {/if}
    </div>
  </header>

  {#if mobileMenuOpen}
    <div
      class="fixed inset-0 z-40 bg-black/20 lg:hidden"
      onclick={onCloseMobileMenu}
      onkeydown={(e) => e.key === 'Escape' && onCloseMobileMenu()}
      role="button"
      tabindex="0"
      aria-label="Close mobile menu"
    ></div>
  {/if}

  <div class="flex">
    <div class="fixed top-0 left-0 hidden h-screen w-64 border-r bg-card lg:block">
      <aside class="relative flex h-full flex-col overflow-hidden">
        <div class="border-b p-6">
          {#if showLogo}
            <div class="flex items-center space-x-3">
              <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary">
                <IconShield class="!h-5 !w-5 text-primary-foreground" />
              </div>
              <div class="flex flex-col items-start">
                <h1 class="text-xl font-bold text-foreground">{appTitle}</h1>
                {#if appSubtitle}
                  <p class="mt-1 text-sm text-muted-foreground">{appSubtitle}</p>
                {/if}
              </div>
            </div>
          {:else}
            <div>
              <h1 class="text-xl font-bold text-foreground">{appTitle}</h1>
              {#if appSubtitle}
                <p class="mt-1 text-sm text-muted-foreground">{appSubtitle}</p>
              {/if}
            </div>
          {/if}
        </div>

        <nav class="flex-1 space-y-2 overflow-y-auto px-4 py-6 pb-28">
          {#each navigationItems as item}
            {@const IconComponent = item.icon}
            <a
              href={item.href}
              class={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActiveRoute(item.href, item.exact)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <IconComponent class="size-5" />
              {item.title}
            </a>
          {/each}
        </nav>

        {#if user}
          <div class="shrink-0 border-t p-4">
            <div class="space-y-2">
              <Button variant="ghost" size="sm" onclick={toggleTheme} class="w-full justify-start">
                {#if mode.current === 'light'}
                  <IconMoon class="mr-2 size-4" /> โหมดมืด
                {:else}
                  <IconSun class="mr-2 size-4" /> โหมดสว่าง
                {/if}
              </Button>
              <Button variant="ghost" size="sm" onclick={handleLogout} class="w-full justify-start">
                <IconLogout class="mr-2 size-4" /> ออกจากระบบ
              </Button>
              {#if showAccountSettings}
                <Button variant="ghost" size="sm" class="w-full justify-start">
                  <a href={accountSettingsHref} class="flex items-center w-full">
                    <IconSettings class="mr-2 size-4" /> ตั้งค่าบัญชี
                  </a>
                </Button>
              {/if}
            </div>
          </div>
        {/if}
      </aside>
    </div>

    <aside
      class={cn(
        'fixed top-0 left-0 z-50 flex h-screen w-64 transform flex-col overflow-hidden border-r bg-card transition-transform duration-300 lg:hidden',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div class="flex items-center justify-between border-b p-6">
        <div class="flex items-center space-x-3">
          {#if showLogo}
            <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary">
              <IconShield class="!h-5 !w-5 text-primary-foreground" />
            </div>
          {/if}
          <div class="flex flex-col items-start">
            <h1 class="text-xl font-bold text-foreground">{appTitle}</h1>
            {#if appSubtitle}
              <p class="mt-1 text-sm text-muted-foreground">{appSubtitle}</p>
            {/if}
          </div>
        </div>
        <Button variant="ghost" size="sm" onclick={onCloseMobileMenu} class="p-2">
          <IconX class="size-5" />
        </Button>
      </div>

      <nav class="flex-1 space-y-2 overflow-y-auto px-4 py-6">
        {#each navigationItems as item}
          {@const IconComponent = item.icon}
          <a
            href={item.href}
            onclick={onCloseMobileMenu}
            class={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActiveRoute(item.href, item.exact)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <IconComponent class="size-5" />
            {item.title}
          </a>
        {/each}
      </nav>

      {#if user}
        <div class="shrink-0 border-t p-4">
          <div class="space-y-2">
            <Button variant="ghost" size="sm" onclick={toggleTheme} class="w-full justify-start">
              {#if mode.current === 'light'}
                <IconMoon class="mr-2 size-4" /> โหมดมืด
              {:else}
                <IconSun class="mr-2 size-4" /> โหมดสว่าง
              {/if}
            </Button>
            <Button variant="ghost" size="sm" onclick={handleLogout} class="w-full justify-start">
              <IconLogout class="mr-2 size-4" /> ออกจากระบบ
            </Button>
          </div>
        </div>
      {/if}
    </aside>

    <main class="min-h-screen flex-1 overflow-x-hidden lg:ml-64">
      <header class="fixed top-0 right-0 left-64 z-40 hidden border-b bg-card lg:block">
        <div class="flex items-center justify-between px-6 py-3">
          <h1 class="text-lg font-semibold">{appTitle}</h1>
          <div class="flex items-center gap-2">
            {#if user}
              <span class="text-sm text-muted-foreground">{user.displayName}</span>
            {/if}
            <Button variant="ghost" size="sm" onclick={toggleTheme} class="p-2">
              {#if mode.current === 'light'}
                <IconMoon class="size-4" />
              {:else}
                <IconSun class="size-4" />
              {/if}
            </Button>
            <Button variant="ghost" size="sm" onclick={handleLogout} class="p-2">
              <IconLogout class="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <div class="container mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-6 pt-4 lg:px-6 lg:py-4 lg:pt-20">
        <slot />
      </div>
    </main>
  </div>

  {#if bottomNavItems.length > 0}
    <nav class="fixed right-0 bottom-0 left-0 z-30 border-t bg-card lg:hidden">
      <div class="flex items-center justify-around py-2">
        {#each bottomNavItems as item}
          {@const IconComponent = item.icon}
          <a
            href={item.href}
            class={cn(
              'flex min-w-0 flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
              isActiveRoute(item.href, item.exact) ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <IconComponent class="size-5 flex-shrink-0" />
            <span class="truncate">{item.title}</span>
          </a>
        {/each}
      </div>
    </nav>
    <div class="h-16 lg:hidden"></div>
  {/if}
</div>
