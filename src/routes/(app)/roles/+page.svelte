<script lang="ts">
  
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/label';
  import CheckIcon from '@lucide/svelte/icons/check';
  import { page } from '$app/stores';
  import { toast } from 'svelte-sonner';

  type Role = { id: string; code: string; name: string };
  type Perm = { id: string; code: string; name: string };

  let roles = $state<Role[]>([]);
  let perms = $state<Perm[]>([]);
  let loading = $state(true);
  let selectedRoleId = $state<string | undefined>(undefined);
  let rolePerms = $state<Set<string>>(new Set());
  let lastSelectedRoleId = $state<string | undefined>(undefined);

  // Create role form
  let newRoleCode = $state('');
  let newRoleName = $state('');
  let creatingRole = $state(false);

  // Create permission form
  let newPermCode = $state('');
  let newPermName = $state('');
  let creatingPerm = $state(false);

  // Inline edit role name
  let editingName = $state<Record<string, string>>({});
  let savingRole = $state<Record<string, boolean>>({});

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
        selectedRoleId = undefined;
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

  $effect(() => { loadAll(); });

  // When selection changes via RadioGroup, load permissions
  $effect(() => {
    if (selectedRoleId && selectedRoleId !== lastSelectedRoleId) {
      lastSelectedRoleId = selectedRoleId;
      loadRolePerms(selectedRoleId);
    }
  });

  async function createRole() {
    if (!newRoleCode.trim() || !newRoleName.trim()) return;
    creatingRole = true;
    try {
      const res = await fetch('/roles/api/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: newRoleCode.trim(), name: newRoleName.trim() }) });
      if (!res.ok) throw new Error(await res.text());
      newRoleCode = ''; newRoleName = '';
      await loadRoles();
      toast.success('สร้างบทบาทสำเร็จ');
    } catch (e) {
      toast.error('สร้างบทบาทไม่สำเร็จ');
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
      toast.success('อัปเดตชื่อบทบาทสำเร็จ');
    } catch (e) {
      toast.error('บันทึกชื่อบทบาทไม่สำเร็จ (บทบาทพื้นฐานแก้ไขไม่ได้)');
    } finally {
      savingRole[id] = false;
    }
  }

  async function deleteRole(id: string) {
    if (!confirm('ลบบทบาทนี้หรือไม่?')) return;
    const res = await fetch(`/roles/api/roles/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('ลบบทบาทไม่สำเร็จ'); return; }
    if (selectedRoleId === id) selectedRoleId = undefined;
    await loadRoles();
    toast.success('ลบบทบาทสำเร็จ');
  }

  async function createPerm() {
    if (!newPermCode.trim() || !newPermName.trim()) return;
    creatingPerm = true;
    try {
      const res = await fetch('/roles/api/permissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: newPermCode.trim(), name: newPermName.trim() }) });
      if (!res.ok) throw new Error(await res.text());
      newPermCode = ''; newPermName = '';
      await loadPerms();
      toast.success('เพิ่มสิทธิ์สำเร็จ');
    } catch (e) {
      toast.error('สร้างสิทธิ์ไม่สำเร็จ');
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
      toast.error('บันทึกสิทธิ์ไม่สำเร็จ');
      // reload actual from server
      await loadRolePerms(selectedRoleId);
    } else {
      toast.success('บันทึกสิทธิ์สำเร็จ');
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
          <CardDescription>บทบาทถูกกำหนดตายตัว: staff / student / parent</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="text-sm text-gray-600">ระบบปิดการสร้างบทบาทใหม่ หากต้องการกำหนดการเข้าถึงให้ละเอียด ใช้การกำหนดสิทธิ์ (permissions) กับบทบาทที่มีอยู่</div>

          <div class="border rounded">
            {#each roles as r}
              <button type="button"
                      class="w-full text-left flex items-center gap-3 px-3 py-2 transition-colors border-l-2 {selectedRoleId === r.id ? 'bg-primary/5 border-primary' : 'border-transparent hover:bg-gray-50'}"
                      aria-pressed={selectedRoleId === r.id}
                      onclick={() => { selectedRoleId = r.id; loadRolePerms(r.id); }}>
                <div class="flex-1">
                  <div class="text-sm font-medium {selectedRoleId === r.id ? 'text-primary' : ''}">{r.name}</div>
                  <div class="text-xs text-gray-500">{r.code}</div>
                </div>
                {#if selectedRoleId === r.id}
                  <CheckIcon class="size-4 text-primary" />
                {/if}
              </button>
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
                <div class="flex items-center gap-2 border rounded p-2" role="button" tabindex="0"
                     onclick={() => toggleRolePerm(p.code)}
                     onkeydown={(e) => { if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') { e.preventDefault(); toggleRolePerm(p.code); }}}>
                  <Checkbox id={`perm-${p.id}`} checked={rolePerms.has(p.code)} />
                  <Label for={`perm-${p.id}`}>
                    <div class="text-sm font-medium">{p.name}</div>
                    <div class="text-xs text-gray-500">{p.code}</div>
                  </Label>
                </div>
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
