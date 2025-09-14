import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { menuItem } from '$lib/server/schema';
import { eq, asc } from 'drizzle-orm';

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
      requires: menuItem.requiredPermissions
    })
    .from(menuItem)
    .where(eq(menuItem.isActive, true))
    .orderBy(asc(menuItem.sortOrder));

  const filtered = items.filter((it: any) => {
    const reqs = (it.requires ?? []) as string[];
    if (!reqs.length) return true;
    return reqs.some((p) => userPerms.includes(p));
  }).map(({ label, href, icon }) => ({ label, href, icon }));

  return json({ data: filtered } satisfies MenuResponse);
};
