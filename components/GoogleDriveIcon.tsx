
import React from 'react';

const GoogleDriveIcon: React.FC<{ className?: string; width?: number | string; height?: number | string }> = ({ className, width = 24, height = 24 }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={width}
        height={height}
        className={className}
        role="img"
        aria-label="Google Drive"
    >
        {/* Simplified 3-color Google Drive mark (left=blue, right=yellow, bottom=green) */}
        <polygon points="12,2 3,9.5 7.5,15.5 16.5,15.5" fill="#4285F4" />
        <polygon points="12,2 16.5,15.5 21,9.5" fill="#FBBC05" />
        <polygon points="7.5,15.5 16.5,15.5 12,22" fill="#34A853" />
    </svg>
);

export default GoogleDriveIcon;
