import React from 'react';

interface SpinnerProps {
  fullScreen?: boolean;
  message?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ fullScreen = false, message }) => {
  const containerClasses = fullScreen 
    ? "fixed inset-0 flex flex-col items-center justify-center bg-gray-50 z-50" 
    : "flex flex-col items-center justify-center";

  return (
    <div className={containerClasses}>
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-500"></div>
      {message && <p className="mt-4 text-lg font-semibold text-gray-700">{message}</p>}
    </div>
  );
};

export default Spinner;