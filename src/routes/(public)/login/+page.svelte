<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { toast } from 'svelte-sonner';

  type Actor = 'personnel' | 'student' | 'guardian';
  let actor: Actor = $state('personnel');
  let nationalId = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');

  async function handleLogin() {
    if (!nationalId.trim() || !password.trim()) {
      error = 'กรุณากรอกเลขบัตรประชาชนและรหัสผ่าน';
      return;
    }

    loading = true;
    error = '';

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorType: actor, id: nationalId.trim(), password })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'การเข้าสู่ระบบล้มเหลว');
      }

      toast.success('เข้าสู่ระบบสำเร็จ');
      goto('/dashboard');
    } catch (err) {
      error = err instanceof Error ? err.message : 'การเข้าสู่ระบบล้มเหลว';
      toast.error(error);
    } finally {
      loading = false;
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleLogin();
    }
  }

  function switchActor(value: string) {
    actor = (['personnel', 'student', 'guardian'].includes(value) ? (value as Actor) : 'personnel');
    error = '';
    password = '';
    nationalId = '';
  }
</script>

<svelte:head>
  <title>เข้าสู่ระบบ | {$page.data.branding.name}</title>
  <meta name="robots" content="noindex" />
  <meta name="description" content="เข้าสู่ระบบด้วยเลขบัตรประชาชนและรหัสผ่าน" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <div class="text-center">
      <h2 class="mt-6 text-3xl font-extrabold text-gray-900">เข้าสู่ระบบ</h2>
      <p class="mt-2 text-sm text-gray-600">ใช้เลขบัตรประชาชนและรหัสผ่านเพื่อเข้าสู่ระบบ</p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>เลือกประเภทผู้ใช้</CardTitle>
        <CardDescription>ระบุประเภทผู้ใช้และกรอกข้อมูลเข้าสู่ระบบ</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={actor} onValueChange={switchActor}>
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="personnel">บุคลากร</TabsTrigger>
            <TabsTrigger value="student">นักเรียน</TabsTrigger>
            <TabsTrigger value="guardian">ผู้ปกครอง</TabsTrigger>
          </TabsList>

          <form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-6 mt-6">
            <div>
              <Label for="nationalId">เลขบัตรประชาชน</Label>
              <Input id="nationalId" type="text" bind:value={nationalId} onkeypress={handleKeyPress} placeholder="กรอกเลขบัตรประชาชน 13 หลัก" required class="mt-1" maxlength={13} />
            </div>

            <div>
              <Label for="password">รหัสผ่าน</Label>
              <Input id="password" type="password" bind:value={password} onkeypress={handleKeyPress} placeholder="กรอกรหัสผ่าน" required class="mt-1" />
            </div>

            {#if error}
              <div class="rounded-md bg-red-50 p-4">
                <div class="text-sm text-red-700">{error}</div>
              </div>
            {/if}

            <Button type="submit" disabled={loading} class="w-full">{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</Button>
          </form>

          <div class="mt-6 text-xs text-gray-500">
            หมายเหตุ: ระบบยังไม่รองรับการเข้าสู่ระบบด้วย OTP
          </div>

        </Tabs>
      </CardContent>
    </Card>
  </div>
  
</div>

