// Files uploaded from the admin portal are served by the API at <api-address>/media/<id>.<ext>.
// Recognised by their shape, so this works whatever address the API is on (local, proxied or deployed).
const UPLOADED = /^https?:\/\/[^/?#]+\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|gif|webp|avif|mp4|webm|mov|ogv)$/i;
export const isUploadedMedia = (url) => typeof url === 'string' && UPLOADED.test(url);
