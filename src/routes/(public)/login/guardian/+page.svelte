<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';

	let nationalId = '';
	let password = '';
	let otp = '';
	let loginMethod = 'password';
	let loading = false;
	let error = '';

	async function handleLogin() {
		if (!nationalId.trim()) {
			error = 'กรุณากรอกเลขบัตรประชาชน';
			return;
		}

		if (loginMethod === 'password' && !password.trim()) {
			error = 'กรุณากรอกรหัสผ่าน';
			return;
		}

		if (loginMethod === 'otp' && !otp.trim()) {
			error = 'กรุณากรอกรหัส OTP';
			return;
		}

		loading = true;
		error = '';

		try {
			const payload: any = {
				actorType: 'guardian',
				id: nationalId.trim()
			};

			if (loginMethod === 'password') {
				payload.password = password;
			} else {
				payload.otp = otp.trim();
			}

			const response = await fetch('/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errorData = await response.text();
				throw new Error(errorData || 'การเข้าสู่ระบบล้มเหลว');
			}

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

	function switchLoginMethod(method: string) {
		loginMethod = method;
		error = '';
		password = '';
		otp = '';
	}
</script>

<svelte:head>
	<title>เข้าสู่ระบบ - ผู้ปกครอง | {$page.data.branding.name}</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<div class="text-center">
			<h2 class="mt-6 text-3xl font-extrabold text-gray-900">
				เข้าสู่ระบบสำหรับผู้ปกครอง
			</h2>
			<p class="mt-2 text-sm text-gray-600">
				ใช้เลขบัตรประชาชนและรหัสผ่านหรือ OTP เพื่อเข้าสู่ระบบ
			</p>
		</div>

		<Card>
			<CardHeader>
				<CardTitle>เข้าสู่ระบบ</CardTitle>
				<CardDescription>เลือกวิธีการเข้าสู่ระบบ</CardDescription>
			</CardHeader>
			<CardContent>
				<Tabs value={loginMethod} onValueChange={switchLoginMethod}>
					<TabsList class="grid w-full grid-cols-2">
						<TabsTrigger value="password">รหัสผ่าน</TabsTrigger>
						<TabsTrigger value="otp">OTP</TabsTrigger>
					</TabsList>
					
					<form on:submit|preventDefault={handleLogin} class="space-y-6 mt-6">
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

						<TabsContent value="password">
							<div>
								<Label for="password">รหัสผ่าน</Label>
								<Input
									id="password"
									type="password"
									bind:value={password}
									onkeypress={handleKeyPress}
									placeholder="กรอกรหัสผ่าน"
									required={loginMethod === 'password'}
									class="mt-1"
								/>
							</div>
						</TabsContent>

						<TabsContent value="otp">
							<div>
								<Label for="otp">รหัส OTP</Label>
								<Input
									id="otp"
									type="text"
									bind:value={otp}
									onkeypress={handleKeyPress}
									placeholder="กรอกรหัส OTP 6 หลัก"
									required={loginMethod === 'otp'}
									class="mt-1"
									maxlength={6}
								/>
								<p class="mt-1 text-sm text-gray-500">
									รหัส OTP จะถูกส่งไปยังเบอร์โทรศัพท์ที่ลงทะเบียนไว้
								</p>
							</div>
						</TabsContent>

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
				</Tabs>

				<div class="mt-6">
					<div class="text-center text-sm">
						<span class="text-gray-600">ประเภทผู้ใช้อื่น: </span>
						<a href="/login/personnel" class="font-medium text-blue-600 hover:text-blue-500">
							บุคลากร
						</a>
						<span class="text-gray-600"> | </span>
						<a href="/login/student" class="font-medium text-blue-600 hover:text-blue-500">
							นักเรียน
						</a>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
</div>