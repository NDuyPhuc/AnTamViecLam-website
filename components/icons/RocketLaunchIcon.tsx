import React from 'react';

const RocketLaunchIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.82m5.84-2.56a6 6 0 0 1-7.38 5.84m2.56-5.84a6 6 0 0 1 5.84-7.38m-5.84 2.56a6 6 0 0 1 7.38-5.84m-2.56 5.84a6 6 0 0 1-5.84 7.38m5.84-2.56a6 6 0 0 1-7.38 5.84m0-11.68a6 6 0 0 1 7.38-5.84m-7.38 5.84a6 6 0 0 1 5.84-7.38" />
  </svg>
);

export default RocketLaunchIcon;
