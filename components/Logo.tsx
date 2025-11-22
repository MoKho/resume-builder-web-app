
import { Link } from 'react-router-dom';

const Logo = () => (
    <Link to="/" className="flex items-center space-x-2 hover:opacity-90 select-none">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 sm:h-8 sm:w-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="font-bold text-slate-100 tracking-tight">
            <span className="text-xl sm:hidden">P-Q</span>
            <span className="hidden sm:inline text-2xl">P-Q</span>
        </span>
    </Link>
);

export default Logo;
