import React from 'react';

const PageLoader = ({ text = "Cargando..." }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="mb-4 relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-[3px] border-gray-200"></div>
        <div className="absolute inset-0 rounded-full border-[3px] border-primary-600 border-t-transparent animate-spin"></div>
      </div>
      <p className="text-gray-500 font-medium">{text}</p>
    </div>
  );
};

export default PageLoader;
