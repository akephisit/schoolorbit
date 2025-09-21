import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
	meta: {
		id: 'user-management',
		label: 'จัดการผู้ใช้',
		description: 'ควบคุมสิทธิ์การจัดการบัญชีผู้ใช้และบทบาท',
		icon: 'i-lucide-users'
	},
	actions: [
		{
			code: 'user:manage',
			label: 'จัดการผู้ใช้',
			description: 'สร้าง แก้ไข ระงับ และกำหนดบทบาทผู้ใช้',
			conditions: [
				{ type: 'feature-enabled' }
			]
		}
	]
};

export default feature;
