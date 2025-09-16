<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import UserAutocomplete from '$lib/components/UserAutocomplete.svelte';
  import { Button } from '$lib/components/ui/button';
  import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import { Label } from '$lib/components/ui/label';

  type OrgUnit = { id: string; code: string; nameTh: string; type: string | null; parentId: string | null };
  type Member = { id: string; userId: string; roleInUnit: 'head'|'deputy'|'member'; displayName: string; email: string };

  let units: OrgUnit[] = [];
  let loading = true;
  let selectedUnitId: string | undefined = undefined;
  let members: Member[] = [];
  let mRoleSel: Record<string, 'head'|'deputy'|'member'> = {};

  // New unit
  let uCode = '';
  let uName = '';
  let uType = '';
  let creating = false;

  // New member
  let mEmail = '';
  let mRole: 'head'|'deputy'|'member' = 'member';

  async function loadUnits() {
    const res = await fetch('/org/api/units');
    if (res.ok) {
      const data = await res.json();
      units = data.data;
      if (selectedUnitId && !units.find(u => u.id === selectedUnitId)) selectedUnitId = undefined;
      if (!selectedUnitId && units.length) selectedUnitId = units[0].id;
      if (selectedUnitId) await loadMembers();
    }
  }

  async function loadMembers() {
    if (!selectedUnitId) { members = []; return; }
    const res = await fetch(`/org/api/memberships?unitId=${selectedUnitId}`);
    if (res.ok) {
      const data = await res.json();
      members = data.data as Member[];
      // initialize select values per member
      for (const m of members) {
        if (!mRoleSel[m.id]) mRoleSel[m.id] = m.roleInUnit;
      }
    }
  }

  onMount(async () => { loading = true; await loadUnits(); loading = false; });

  // Update member role when selection changes
  $: if (members) {
    for (const m of members) {
      const next = mRoleSel[m.id];
      if (next && next !== m.roleInUnit) {
        updateMemberRole(m.id, next);
      }
    }
  }

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
    const payload = { unitId: selectedUnitId, userEmail: mEmail.trim(), roleInUnit: mRole };
    const res = await fetch('/org/api/memberships', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { alert('เพิ่มสมาชิกไม่สำเร็จ'); return; }
    mEmail=''; mRole='member';
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

          <RadioGroup bind:value={selectedUnitId} class="border rounded divide-y max-h-[400px] overflow-auto">
            {#each units as u}
              <div class="p-2 flex items-center gap-2 {selectedUnitId === u.id ? 'bg-gray-50' : ''}"
                   role="button" tabindex="0"
                   on:click={() => { selectedUnitId = u.id; loadMembers(); }}
                   on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectedUnitId = u.id; loadMembers(); } }}>
                <RadioGroupItem value={u.id} id={`unit-${u.id}`} />
                <Label for={`unit-${u.id}`} class="sr-only">เลือก {u.nameTh}</Label>
                <div>
                  <div class="text-sm font-medium">{u.nameTh}</div>
                  <div class="text-xs text-gray-500">{u.code}{u.type ? ` • ${u.type}` : ''}</div>
                </div>
              </div>
            {/each}
            {#if units.length === 0}
              <div class="p-3 text-sm text-gray-500">ยังไม่มีหน่วยงาน</div>
            {/if}
          </RadioGroup>
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
              <div class="w-56"><UserAutocomplete bind:value={mEmail} placeholder="ค้นหาผู้ใช้ (พิมพ์ชื่อ/อีเมล)" /></div>
              <Select type="single" bind:value={mRole}>
                <SelectTrigger>{mRole === 'head' ? 'หัวหน้าฝ่าย' : mRole === 'deputy' ? 'รองหัวหน้า' : 'สมาชิก'}</SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">สมาชิก</SelectItem>
                  <SelectItem value="deputy">รองหัวหน้า</SelectItem>
                  <SelectItem value="head">หัวหน้าฝ่าย</SelectItem>
                </SelectContent>
              </Select>
              <Button onclick={addMember}>เพิ่มสมาชิก</Button>
            </div>

            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {#each members as m}
                <div class="border rounded p-2 flex items-center justify-between">
                  <div>
                    <div class="text-sm font-medium">{m.displayName}</div>
                    <div class="text-xs text-gray-500">{m.email}</div>
                    
                  </div>
                  <div class="flex items-center gap-2">
                    <Select type="single" bind:value={mRoleSel[m.id]}>
                      <SelectTrigger>{mRoleSel[m.id] === 'head' ? 'หัวหน้าฝ่าย' : mRoleSel[m.id] === 'deputy' ? 'รองหัวหน้า' : 'สมาชิก'}</SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">สมาชิก</SelectItem>
                        <SelectItem value="deputy">รองหัวหน้า</SelectItem>
                        <SelectItem value="head">หัวหน้าฝ่าย</SelectItem>
                      </SelectContent>
                    </Select>
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
