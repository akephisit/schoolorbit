<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import UserAutocomplete from '$lib/components/UserAutocomplete.svelte';
  import { Button } from '$lib/components/ui/button';
  import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import { Label } from '$lib/components/ui/label';
  import CheckIcon from '@lucide/svelte/icons/check';
  import { toast } from 'svelte-sonner';
  import { parseApiError, firstFieldErrorMap } from '$lib/utils/api';

  type OrgUnit = { id: string; code: string; nameTh: string; type: string | null; parentId: string | null };
  type Member = { id: string; userId: string; roleInUnit: 'head'|'deputy'|'member'; displayName: string; email: string };

  let units = $state<OrgUnit[]>([]);
  let loading = $state(true);
  let selectedUnitId = $state<string | undefined>(undefined);
  let members = $state<Member[]>([]);
  let mRoleSel = $state<Record<string, 'head'|'deputy'|'member'>>({});

  // New unit
  let uCode = $state('');
  let uName = $state('');
  let uType = $state('');
  let creating = $state(false);
  let unitFieldErrors = $state<Record<string, string>>({});

  // New member
  let mEmail = $state('');
  let mRole = $state<'head'|'deputy'|'member'>('member');
  let memberFieldErrors = $state<Record<string, string>>({});

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

  $effect(() => { loading = true; (async () => { await loadUnits(); loading = false; })(); });

  // Update member role when selection changes
  $effect(() => {
    for (const m of members) {
      const next = mRoleSel[m.id];
      if (next && next !== m.roleInUnit) {
        updateMemberRole(m.id, next);
      }
    }
  });

  async function createUnit() {
    unitFieldErrors = {};
    creating = true;
    try {
      const res = await fetch('/org/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: uCode.trim(), nameTh: uName.trim(), type: uType.trim() || undefined })
      });
      if (!res.ok) {
        const apiError = await parseApiError(res);
        unitFieldErrors = firstFieldErrorMap(apiError.fieldErrors);
        toast.error(apiError.message);
        return;
      }
      uCode = ''; uName = ''; uType = '';
      unitFieldErrors = {};
      await loadUnits();
    } catch (e) {
      toast.error('สร้างหน่วยงานไม่สำเร็จ');
    } finally { creating = false; }
  }

  async function addMember() {
    memberFieldErrors = {};
    if (!selectedUnitId || !mEmail.trim()) {
      memberFieldErrors = { userEmail: 'กรุณาเลือกอีเมลผู้ใช้' };
      toast.error('กรุณาเลือกอีเมลผู้ใช้');
      return;
    }
    const payload = { unitId: selectedUnitId, userEmail: mEmail.trim(), roleInUnit: mRole };
    const res = await fetch('/org/api/memberships', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const apiError = await parseApiError(res);
      memberFieldErrors = firstFieldErrorMap(apiError.fieldErrors);
      toast.error(apiError.message);
      return;
    }
    mEmail=''; mRole='member';
    memberFieldErrors = {};
    await loadMembers();
  }

  async function updateMemberRole(id: string, role: 'head'|'deputy'|'member') {
    const res = await fetch(`/org/api/memberships/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleInUnit: role }) });
    if (!res.ok) {
      const apiError = await parseApiError(res);
      toast.error(apiError.message);
      return;
    }
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
          <div class="flex flex-wrap gap-2">
            <div class="flex flex-col gap-1 flex-1 min-w-40">
              <Input placeholder="รหัส (เช่น ACADEMIC)" bind:value={uCode} class={unitFieldErrors.code ? 'border-red-500 focus-visible:ring-red-500' : ''} />
              {#if unitFieldErrors.code}<p class="text-xs text-red-500">{unitFieldErrors.code}</p>{/if}
            </div>
            <div class="flex flex-col gap-1 flex-1 min-w-40">
              <Input placeholder="ชื่อหน่วยงาน (ไทย)" bind:value={uName} class={unitFieldErrors.nameTh ? 'border-red-500 focus-visible:ring-red-500' : ''} />
              {#if unitFieldErrors.nameTh}<p class="text-xs text-red-500">{unitFieldErrors.nameTh}</p>{/if}
            </div>
          </div>
          <div class="flex flex-wrap gap-2 items-end">
            <div class="flex flex-col gap-1 flex-1 min-w-40">
              <Input placeholder="ประเภท (ตัวเลือก)" bind:value={uType} class={unitFieldErrors.type ? 'border-red-500 focus-visible:ring-red-500' : ''} />
              {#if unitFieldErrors.type}<p class="text-xs text-red-500">{unitFieldErrors.type}</p>{/if}
            </div>
            <Button onclick={createUnit} disabled={creating}>{creating ? 'กำลังเพิ่ม...' : 'เพิ่ม'}</Button>
          </div>

          <RadioGroup bind:value={selectedUnitId} class="border rounded max-h-[400px] overflow-auto">
            {#each units as u}
              <button type="button"
                      class="w-full text-left flex items-center gap-3 px-3 py-2 transition-colors border-l-2 {selectedUnitId === u.id ? 'bg-primary/5 border-primary' : 'border-transparent hover:bg-gray-50'}"
                      aria-pressed={selectedUnitId === u.id}
                      onclick={() => { selectedUnitId = u.id; loadMembers(); }}
                      onkeydown={(e) => { if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') { e.preventDefault(); selectedUnitId = u.id; loadMembers(); } }}>
                <RadioGroupItem value={u.id} id={`unit-${u.id}`} class="sr-only" />
                <div class="flex-1">
                  <div class="text-sm font-medium {selectedUnitId === u.id ? 'text-primary' : ''}">{u.nameTh}</div>
                  <div class="text-xs text-gray-500">{u.code}{u.type ? ` • ${u.type}` : ''}</div>
                </div>
                {#if selectedUnitId === u.id}
                  <CheckIcon class="size-4 text-primary" />
                {/if}
              </button>
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
              <div class="w-56 flex flex-col gap-1">
                <UserAutocomplete bind:value={mEmail} placeholder="ค้นหาผู้ใช้ (พิมพ์ชื่อ/อีเมล)" />
                {#if memberFieldErrors.userEmail}<p class="text-xs text-red-500">{memberFieldErrors.userEmail}</p>{/if}
              </div>
              <div class="flex flex-col gap-1">
                <Select type="single" bind:value={mRole}>
                  <SelectTrigger>{mRole === 'head' ? 'หัวหน้าฝ่าย' : mRole === 'deputy' ? 'รองหัวหน้า' : 'สมาชิก'}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">สมาชิก</SelectItem>
                    <SelectItem value="deputy">รองหัวหน้า</SelectItem>
                    <SelectItem value="head">หัวหน้าฝ่าย</SelectItem>
                  </SelectContent>
                </Select>
                {#if memberFieldErrors.roleInUnit}<p class="text-xs text-red-500">{memberFieldErrors.roleInUnit}</p>{/if}
              </div>
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
