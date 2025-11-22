
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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  // Wrap both the avatar button and its menu so outside click logic doesn't close before menu button handlers run
  const profileContainerRef = useRef<HTMLDivElement | null>(null);

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

  // Close profile menu on outside click / escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!showProfileMenu) return;
      if (profileContainerRef.current && !profileContainerRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowProfileMenu(false);
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [showProfileMenu]);

  const initial = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="bg-slate-800/60 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <nav className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3" ref={anchorRef}>
            <Logo />
          </div>
          <div className="flex items-center space-x-2">
            {/* Share button */}
            <button
              aria-label="Share"
              onClick={() => setShowSharePopover(v => !v)}
              className="hidden xs:inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-700 text-white hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              Share
            </button>
            <SharePopover visible={showSharePopover} onClose={() => setShowSharePopover(false)} url={window.location.href} />
            {/* Profile avatar button */}
            {user && (
              <div className="relative" ref={profileContainerRef}>
                <button
                  onClick={() => setShowProfileMenu(v => !v)}
                  aria-haspopup="true"
                  aria-expanded={showProfileMenu}
                  className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-teal-300 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                  title={user.email}
                >
                  {initial}
                </button>
                {showProfileMenu && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 origin-top-right rounded-md border border-slate-700 bg-slate-800 shadow-lg p-3 animate-fade-in z-20"
                  >
                    <div className="mb-2">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Signed in as</p>
                      <p className="text-sm font-medium text-slate-200 truncate" title={user.email}>{user.email}</p>
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={() => { handleEditProfile(); setShowProfileMenu(false); }}
                        className="w-full text-left px-3 py-2 rounded-md text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        Edit Profile
                      </button>
                      <button
                        onClick={() => { handleSignOut(); setShowProfileMenu(false); }}
                        className="w-full text-left px-3 py-2 rounded-md text-sm bg-teal-600 hover:bg-teal-500 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>
      </header>
      <main className="flex-grow container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
