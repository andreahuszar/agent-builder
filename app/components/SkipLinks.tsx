'use client';

import React from 'react';

const SkipLinks = () => {
  return (
    <div className="absolute left-0 top-0 z-[10000]">
      <a 
        href="#main-content" 
        className="skip-link"
      >
        Skip to main content
      </a>
      <a 
        href="#main-navigation" 
        className="skip-link"
      >
        Skip to navigation
      </a>
    </div>
  );
};

export default SkipLinks;