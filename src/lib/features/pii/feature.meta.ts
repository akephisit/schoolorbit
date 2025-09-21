import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
	meta: {
		id: 'pii-access',
		label: 'ข้อมูลอ่อนไหว (PII)',
		description: 'กำหนดสิทธิ์การดูข้อมูลส่วนบุคคลที่เข้ารหัส',
		icon: 'i-lucide-shield'
	},
	actions: [
		{
			code: 'pii:view',
			label: 'ดูข้อมูล PII',
			description: 'อนุญาตให้ถอดรหัสและแสดงข้อมูลส่วนบุคคลของผู้ใช้'
		}
	]
};

export default feature;
