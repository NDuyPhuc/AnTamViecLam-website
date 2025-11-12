import React from 'react';

const BriefcaseIconSolid: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 2a2 2 0 00-2 2v1h4V4a2 2 0 00-2-2zM4 7v1h12V7a1 1 0 00-1-1H5a1 1 0 00-1 1zm0 3v7a1 1 0 001 1h10a1 1 0 001-1v-7H4z" clipRule="evenodd" />
  </svg>
);

export default BriefcaseIconSolid;