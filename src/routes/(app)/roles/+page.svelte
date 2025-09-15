<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import { page } from '$app/stores';

  type Role = { id: string; code: string; name: string };
  type Perm = { id: string; code: string; name: string };

  let roles: Role[] = [];
  let perms: Perm[] = [];
  let loading = true;
  let selectedRoleId: string | null = null;
  let rolePerms = new Set<string>();

  // Create role form
  let newRoleCode = '';
  let newRoleName = '';
  let creatingRole = false;

  // Create permission form
  let newPermCode = '';
  let newPermName = '';
  let creatingPerm = false;

  // Inline edit role name
  let editingName: Record<string, string> = {};
  let savingRole: Record<string, boolean> = {};

  async function loadAll() {
    loading = true;
    await Promise.all([loadRoles(), loadPerms()]);
    loading = false;
  }

  async function loadRoles() {
    const res = await fetch('/roles/api/roles');
    if (res.ok) {
      const data = await res.json();
      roles = data.data as Role[];
      // initialize inline edit values
      for (const r of roles) {
        if (editingName[r.id] === undefined) editingName[r.id] = r.name;
      }
      if (selectedRoleId && !roles.find(r => r.id === selectedRoleId)) {
        selectedRoleId = null;
      }
      if (!selectedRoleId && roles.length) {
        selectedRoleId = roles[0].id;
      }
      if (selectedRoleId) await loadRolePerms(selectedRoleId);
    }
  }

  async function loadPerms() {
    const res = await fetch('/roles/api/permissions');
    if (res.ok) {
      const data = await res.json();
      perms = data.data as Perm[];
    }
  }

  async function loadRolePerms(id: string) {
    const res = await fetch(`/roles/api/roles/${id}/permissions`);
    if (res.ok) {
      const data = await res.json();
      rolePerms = new Set<string>(data.data as string[]);
    }
  }

  onMount(loadAll);

  async function createRole() {
    if (!newRoleCode.trim() || !newRoleName.trim()) return;
    creatingRole = true;
    try {
      const res = await fetch('/roles/api/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: newRoleCode.trim(), name: newRoleName.trim() }) });
      if (!res.ok) throw new Error(await res.text());
      newRoleCode = ''; newRoleName = '';
      await loadRoles();
    } catch (e) {
      alert('สร้างบทบาทไม่สำเร็จ');
    } finally {
      creatingRole = false;
    }
  }

  async function updateRoleName(id: string) {
    const name = (editingName[id] || '').trim();
    if (!name) return;
    savingRole[id] = true;
    try {
      const res = await fetch(`/roles/api/roles/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error(await res.text());
      await loadRoles();
    } catch (e) {
      alert('บันทึกชื่อบทบาทไม่สำเร็จ');
    } finally {
      savingRole[id] = false;
    }
  }

  async function deleteRole(id: string) {
    if (!confirm('ลบบทบาทนี้หรือไม่?')) return;
    const res = await fetch(`/roles/api/roles/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('ลบบทบาทไม่สำเร็จ'); return; }
    if (selectedRoleId === id) selectedRoleId = null;
    await loadRoles();
  }

  async function createPerm() {
    if (!newPermCode.trim() || !newPermName.trim()) return;
    creatingPerm = true;
    try {
      const res = await fetch('/roles/api/permissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: newPermCode.trim(), name: newPermName.trim() }) });
      if (!res.ok) throw new Error(await res.text());
      newPermCode = ''; newPermName = '';
      await loadPerms();
    } catch (e) {
      alert('สร้างสิทธิ์ไม่สำเร็จ');
    } finally {
      creatingPerm = false;
    }
  }

  async function toggleRolePerm(code: string) {
    if (!selectedRoleId) return;
    const next = new Set(rolePerms);
    if (next.has(code)) next.delete(code); else next.add(code);
    // Optimistic UI
    rolePerms = next;
    const res = await fetch(`/roles/api/roles/${selectedRoleId}/permissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permissions: Array.from(next) }) });
    if (!res.ok) {
      alert('บันทึกสิทธิ์ไม่สำเร็จ');
      // reload actual from server
      await loadRolePerms(selectedRoleId);
    }
  }
</script>

<svelte:head>
  <title>บทบาทและสิทธิ์ | {$page.data.branding?.name || 'SchoolOrbit'}</title>
  <meta name="robots" content="noindex" />
  </svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-semibold text-gray-900">บทบาทและสิทธิ์</h1>
    <p class="mt-2 text-sm text-gray-600">จัดการบทบาทของผู้ใช้และกำหนดสิทธิ์การเข้าถึง</p>
  </div>

  {#if loading}
    <div>กำลังโหลด...</div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Roles -->
      <Card class="lg:col-span-1">
        <CardHeader>
          <CardTitle>บทบาท</CardTitle>
          <CardDescription>สร้าง/แก้ไข/ลบบทบาท</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex gap-2">
            <Input placeholder="code (เช่น admin)" bind:value={newRoleCode} />
            <Input placeholder="ชื่อบทบาท (ไทย)" bind:value={newRoleName} />
            <Button onclick={createRole} disabled={creatingRole}>{creatingRole ? 'กำลังสร้าง...' : 'เพิ่ม'}</Button>
          </div>

          <div class="divide-y border rounded">
            {#each roles as r}
              <div class="p-3 flex items-center gap-2 {selectedRoleId === r.id ? 'bg-gray-50' : ''}">
                <input type="radio" name="selRole" checked={selectedRoleId === r.id} on:change={() => { selectedRoleId = r.id; loadRolePerms(r.id); }} />
                <div class="flex-1">
                  <div class="text-xs text-gray-500">{r.code}</div>
                  <div class="flex gap-2 mt-1">
                    <Input class="flex-1" bind:value={editingName[r.id]} placeholder={r.name} />
                    <Button size="sm" onclick={() => updateRoleName(r.id)} disabled={!!savingRole[r.id]}>{savingRole[r.id] ? '...' : 'บันทึก'}</Button>
                    <Button size="sm" variant="destructive" onclick={() => deleteRole(r.id)}>ลบ</Button>
                  </div>
                </div>
              </div>
            {/each}
            {#if roles.length === 0}
              <div class="p-3 text-sm text-gray-500">ยังไม่มีบทบาท</div>
            {/if}
          </div>
        </CardContent>
      </Card>

      <!-- Permissions -->
      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle>สิทธิ์การใช้งาน</CardTitle>
          <CardDescription>กำหนดสิทธิ์ให้กับบทบาทที่เลือก</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex gap-2">
            <Input placeholder="permission code (เช่น user:manage)" bind:value={newPermCode} />
            <Input placeholder="ชื่อสิทธิ์ (ไทย)" bind:value={newPermName} />
            <Button onclick={createPerm} disabled={creatingPerm}>{creatingPerm ? 'กำลังเพิ่ม...' : 'เพิ่มสิทธิ์'}</Button>
          </div>

          {#if !selectedRoleId}
            <div class="text-sm text-gray-600">กรุณาเลือกบทบาททางซ้าย</div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {#each perms as p}
                <label class="flex items-center gap-2 border rounded p-2">
                  <input type="checkbox" checked={rolePerms.has(p.code)} on:change={() => toggleRolePerm(p.code)} />
                  <div>
                    <div class="text-sm font-medium">{p.name}</div>
                    <div class="text-xs text-gray-500">{p.code}</div>
                  </div>
                </label>
              {/each}
            </div>
            {#if perms.length === 0}
              <div class="text-sm text-gray-500">ยังไม่มีสิทธิ์ กรุณาเพิ่มด้านบน</div>
            {/if}
          {/if}
        </CardContent>
      </Card>
    </div>
  {/if}
</div>
