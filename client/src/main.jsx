import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { announceContentChange, refreshPublicContent } from './lib/liveContent';
import App from './App';
import './styles/index.css';
// After any successful save in the admin area, refetch the public data here and tell other open tabs to do the same.
const queryClient = new QueryClient({
    mutationCache: new MutationCache({ onSuccess: () => { refreshPublicContent(queryClient); announceContentChange(); } }),
    defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
});
createRoot(document.getElementById('root')).render(<React.StrictMode><QueryClientProvider client={queryClient}><BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></BrowserRouter></QueryClientProvider></React.StrictMode>);
