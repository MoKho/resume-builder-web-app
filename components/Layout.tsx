
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Logo from './Logo';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import SharePopover from './SharePopover';


interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    addToast('You have been signed out.', 'info');
    navigate('/auth');
  };

  const handleEditProfile = () => {
    navigate('/wizard/step-1');
  };

  const [showSharePopover, setShowSharePopover] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let timer: number | null = null;
    const handleDownloaded = () => {
      // show popover after 3s
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setShowSharePopover(true), 3000);
    };

    window.addEventListener('resume:downloaded', handleDownloaded as EventListener);
    return () => {
      window.removeEventListener('resume:downloaded', handleDownloaded as EventListener);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 relative" ref={anchorRef}>
            <Logo />
            {/* Share button near logo */}
            <button
              aria-label="Share"
              onClick={() => setShowSharePopover(v => !v)}
              className="hidden sm:inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-slate-700 text-white hover:bg-slate-600"
            >
              Share
            </button>
            <SharePopover visible={showSharePopover} onClose={() => setShowSharePopover(false)} url={window.location.href} />
          </div>
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-slate-400 hidden sm:block">{user.email}</span>
                <button onClick={handleEditProfile} className="px-4 py-2 text-sm font-medium text-slate-200 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors">
                  Edit Profile
                </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-500 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </nav>
      </header>
      <main className="flex-grow container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
