import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Outlet } from 'react-router-dom';
import { Guard } from '../src/pages/admin/Guard';

const renderGuard = (me, area) => render(
    <MemoryRouter><Routes><Route element={<Outlet context={me} />}><Route path="/" element={<Guard area={area}><p>secret area</p></Guard>} /></Route></Routes></MemoryRouter>);

describe('admin Guard (UX only; the API enforces access too)', () => {
    it('shows content to an admin who has the area', () => {
        renderGuard({ role: 'admin', permissions: ['blog'] }, 'blog');
        expect(screen.getByText('secret area')).toBeInTheDocument();
    });
    it('shows an access message when the area is missing', () => {
        renderGuard({ role: 'admin', permissions: ['blog'] }, 'enquiries');
        expect(screen.queryByText('secret area')).not.toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent(/don.t have access/i);
    });
    it('super-only areas are hidden from normal admins', () => {
        renderGuard({ role: 'admin', permissions: ['blog', 'enquiries'] }, 'super');
        expect(screen.queryByText('secret area')).not.toBeInTheDocument();
    });
    it('super admin passes super-only areas', () => {
        renderGuard({ role: 'super_admin', permissions: [] }, 'super');
        expect(screen.getByText('secret area')).toBeInTheDocument();
    });
});
