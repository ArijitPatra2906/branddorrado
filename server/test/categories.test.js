import { describe, expect, it, vi } from 'vitest';

vi.mock('resend', () => ({ Resend: class { emails = { send: vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null }) }; } }));

import { api, makeAdmin, signIn, uniq } from './helpers.js';

describe('saved categories', () => {
    it('a new project category is saved and offered for later projects', async () => {
        const s = await signIn(await makeAdmin());
        const cat = `Real Estate ${uniq('c')}`;
        const created = await s.post('/api/admin/projects').send({ title: `P ${uniq()}`, industry: cat, shortDescription: 'x', status: 'draft' });
        expect(created.status).toBe(201);
        const list = await s.get('/api/admin/categories/projects');
        expect(list.status).toBe(200);
        expect(list.body.data).toContain(cat);
        // still offered after the only project that used it is deleted
        await s.delete(`/api/admin/projects/${created.body.data.id}`);
        expect((await s.get('/api/admin/categories/projects')).body.data).toContain(cat);
    });
    it('a new blog category is saved and offered for later articles, separately from projects', async () => {
        const s = await signIn(await makeAdmin());
        const cat = `Podcasts ${uniq('c')}`;
        const created = await s.post('/api/admin/blog').send({ title: `B ${uniq()}`, excerpt: 'e', content: 'c', category: cat, status: 'draft' });
        expect(created.status).toBe(201);
        expect((await s.get('/api/admin/categories/blog')).body.data).toContain(cat);
        expect((await s.get('/api/admin/categories/projects')).body.data).not.toContain(cat);
    });
    it('does not save the same category twice when only the capitals differ', async () => {
        const s = await signIn(await makeAdmin());
        const base = `Spa ${uniq('c')}`;
        await s.post('/api/admin/projects').send({ title: `P ${uniq()}`, industry: base, shortDescription: 'x' });
        await s.post('/api/admin/projects').send({ title: `P ${uniq()}`, industry: base.toUpperCase(), shortDescription: 'x' });
        const names = (await s.get('/api/admin/categories/projects')).body.data.filter((n) => n.toLowerCase() === base.toLowerCase());
        expect(names).toHaveLength(1);
    });
    it('needs a signed-in admin with the right permission', async () => {
        expect((await api().get('/api/admin/categories/projects')).status).toBe(401);
        const blogOnly = await signIn(await makeAdmin({ permissions: ['blog'] }));
        expect((await blogOnly.get('/api/admin/categories/projects')).status).toBe(403);
        expect((await blogOnly.get('/api/admin/categories/blog')).status).toBe(200);
    });
});

describe('video card size ratio', () => {
    it('defaults to 4:5, is saved for projects and articles, and is sent to visitors', async () => {
        const s = await signIn(await makeAdmin());
        const cat = `Ratio ${uniq('c')}`;
        const plain = await s.post('/api/admin/projects').send({ title: `P ${uniq()}`, industry: cat, shortDescription: 'x', status: 'published' });
        expect((await s.get(`/api/admin/projects/${plain.body.data.id}`)).body.data.videoRatio).toBe('4:5');
        const wide = await s.post('/api/admin/projects').send({ title: `P ${uniq()}`, industry: cat, shortDescription: 'x', status: 'published', videoUrl: 'https://example.com/a.mp4', videoRatio: '16:9' });
        expect(wide.status).toBe(201);
        const pub = await api().get('/api/projects/by-category?perCategory=12');
        const group = pub.body.data.find((g) => g.category === cat);
        expect(group.items.map((i) => i.videoRatio).sort()).toEqual(['16:9', '4:5']);
        const post = await s.post('/api/admin/blog').send({ title: `B ${uniq()}`, excerpt: 'e', content: 'c', category: cat, status: 'published', videoUrl: 'https://example.com/b.mp4', videoRatio: '9:16' });
        expect(post.status).toBe(201);
        const blog = await api().get('/api/blog/by-category?perCategory=12');
        expect(blog.body.data.find((g) => g.category === cat).items[0].videoRatio).toBe('9:16');
    });
    it('rejects a ratio that is not in the list, and editing a project keeps its ratio', async () => {
        const s = await signIn(await makeAdmin());
        const bad = await s.post('/api/admin/projects').send({ title: `P ${uniq()}`, industry: 'Fitness', shortDescription: 'x', videoRatio: '7:3' });
        expect(bad.status).toBe(400);
        const ok = await s.post('/api/admin/projects').send({ title: `P ${uniq()}`, industry: 'Fitness', shortDescription: 'x', videoRatio: '1:1' });
        await s.patch(`/api/admin/projects/${ok.body.data.id}`).send({ status: 'published' });
        expect((await s.get(`/api/admin/projects/${ok.body.data.id}`)).body.data.videoRatio).toBe('1:1');
    });
});
