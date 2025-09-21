import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
  meta: {
    id: 'attendance',
    label: 'ระบบเช็คชื่อ',
    description: 'จัดการระบบเช็คชื่อรายวันและรายงานสถานะนักเรียน',
    icon: 'i-lucide-calendar-check-2'
  },
  states: [
    {
      code: 'open',
      kind: 'toggle',
      label: 'เปิดระบบเช็คชื่อ',
      description: 'เมื่อเปิด ครูสามารถเช็คชื่อนักเรียนได้',
      defaultValue: false
    }
  ],
  actions: [
    {
      code: 'attend:read',
      label: 'ดูรายงานเช็คชื่อ',
      description: 'เข้าถึงแดชบอร์ดและรายงานการเช็คชื่อ',
      conditions: [
        {
          type: 'feature-enabled'
        }
      ]
    },
    {
      code: 'attend:write',
      label: 'เช็คชื่อนักเรียน',
      description: 'บันทึกการเข้าห้องเรียนของนักเรียน',
      conditions: [
        {
          type: 'feature-enabled'
        },
        {
          type: 'feature-state',
          state: 'open',
          expected: true
        }
      ]
    },
    {
      code: 'attend:toggle',
      label: 'เปิด/ปิดระบบเช็คชื่อ',
      description: 'จัดการสถานะการเปิดระบบเช็คชื่อ'
    }
  ],
  menu: [
    {
      id: 'attendance-dashboard',
      label: 'เช็คชื่อ',
      href: '/attendance',
      icon: 'i-lucide-calendar-check-2',
      order: 20,
      requires: ['attend:read']
    },
    {
      id: 'attendance-mark',
      label: 'บันทึกการเช็คชื่อ',
      href: '/attendance/mark',
      icon: 'i-lucide-user-check',
      order: 21,
      requires: ['attend:write'],
      requiresFeatures: ['attendance']
    }
  ]
};

export default feature;
