# Admin guide

Sign in at `/admin`. Everything below is done in the browser; no code editing is needed.

## Roles
- **Super admin** (one only): everything, plus **Team** (add admins, limit what each can do, deactivate, reset passwords) and **Activity** (who changed what and when).
- **Admins**: all areas by default, or only the areas the super admin chooses (enquiries, projects, services, testimonials, pricing, blog, settings). The server enforces this on every request.
- Password rule: at least 6 characters with an uppercase letter, a lowercase letter, a number and a special character. Use "Forgot your password?" on the sign-in page, or ask the super admin.

## Managing leads (Enquiries)
1. Open **Enquiries**. Search by name, email, business or reference (for example `BD-261024-ABCDE`); filter by status, service, budget and date.
2. Open an enquiry to read it all. Change the **status** (New, Contacted, Qualified, Proposal Sent, Won, Lost, Archived), set a **follow-up date**, and add **internal notes**. Notes are private and never appear on the website or in customer emails.
3. If the email status shows "failed", use **Retry email** after checking the Resend settings.
4. **Export CSV** downloads the current filtered list. Treat the file as confidential customer data.
5. Delete only when your retention policy says so; deletion cannot be undone.

## Adding a project (Our Work)
1. **Projects, New.** Choose a **category** first (or add a new one); uploads need it.
2. Fill in the title, short description and case study. Add a cover image, gallery photos and a video (upload or a YouTube/Vimeo link). A video with no thumbnail gets one generated from the video.
3. Add verified results only if they are true and approved by the client.
4. Tick **Featured** to list it first. Tick **Sample** only for demonstration content.
5. Set the status to **Published** to show it on the website; **Draft** hides it.

## Services, pricing, testimonials, blog
- **Services:** title, descriptions, image, icon, order, benefits, deliverables, SEO. Hidden services are not shown or selectable in the enquiry form.
- **Pricing:** a package needs a price or "custom quote" before it can be made available. Packages that are not available are hidden from visitors.
- **Testimonials:** add only real, approved quotes. A testimonial appears only when both **approved** and **published** are set.
- **Blog:** works like Projects (category, short description, photo, video, gallery, related services, featured, sample). Content is plain text/Markdown and is rendered safely; raw HTML is not run.

## Settings
Agency name, tagline, public email, WhatsApp number, social links, hero text and image/video, statistics, About and footer text, response-time text, legal pages, and SEO defaults. Statistics show on the website only when filled in with real figures.

## Good habits
- Do not publish figures, clients or reviews you cannot prove.
- Keep videos short and compressed; uploads are stored in the database and count towards its limits.
- Sign out on shared computers.
