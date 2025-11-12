import React from 'react';

const ShieldCheckIconSolid: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M12.016 2.002c-5.523 0-9.984 4.47-9.984 9.998 0 3.803 2.12 7.126 5.234 8.786a.75.75 0 00.98-.103l.055-.065a.75.75 0 00-.03-1.06l-1.29-1.29a.75.75 0 01-.217-.53v-3.384a3.75 3.75 0 016.48-2.457.75.75 0 001.353-.646A3.75 3.75 0 0118 9.75v3.384a.75.75 0 01-.217.53l-1.29 1.29a.75.75 0 00-.03 1.06l.055.065a.75.75 0 00.98.103c3.113-1.66 5.234-4.983 5.234-8.786C22 6.472 17.539 2.002 12.016 2.002zM8.982 13.24a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.5-4.5a.75.75 0 00-1.06-1.06L10.5 14.94l-1.518-1.518z" clipRule="evenodd" />
  </svg>
);

export default ShieldCheckIconSolid;