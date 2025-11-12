import React from 'react';

const ChatBubbleIconSolid: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.352 0 9.75-4.348 9.75-9.75S17.352 2.25 12 2.25 2.25 6.598 2.25 12c0 1.752.47 3.419 1.305 4.804l-1.125 4.498a.75.75 0 00.916.916l4.498-1.125zM8.25 12a.75.75 0 01.75-.75h.01a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75zm3.75 0a.75.75 0 01.75-.75h.01a.75.75 0 010 1.5H12.75a.75.75 0 01-.75-.75zm3-1.5a.75.75 0 000 1.5h.01a.75.75 0 000-1.5H15z" clipRule="evenodd" />
  </svg>
);

export default ChatBubbleIconSolid;