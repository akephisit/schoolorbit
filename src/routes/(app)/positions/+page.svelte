<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import UserAutocomplete from '$lib/components/UserAutocomplete.svelte';
  import { Button } from '$lib/components/ui/button';
  import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
  import { Label } from '$lib/components/ui/label';

  type Position = { id: string; code: string; titleTh: string; category: string | null };
  type Assign = { id: string; userId: string; positionId: string; email: string; displayName: string };

  let positions: Position[] = [];
  let selectedPosId: string | undefined = undefined;
  let assigns: Assign[] = [];
  let loading = true;

  // New position
  let pCode = '';
  let pTitle = '';
  let pCat = '';
  let creating = false;

  // New assignment
  let aEmail = '';

  async function loadPositions() {
    const res = await fetch('/positions/api/positions');
    if (res.ok) { const data = await res.json(); positions = data.data; if (!selectedPosId && positions.length) selectedPosId = positions[0].id; }
  }
  async function loadAssigns() {
    if (!selectedPosId) { assigns = []; return; }
    const res = await fetch(`/positions/api/assignments?positionId=${selectedPosId}`);
    if (res.ok) { const data = await res.json(); assigns = data.data; }
  }

  onMount(async () => { loading = true; await loadPositions(); await loadAssigns(); loading = false; });

  async function createPosition() {
    if (!pCode.trim() || !pTitle.trim()) return;
    creating = true;
    try {
      const res = await fetch('/positions/api/positions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: pCode.trim(), titleTh: pTitle.trim(), category: pCat.trim() || null }) });
      if (!res.ok) throw new Error(await res.text());
      pCode=''; pTitle=''; pCat='';
      await loadPositions();
    } catch { alert('เพิ่มตำแหน่งไม่สำเร็จ'); } finally { creating = false; }
  }

  async function addAssign() {
    if (!selectedPosId || !aEmail.trim()) return;
    const res = await fetch('/positions/api/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ positionId: selectedPosId, userEmail: aEmail.trim() }) });
    if (!res.ok) { alert('มอบหมายตำแหน่งไม่สำเร็จ'); return; }
    aEmail='';
    await loadAssigns();
  }

  async function removeAssign(id: string) {
    if (!confirm('ยกเลิกมอบหมายตำแหน่งนี้หรือไม่?')) return;
    const res = await fetch(`/positions/api/assignments/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('ลบไม่สำเร็จ'); return; }
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
          <div class="flex gap-2">
            <Input placeholder="รหัส (เช่น DIRECTOR)" bind:value={pCode} />
            <Input placeholder="ชื่อตำแหน่ง (ไทย)" bind:value={pTitle} />
          </div>
          <div class="flex gap-2">
            <Input placeholder="หมวด (ตัวเลือก)" bind:value={pCat} />
            <Button onclick={createPosition} disabled={creating}>{creating ? 'กำลังเพิ่ม...' : 'เพิ่ม'}</Button>
          </div>

          <RadioGroup bind:value={selectedPosId} class="border rounded divide-y max-h-[400px] overflow-auto">
            {#each positions as p}
              <div class="p-2 flex items-center gap-2 {selectedPosId === p.id ? 'bg-gray-50' : ''}"
                   role="button" tabindex="0"
                   on:click={() => { selectedPosId = p.id; loadAssigns(); }}
                   on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectedPosId = p.id; loadAssigns(); } }}>
                <RadioGroupItem value={p.id} id={`pos-${p.id}`} />
                <Label for={`pos-${p.id}`} class="sr-only">เลือก {p.titleTh}</Label>
                <div>
                  <div class="text-sm font-medium">{p.titleTh}</div>
                  <div class="text-xs text-gray-500">{p.code}{p.category ? ` • ${p.category}` : ''}</div>
                </div>
              </div>
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
              <div class="w-56"><UserAutocomplete bind:value={aEmail} placeholder="ค้นหาผู้ใช้ (พิมพ์ชื่อ/อีเมล)" /></div>
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
