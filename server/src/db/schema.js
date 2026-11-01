import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, blob, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';
const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const now = () => new Date().toISOString();
const stamps = {
    createdAt: text('created_at').notNull().$defaultFn(now),
    updatedAt: text('updated_at').notNull().$defaultFn(now).$onUpdateFn(now),
};
const flag = (name, def = false) => integer(name, { mode: 'boolean' }).notNull().default(def);
const seo = { seoTitle: text('seo_title'), seoDescription: text('seo_description') };
export const publishStatus = ['draft', 'published', 'archived'];
// Shape of a video card on the website (width:height). The admin picks one for every project and article that has a video.
export const videoRatios = ['16:9', '4:3', '1:1', '4:5', '3:4', '9:16'];
export const adminAreas = ['enquiries', 'projects', 'services', 'testimonials', 'pricing', 'blog', 'settings'];
// 'super_admin' is unique (enforced by the partial unique index below, so it can only ever be created once).
// 'admin' accounts have full access (permissions = null) unless the super admin restricts them to specific areas.
export const adminUsers = sqliteTable('admin_users', {
    id: id(), name: text('name').notNull(), email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role', { enum: ['super_admin', 'admin'] }).notNull().default('admin'),
    permissions: text('permissions', { mode: 'json' }).$type(),
    createdBy: text('created_by'),
    active: flag('active', true), lastLoginAt: text('last_login_at'), ...stamps,
}, (t) => [uniqueIndex('admin_single_super_uq').on(t.role).where(sql `${t.role} = 'super_admin'`)]);
// Audit trail of every state-changing admin action. Stores who/what/when and field names only: never passwords or customer data.
export const activityLog = sqliteTable('activity_log', {
    id: id(), userId: text('user_id').references(() => adminUsers.id, { onDelete: 'set null' }), userName: text('user_name').notNull(),
    action: text('action').notNull(), entity: text('entity').notNull(), entityId: text('entity_id'), summary: text('summary').notNull(),
    createdAt: text('created_at').notNull().$defaultFn(now),
}, (t) => [index('activity_created_idx').on(t.createdAt), index('activity_user_idx').on(t.userId, t.createdAt)]);
export const sessions = sqliteTable('sessions', {
    id: id(), userId: text('user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(), csrfToken: text('csrf_token').notNull(),
    expiresAt: text('expires_at').notNull(), revokedAt: text('revoked_at'),
    createdAt: text('created_at').notNull().$defaultFn(now),
}, (t) => [index('sessions_user_idx').on(t.userId)]);
// Single-use password-reset tokens. Only a hash is stored, so a database leak cannot be turned into a working reset link.
export const passwordResets = sqliteTable('password_resets', {
    id: id(), userId: text('user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(), expiresAt: text('expires_at').notNull(), usedAt: text('used_at'),
    createdAt: text('created_at').notNull().$defaultFn(now),
}, (t) => [index('password_resets_user_idx').on(t.userId)]);
// Photos and videos uploaded from the admin portal. The file itself lives in Turso (a BLOB); pages store only its link.
export const media = sqliteTable('media', {
  id: id(), kind: text('kind', { enum: ['image', 'video'] }).notNull(), mime: text('mime').notNull(), ext: text('ext').notNull(),
  size: integer('size').notNull(), originalName: text('original_name'), uploadedBy: text('uploaded_by'),
  // New uploads are stored in 1 MB pieces in media_chunks (chunkCount > 0). `data` only holds files saved by the earlier single-row version.
  chunkCount: integer('chunk_count').notNull().default(0),
  data: blob('data', { mode: 'buffer' }), createdAt: text('created_at').notNull().$defaultFn(now),
});
// The pieces of an uploaded file, so a video range or a photo is read from Turso a piece at a time instead of loading the whole file.
export const mediaChunks = sqliteTable('media_chunks', {
  mediaId: text('media_id').notNull(), idx: integer('idx').notNull(), data: blob('data', { mode: 'buffer' }).notNull(),
}, (t) => [primaryKey({ columns: [t.mediaId, t.idx] })]);

export const services = sqliteTable('services', {
    id: id(), title: text('title').notNull(), slug: text('slug').notNull().unique(),
    shortDescription: text('short_description').notNull(), detailedDescription: text('detailed_description'),
    imageUrl: text('image_url'), iconId: text('icon_id'), ctaLabel: text('cta_label'),
    benefits: text('benefits', { mode: 'json' }).$type().notNull().default([]),
    displayOrder: integer('display_order').notNull().default(0),
    status: text('status', { enum: publishStatus }).notNull().default('draft'), ...seo, ...stamps,
}, (t) => [index('services_status_order_idx').on(t.status, t.displayOrder)]);
export const serviceDeliverables = sqliteTable('service_deliverables', {
    id: id(), serviceId: text('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
    label: text('label').notNull(), position: integer('position').notNull().default(0),
});
export const projects = sqliteTable('projects', {
    id: id(), title: text('title').notNull(), slug: text('slug').notNull().unique(),
    clientName: text('client_name'), industry: text('industry').notNull(), projectType: text('project_type'),
    shortDescription: text('short_description').notNull(), caseStudy: text('case_study'),
    coverImageUrl: text('cover_image_url'), videoUrl: text('video_url'), externalUrl: text('external_url'),
    results: text('results', { mode: 'json' }).$type().notNull().default([]),
    isDemo: flag('is_demo'), featured: flag('featured'),
    status: text('status', { enum: publishStatus }).notNull().default('draft'),
    videoRatio: text('video_ratio', { enum: videoRatios }).notNull().default('4:5'),
    completedOn: text('completed_on'), ...seo, ...stamps,
}, (t) => [index('projects_list_idx').on(t.status, t.industry, t.featured)]);
export const projectServices = sqliteTable('project_services', {
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    serviceId: text('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.projectId, t.serviceId] })]);
export const projectGallery = sqliteTable('project_gallery', {
    id: id(), projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    url: text('url').notNull(), alt: text('alt').notNull().default(''), position: integer('position').notNull().default(0),
});
export const testimonials = sqliteTable('testimonials', {
    id: id(), clientName: text('client_name').notNull(), businessName: text('business_name'), industry: text('industry'),
    avatarUrl: text('avatar_url'), body: text('body').notNull(), rating: integer('rating'),
    approved: flag('approved'), status: text('status', { enum: publishStatus }).notNull().default('draft'),
    displayOrder: integer('display_order').notNull().default(0), ...stamps,
});
export const pricingPackages = sqliteTable('pricing_packages', {
    id: id(), name: text('name').notNull(), slug: text('slug').notNull().unique(), description: text('description'),
    priceMinor: integer('price_minor'), customQuote: flag('custom_quote'), currency: text('currency').notNull().default('INR'),
    billingPeriod: text('billing_period', { enum: ['one_time', 'monthly', 'quarterly', 'yearly'] }).notNull().default('monthly'),
    revisionTerms: text('revision_terms'), deliveryTimeline: text('delivery_timeline'),
    featured: flag('featured'), available: flag('available'),
    displayOrder: integer('display_order').notNull().default(0), ...stamps,
});
export const pricingDeliverables = sqliteTable('pricing_deliverables', {
    id: id(), packageId: text('package_id').notNull().references(() => pricingPackages.id, { onDelete: 'cascade' }),
    label: text('label').notNull(), position: integer('position').notNull().default(0),
});
export const blogPosts = sqliteTable('blog_posts', {
    id: id(), title: text('title').notNull(), slug: text('slug').notNull().unique(), excerpt: text('excerpt'),
    content: text('content').notNull(), featuredImageUrl: text('featured_image_url'), category: text('category'),
    authorName: text('author_name'), videoUrl: text('video_url'), externalUrl: text('external_url'),
    videoRatio: text('video_ratio', { enum: videoRatios }).notNull().default('4:5'),
    isDemo: flag('is_demo'), featured: flag('featured'),
    status: text('status', { enum: publishStatus }).notNull().default('draft'),
    publishedAt: text('published_at'), ...seo, ...stamps,
}, (t) => [index('blog_list_idx').on(t.status, t.publishedAt, t.category)]);
// Same shape as project_services / project_gallery: the services an article relates to, and its gallery photos.
export const blogServices = sqliteTable('blog_services', {
    postId: text('post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
    serviceId: text('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.postId, t.serviceId] })]);
export const blogGallery = sqliteTable('blog_gallery', {
    id: id(), postId: text('post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
    url: text('url').notNull(), alt: text('alt').notNull().default(''), position: integer('position').notNull().default(0),
});
export const enquiryStatuses = ['new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost', 'archived'];
export const enquiries = sqliteTable('enquiries', {
    id: id(), reference: text('reference').notNull(), fullName: text('full_name').notNull(), businessName: text('business_name'),
    email: text('email').notNull(), phone: text('phone'), websiteUrl: text('website_url'),
    serviceId: text('service_id').references(() => services.id, { onDelete: 'set null' }), serviceLabel: text('service_label'),
    packageId: text('package_id').references(() => pricingPackages.id, { onDelete: 'set null' }),
    budgetRange: text('budget_range'), timeline: text('timeline'), contactMethod: text('contact_method'),
    description: text('description').notNull(), referralSource: text('referral_source'),
    consentAt: text('consent_at'), consentVersion: text('consent_version'),
    dedupeHash: text('dedupe_hash').notNull(),
    status: text('status', { enum: enquiryStatuses }).notNull().default('new'),
    assignedTo: text('assigned_to').references(() => adminUsers.id, { onDelete: 'set null' }),
    followUpOn: text('follow_up_on'),
    notifyStatus: text('notify_status', { enum: ['pending', 'sent', 'failed'] }).notNull().default('pending'),
    ackStatus: text('ack_status', { enum: ['pending', 'sent', 'failed', 'skipped'] }).notNull().default('pending'), ...stamps,
}, (t) => [uniqueIndex('enquiries_ref_uq').on(t.reference), index('enquiries_email_idx').on(t.email),
    index('enquiries_filter_idx').on(t.status, t.createdAt), index('enquiries_dedupe_idx').on(t.dedupeHash, t.createdAt)]);
// Internal notes live in their own table so public/customer queries can never select them by accident.
export const enquiryNotes = sqliteTable('enquiry_notes', {
    id: id(), enquiryId: text('enquiry_id').notNull().references(() => enquiries.id, { onDelete: 'cascade' }),
    authorId: text('author_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    body: text('body').notNull(), createdAt: text('created_at').notNull().$defaultFn(now),
});
export const emailAttempts = sqliteTable('email_attempts', {
    id: id(), enquiryId: text('enquiry_id').references(() => enquiries.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['agency_notification', 'customer_ack'] }).notNull(),
    status: text('status', { enum: ['sent', 'failed'] }).notNull(), providerId: text('provider_id'),
    errorCode: text('error_code'), createdAt: text('created_at').notNull().$defaultFn(now),
}, (t) => [index('email_attempts_enquiry_idx').on(t.enquiryId)]);
export const siteSettings = sqliteTable('site_settings', {
    id: integer('id').primaryKey(), // singleton row, id = 1
    data: text('data', { mode: 'json' }).$type().notNull().default({}), ...stamps,
});

// Categories the admin has created for projects and blog posts. They are saved here the first time a project or article uses them,
// so they appear in the category list for every later project or article.
export const categories = sqliteTable('categories', {
    id: id(), kind: text('kind', { enum: ['project', 'blog'] }).notNull(), name: text('name').notNull(), ...stamps,
}, (t) => [uniqueIndex('categories_kind_name_idx').on(t.kind, t.name)]);
