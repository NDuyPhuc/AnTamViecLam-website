import React from 'react';

const MotorcycleIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 16.5c0 1.242-1.008 2.25-2.25 2.25S16.5 17.742 16.5 16.5 17.508 14.25 18.75 14.25 21 15.258 21 16.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 16.5c0 1.242-1.008 2.25-2.25 2.25S3 17.742 3 16.5 4.008 14.25 5.25 14.25 7.5 15.258 7.5 16.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 16.5h9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 16.5v-4.5a1.5 1.5 0 011.5-1.5h1.5v-1.5H12a3 3 0 00-3 3v4.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9l2.25 3h3.75" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 6.75l-.75-1.5" />
  </svg>
);

export default MotorcycleIcon;