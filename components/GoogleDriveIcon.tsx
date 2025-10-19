
import React from 'react';

const GoogleDriveIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className} 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        strokeWidth="2" 
        stroke="currentColor" 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
       <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
       <path d="M12 12l-3.5 -7l-7 0l3.5 7l7 0z"></path>
       <path d="M12 12l3.5 7l7 0l-3.5 -7l-7 0z"></path>
       <path d="M12 12l-6 0l-3.5 7l6 0"></path>
       <path d="M12 12l6 0l3.5 7l-6 0"></path>
    </svg>
);

export default GoogleDriveIcon;
