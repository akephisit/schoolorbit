import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
  meta: {
    id: 'grades',
    label: 'ระบบคะแนน',
    description: 'จัดการการกรอกคะแนนและสรุปรายงานผลการเรียน',
    icon: 'i-lucide-graduation-cap'
  },
  states: [
    {
      code: 'entry-open',
      kind: 'toggle',
      label: 'เปิดระบบกรอกคะแนน',
      description: 'เมื่อเปิด ครูสามารถกรอกและแก้ไขคะแนนได้',
      defaultValue: false
    }
  ],
  actions: [
    {
      code: 'grade:read',
      label: 'ดูข้อมูลคะแนน',
      description: 'เข้าถึงหน้าแดชบอร์ดคะแนนและรายงานต่าง ๆ',
      conditions: [
        {
          type: 'feature-enabled'
        }
      ]
    },
    {
      code: 'grade:write',
      label: 'กรอกคะแนน',
      description: 'บันทึกและแก้ไขคะแนนนักเรียน',
      conditions: [
        {
          type: 'feature-enabled'
        },
        {
          type: 'feature-state',
          state: 'entry-open',
          expected: true
        }
      ]
    },
    {
      code: 'grade:toggle-entry',
      label: 'เปิด/ปิดระบบกรอกคะแนน',
      description: 'ควบคุมการเปิดให้ครูกรอกคะแนน'
    },
    {
      code: 'grade:manage',
      label: 'ตั้งค่าระบบคะแนน',
      description: 'บันทึกค่ากำหนดหลักสูตรและน้ำหนักคะแนน',
      implies: ['grade:read', 'grade:toggle-entry', 'grade:write']
    }
  ],
  menu: [
    {
      id: 'grades-dashboard',
      label: 'คะแนน',
      href: '/grades',
      icon: 'i-lucide-clipboard-list',
      order: 15,
      requires: ['grade:read'],
      requiresFeatures: ['grades']
    }
  ]
};

export default feature;
