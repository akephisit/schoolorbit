<script lang="ts">
  import AppLayout from '$lib/components/AppLayout.svelte';
  import { page } from '$app/stores';
  $: appTitle = $page.data.branding?.name || 'SchoolOrbit';
  $: appSubtitle = '';
</script>

<AppLayout {appTitle} {appSubtitle}>
  <slot />
</AppLayout>
