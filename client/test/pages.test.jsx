import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import Services from '../src/pages/Services';
import WorkList from '../src/pages/WorkList';
import AdminLayout from '../src/pages/admin/AdminLayout';
import { renderWithProviders, mockFetch } from './helpers';

describe('Services page', () => {
    it('loads services from the API and links each one to its page', async () => {
        mockFetch({ '/services': () => ({ body: { data: [{ id: '1', slug: 'content-creation', title: 'Content Creation', shortDescription: 'Reels and video.' }] } }) });
        renderWithProviders(<Services />, { route: '/services' });
        const link = await screen.findByRole('link', { name: /content creation/i });
        expect(link).toHaveAttribute('href', '/services/content-creation');
    });
    it('shows an error with a retry button when loading fails', async () => {
        mockFetch({ '/services': () => ({ status: 500, body: { error: { message: 'x' } } }) });
        renderWithProviders(<Services />, { route: '/services' });
        expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load/i);
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
    it('shows an empty state when there are no published services', async () => {
        mockFetch({ '/services': () => ({ body: { data: [] } }) });
        renderWithProviders(<Services />, { route: '/services' });
        expect(await screen.findByText(/services are being updated/i)).toBeInTheDocument();
    });
});

describe('Work page filtering', () => {
    const routes = () => ({
        '/projects/industries': () => ({ body: { data: ['Fitness', 'Travel'] } }),
        '/projects/by-category': () => ({ body: { data: [] } }),
        '/projects?': () => ({ body: { data: [{ id: 'p1', slug: 'gym-reel', title: 'Gym Reel', industry: 'Fitness', shortDescription: 'Short reel campaign.' }], meta: { page: 1, pageSize: 9, total: 1 } } }),
    });
    it('choosing a category asks the API for that category and shows the projects', async () => {
        const calls = mockFetch(routes());
        const user = userEvent.setup();
        renderWithProviders(<WorkList />, { route: '/work' });
        await user.click(await screen.findByRole('button', { name: 'Fitness' }));
        expect(await screen.findByText('Gym Reel')).toBeInTheDocument();
        expect(calls.some((c) => c.path.startsWith('/projects?') && c.path.includes('industry=Fitness'))).toBe(true);
        expect(screen.getByRole('button', { name: 'Fitness' })).toHaveAttribute('aria-pressed', 'true');
    });
    it('an unknown category shows the empty state', async () => {
        mockFetch({ ...routes(), '/projects?': () => ({ body: { data: [], meta: { page: 1, pageSize: 9, total: 0 } } }) });
        renderWithProviders(<WorkList />, { route: '/work?industry=Fitness' });
        expect(await screen.findByText(/no projects match your filters/i)).toBeInTheDocument();
    });
});

describe('Admin routes', () => {
    it('send a signed-out visitor to the sign-in page', async () => {
        mockFetch({ '/auth/me': () => ({ status: 401, body: { error: { message: 'Not signed in.' } } }) });
        renderWithProviders(<Routes><Route path="/admin" element={<AdminLayout />}><Route index element={<p>secret dashboard</p>} /></Route><Route path="/admin/login" element={<p>sign in page</p>} /></Routes>, { route: '/admin' });
        await waitFor(() => expect(screen.getByText('sign in page')).toBeInTheDocument());
        expect(screen.queryByText('secret dashboard')).not.toBeInTheDocument();
    });
    it('show the dashboard to a signed-in admin', async () => {
        mockFetch({ '/auth/me': () => ({ body: { data: { user: { id: '1', name: 'Test Admin', email: 'a@b.co', role: 'admin', permissions: ['enquiries'] }, csrfToken: 't' } } }) });
        renderWithProviders(<Routes><Route path="/admin" element={<AdminLayout />}><Route index element={<p>secret dashboard</p>} /></Route></Routes>, { route: '/admin' });
        expect(await screen.findByText('secret dashboard')).toBeInTheDocument();
    });
});
