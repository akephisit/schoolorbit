<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-semibold text-gray-900">บันทึกการเข้าเรียน</h1>
    <p class="mt-2 text-sm text-gray-600">สำหรับครูผู้สอน</p>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>กำลังพัฒนา</CardTitle>
      <CardDescription>ตัวอย่างหน้าเพื่อทดสอบการอนุญาต (attend:write)</CardDescription>
    </CardHeader>
    <CardContent>
      <Button disabled>เริ่มบันทึกการเข้าเรียน</Button>
    </CardContent>
  </Card>
</div>

