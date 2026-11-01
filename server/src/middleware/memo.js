// Short in-memory cache for public, non-personal GET responses (services, projects, blog, pricing, settings...).
// Many visitors loading the same page cost one database read per address per few seconds instead of one each.
// Every successful admin change clears it, so edits (including the 3D hero switch) show up immediately on this server.
const store = new Map();
const inflight = new Map(); // address -> promise that settles when the first request for it has finished
const MAX_ENTRIES = 400;
// A value that changes on every admin change. Open pages poll it (GET /api/revision) and refetch as soon as it changes.
const bootId = Date.now().toString(36);
let counter = 0;
export const getRevision = () => `${bootId}-${counter}`;
export const clearMemo = () => { store.clear(); counter++; };
export const memo = (ttlSeconds) => async (req, res, next) => {
    if (req.method !== 'GET')
        return next();
    const key = req.originalUrl;
    const replay = () => {
        const hit = store.get(key);
        if (!hit || hit.exp <= Date.now())
            return false;
        if (hit.cc)
            res.set('Cache-Control', hit.cc);
        res.set('X-Cache', 'HIT');
        res.type('json').send(hit.body);
        return true;
    };
    if (replay())
        return;
    // Many visitors can ask for the same uncached address at the same moment (a traffic spike, or right after an edit).
    // Only the first one goes to the database; the others wait for it and reuse its answer.
    const leader = inflight.get(key);
    if (leader) {
        await leader;
        if (replay())
            return;
    }
    else {
        let done;
        inflight.set(key, new Promise((r) => { done = r; }));
        res.on('close', () => { inflight.delete(key); done(); });
    }
    res.json = (obj) => {
        const body = JSON.stringify(obj);
        if (res.statusCode === 200) {
            if (store.size >= MAX_ENTRIES)
                store.delete(store.keys().next().value);
            store.set(key, { body, exp: Date.now() + ttlSeconds * 1000, cc: res.getHeader('Cache-Control') });
            res.set('X-Cache', 'MISS');
        }
        return res.type('json').send(body);
    };
    next();
};
