import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { menuItem } from '$lib/server/schema';
import { eq, asc } from 'drizzle-orm';
import { getEnabledFeatures } from '$lib/server/features';

interface MenuItemOut {
  label: string;
  href: string;
  icon: string;
}

interface MenuResponse {
  data: MenuItemOut[];
}

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.me?.data?.user?.id) {
    return error(401, 'Unauthorized');
  }

  const userPerms = locals.me.data.perms || [] as string[];

  const items = await db
    .select({
      label: menuItem.label,
      href: menuItem.href,
      icon: menuItem.icon,
      requires: menuItem.requiredPermissions,
      requiredFeatures: menuItem.requiredFeatures
    })
    .from(menuItem)
    .where(eq(menuItem.isActive, true))
    .orderBy(asc(menuItem.sortOrder));

  const enabledFeatures = await getEnabledFeatures(locals);
  const featureSet = new Set(enabledFeatures);

  const filtered = items
    .filter((it: any) => {
      const reqPerms = (it.requires ?? []) as string[];
      if (reqPerms.length && !reqPerms.some((p) => userPerms.includes(p))) {
        return false;
      }
      const featReqs = (it.requiredFeatures ?? []) as string[];
      if (featReqs.length && !featReqs.every((feat) => featureSet.has(feat))) {
        return false;
      }
      return true;
    })
    .map(({ label, href, icon }) => ({ label, href, icon }));

  return json({ data: filtered } satisfies MenuResponse);
};
