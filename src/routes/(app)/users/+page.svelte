<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '$lib/components/ui/table';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/label';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import { toast } from 'svelte-sonner';
  import { parseApiError, firstFieldErrorMap } from '$lib/utils/api';

  type UserRow = {
    id: string;
    email: string | null;
    displayName: string;
    title: string | null;
    firstName: string | null;
    lastName: string | null;
    status: string;
    roles: string[];
  };
  type RoleOpt = { id: string; code: string; name: string };

  let roles = $state<RoleOpt[]>([]);
  let users = $state<UserRow[]>([]);
  let loading = $state(true);
  let creating = $state(false);
  let q = $state('');

  // create form
  let cEmail = $state('');
  let cTitle = $state('');
  let cFirstName = $state('');
  let cLastName = $state('');
  let cDisplayName = $state('');
  let cPassword = $state('');
  let cNationalId = $state('');
  let cRoles = $state(new Set<string>());
  let cFieldErrors = $state<Record<string, string>>({});

  async function loadRoles() {
    const res = await fetch('/users/api/roles');
    if (res.ok) {
      const data = await res.json();
      roles = data.data as RoleOpt[];
    }
  }
  async function loadUsers() {
    loading = true;
    const u = new URL('/users/api/users', window.location.origin);
    if (q.trim()) u.searchParams.set('q', q.trim());
    const res = await fetch(u);
    if (res.ok) {
      const data = await res.json();
      users = data.data as UserRow[];
    }
    loading = false;
  }

  $effect(() => { (async () => { await Promise.all([loadRoles(), loadUsers()]); })(); });

  async function createUser() {
    cFieldErrors = {};
    creating = true;
    try {
      const payload = {
        email: cEmail.trim(),
        displayName: cDisplayName.trim() || undefined,
        title: cTitle.trim() || undefined,
        firstName: cFirstName.trim(),
        lastName: cLastName.trim(),
        password: cPassword || undefined,
        nationalId: cNationalId,
        roles: Array.from(cRoles)
      };
      const res = await fetch('/users/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const apiError = await parseApiError(res);
        cFieldErrors = firstFieldErrorMap(apiError.fieldErrors);
        toast.error(apiError.message);
        return;
      }
      cEmail = '';
      cTitle = '';
      cFirstName = '';
      cLastName = '';
      cDisplayName = '';
      cPassword = '';
      cNationalId = '';
      cRoles = new Set();
      cFieldErrors = {};
      await loadUsers();
      toast.success('สร้างผู้ใช้สำเร็จ');
    } catch (e) {
      toast.error('สร้างผู้ใช้ไม่สำเร็จ');
    } finally {
      creating = false;
    }
  }

  // editing state per row
  let editing = $state<Record<string, boolean>>({});
  let editTitle = $state<Record<string, string>>({});
  let editFirstName = $state<Record<string, string>>({});
  let editLastName = $state<Record<string, string>>({});
  let editDisplayName = $state<Record<string, string>>({});
  let editEmail = $state<Record<string, string>>({});
  let editStatus = $state<Record<string, string>>({});
  let editPassword = $state<Record<string, string>>({});
  let editRoles = $state<Record<string, Set<string>>>({});
  let editFieldErrors = $state<Record<string, Record<string, string>>>({});

  // Map role code -> display name from API
  const roleNameMap = $derived(new Map(roles.map(r => [r.code, r.name] as const)));

  const statusLabel: Record<string, string> = {
    active: 'ใช้งาน',
    inactive: 'ไม่ใช้งาน',
    suspended: 'ระงับ'
  };

  function startEdit(u: UserRow) {
    editing[u.id] = true;
    editTitle[u.id] = u.title ?? '';
    editFirstName[u.id] = u.firstName ?? '';
    editLastName[u.id] = u.lastName ?? '';
    editDisplayName[u.id] = u.displayName;
    editEmail[u.id] = u.email || '';
    editStatus[u.id] = u.status;
    editPassword[u.id] = '';
    editRoles[u.id] = new Set(u.roles);
    editFieldErrors[u.id] = {};
  }

  function cancelEdit(id: string) {
    delete editing[id];
    delete editTitle[id];
    delete editFirstName[id];
    delete editLastName[id];
    delete editDisplayName[id];
    delete editEmail[id];
    delete editStatus[id];
    delete editPassword[id];
    delete editRoles[id];
    delete editFieldErrors[id];
  }

  async function saveEdit(u: UserRow) {
    editFieldErrors[u.id] = {};
    const rawTitle = (editTitle[u.id] ?? '').trim();
    const rawFirstName = (editFirstName[u.id] ?? '').trim();
    const rawLastName = (editLastName[u.id] ?? '').trim();
    const displayNameInput = (editDisplayName[u.id] ?? '').trim();
    const payload = {
      email: editEmail[u.id]?.trim() || undefined,
      title: rawTitle ? rawTitle : null,
      firstName: rawFirstName,
      lastName: rawLastName,
      displayName: displayNameInput || undefined,
      status: editStatus[u.id]
    };
    const res = await fetch(`/users/api/users/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const apiError = await parseApiError(res);
      editFieldErrors[u.id] = firstFieldErrorMap(apiError.fieldErrors);
      toast.error(apiError.message);
      return;
    }
    // roles
    const rolesRes = await fetch(`/users/api/users/${u.id}/roles`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roles: Array.from(editRoles[u.id]) }) });
    if (!rolesRes.ok) {
      const apiError = await parseApiError(rolesRes);
      toast.error(apiError.message);
      return;
    }
    // password if provided
    const pwd = editPassword[u.id];
    if (pwd && pwd.length >= 8) {
      const passRes = await fetch(`/users/api/users/${u.id}/password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) });
      if (!passRes.ok) {
        const apiError = await parseApiError(passRes);
        editFieldErrors[u.id] = {
          ...(editFieldErrors[u.id] || {}),
          password: apiError.fieldErrors.password?.[0] || apiError.message
        };
        toast.error(apiError.message);
        return;
      }
    }
    await loadUsers();
    cancelEdit(u.id);
    toast.success('บันทึกข้อมูลสำเร็จ');
  }

  async function removeUser(u: UserRow) {
    if (!confirm(`ลบผู้ใช้ ${u.displayName}?`)) return;
    const res = await fetch(`/users/api/users/${u.id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('ลบไม่สำเร็จ'); return; }
    await loadUsers();
    toast.success('ลบผู้ใช้สำเร็จ');
  }
</script>

<div class="space-y-6">
  <div class="flex items-end justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold text-gray-900">จัดการผู้ใช้</h1>
      <p class="mt-2 text-sm text-gray-600">เพิ่ม/แก้ไข/ลบผู้ใช้ และกำหนดบทบาท</p>
    </div>
    <div class="flex gap-2">
      <Input placeholder="ค้นหาชื่อ" bind:value={q} />
      <Button onclick={loadUsers}>ค้นหา</Button>
    </div>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>สร้างผู้ใช้</CardTitle>
      <CardDescription>ใส่อีเมล ชื่อ และตัวเลือกบทบาท เริ่มต้น</CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <div class="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div class="md:col-span-2 flex flex-col gap-1">
          <Input placeholder="อีเมล" bind:value={cEmail} class={cFieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''} />
          {#if cFieldErrors.email}<p class="text-xs text-red-500">{cFieldErrors.email}</p>{/if}
        </div>
        <div class="flex flex-col gap-1">
          <Input placeholder="คำนำหน้า (เช่น นาย)" bind:value={cTitle} class={cFieldErrors.title ? 'border-red-500 focus-visible:ring-red-500' : ''} />
          {#if cFieldErrors.title}<p class="text-xs text-red-500">{cFieldErrors.title}</p>{/if}
        </div>
        <div class="flex flex-col gap-1">
          <Input placeholder="ชื่อ" bind:value={cFirstName} class={cFieldErrors.firstName ? 'border-red-500 focus-visible:ring-red-500' : ''} />
          {#if cFieldErrors.firstName}<p class="text-xs text-red-500">{cFieldErrors.firstName}</p>{/if}
        </div>
        <div class="flex flex-col gap-1">
          <Input placeholder="นามสกุล" bind:value={cLastName} class={cFieldErrors.lastName ? 'border-red-500 focus-visible:ring-red-500' : ''} />
          {#if cFieldErrors.lastName}<p class="text-xs text-red-500">{cFieldErrors.lastName}</p>{/if}
        </div>
        <div class="md:col-span-2 flex flex-col gap-1">
          <Input placeholder="ชื่อแสดงผล (เว้นว่างจะใช้ข้อมูลด้านบน)" bind:value={cDisplayName} class={cFieldErrors.displayName ? 'border-red-500 focus-visible:ring-red-500' : ''} />
          {#if cFieldErrors.displayName}<p class="text-xs text-red-500">{cFieldErrors.displayName}</p>{/if}
        </div>
        <div class="md:col-span-2 flex flex-col gap-1">
          <Input placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว)" type="password" bind:value={cPassword} class={cFieldErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''} />
          {#if cFieldErrors.password}<p class="text-xs text-red-500">{cFieldErrors.password}</p>{/if}
        </div>
        <div class="md:col-span-2 flex flex-col gap-1">
          <Input placeholder="เลขบัตรประชาชน 13 หลัก" bind:value={cNationalId} maxlength={13} class={cFieldErrors.nationalId ? 'border-red-500 focus-visible:ring-red-500' : ''} />
          {#if cFieldErrors.nationalId}<p class="text-xs text-red-500">{cFieldErrors.nationalId}</p>{/if}
        </div>
        <div class="md:col-span-6 flex flex-wrap items-center gap-3">
          {#each roles as r}
            <div class="flex items-center gap-2" role="button" tabindex="0"
                 onclick={() => { cRoles.has(r.code) ? cRoles.delete(r.code) : cRoles.add(r.code); cRoles = new Set(cRoles); }}
                 onkeydown={(e) => { if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') { e.preventDefault(); cRoles.has(r.code) ? cRoles.delete(r.code) : cRoles.add(r.code); cRoles = new Set(cRoles); } }}>
              <Checkbox id={`crole-${r.code}`} checked={cRoles.has(r.code)} />
              <Label for={`crole-${r.code}`} class="text-sm">{r.name}</Label>
            </div>
          {/each}
        </div>
      </div>
      <div>
        <Button onclick={createUser} disabled={creating}>{creating ? 'กำลังสร้าง...' : 'สร้างผู้ใช้'}</Button>
      </div>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>รายชื่อผู้ใช้</CardTitle>
      <CardDescription>รวมบทบาท และจัดการได้จากแถว</CardDescription>
    </CardHeader>
    <CardContent>
      {#if loading}
        <div>กำลังโหลด...</div>
      {:else}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>อีเมล</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>บทบาท</TableHead>
              <TableHead class="text-right">การจัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each users as u}
              <TableRow>
                <TableCell>
                  {#if editing[u.id]}
                    <div class="flex flex-col gap-1">
                      <Input bind:value={editEmail[u.id]} class={editFieldErrors[u.id]?.email ? 'border-red-500 focus-visible:ring-red-500' : ''} />
                      {#if editFieldErrors[u.id]?.email}<p class="text-xs text-red-500">{editFieldErrors[u.id]?.email}</p>{/if}
                    </div>
                  {:else}
                    {u.email}
                  {/if}
                </TableCell>
                <TableCell>
                  {#if editing[u.id]}
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div class="flex flex-col gap-1">
                        <Input placeholder="คำนำหน้า" bind:value={editTitle[u.id]} class={editFieldErrors[u.id]?.title ? 'border-red-500 focus-visible:ring-red-500' : ''} />
                        {#if editFieldErrors[u.id]?.title}<p class="text-xs text-red-500">{editFieldErrors[u.id]?.title}</p>{/if}
                      </div>
                      <div class="flex flex-col gap-1">
                        <Input placeholder="ชื่อ" bind:value={editFirstName[u.id]} class={editFieldErrors[u.id]?.firstName ? 'border-red-500 focus-visible:ring-red-500' : ''} />
                        {#if editFieldErrors[u.id]?.firstName}<p class="text-xs text-red-500">{editFieldErrors[u.id]?.firstName}</p>{/if}
                      </div>
                      <div class="flex flex-col gap-1">
                        <Input placeholder="นามสกุล" bind:value={editLastName[u.id]} class={editFieldErrors[u.id]?.lastName ? 'border-red-500 focus-visible:ring-red-500' : ''} />
                        {#if editFieldErrors[u.id]?.lastName}<p class="text-xs text-red-500">{editFieldErrors[u.id]?.lastName}</p>{/if}
                      </div>
                      <div class="flex flex-col gap-1">
                        <Input placeholder="ชื่อแสดงผล" bind:value={editDisplayName[u.id]} class={editFieldErrors[u.id]?.displayName ? 'border-red-500 focus-visible:ring-red-500' : ''} />
                        {#if editFieldErrors[u.id]?.displayName}<p class="text-xs text-red-500">{editFieldErrors[u.id]?.displayName}</p>{/if}
                      </div>
                    </div>
                  {:else}
                    <div class="space-y-1">
                      <div>{u.displayName}</div>
                      {#if u.title || u.firstName || u.lastName}
                        <div class="text-xs text-muted-foreground">{[u.title, u.firstName, u.lastName].filter(Boolean).join(' ')}</div>
                      {/if}
                    </div>
                  {/if}
                </TableCell>
                <TableCell>
                  {#if editing[u.id]}
                    <Select type="single" bind:value={editStatus[u.id]}>
                      <SelectTrigger>{statusLabel[editStatus[u.id]] || editStatus[u.id] || 'เลือกสถานะ'}</SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">ใช้งาน</SelectItem>
                        <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                        <SelectItem value="suspended">ระงับ</SelectItem>
                      </SelectContent>
                    </Select>
                  {:else}
                    <span class="text-sm">{statusLabel[u.status] || u.status}</span>
                  {/if}
                </TableCell>
                <TableCell>
                  {#if editing[u.id]}
                    <div class="flex flex-wrap gap-3">
                      {#each roles as r}
                        <div class="flex items-center gap-2" role="button" tabindex="0"
                             onclick={() => { const set = editRoles[u.id] || new Set<string>(); if (set.has(r.code)) set.delete(r.code); else set.add(r.code); editRoles[u.id] = new Set(set); }}
                             onkeydown={(e) => { if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') { e.preventDefault(); const set = editRoles[u.id] || new Set<string>(); if (set.has(r.code)) set.delete(r.code); else set.add(r.code); editRoles[u.id] = new Set(set); } }}>
                          <Checkbox id={`erole-${u.id}-${r.code}`} checked={editRoles[u.id]?.has(r.code)} />
                          <Label for={`erole-${u.id}-${r.code}`} class="text-sm">{r.name}</Label>
                        </div>
                      {/each}
                    </div>
                    <div class="mt-2">
                      <div class="flex flex-col gap-1">
                        <Input placeholder="ตั้งรหัสผ่านใหม่ (>=8)" type="password" bind:value={editPassword[u.id]} class={editFieldErrors[u.id]?.password ? 'border-red-500 focus-visible:ring-red-500' : ''} />
                        {#if editFieldErrors[u.id]?.password}<p class="text-xs text-red-500">{editFieldErrors[u.id]?.password}</p>{/if}
                      </div>
                    </div>
                  {:else}
                    <span class="text-sm">{u.roles.map((c) => roleNameMap.get(c) || c).join(', ')}</span>
                  {/if}
                </TableCell>
                <TableCell class="text-right space-x-2">
                  {#if editing[u.id]}
                    <Button size="sm" onclick={() => saveEdit(u)}>บันทึก</Button>
                    <Button size="sm" variant="secondary" onclick={() => cancelEdit(u.id)}>ยกเลิก</Button>
                  {:else}
                    <Button size="sm" variant="secondary" onclick={() => startEdit(u)}>แก้ไข</Button>
                    <Button size="sm" variant="destructive" onclick={() => removeUser(u)}>ลบ</Button>
                  {/if}
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      {/if}
    </CardContent>
  </Card>
</div>
