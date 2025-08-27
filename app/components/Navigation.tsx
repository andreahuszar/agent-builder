'use client';

import React from 'react';
import { FileText, ArrowLeftRight, FileCheck, Users, TrendingUp, HelpCircle } from 'lucide-react';

const Navigation = () => {
  return (
    <div className="w-16 min-w-16 max-w-16 flex-shrink-0 flex flex-col bg-[linear-gradient(rgb(11,11,69)_0%,rgb(59,15,115)_52.08%,rgb(33,8,64)_100%)] text-white sticky top-0 h-screen">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center">
        <a className="flex items-center justify-center" href="/">
          <img src="/xelix_logo_small.svg" alt="Xelix" className="w-8 h-8" />
        </a>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col items-center py-4 gap-6">
        {/* Invoice Processing - Active */}
        <a 
          className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-900" 
          title="Invoice Processing" 
          href="/"
        >
          <FileText className="h-5 w-5 text-white" />
        </a>

        {/* Transactions */}
        <a 
          className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-purple-900 transition-all" 
          title="Transactions" 
          href="#"
        >
          <ArrowLeftRight className="h-5 w-5 text-white" />
        </a>

        {/* Statements */}
        <a 
          className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-purple-900 transition-all" 
          title="Statements" 
          href="#"
        >
          <FileCheck className="h-5 w-5 text-white" />
        </a>

        {/* Vendors */}
        <a 
          className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-purple-900 transition-all" 
          title="Vendors" 
          href="#"
        >
          <Users className="h-5 w-5 text-white" />
        </a>

        {/* Reports */}
        <a 
          className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-purple-900 transition-all" 
          title="Reports" 
          href="#"
        >
          <TrendingUp className="h-5 w-5 text-white" />
        </a>

        {/* Helpdesk */}
        <a 
          className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-purple-900 transition-all" 
          title="Helpdesk" 
          href="#"
        >
          <HelpCircle className="h-5 w-5 text-white" />
        </a>
      </nav>
    </div>
  );
};

export default Navigation;