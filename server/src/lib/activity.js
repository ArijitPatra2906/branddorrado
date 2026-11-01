import { db } from '../db/client.js';
import { activityLog } from '../db/schema.js';
export async function logActivity(user, action, entity, entityId, summary) {
    try {
        await db.insert(activityLog).values({ userId: user?.id ?? null, userName: user?.name ?? 'Unknown', action, entity, entityId, summary: summary.slice(0, 300) });
    }
    catch {
        console.error('[activity] could not record an audit entry');
    } // an audit failure must never break the admin's action
}
