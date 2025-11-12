import React from 'react';

const MapPinIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M12 2.25c-3.96 0-7.25 3.29-7.25 7.353 0 4.434 5.333 11.235 6.75 12.83a.75.75 0 001.002 0c1.417-1.595 6.75-8.396 6.75-12.83C19.25 5.543 15.96 2.25 12 2.25zM12 12a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
  </svg>
);

export default MapPinIcon;
