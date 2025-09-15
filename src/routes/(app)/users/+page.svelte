<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '$lib/components/ui/table';
  import { toast } from 'svelte-sonner';

  type UserRow = { id: string; email: string | null; displayName: string; status: string; roles: string[] };
  type RoleOpt = { id: string; code: string; name: string };

  let roles: RoleOpt[] = [];
  let users: UserRow[] = [];
  let loading = true;
  let creating = false;
  let q = '';

  // create form
  let cEmail = '';
  let cName = '';
  let cPassword = '';
  let cRoles = new Set<string>();

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

  onMount(async () => {
    await Promise.all([loadRoles(), loadUsers()]);
  });

  async function createUser() {
    if (!cEmail.trim() || !cName.trim()) return;
    creating = true;
    try {
      const payload = {
        email: cEmail.trim(),
        displayName: cName.trim(),
        password: cPassword || undefined,
        roles: Array.from(cRoles)
      };
      const res = await fetch('/users/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      cEmail = ''; cName = ''; cPassword = ''; cRoles = new Set();
      await loadUsers();
      toast.success('สร้างผู้ใช้สำเร็จ');
    } catch (e) {
      toast.error('สร้างผู้ใช้ไม่สำเร็จ');
    } finally {
      creating = false;
    }
  }

  // editing state per row
  let editing: Record<string, boolean> = {};
  let editName: Record<string, string> = {};
  let editEmail: Record<string, string> = {};
  let editStatus: Record<string, string> = {};
  let editPassword: Record<string, string> = {};
  let editRoles: Record<string, Set<string>> = {};

  // Map role code -> display name from API
  $: roleNameMap = new Map(roles.map(r => [r.code, r.name] as const));

  const statusLabel: Record<string, string> = {
    active: 'ใช้งาน',
    inactive: 'ไม่ใช้งาน',
    suspended: 'ระงับ'
  };

  function startEdit(u: UserRow) {
    editing[u.id] = true;
    editName[u.id] = u.displayName;
    editEmail[u.id] = u.email || '';
    editStatus[u.id] = u.status;
    editPassword[u.id] = '';
    editRoles[u.id] = new Set(u.roles);
  }

  function cancelEdit(id: string) {
    delete editing[id];
  }

  async function saveEdit(u: UserRow) {
    const upd = { email: editEmail[u.id], displayName: editName[u.id], status: editStatus[u.id] };
    const res = await fetch(`/users/api/users/${u.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(upd) });
    if (!res.ok) { toast.error('บันทึกข้อมูลผู้ใช้ไม่สำเร็จ'); return; }
    // roles
    const rolesRes = await fetch(`/users/api/users/${u.id}/roles`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roles: Array.from(editRoles[u.id]) }) });
    if (!rolesRes.ok) { toast.error('บันทึกบทบาทไม่สำเร็จ'); return; }
    // password if provided
    const pwd = editPassword[u.id];
    if (pwd && pwd.length >= 8) {
      const passRes = await fetch(`/users/api/users/${u.id}/password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) });
      if (!passRes.ok) { toast.error('เปลี่ยนรหัสผ่านไม่สำเร็จ'); } else { toast.success('เปลี่ยนรหัสผ่านแล้ว'); }
    }
    await loadUsers();
    delete editing[u.id];
    toast.success('บันทึกข้อมูลผู้ใช้สำเร็จ');
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
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Input placeholder="อีเมล" bind:value={cEmail} />
        <Input placeholder="ชื่อแสดงผล" bind:value={cName} />
        <Input placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว)" type="password" bind:value={cPassword} />
        <div class="flex flex-wrap items-center gap-2">
          {#each roles as r}
            <label class="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={cRoles.has(r.code)} onchange={(e) => { e.currentTarget?.checked ? cRoles.add(r.code) : cRoles.delete(r.code); cRoles = new Set(cRoles); }} />
              {r.name}
            </label>
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
                    <Input bind:value={editEmail[u.id]} />
                  {:else}
                    {u.email}
                  {/if}
                </TableCell>
                <TableCell>
                  {#if editing[u.id]}
                    <Input bind:value={editName[u.id]} />
                  {:else}
                    {u.displayName}
                  {/if}
                </TableCell>
                <TableCell>
                  {#if editing[u.id]}
                    <select class="border rounded px-2 py-1" bind:value={editStatus[u.id]}>
                      <option value="active">ใช้งาน</option>
                      <option value="inactive">ไม่ใช้งาน</option>
                      <option value="suspended">ระงับ</option>
                    </select>
                  {:else}
                    <span class="text-sm">{statusLabel[u.status] || u.status}</span>
                  {/if}
                </TableCell>
                <TableCell>
                  {#if editing[u.id]}
                    <div class="flex flex-wrap gap-2">
                      {#each roles as r}
                        <label class="flex items-center gap-1 text-sm">
                          <input type="checkbox" checked={editRoles[u.id]?.has(r.code)} onchange={(e) => { const set = editRoles[u.id] || new Set<string>(); if (e.currentTarget?.checked) set.add(r.code); else set.delete(r.code); editRoles[u.id] = new Set(set); }} />
                          {r.name}
                        </label>
                      {/each}
                    </div>
                    <div class="mt-2">
                      <Input placeholder="ตั้งรหัสผ่านใหม่ (>=8)" type="password" bind:value={editPassword[u.id]} />
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
