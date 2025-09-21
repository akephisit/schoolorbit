import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
	meta: {
		id: 'classes',
		label: 'ข้อมูลชั้นเรียน',
		description: 'เข้าถึงรายชื่อและรายละเอียดชั้นเรียนที่เปิดสอน',
		icon: 'i-lucide-book-open'
	},
	actions: [
		{
			code: 'class:read',
			label: 'ดูข้อมูลชั้นเรียน',
			description: 'เข้าถึงหน้ารายการชั้นเรียนและข้อมูลที่เกี่ยวข้อง'
		}
	]
};

export default feature;
