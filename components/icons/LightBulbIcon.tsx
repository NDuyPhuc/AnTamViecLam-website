
import React from 'react';

const LightBulbIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.311a12.06 12.06 0 00-4.5 0m4.5 0a12.06 12.06 0 01-4.5 0M12 6.75a2.25 2.25 0 110-4.5 2.25 2.25 0 010 4.5zM12 12.75a2.25 2.25 0 110-4.5 2.25 2.25 0 010 4.5z" />
  </svg>
);

export default LightBulbIcon;
