import { useAdminUser } from './useAdminUser';
// UX only: the API independently refuses requests for areas the admin has not been given.
export function Guard({ area, children }) {
    const me = useAdminUser();
    const ok = area === 'super' ? me.role === 'super_admin' : me.permissions.includes(area);
    return ok ? <>{children}</> : <p role="alert" className="rounded-card border border-gold/40 p-8 text-center">You don’t have access to this area. Ask the super admin if you need it.</p>;
}
