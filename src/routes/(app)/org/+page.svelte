<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';

  type OrgUnit = { id: string; code: string; nameTh: string; type: string | null; parentId: string | null };
  type Member = { id: string; userId: string; roleInUnit: 'head'|'deputy'|'member'; startDate: string|null; endDate: string|null; displayName: string; email: string };

  let units: OrgUnit[] = [];
  let loading = true;
  let selectedUnitId: string | null = null;
  let members: Member[] = [];

  // New unit
  let uCode = '';
  let uName = '';
  let uType = '';
  let creating = false;

  // New member
  let mEmail = '';
  let mRole: 'head'|'deputy'|'member' = 'member';
  let mStart = '';
  let mEnd = '';

  async function loadUnits() {
    const res = await fetch('/org/api/units');
    if (res.ok) {
      const data = await res.json();
      units = data.data;
      if (selectedUnitId && !units.find(u => u.id === selectedUnitId)) selectedUnitId = null;
      if (!selectedUnitId && units.length) selectedUnitId = units[0].id;
      if (selectedUnitId) await loadMembers();
    }
  }

  async function loadMembers() {
    if (!selectedUnitId) { members = []; return; }
    const res = await fetch(`/org/api/memberships?unitId=${selectedUnitId}`);
    if (res.ok) { const data = await res.json(); members = data.data; }
  }

  onMount(async () => { loading = true; await loadUnits(); loading = false; });

  async function createUnit() {
    if (!uCode.trim() || !uName.trim()) return;
    creating = true;
    try {
      const res = await fetch('/org/api/units', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: uCode.trim(), nameTh: uName.trim(), type: uType.trim() || null }) });
      if (!res.ok) throw new Error(await res.text());
      uCode = ''; uName = ''; uType = '';
      await loadUnits();
    } catch (e) {
      alert('สร้างหน่วยงานไม่สำเร็จ');
    } finally { creating = false; }
  }

  async function addMember() {
    if (!selectedUnitId || !mEmail.trim()) return;
    const payload = { unitId: selectedUnitId, userEmail: mEmail.trim(), roleInUnit: mRole, startDate: mStart || null, endDate: mEnd || null };
    const res = await fetch('/org/api/memberships', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { alert('เพิ่มสมาชิกไม่สำเร็จ'); return; }
    mEmail=''; mRole='member'; mStart=''; mEnd='';
    await loadMembers();
  }

  async function updateMemberRole(id: string, role: 'head'|'deputy'|'member') {
    const res = await fetch(`/org/api/memberships/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleInUnit: role }) });
    if (!res.ok) { alert('อัปเดตบทบาทในฝ่ายไม่สำเร็จ'); return; }
    await loadMembers();
  }

  async function removeMember(id: string) {
    if (!confirm('นำสมาชิกออกจากฝ่ายนี้หรือไม่?')) return;
    const res = await fetch(`/org/api/memberships/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('ลบไม่สำเร็จ'); return; }
    await loadMembers();
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-semibold text-gray-900">หน่วยงาน/ฝ่าย</h1>
    <p class="mt-2 text-sm text-gray-600">จัดการโครงสร้างฝ่ายและสมาชิก</p>
  </div>

  {#if loading}
    <div>กำลังโหลด...</div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card class="lg:col-span-1">
        <CardHeader>
          <CardTitle>หน่วยงาน</CardTitle>
          <CardDescription>เพิ่มและเลือกหน่วยงาน</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="flex gap-2">
            <Input placeholder="รหัส (เช่น ACADEMIC)" bind:value={uCode} />
            <Input placeholder="ชื่อหน่วยงาน (ไทย)" bind:value={uName} />
          </div>
          <div class="flex gap-2">
            <Input placeholder="ประเภท (ตัวเลือก)" bind:value={uType} />
            <Button onclick={createUnit} disabled={creating}>{creating ? 'กำลังเพิ่ม...' : 'เพิ่ม'}</Button>
          </div>

          <div class="border rounded divide-y max-h-[400px] overflow-auto">
            {#each units as u}
              <label class="p-2 flex items-center gap-2 {selectedUnitId === u.id ? 'bg-gray-50' : ''}">
                <input type="radio" name="selUnit" checked={selectedUnitId === u.id} on:change={() => { selectedUnitId = u.id; loadMembers(); }} />
                <div>
                  <div class="text-sm font-medium">{u.nameTh}</div>
                  <div class="text-xs text-gray-500">{u.code}{u.type ? ` • ${u.type}` : ''}</div>
                </div>
              </label>
            {/each}
            {#if units.length === 0}
              <div class="p-3 text-sm text-gray-500">ยังไม่มีหน่วยงาน</div>
            {/if}
          </div>
        </CardContent>
      </Card>

      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle>สมาชิกฝ่าย</CardTitle>
          <CardDescription>เพิ่ม/ลบ และกำหนดหัวหน้า/รอง/สมาชิก</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          {#if !selectedUnitId}
            <div class="text-sm text-gray-600">กรุณาเลือกหน่วยงานทางซ้าย</div>
          {:else}
            <div class="flex flex-wrap gap-2 items-end">
              <Input class="w-56" placeholder="อีเมลบุคลากร" bind:value={mEmail} />
              <select class="border rounded px-2 py-2" bind:value={mRole}>
                <option value="member">สมาชิก</option>
                <option value="deputy">รองหัวหน้า</option>
                <option value="head">หัวหน้าฝ่าย</option>
              </select>
              <Input class="w-40" type="date" bind:value={mStart} />
              <Input class="w-40" type="date" bind:value={mEnd} />
              <Button onclick={addMember}>เพิ่มสมาชิก</Button>
            </div>

            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {#each members as m}
                <div class="border rounded p-2 flex items-center justify-between">
                  <div>
                    <div class="text-sm font-medium">{m.displayName}</div>
                    <div class="text-xs text-gray-500">{m.email}</div>
                    <div class="text-xs text-gray-500">ช่วงเวลา: {m.startDate || '-'} ถึง {m.endDate || '-'}</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <select class="border rounded px-2 py-1" bind:value={m.roleInUnit} on:change={(e) => updateMemberRole(m.id, (e.currentTarget as HTMLSelectElement).value as any)}>
                      <option value="member">สมาชิก</option>
                      <option value="deputy">รองหัวหน้า</option>
                      <option value="head">หัวหน้าฝ่าย</option>
                    </select>
                    <Button size="sm" variant="destructive" onclick={() => removeMember(m.id)}>นำออก</Button>
                  </div>
                </div>
              {/each}
              {#if members.length === 0}
                <div class="text-sm text-gray-500">ยังไม่มีสมาชิกในหน่วยงานนี้</div>
              {/if}
            </div>
          {/if}
        </CardContent>
      </Card>
    </div>
  {/if}
</div>

