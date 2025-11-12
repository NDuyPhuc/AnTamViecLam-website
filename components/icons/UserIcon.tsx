
import React from 'react';

const UserIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
    <div className={`flex items-center justify-center rounded-full bg-blue-500 text-white ${className}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
    </div>
);

export default UserIcon;
