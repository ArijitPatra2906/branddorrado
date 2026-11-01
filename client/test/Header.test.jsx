import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header, NAV } from '../src/components/layout/Header';
import { renderWithProviders } from './helpers';

describe('Header (inner pages)', () => {
    it('shows every main destination and the Start a Project action', () => {
        renderWithProviders(<Header />, { route: '/about' });
        const main = screen.getByRole('navigation', { name: 'Main' });
        for (const n of NAV) expect(main).toHaveTextContent(n.label);
        expect(screen.getAllByRole('link', { name: /start a project/i }).length).toBeGreaterThan(0);
    });

    it('mobile menu: toggle button reports state and the panel shows and hides', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Header />, { route: '/about' });
        const btn = screen.getByRole('button', { name: 'Open menu' });
        expect(btn).toHaveAttribute('aria-expanded', 'false');
        await user.click(btn);
        const closeBtn = screen.getByRole('button', { name: 'Close menu' });
        expect(closeBtn).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('navigation', { name: 'Mobile' })).toBeVisible();
        await user.click(closeBtn);
        expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
    });

    it('uses the transparent home layout on /', () => {
        renderWithProviders(<Header />, { route: '/' });
        expect(screen.getByRole('navigation', { name: 'Secondary' })).toBeInTheDocument();
    });
});
