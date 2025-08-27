'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TopNavigation = () => {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="flex-1 flex justify-start" aria-label="Tabs">
      <div className="flex space-x-2">
        <Link
          href="/"
          className={`${
            isActive('/')
              ? 'bg-purple-600 text-white'
              : 'text-gray-900 hover:text-gray-950 hover:bg-gray-100'
          } px-3 py-1.5 rounded-lg text-base font-medium transition-all duration-200`}
        >
          Workspace
        </Link>
        <Link
          href="/invoices"
          className={`${
            isActive('/invoices')
              ? 'bg-purple-600 text-white'
              : 'text-gray-900 hover:text-gray-950 hover:bg-gray-100'
          } px-3 py-1.5 rounded-lg text-base font-medium transition-all duration-200`}
        >
          Invoices
        </Link>
        <Link
          href="/purchase-orders"
          className={`${
            isActive('/purchase-orders')
              ? 'bg-purple-600 text-white'
              : 'text-gray-900 hover:text-gray-950 hover:bg-gray-100'
          } px-3 py-1.5 rounded-lg text-base font-medium transition-all duration-200`}
        >
          Purchase Orders
        </Link>
      </div>
    </nav>
  );
};

export default TopNavigation;