import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
function ScrollManager() {
    const { pathname, hash } = useLocation();
    useEffect(() => {
        if (hash) {
            requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
        }
        else
            window.scrollTo(0, 0);
    }, [pathname, hash]);
    return null;
}
export function Layout() {
    return (<>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:text-obsidian">Skip to content</a>
      <ScrollManager />
      <Header />
      <main id="main"><Outlet /></main>
      <Footer />
    </>);
}
