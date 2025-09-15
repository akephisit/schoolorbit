<script lang="ts">
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
  import { page } from '$app/stores';
  // Placeholder page for managing roles & permissions
  // You can extend this to CRUD roles and map permissions.
</script>

<svelte:head>
  <title>บทบาทและสิทธิ์ | {$page.data.branding?.name || 'SchoolOrbit'}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-semibold text-gray-900">บทบาทและสิทธิ์</h1>
    <p class="mt-2 text-sm text-gray-600">จัดการบทบาทของผู้ใช้และกำหนดสิทธิ์การเข้าถึง</p>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>อยู่ระหว่างการพัฒนา</CardTitle>
      <CardDescription>หน้าจอนี้เป็นหน้าตัวอย่างสำหรับเมนู “บทบาทและสิทธิ์”</CardDescription>
    </CardHeader>
    <CardContent>
      <p class="text-sm text-muted-foreground">
        หากต้องการให้เพิ่มความสามารถ เช่น สร้าง/แก้ไขบทบาท และกำหนดสิทธิ์โปรดแจ้งรายละเอียดโครงสร้างสิทธิ์ที่ต้องการ
      </p>
    </CardContent>
  </Card>
</div>

