import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { menuItem } from '$lib/server/schema';
import { eq, asc } from 'drizzle-orm';
import { getEnabledFeatures } from '$lib/server/features';
import { featureRegistry } from '$lib/features';

interface MenuItemOut {
  label: string;
  href: string;
  icon: string;
}

interface MenuResponse {
  data: MenuItemOut[];
}

type RawMenuItem = {
  label: string;
  href: string;
  icon: string;
  requires?: string[] | null;
  requiredFeatures?: string[] | null;
  order?: number | null;
};

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.me?.data?.user?.id) {
    return error(401, 'Unauthorized');
  }

  const userPerms = locals.me.data.perms || [] as string[];

  const items = (await db
    .select({
      label: menuItem.label,
      href: menuItem.href,
      icon: menuItem.icon,
      requires: menuItem.requiredPermissions,
      requiredFeatures: menuItem.requiredFeatures,
      order: menuItem.sortOrder
    })
    .from(menuItem)
    .where(eq(menuItem.isActive, true))
    .orderBy(asc(menuItem.sortOrder))) as RawMenuItem[];

  const enabledFeatures = await getEnabledFeatures(locals);
  const featureSet = new Set(enabledFeatures);

  const featureMenuItems: RawMenuItem[] = featureRegistry.listMenuItems().map((item) => ({
    label: item.label,
    href: item.href,
    icon: item.icon,
    requires: item.requires ?? [],
    requiredFeatures: item.requiresFeatures ?? [item.featureId],
    order: item.order ?? 0
  }));

  const combined = [...items, ...featureMenuItems];

  const filtered = combined
    .filter((it) => {
      const reqPerms = it.requires ?? [];
      if (reqPerms.length && !reqPerms.some((p) => userPerms.includes(p))) {
        return false;
      }
      const featReqs = it.requiredFeatures ?? [];
      if (featReqs.length && !featReqs.every((feat) => featureSet.has(feat))) {
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(({ label, href, icon }) => ({ label, href, icon }));

  return json({ data: filtered } satisfies MenuResponse);
};
