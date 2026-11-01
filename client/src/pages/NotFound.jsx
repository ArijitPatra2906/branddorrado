import { Link } from 'react-router-dom';
import { container } from '../components/Section';
export default function NotFound() {
    return (<section className={`${container} py-28 text-center`}>
      <p className="eyebrow">404</p><h1 className="mt-4">Page not found.</h1>
      <p className="mx-auto mt-5 max-w-md text-cream/70">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="btn-gold mt-8">Back to home</Link>
    </section>);
}
