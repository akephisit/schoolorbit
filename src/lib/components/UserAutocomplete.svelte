<script lang="ts">
  import { onDestroy } from 'svelte';
  // Use native input to avoid event typing issues on custom Input

  export let value: string = '';
  export let placeholder: string = 'อีเมลผู้ใช้';
  export let minLength = 2;

  type User = { id: string; email: string | null; displayName: string; status: string };

  let open = false;
  let q = '';
  let results: User[] = [];
  let loading = false;
  let abort: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function show() { open = true; }
  function hide() { setTimeout(() => (open = false), 150); }

  function pick(u: User) {
    value = u.email || '';
    q = `${u.displayName} <${u.email || ''}>`;
    open = false;
  }

  async function search(query: string) {
    if (query.trim().length < minLength) { results = []; return; }
    loading = true;
    abort?.abort();
    abort = new AbortController();
    try {
      const url = new URL('/users/api/users', window.location.origin);
      url.searchParams.set('q', query.trim());
      const res = await fetch(url, { signal: abort.signal });
      if (!res.ok) throw new Error('search failed');
      const data = await res.json();
      results = (data.data || []) as User[];
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        console.error('user search failed', e);
      }
    } finally {
      loading = false;
    }
  }

  function onInput(e: Event) {
    const t = e.currentTarget as HTMLInputElement;
    q = t.value;
    show();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => search(q), 250);
  }

  onDestroy(() => { abort?.abort(); if (timer) clearTimeout(timer); });
</script>

<div class="relative">
  <input class="w-full border rounded px-3 py-2" {placeholder} value={q || value} on:focus={show} on:input={onInput} on:blur={hide} />
  {#if open}
    <div class="absolute z-50 mt-1 w-full bg-white border rounded shadow max-h-64 overflow-auto">
      {#if loading}
        <div class="p-2 text-sm text-gray-500">กำลังค้นหา…</div>
      {:else if results.length === 0}
        <div class="p-2 text-sm text-gray-500">ไม่พบผู้ใช้</div>
      {:else}
        {#each results as u}
          <button type="button" class="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm" on:mousedown|preventDefault={() => pick(u)}>
            <div class="font-medium">{u.displayName}</div>
            <div class="text-xs text-gray-500">{u.email}</div>
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>
