import { useQuery } from '@tanstack/react-query';
import { api } from './api';
const get = (path) => api(path).then((r) => r.data);
export const useSiteSettings = () => useQuery({ queryKey: ['settings'], queryFn: () => get('/site-settings/public') });
export const useServices = () => useQuery({ queryKey: ['services'], queryFn: () => get('/services') });
export const useProjects = (params = {}) => {
    const qs = new URLSearchParams();
    if (params.featured)
        qs.set('featured', 'true');
    qs.set('limit', String(params.limit ?? 12));
    return useQuery({ queryKey: ['projects', qs.toString()], queryFn: () => get(`/projects?${qs}`) });
};
export const useTestimonials = () => useQuery({ queryKey: ['testimonials'], queryFn: () => get('/testimonials') });
export const useEnquiryOptions = () => useQuery({ queryKey: ['enquiry-options'], queryFn: () => get('/enquiry-options'), staleTime: 5 * 60_000 });
const getPaged = (path) => api(path);
export const useServiceDetail = (slug) => useQuery({ queryKey: ['service', slug], queryFn: () => get(`/services/${encodeURIComponent(slug)}`), retry: false });
export const useWork = (p) => {
    const qs = new URLSearchParams({ page: String(p.page), limit: '9' });
    if (p.industry)
        qs.set('industry', p.industry);
    if (p.q)
        qs.set('q', p.q);
    return useQuery({ queryKey: ['work', qs.toString()], queryFn: () => getPaged(`/projects?${qs}`), placeholderData: (prev) => prev });
};
export const useWorkByCategory = (perCategory = 5) => useQuery({ queryKey: ['work-by-category', perCategory], queryFn: () => get(`/projects/by-category?perCategory=${perCategory}`) });
export const useIndustries = () => useQuery({ queryKey: ['industries'], queryFn: () => get('/projects/industries') });
export const useProjectDetail = (slug) => useQuery({ queryKey: ['project', slug], queryFn: () => get(`/projects/${encodeURIComponent(slug)}`), retry: false });
export const usePricing = () => useQuery({ queryKey: ['pricing'], queryFn: () => get('/pricing') });
export const useBlog = (p) => {
    const qs = new URLSearchParams({ page: String(p.page), limit: '9' });
    if (p.category)
        qs.set('category', p.category);
    if (p.q)
        qs.set('q', p.q);
    return useQuery({ queryKey: ['blog', qs.toString()], queryFn: () => getPaged(`/blog?${qs}`), placeholderData: (prev) => prev });
};
export const useBlogCategories = () => useQuery({ queryKey: ['blog-categories'], queryFn: () => get('/blog/categories') });
export const useBlogPost = (slug) => useQuery({ queryKey: ['post', slug], queryFn: () => get(`/blog/${encodeURIComponent(slug)}`), retry: false });
export const useBlogByCategory = (perCategory = 5) => useQuery({ queryKey: ['blog-by-category', perCategory], queryFn: () => get(`/blog/by-category?perCategory=${perCategory}`) });
