'use client';

import React, { useState, useRef } from 'react';
import { FileText, ArrowLeftRight, FileCheck, Users, TrendingUp, Headphones, Settings } from 'lucide-react';

const Navigation = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsExpanded(true);
    }, 432);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsExpanded(false);
  };

  return (
    <div 
      className="w-16 relative flex-shrink-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Overlay container */}
      <div className={`${
        isExpanded ? 'fixed w-56 left-0 top-0 h-screen z-[9999] shadow-2xl' : 'sticky top-0 w-16 h-screen z-[9999]'
      } transition-all duration-300 ease-in-out flex flex-col bg-brand-gradient text-white`}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4">
        <a className="flex items-center" href="/">
          <img src="/xelix_logo_small.svg" alt="Xelix" className="w-8 h-8 flex-shrink-0" />
        </a>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col py-2 px-2">
        {/* Main navigation items */}
        <div className="flex-1 flex flex-col gap-1">
          {/* Invoice Processing - Active */}
        <a 
          className="flex items-center rounded-md bg-purple-900 transition-all duration-300 h-12 overflow-hidden"
          href="/"
        >
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-white" />
          </div>
          {isExpanded && (
            <span className="pr-3 whitespace-nowrap overflow-hidden font-medium">
              Invoice Processing
            </span>
          )}
        </a>

        {/* Transactions */}
        <a 
          className="flex items-center rounded-md hover:bg-purple-900/70 transition-all duration-300 h-12 overflow-hidden"
          href="#"
        >
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            <ArrowLeftRight className="h-5 w-5 text-white" />
          </div>
          {isExpanded && (
            <span className="pr-3 whitespace-nowrap overflow-hidden font-medium">
              Transactions
            </span>
          )}
        </a>

        {/* Statements */}
        <a 
          className="flex items-center rounded-md hover:bg-purple-900/70 transition-all duration-300 h-12 overflow-hidden"
          href="#"
        >
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            <FileCheck className="h-5 w-5 text-white" />
          </div>
          {isExpanded && (
            <span className="pr-3 whitespace-nowrap overflow-hidden font-medium">
              Statements
            </span>
          )}
        </a>

        {/* Vendors */}
        <a 
          className="flex items-center rounded-md hover:bg-purple-900/70 transition-all duration-300 h-12 overflow-hidden"
          href="#"
        >
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-white" />
          </div>
          {isExpanded && (
            <span className="pr-3 whitespace-nowrap overflow-hidden font-medium">
              Vendors
            </span>
          )}
        </a>

        {/* Reports */}
        <a 
          className="flex items-center rounded-md hover:bg-purple-900/70 transition-all duration-300 h-12 overflow-hidden"
          href="#"
        >
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          {isExpanded && (
            <span className="pr-3 whitespace-nowrap overflow-hidden font-medium">
              Reports
            </span>
          )}
        </a>

        {/* Helpdesk */}
        <a 
          className="flex items-center rounded-md hover:bg-purple-900/70 transition-all duration-300 h-12 overflow-hidden"
          href="#"
        >
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            <Headphones className="h-5 w-5 text-white" />
          </div>
          {isExpanded && (
            <span className="pr-3 whitespace-nowrap overflow-hidden font-medium">
              Helpdesk
            </span>
          )}
        </a>
        </div>
        
        {/* Bottom section with Settings */}
        <div className="border-t border-purple-800/50 pt-2 mt-2">
          <a 
            className="flex items-center rounded-md hover:bg-purple-900/70 transition-all duration-300 h-12 overflow-hidden"
            href="#"
          >
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
              <Settings className="h-5 w-5 text-white" />
            </div>
            {isExpanded && (
              <span className="pr-3 whitespace-nowrap overflow-hidden font-medium">
                Settings
              </span>
            )}
          </a>
        </div>
      </nav>
      </div>
    </div>
  );
};

export default Navigation;