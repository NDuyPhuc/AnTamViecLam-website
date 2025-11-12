
import React from 'react';

const BotIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
    <div className={`flex items-center justify-center rounded-full bg-indigo-500 text-white ${className}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V5a1 1 0 00-1.447-.894l-4 2A1 1 0 0011 7v10zM4 17a1 1 0 001.447.894l4-2A1 1 0 0010 15V5a1 1 0 00-1.447-.894l-4 2A1 1 0 004 7v10z" />
        </svg>
    </div>
);

export default BotIcon;
