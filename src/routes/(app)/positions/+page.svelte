<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import UserAutocomplete from '$lib/components/UserAutocomplete.svelte';
  import { Button } from '$lib/components/ui/button';
  import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
  import { Label } from '$lib/components/ui/label';
  import CheckIcon from '@lucide/svelte/icons/check';
  import { toast } from 'svelte-sonner';
  import { parseApiError, firstFieldErrorMap } from '$lib/utils/api';

  type Position = { id: string; code: string; titleTh: string; category: string | null };
  type Assign = { id: string; userId: string; positionId: string; email: string; displayName: string };

  let positions = $state<Position[]>([]);
  let selectedPosId = $state<string | undefined>(undefined);
  let assigns = $state<Assign[]>([]);
  let loading = $state(true);

  // New position
  let pCode = $state('');
  let pTitle = $state('');
  let pCat = $state('');
  let creating = $state(false);
  let positionFieldErrors = $state<Record<string, string>>({});

  // New assignment
  let aEmail = $state('');
  let assignmentFieldErrors = $state<Record<string, string>>({});

  async function loadPositions() {
    const res = await fetch('/positions/api/positions');
    if (res.ok) { const data = await res.json(); positions = data.data; if (!selectedPosId && positions.length) selectedPosId = positions[0].id; }
  }
  async function loadAssigns() {
    if (!selectedPosId) { assigns = []; return; }
    const res = await fetch(`/positions/api/assignments?positionId=${selectedPosId}`);
    if (res.ok) { const data = await res.json(); assigns = data.data; }
  }

  $effect(() => { loading = true; (async () => { await loadPositions(); await loadAssigns(); loading = false; })(); });

  async function createPosition() {
    positionFieldErrors = {};
    creating = true;
    try {
      const res = await fetch('/positions/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pCode.trim(), titleTh: pTitle.trim(), category: pCat.trim() || undefined })
      });
      if (!res.ok) {
        const apiError = await parseApiError(res);
        positionFieldErrors = firstFieldErrorMap(apiError.fieldErrors);
        toast.error(apiError.message);
        return;
      }
      pCode=''; pTitle=''; pCat='';
      positionFieldErrors = {};
      await loadPositions();
    } catch { toast.error('เพิ่มตำแหน่งไม่สำเร็จ'); } finally { creating = false; }
  }

  async function addAssign() {
    assignmentFieldErrors = {};
    if (!selectedPosId || !aEmail.trim()) {
      assignmentFieldErrors = { userEmail: 'กรุณาเลือกอีเมลผู้ใช้' };
      toast.error('กรุณาเลือกอีเมลผู้ใช้');
      return;
    }
    const res = await fetch('/positions/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId: selectedPosId, userEmail: aEmail.trim() })
    });
    if (!res.ok) {
      const apiError = await parseApiError(res);
      assignmentFieldErrors = firstFieldErrorMap(apiError.fieldErrors);
      toast.error(apiError.message);
      return;
    }
    aEmail='';
    assignmentFieldErrors = {};
    await loadAssigns();
  }

  async function removeAssign(id: string) {
    if (!confirm('ยกเลิกมอบหมายตำแหน่งนี้หรือไม่?')) return;
    const res = await fetch(`/positions/api/assignments/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('ลบไม่สำเร็จ'); return; }
    await loadAssigns();
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-semibold text-gray-900">ตำแหน่ง</h1>
    <p class="mt-2 text-sm text-gray-600">จัดการตำแหน่งและการมอบหมาย</p>
  </div>

  {#if loading}
    <div>กำลังโหลด...</div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card class="lg:col-span-1">
        <CardHeader>
          <CardTitle>ตำแหน่ง</CardTitle>
          <CardDescription>เพิ่มและเลือกตำแหน่ง</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="flex flex-wrap gap-2">
            <div class="flex flex-col gap-1 flex-1 min-w-40">
              <Input placeholder="รหัส (เช่น DIRECTOR)" bind:value={pCode} class={positionFieldErrors.code ? 'border-red-500 focus-visible:ring-red-500' : ''} />
              {#if positionFieldErrors.code}<p class="text-xs text-red-500">{positionFieldErrors.code}</p>{/if}
            </div>
            <div class="flex flex-col gap-1 flex-1 min-w-40">
              <Input placeholder="ชื่อตำแหน่ง (ไทย)" bind:value={pTitle} class={positionFieldErrors.titleTh ? 'border-red-500 focus-visible:ring-red-500' : ''} />
              {#if positionFieldErrors.titleTh}<p class="text-xs text-red-500">{positionFieldErrors.titleTh}</p>{/if}
            </div>
          </div>
          <div class="flex flex-wrap gap-2 items-end">
            <div class="flex flex-col gap-1 flex-1 min-w-40">
              <Input placeholder="หมวด (ตัวเลือก)" bind:value={pCat} class={positionFieldErrors.category ? 'border-red-500 focus-visible:ring-red-500' : ''} />
              {#if positionFieldErrors.category}<p class="text-xs text-red-500">{positionFieldErrors.category}</p>{/if}
            </div>
            <Button onclick={createPosition} disabled={creating}>{creating ? 'กำลังเพิ่ม...' : 'เพิ่ม'}</Button>
          </div>

          <RadioGroup bind:value={selectedPosId} class="border rounded max-h-[400px] overflow-auto">
            {#each positions as p}
              <button type="button"
                      class="w-full text-left flex items-center gap-3 px-3 py-2 transition-colors border-l-2 {selectedPosId === p.id ? 'bg-primary/5 border-primary' : 'border-transparent hover:bg-gray-50'}"
                      aria-pressed={selectedPosId === p.id}
                      onclick={() => { selectedPosId = p.id; loadAssigns(); }}
                      onkeydown={(e) => { if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') { e.preventDefault(); selectedPosId = p.id; loadAssigns(); } }}>
                <RadioGroupItem value={p.id} id={`pos-${p.id}`} class="sr-only" />
                <div class="flex-1">
                  <div class="text-sm font-medium {selectedPosId === p.id ? 'text-primary' : ''}">{p.titleTh}</div>
                  <div class="text-xs text-gray-500">{p.code}{p.category ? ` • ${p.category}` : ''}</div>
                </div>
                {#if selectedPosId === p.id}
                  <CheckIcon class="size-4 text-primary" />
                {/if}
              </button>
            {/each}
            {#if positions.length === 0}
              <div class="p-3 text-sm text-gray-500">ยังไม่มีตำแหน่ง</div>
            {/if}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle>การมอบหมายตำแหน่ง</CardTitle>
          <CardDescription>เลือกอีเมลบุคลากรและช่วงเวลา</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          {#if !selectedPosId}
            <div class="text-sm text-gray-600">กรุณาเลือกตำแหน่งทางซ้าย</div>
          {:else}
            <div class="flex flex-wrap gap-2 items-end">
              <div class="w-56 flex flex-col gap-1">
                <UserAutocomplete bind:value={aEmail} placeholder="ค้นหาผู้ใช้ (พิมพ์ชื่อ/อีเมล)" />
                {#if assignmentFieldErrors.userEmail}<p class="text-xs text-red-500">{assignmentFieldErrors.userEmail}</p>{/if}
              </div>
              <Button onclick={addAssign}>มอบหมาย</Button>
            </div>

            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {#each assigns as a}
                <div class="border rounded p-2 flex items-center justify-between">
                  <div>
                    <div class="text-sm font-medium">{a.displayName}</div>
                    <div class="text-xs text-gray-500">{a.email}</div>
                    
                  </div>
                  <div class="flex items-center gap-2">
                    <Button size="sm" variant="destructive" onclick={() => removeAssign(a.id)}>ยกเลิก</Button>
                  </div>
                </div>
              {/each}
              {#if assigns.length === 0}
                <div class="text-sm text-gray-500">ยังไม่มีการมอบหมายในตำแหน่งนี้</div>
              {/if}
            </div>
          {/if}
        </CardContent>
      </Card>
    </div>
  {/if}
</div>
