import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnquiryForm } from '../src/components/forms/EnquiryForm';
import { renderWithProviders, mockFetch } from './helpers';

const options = { budgets: ['Not sure yet'], timelines: ['Flexible'], contactMethods: ['Email'], referralSources: ['Other'], phoneRequired: false };
const services = [{ id: '1', title: 'Content Creation', slug: 'content-creation' }];

const fill = async (user) => {
    await user.type(screen.getByLabelText(/full name/i), 'Asha Rao');
    await user.type(screen.getByLabelText(/^email/i), 'asha@example.com');
    await user.selectOptions(screen.getByLabelText(/service/i), 'content-creation');
    await user.type(screen.getByLabelText(/project description|tell us/i), 'We run a cafe and need a content plan for the season.');
    await user.click(screen.getByRole('checkbox'));
};

describe('EnquiryForm', () => {
    it('shows field-level errors and does not call the API when the form is empty', async () => {
        const calls = mockFetch({ '/services': () => ({ body: { data: services } }), '/enquiry-options': () => ({ body: { data: options } }) });
        const user = userEvent.setup();
        renderWithProviders(<EnquiryForm />, { route: '/contact' });
        await user.click(screen.getByRole('button', { name: /send|submit/i }));
        expect(await screen.findAllByText(/^Error:/)).not.toHaveLength(0);
        expect(calls.some((c) => c.path.startsWith('/enquiries'))).toBe(false);
    });

    it('prefills the service from the URL', async () => {
        mockFetch({ '/services': () => ({ body: { data: services } }), '/enquiry-options': () => ({ body: { data: options } }) });
        renderWithProviders(<EnquiryForm />, { route: '/contact?service=content-creation' });
        await waitFor(() => expect(screen.getByLabelText(/service/i)).toHaveValue('content-creation'));
    });

    it('shows the reference only after the server confirms the save', async () => {
        const calls = mockFetch({
            '/services': () => ({ body: { data: services } }), '/enquiry-options': () => ({ body: { data: options } }),
            '/enquiries': () => ({ status: 201, body: { data: { reference: 'BD-261024-ABCDE' } } }),
        });
        const user = userEvent.setup();
        renderWithProviders(<EnquiryForm />, { route: '/contact' });
        await screen.findByRole('option', { name: /content creation/i });
        await fill(user);
        await user.click(screen.getByRole('button', { name: /send|submit/i }));
        expect(await screen.findByText(/BD-261024-ABCDE/)).toBeInTheDocument();
        const post = calls.find((c) => c.path.startsWith('/enquiries'));
        expect(JSON.parse(post.init.body).email).toBe('asha@example.com');
    });

    it('never shows success when the server fails', async () => {
        mockFetch({
            '/services': () => ({ body: { data: services } }), '/enquiry-options': () => ({ body: { data: options } }),
            '/enquiries': () => ({ status: 500, body: { error: { message: 'Something went wrong.' } } }),
        });
        const user = userEvent.setup();
        renderWithProviders(<EnquiryForm />, { route: '/contact' });
        await screen.findByRole('option', { name: /content creation/i });
        await fill(user);
        await user.click(screen.getByRole('button', { name: /send|submit/i }));
        expect(await screen.findByRole('alert')).toHaveTextContent(/nothing has been saved/i);
        expect(screen.queryByText(/Thank you/)).not.toBeInTheDocument();
    });
});
