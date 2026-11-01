// Uses the supplied logo artwork as-is (never redrawn). Pick the variant by background.
const SRC = {
    'primary-light': '/logos/logo-primary-light.png', 'primary-dark': '/logos/logo-primary-dark.png',
    'horizontal-light': '/logos/logo-horizontal-light.png', 'horizontal-dark': '/logos/logo-horizontal-dark.png',
    symbol: '/logos/symbol.png',
    // Horizontal dark logo with its empty transparent margin trimmed (same artwork, same proportions).
    'wordmark-dark': '/logos/wordmark-dark.png',
};
export function Logo({ variant, className = 'h-10 w-auto' }) {
    return <img src={SRC[variant]} alt="BrandDorrado" className={className}/>;
}
