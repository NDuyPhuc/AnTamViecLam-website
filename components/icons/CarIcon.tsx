import React from 'react';

const CarIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0h1.5M15.75 18.75a1.5 1.5 0 01-3 0m3 0h1.5m-9-1.5H5.625c-.621 0-1.125-.504-1.125-1.125V11.25c0-.621.504-1.125 1.125-1.125h12.75c.621 0 1.125.504 1.125 1.125v4.875c0 .621-.504 1.125-1.125 1.125H12M5.25 12.75v-1.5m13.5 1.5v-1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 12.75h13.5m-13.5 0a3 3 0 003 3h7.5a3 3 0 003-3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 9.75h13.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4.5l-2.25 2.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 4.5l2.25 2.25" />
  </svg>
);

export default CarIcon;