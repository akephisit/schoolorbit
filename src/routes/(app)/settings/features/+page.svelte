<script lang="ts">
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
  import { Switch } from '$lib/components/ui/switch';
  import { Button } from '$lib/components/ui/button';
  import { toast } from 'svelte-sonner';

  const { data } = $props();

  type Feature = typeof data.features[number];
  type FeatureState = Feature['states'][number];

  let features = $state<Feature[]>(data.features ?? []);
  let updating = $state<Record<string, boolean>>({});

  function formatUpdatedAt(feature: Feature) {
    if (!feature.updatedAt) return '—';
    const date = new Date(feature.updatedAt);
    return date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function stateKey(feature: Feature, state: FeatureState) {
    return `${feature.code}:${state.code}`;
  }

  async function toggleFeature(feature: Feature, nextEnabled: boolean) {
    if (updating[feature.code]) {
      return;
    }
    const previous = feature.enabled;
    updating[feature.code] = true;
    features = features.map((item) =>
      item.code === feature.code ? { ...item, enabled: nextEnabled } : item
    );
    try {
      const res = await fetch(`/settings/api/features/${feature.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'อัปเดตฟีเจอร์ไม่สำเร็จ');
      }
      const { data: updated } = await res.json();
      features = features.map((item) =>
        item.code === feature.code ? { ...item, ...updated } : item
      );
      toast.success(nextEnabled ? 'เปิดใช้งานฟีเจอร์แล้ว' : 'ปิดใช้งานฟีเจอร์แล้ว');
    } catch (err) {
      features = features.map((item) =>
        item.code === feature.code ? { ...item, enabled: previous } : item
      );
      toast.error(err instanceof Error ? err.message : 'อัปเดตฟีเจอร์ไม่สำเร็จ');
    } finally {
      delete updating[feature.code];
      updating = { ...updating };
    }
  }

  async function toggleFeatureState(feature: Feature, state: FeatureState, nextValue: boolean) {
    const key = stateKey(feature, state);
    if (updating[key]) {
      return;
    }

    const previous = state.value;
    updating[key] = true;
    features = features.map((item) =>
      item.code === feature.code
        ? {
            ...item,
            states: item.states.map((s) => (s.code === state.code ? { ...s, value: nextValue } : s))
          }
        : item
    );

    try {
      const res = await fetch(`/settings/api/features/${feature.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ states: { [state.code]: nextValue } })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'อัปเดตสถานะฟีเจอร์ไม่สำเร็จ');
      }
      const { data: updated } = await res.json();
      features = features.map((item) =>
        item.code === feature.code ? { ...item, ...updated } : item
      );
      toast.success('อัปเดตสถานะฟีเจอร์แล้ว');
    } catch (err) {
      features = features.map((item) =>
        item.code === feature.code
          ? {
              ...item,
              states: item.states.map((s) => (s.code === state.code ? { ...s, value: previous } : s))
            }
          : item
      );
      toast.error(err instanceof Error ? err.message : 'อัปเดตสถานะฟีเจอร์ไม่สำเร็จ');
    } finally {
      delete updating[key];
      updating = { ...updating };
    }
  }

  async function refreshFeatures() {
    try {
      const res = await fetch('/settings/api/features');
      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลฟีเจอร์ได้');
      const payload = await res.json();
      features = payload.data as Feature[];
      toast.success('รีเฟรชข้อมูลแล้ว');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'รีเฟรชข้อมูลไม่สำเร็จ');
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-semibold text-gray-900">ฟีเจอร์ของระบบ</h1>
      <p class="mt-2 text-sm text-gray-600">เปิด/ปิดโมดูลการทำงานที่ต้องการให้ครูและบุคลากรใช้งาน</p>
    </div>
    <Button variant="outline" onclick={refreshFeatures}>รีเฟรช</Button>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>รายการฟีเจอร์</CardTitle>
      <CardDescription>ต้องมีสิทธิ์ feature:manage จึงจะปรับได้</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      {#if features.length === 0}
        <p class="text-sm text-muted-foreground">ยังไม่มีฟีเจอร์ที่กำหนดไว้</p>
      {:else}
        <div class="divide-y rounded-md border">
          {#each features as feature}
            <div class="space-y-4 p-4">
              <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 class="text-sm font-semibold text-foreground">{feature.name}</h3>
                  <p class="text-xs text-muted-foreground">{feature.code}</p>
                  {#if feature.description}
                    <p class="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                  {/if}
                  <p class="mt-1 text-xs text-muted-foreground">
                    อัปเดตล่าสุด: {formatUpdatedAt(feature)}
                    {#if feature.updatedByName}
                      โดย {feature.updatedByName}
                    {/if}
                  </p>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-sm text-muted-foreground">
                    {feature.enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                  <Switch
                    checked={feature.enabled}
                    disabled={updating[feature.code]}
                    onclick={(event) => {
                      event.preventDefault();
                      toggleFeature(feature, !feature.enabled);
                    }}
                  />
                </div>
              </div>

              {#if feature.states.length}
                <div class="space-y-3 rounded-md border border-dashed border-border/70 p-3">
                  <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    การตั้งค่าฟีเจอร์ย่อย
                  </p>
                  <div class="space-y-4">
                    {#each feature.states as state}
                      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p class="text-sm font-semibold text-foreground">{state.label}</p>
                          <p class="text-xs text-muted-foreground">{state.code}</p>
                          {#if state.description}
                            <p class="mt-1 text-xs text-muted-foreground">{state.description}</p>
                          {/if}
                          <p class="mt-1 text-xs text-muted-foreground">
                            ค่าเริ่มต้น: {state.defaultValue ? 'เปิด' : 'ปิด'}
                          </p>
                        </div>
                        <div class="flex items-center gap-3">
                          <span class="text-sm text-muted-foreground">
                            {state.value ? 'เปิดอยู่' : 'ปิดอยู่'}
                          </span>
                          <Switch
                            checked={state.value}
                            disabled={!feature.enabled || updating[stateKey(feature, state)]}
                            onclick={(event) => {
                              event.preventDefault();
                              toggleFeatureState(feature, state, !state.value);
                            }}
                          />
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </CardContent>
  </Card>
</div>
