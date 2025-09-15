<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';

  type HR = { id: string; classCode: string; startDate: string|null; endDate: string|null; email: string; displayName: string };

  let items: HR[] = [];
  let loading = true;

  let classCode = '';
  let teacherEmail = '';
  let startDate = '';
  let endDate = '';

  async function loadAll() {
    const res = await fetch('/homeroom/api/assignments');
    if (res.ok) { const data = await res.json(); items = data.data; }
  }

  onMount(async () => { loading = true; await loadAll(); loading = false; });

  async function add() {
    if (!classCode.trim() || !teacherEmail.trim()) return;
    const res = await fetch('/homeroom/api/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classCode: classCode.trim(), teacherEmail: teacherEmail.trim(), startDate: startDate || null, endDate: endDate || null }) });
    if (!res.ok) { alert('เพิ่มครูประจำชั้นไม่สำเร็จ'); return; }
    classCode=''; teacherEmail=''; startDate=''; endDate='';
    await loadAll();
  }

  async function remove(id: string) {
    if (!confirm('ลบรายการนี้หรือไม่?')) return;
    const res = await fetch(`/homeroom/api/assignments/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('ลบไม่สำเร็จ'); return; }
    await loadAll();
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-semibold text-gray-900">ครูประจำชั้น</h1>
    <p class="mt-2 text-sm text-gray-600">จัดการการมอบหมายครูประจำชั้น</p>
  </div>

  {#if loading}
    <div>กำลังโหลด...</div>
  {:else}
    <Card>
      <CardHeader>
        <CardTitle>เพิ่มการมอบหมาย</CardTitle>
        <CardDescription>ใส่รหัสชั้นเรียนและอีเมลครู</CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex flex-wrap gap-2 items-end">
          <Input class="w-40" placeholder="ชั้น (เช่น ม.6/1)" bind:value={classCode} />
          <Input class="w-56" placeholder="อีเมลครู" bind:value={teacherEmail} />
          <Input class="w-40" type="date" bind:value={startDate} />
          <Input class="w-40" type="date" bind:value={endDate} />
          <Button onclick={add}>เพิ่ม</Button>
        </div>

        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {#each items as it}
            <div class="border rounded p-2 flex items-center justify-between">
              <div>
                <div class="text-sm font-medium">{it.displayName}</div>
                <div class="text-xs text-gray-500">{it.email}</div>
                <div class="text-xs text-gray-500">ชั้น: {it.classCode}</div>
                <div class="text-xs text-gray-500">ช่วงเวลา: {it.startDate || '-'} ถึง {it.endDate || '-'}</div>
              </div>
              <div class="flex items-center gap-2">
                <Button size="sm" variant="destructive" onclick={() => remove(it.id)}>ลบ</Button>
              </div>
            </div>
          {/each}
          {#if items.length === 0}
            <div class="text-sm text-gray-500">ยังไม่มีการมอบหมาย</div>
          {/if}
        </div>
      </CardContent>
    </Card>
  {/if}
</div>

