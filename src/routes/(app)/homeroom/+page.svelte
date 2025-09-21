<script lang="ts">
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import UserAutocomplete from '$lib/components/UserAutocomplete.svelte';
  import { Button } from '$lib/components/ui/button';
  import { toast } from 'svelte-sonner';
  import { parseApiError, firstFieldErrorMap } from '$lib/utils/api';

  type HR = { id: string; classCode: string; email: string; displayName: string };

  let items = $state<HR[]>([]);
  let loading = $state(true);

  let classCode = $state('');
  let teacherEmail = $state('');
  let fieldErrors = $state<Record<string, string>>({});
  

  async function loadAll() {
    const res = await fetch('/homeroom/api/assignments');
    if (res.ok) { const data = await res.json(); items = data.data; }
  }

  $effect(() => { loading = true; (async () => { await loadAll(); loading = false; })(); });

  async function add() {
    fieldErrors = {};
    if (!classCode.trim() || !teacherEmail.trim()) {
      fieldErrors = {
        ...(classCode.trim() ? {} : { classCode: 'กรุณากรอกห้องเรียน' }),
        ...(teacherEmail.trim() ? {} : { teacherEmail: 'กรุณาเลือกอีเมลครู' })
      };
      toast.error('กรุณากรอกข้อมูลให้ครบ');
      return;
    }
    const res = await fetch('/homeroom/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classCode: classCode.trim(), teacherEmail: teacherEmail.trim() })
    });
    if (!res.ok) {
      const apiError = await parseApiError(res);
      fieldErrors = firstFieldErrorMap(apiError.fieldErrors);
      toast.error(apiError.message);
      return;
    }
    classCode=''; teacherEmail='';
    fieldErrors = {};
    await loadAll();
  }

  async function remove(id: string) {
    if (!confirm('ลบรายการนี้หรือไม่?')) return;
    const res = await fetch(`/homeroom/api/assignments/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('ลบไม่สำเร็จ'); return; }
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
          <div class="flex flex-col gap-1 w-40">
            <Input placeholder="ชั้น (เช่น ม.6/1)" bind:value={classCode} class={fieldErrors.classCode ? 'border-red-500 focus-visible:ring-red-500' : ''} />
            {#if fieldErrors.classCode}<p class="text-xs text-red-500">{fieldErrors.classCode}</p>{/if}
          </div>
          <div class="w-56 flex flex-col gap-1">
            <UserAutocomplete bind:value={teacherEmail} placeholder="ค้นหาครู (พิมพ์ชื่อ/อีเมล)" />
            {#if fieldErrors.teacherEmail}<p class="text-xs text-red-500">{fieldErrors.teacherEmail}</p>{/if}
          </div>
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
