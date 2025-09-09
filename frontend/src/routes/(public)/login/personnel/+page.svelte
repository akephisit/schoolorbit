<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { api } from '$lib/api.js';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';

	let nationalId = '';
	let password = '';
	let loading = false;
	let error = '';

	async function handleLogin() {
		if (!nationalId.trim() || !password.trim()) {
			error = 'กรุณากรอกข้อมูลให้ครบถ้วน';
			return;
		}

		loading = true;
		error = '';

		try {
			await api.post('/auth/login', {
				actorType: 'personnel',
				id: nationalId.trim(),
				password: password,
				schoolId: $page.data.schoolId
			});

			// Redirect to dashboard on successful login
			goto('/dashboard');
		} catch (err) {
			error = err instanceof Error ? err.message : 'การเข้าสู่ระบบล้มเหลว';
		} finally {
			loading = false;
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleLogin();
		}
	}
</script>

<svelte:head>
	<title>เข้าสู่ระบบ - บุคลากร | {$page.data.branding.name}</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<div class="text-center">
			<h2 class="mt-6 text-3xl font-extrabold text-gray-900">
				เข้าสู่ระบบสำหรับบุคลากร
			</h2>
			<p class="mt-2 text-sm text-gray-600">
				ใช้เลขบัตรประชาชนและรหัสผ่านเพื่อเข้าสู่ระบบ
			</p>
		</div>

		<Card>
			<CardHeader>
				<CardTitle>เข้าสู่ระบบ</CardTitle>
				<CardDescription>กรุณากรอกข้อมูลการเข้าสู่ระบบ</CardDescription>
			</CardHeader>
			<CardContent>
				<form on:submit|preventDefault={handleLogin} class="space-y-6">
					<div>
						<Label for="nationalId">เลขบัตรประชาชน</Label>
						<Input
							id="nationalId"
							type="text"
							bind:value={nationalId}
							onkeypress={handleKeyPress}
							placeholder="กรอกเลขบัตรประชาชน 13 หลัก"
							required
							class="mt-1"
							maxlength={13}
						/>
					</div>

					<div>
						<Label for="password">รหัสผ่าน</Label>
						<Input
							id="password"
							type="password"
							bind:value={password}
							onkeypress={handleKeyPress}
							placeholder="กรอกรหัสผ่าน"
							required
							class="mt-1"
						/>
					</div>

					{#if error}
						<div class="rounded-md bg-red-50 p-4">
							<div class="text-sm text-red-700">
								{error}
							</div>
						</div>
					{/if}

					<Button
						type="submit"
						disabled={loading}
						class="w-full"
					>
						{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
					</Button>
				</form>

				<div class="mt-6">
					<div class="text-center text-sm">
						<span class="text-gray-600">ประเภทผู้ใช้อื่น: </span>
						<a href="/login/student" class="font-medium text-blue-600 hover:text-blue-500">
							นักเรียน
						</a>
						<span class="text-gray-600"> | </span>
						<a href="/login/guardian" class="font-medium text-blue-600 hover:text-blue-500">
							ผู้ปกครอง
						</a>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
</div>