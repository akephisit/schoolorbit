<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import UserAutocomplete from '$lib/components/UserAutocomplete.svelte';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';

  type HR = { id: string; classCode: string; email: string; displayName: string };

  let items: HR[] = [];
  let loading = true;

  let classCode = '';
  let teacherEmail = '';
  

  async function loadAll() {
    const res = await fetch('/homeroom/api/assignments');
    if (res.ok) { const data = await res.json(); items = data.data; }
  }

  onMount(async () => { loading = true; await loadAll(); loading = false; });

  async function add() {
    if (!classCode.trim() || !teacherEmail.trim()) return;
    const res = await fetch('/homeroom/api/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classCode: classCode.trim(), teacherEmail: teacherEmail.trim() }) });
    if (!res.ok) { toast.error('เพิ่มครูประจำชั้นไม่สำเร็จ'); return; }
    classCode=''; teacherEmail='';
    await loadAll();
    toast.success('เพิ่มครูประจำชั้นแล้ว');
  }

  async function remove(id: string) {
    if (!confirm('ลบรายการนี้หรือไม่?')) return;
    const res = await fetch(`/homeroom/api/assignments/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('ลบไม่สำเร็จ'); return; }
    await loadAll();
    toast.success('ลบแล้ว');
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
          <div class="w-56"><UserAutocomplete bind:value={teacherEmail} placeholder="ค้นหาครู (พิมพ์ชื่อ/อีเมล)" /></div>
          <Button onclick={add}>เพิ่ม</Button>
        </div>

        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {#each items as it}
            <div class="border rounded p-2 flex items-center justify-between">
              <div>
                <div class="text-sm font-medium">{it.displayName}</div>
                <div class="text-xs text-gray-500">{it.email}</div>
                <div class="text-xs text-gray-500">ชั้น: {it.classCode}</div>
                
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
