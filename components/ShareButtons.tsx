import React from 'react';
import { useToast } from '../hooks/useToast';

interface Props {
  url?: string;
  title?: string;
  text?: string;
  className?: string;
}

const ShareButtons: React.FC<Props> = ({ url, title = 'Check this out', text = '', className }) => {
  const { addToast } = useToast();

  const shareUrl = url || window.location.href;

  const handleNativeShare = async () => {
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title, text, url: shareUrl });
        addToast('Shared successfully', 'success');
      } catch (err) {
        // user cancelled or failed
        addToast('Share cancelled', 'info');
      }
    } else {
      addToast('Native share not supported on this device', 'info');
    }
  };

  const openWindow = (shareUrlStr: string) => {
    window.open(shareUrlStr, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  const onLinkedIn = () => openWindow(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(text)}`);
  const onX = () => openWindow(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`);
  const onReddit = () => openWindow(`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(title)}`);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      addToast('Link copied to clipboard', 'success');
    } catch (e) {
      addToast('Could not copy link', 'error');
    }
  };

  return (
    <div className={className ?? 'flex items-center space-x-2'}>
      <button
        aria-label="Share"
        onClick={handleNativeShare}
        className="px-3 py-2 rounded bg-slate-700 text-white text-sm"
        title="Share"
      >
        Share
      </button>

      <button aria-label="Share on LinkedIn" onClick={onLinkedIn} className="px-3 py-2 rounded hover:bg-slate-700 text-sm">
        in
      </button>

      <button aria-label="Share on X" onClick={onX} className="px-3 py-2 rounded hover:bg-slate-700 text-sm">
        X
      </button>

      <button aria-label="Share on Reddit" onClick={onReddit} className="px-3 py-2 rounded hover:bg-slate-700 text-sm">
        r/
      </button>

      <button aria-label="Copy link" onClick={copyLink} className="px-3 py-2 rounded hover:bg-slate-700 text-sm">
        Copy
      </button>
    </div>
  );
};

export default ShareButtons;
