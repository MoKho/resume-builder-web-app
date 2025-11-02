import React from 'react';
import ShareButtons from './ShareButtons';

interface Props {
  visible: boolean;
  onClose: () => void;
  url?: string;
}

const SharePopover: React.FC<Props> = ({ visible, onClose, url }) => {
  if (!visible) return null;

  return (
    <div className="absolute left-0 top-full mt-2 z-30">
      <div className="w-72 bg-slate-800 border border-slate-700 rounded-md shadow-lg p-4 text-slate-100">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-sm font-semibold">Share P-Q</h4>
            <p className="text-xs text-slate-300 mt-1">Loved P-Q? Share it with friends — they'd thank you! We do too! :D</p>
          </div>
          <button aria-label="Close share" onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-200">
            ×
          </button>
        </div>

        <div className="mt-3">
          <ShareButtons url={url} title="P-Q | Job Application Assistant" text="Check out P-Q. It helped me tailor my resume for job applications!" />
        </div>
      </div>
    </div>
  );
};

export default SharePopover;
