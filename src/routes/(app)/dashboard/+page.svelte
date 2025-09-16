<script lang="ts">
	import { page } from '$app/stores';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { 
		Users,
		Book,
		Calendar,
		Activity,
		CheckCircle,
		Award,
		TrendingUp,
		FileText,
		Bell
	} from '@lucide/svelte';

	interface DashboardCard {
		title: string;
		value: string;
		description: string;
		icon: string;
		color: string;
	}

	let dashboardCards = $state<DashboardCard[]>([]);
	let loading = $state(true);
	let error = $state('');

	const iconMap: Record<string, any> = {
		users: Users,
		book: Book,
		calendar: Calendar,
		activity: Activity,
		check: CheckCircle,
		award: Award,
		'trending-up': TrendingUp,
		'file-text': FileText,
		bell: Bell
	};

	const colorClasses: Record<string, string> = {
		blue: 'text-blue-600 bg-blue-100',
		green: 'text-green-600 bg-green-100',
		purple: 'text-purple-600 bg-purple-100',
		emerald: 'text-emerald-600 bg-emerald-100',
		orange: 'text-orange-600 bg-orange-100',
		red: 'text-red-600 bg-red-100'
	};

	$effect(() => { (async () => {
		try {
			const response = await fetch('/dashboard/summary');
			if (!response.ok) {
				throw new Error('Failed to fetch dashboard data');
			}
			const data = await response.json();
			dashboardCards = data.data;
		} catch (err) {
			error = 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้';
			console.error('Dashboard error:', err);
		} finally {
			loading = false;
		}
	})() });

	function getUserTypeTitle() {
		const roles = $page.data.roles || [];
		if (roles.includes('staff')) return 'แดชบอร์ดบุคลากร';
		if (roles.includes('student')) return 'แดชบอร์ดนักเรียน';
		if (roles.includes('parent')) return 'แดชบอร์ดผู้ปกครอง';
		return 'แดชบอร์ด';
	}
</script>

<svelte:head>
	<title>แดชบอร์ด | {$page.data.branding?.name || 'SchoolOrbit'}</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold text-gray-900">
			{getUserTypeTitle()}
		</h1>
		<p class="mt-2 text-sm text-gray-600">
			ภาพรวมข้อมูลและสถานะต่างๆ ของระบบ
		</p>
	</div>

	{#if loading}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
			{#each Array(4) as _}
				<Card>
					<CardContent class="p-6">
						<div class="animate-pulse">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<div class="w-8 h-8 bg-gray-200 rounded-full"></div>
								</div>
								<div class="ml-5 w-0 flex-1">
									<div class="h-4 bg-gray-200 rounded mb-2"></div>
									<div class="h-6 bg-gray-200 rounded mb-1"></div>
									<div class="h-3 bg-gray-200 rounded"></div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{:else if error}
		<Card>
			<CardContent class="p-6">
				<div class="text-center">
					<div class="text-red-600 mb-2">⚠️</div>
					<h3 class="text-lg font-medium text-gray-900 mb-2">เกิดข้อผิดพลาด</h3>
					<p class="text-sm text-gray-600">{error}</p>
				</div>
			</CardContent>
		</Card>
	{:else if dashboardCards.length === 0}
		<Card>
			<CardContent class="p-6">
				<div class="text-center">
					<div class="text-gray-400 mb-2">📊</div>
					<h3 class="text-lg font-medium text-gray-900 mb-2">ไม่มีข้อมูล</h3>
					<p class="text-sm text-gray-600">ยังไม่มีข้อมูลแดชบอร์ดให้แสดง</p>
				</div>
			</CardContent>
		</Card>
	{:else}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
			{#each dashboardCards as card}
				<Card>
					<CardContent class="p-6">
						{@const Icon = iconMap[card.icon] || Activity}
						<div class="flex items-center">
							<div class="flex-shrink-0">
				<div class="w-8 h-8 rounded-full flex items-center justify-center {colorClasses[card.color] || 'text-gray-600 bg-gray-100'}">
					<Icon class="w-5 h-5" />
				</div>
							</div>
							<div class="ml-5 w-0 flex-1">
								<dl>
									<dt class="text-sm font-medium text-gray-500 truncate">
										{card.title}
									</dt>
									<dd class="text-lg font-medium text-gray-900">
										{card.value}
									</dd>
									<dd class="text-sm text-gray-600">
										{card.description}
									</dd>
								</dl>
							</div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}

	<!-- Welcome message based on user role -->
	<Card>
		<CardHeader>
			<CardTitle>ยินดีต้อนรับ, {$page.data.user?.displayName || 'ผู้ใช้'}!</CardTitle>
			<CardDescription>
				{#if $page.data.roles?.includes('staff')}
					คุณสามารถเข้าถึงเมนูที่เกี่ยวกับงานบุคลากร เช่น วิชาการ การเงิน การเข้าเรียน หรือการจัดการผู้ใช้ ตามสิทธิ์ที่ได้รับ
				{:else if $page.data.roles?.includes('student')}
					คุณสามารถดูตารางเรียน เช็คการเข้าเรียน และผลการเรียนได้
				{:else if $page.data.roles?.includes('parent')}
					คุณสามารถติดตามการเข้าเรียนและผลการเรียนของบุตรหลานได้
				{:else}
					ยินดีต้อนรับสู่ระบบ SchoolOrbit
				{/if}
			</CardDescription>
		</CardHeader>
	</Card>
</div>
