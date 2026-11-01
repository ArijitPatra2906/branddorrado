export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: { extend: {
            colors: { gold: { DEFAULT: '#C89A3C', deep: '#A1731F' }, obsidian: '#111111', cream: '#F9F6EF' },
            fontFamily: { serif: ['"Cormorant Garamond"', 'Georgia', 'serif'], sans: ['Inter', 'system-ui', 'sans-serif'] },
            borderRadius: { card: '14px' },
            keyframes: { float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-14px)' } } },
            animation: { float: 'float 7s ease-in-out infinite' },
            backgroundImage: { 'gold-metal': 'linear-gradient(135deg,#E3B964 0%,#C89A3C 45%,#A1731F 100%)' },
        } },
};
