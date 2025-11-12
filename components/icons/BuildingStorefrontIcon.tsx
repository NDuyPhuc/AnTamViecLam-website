import React from 'react';

const BuildingStorefrontIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V11.25m0-1.01V8.25m0 5.25v5.25m0-5.25H4.5m7.5 0H19.5M3.75 11.25h16.5M4.5 21h15M3 11.25a.75.75 0 01.75-.75h16.5a.75.75 0 01.75.75v9a.75.75 0 01-.75.75H3.75a.75.75 0 01-.75-.75v-9z" />
  </svg>
);

export default BuildingStorefrontIcon;