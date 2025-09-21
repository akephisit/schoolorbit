import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
	meta: {
		id: 'feature-admin',
		label: 'จัดการคุณลักษณะระบบ',
		description: 'กำหนดการเปิดปิดฟีเจอร์และสถานะย่อยของระบบ',
		icon: 'i-lucide-toggle-left'
	},
	actions: [
		{
			code: 'feature:manage',
			label: 'ปรับตั้งค่าฟีเจอร์',
			description: 'เข้าถึงหน้าจัดการฟีเจอร์และแก้ไขสถานะต่าง ๆ'
		}
	]
};

export default feature;
