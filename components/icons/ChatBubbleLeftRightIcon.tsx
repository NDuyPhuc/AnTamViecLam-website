import React from 'react';

const ChatBubbleLeftRightIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.722.28c-.85.064-1.649-.24-2.228-.796a4.425 4.425 0 01-1.16-3.197V8.511c0-.969.616-1.813 1.5-2.097L16.5 6.25l3.75 2.261zM3.75 14.25a2.25 2.25 0 002.25 2.25h3.75V15.75h-3.75a.75.75 0 01-.75-.75V8.25a.75.75 0 01.75-.75h3.75V6.75h-3.75a2.25 2.25 0 00-2.25 2.25v6z" />
  </svg>
);

export default ChatBubbleLeftRightIcon;
