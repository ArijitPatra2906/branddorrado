import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// A password field with a show/hide button. The field is hidden by default; the button is keyboard accessible and announces its state.
export function PasswordInput({ className = 'field', ...props }) {
    const [shown, setShown] = useState(false);
    return (<div className="relative">
      <input {...props} type={shown ? 'text' : 'password'} className={`${className} pr-12`}/>
      <button type="button" onClick={() => setShown((v) => !v)} aria-pressed={shown} aria-label={shown ? 'Hide password' : 'Show password'}
        className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-cream/70 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
        {shown ? <EyeOff size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}
      </button>
    </div>);
}
