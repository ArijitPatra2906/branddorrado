import { adminAreas } from '../db/schema.js';
export const AREAS = adminAreas;
// Super admin and unrestricted admins (permissions = null) can use every area.
export const effectivePermissions = (role, perms) => role === 'super_admin' || perms == null ? [...AREAS] : AREAS.filter((a) => perms.includes(a));
