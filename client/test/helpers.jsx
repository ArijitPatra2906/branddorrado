import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

export const renderWithProviders = (ui, { route = '/' } = {}) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter></QueryClientProvider>);
};

// Minimal fetch mock: routes is { '/path-prefix': (init) => ({ status, body }) }.
export const mockFetch = (routes) => {
    const calls = [];
    globalThis.fetch = vi.fn(async (url, init = {}) => {
        const path = String(url).replace(/^https?:\/\/[^/]+\/api/, '');
        calls.push({ path, init });
        const key = Object.keys(routes).find((k) => path.startsWith(k));
        const { status = 200, body = {} } = key ? routes[key](init) : { status: 404, body: { error: { message: 'not found' } } };
        return { ok: status >= 200 && status < 300, status, json: async () => body };
    });
    return calls;
};
