import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Home from './pages/Home';
import Contact from './pages/Contact';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import WorkList from './pages/WorkList';
import WorkDetail from './pages/WorkDetail';
import About from './pages/About';
import Pricing from './pages/Pricing';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import { PrivacyPage, TermsPage } from './pages/Legal';
import NotFound from './pages/NotFound';
import { Guard } from './pages/admin/Guard';
import { useLiveContent } from './lib/liveContent';
// The admin area is code-split so it never adds weight to the public site.
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const EnquiryList = lazy(() => import('./pages/admin/Enquiries').then((m) => ({ default: m.EnquiryList })));
const EnquiryDetail = lazy(() => import('./pages/admin/Enquiries').then((m) => ({ default: m.EnquiryDetail })));
const resource = (name) => lazy(() => import('./pages/admin/Resource').then((m) => ({ default: () => <m.default cfg={m.CONFIGS[name]}/> })));
const AdminProjects = resource('projects'), AdminServices = resource('services'), AdminTestimonials = resource('testimonials'), AdminPricing = resource('pricing'), AdminBlog = resource('blog');
const ForgotPassword = lazy(() => import('./pages/admin/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/admin/ResetPassword'));
const AdminSetup = lazy(() => import('./pages/admin/AdminSetup'));
const Team = lazy(() => import('./pages/admin/Team'));
const Activity = lazy(() => import('./pages/admin/Activity'));
const Account = lazy(() => import('./pages/admin/Account'));
const Loading = () => <p role="status" className="p-10 text-center text-cream/70">Loading…</p>;
export default function App() {
    useLiveContent();
    return (<Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />}/>
          <Route path="services" element={<Services />}/>
          <Route path="services/:slug" element={<ServiceDetail />}/>
          <Route path="work" element={<WorkList />}/>
          <Route path="work/:slug" element={<WorkDetail />}/>
          <Route path="about" element={<About />}/>
          <Route path="pricing" element={<Pricing />}/>
          <Route path="blog" element={<Blog />}/>
          <Route path="blog/:slug" element={<BlogPost />}/>
          <Route path="contact" element={<Contact />}/>
          <Route path="privacy-policy" element={<PrivacyPage />}/>
          <Route path="terms" element={<TermsPage />}/>
          <Route path="404" element={<NotFound />}/>
        </Route>
        <Route path="admin/login" element={<AdminLogin />}/>
        <Route path="admin/forgot-password" element={<ForgotPassword />}/>
        <Route path="admin/reset-password" element={<ResetPassword />}/>
        <Route path="admin/setup" element={<AdminSetup />}/>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />}/>
          <Route path="enquiries" element={<Guard area="enquiries"><EnquiryList /></Guard>}/>
          <Route path="enquiries/:id" element={<Guard area="enquiries"><EnquiryDetail /></Guard>}/>
          <Route path="projects" element={<Guard area="projects"><AdminProjects /></Guard>}/>
          <Route path="services" element={<Guard area="services"><AdminServices /></Guard>}/>
          <Route path="testimonials" element={<Guard area="testimonials"><AdminTestimonials /></Guard>}/>
          <Route path="pricing" element={<Guard area="pricing"><AdminPricing /></Guard>}/>
          <Route path="blog" element={<Guard area="blog"><AdminBlog /></Guard>}/>
          <Route path="settings" element={<Guard area="settings"><Settings /></Guard>}/>
          <Route path="team" element={<Guard area="super"><Team /></Guard>}/>
          <Route path="activity" element={<Guard area="super"><Activity /></Guard>}/>
          <Route path="account" element={<Account />}/>
          <Route path="*" element={<Navigate to="/admin" replace/>}/>
        </Route>
        <Route element={<Layout />}><Route path="*" element={<NotFound />}/></Route>
      </Routes>
    </Suspense>);
}
