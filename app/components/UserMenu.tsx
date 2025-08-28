'use client';

import React from 'react';
import { LogOut, Shield } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
}

const UserMenu = () => {
  // Mock user data for now
  const user: User = {
    id: '1',
    username: 'Caroline',
    email: 'caroline@example.com',
    isAdmin: false,
  };

  const initial = user.username.charAt(0).toUpperCase();

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const handleAdminDashboard = () => {
    console.log('Admin dashboard clicked');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex size-9 items-center justify-center rounded-full text-base font-medium text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            user.isAdmin 
              ? 'bg-gradient-to-br from-pink-500 to-pink-700 hover:from-pink-600 hover:to-pink-800 focus:ring-pink-500' 
              : 'bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 focus:ring-purple-500'
          }`}
          title={user.username}
          aria-label={`User menu for ${user.username}`}
          aria-expanded="false"
          aria-haspopup="menu"
        >
          {initial}
          <span className="sr-only">{user.username}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.username}</p>
            <p className="text-xs leading-none text-gray-500">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-200" />
        {user.isAdmin && (
          <>
            <DropdownMenuItem 
              onClick={handleAdminDashboard}
              className="cursor-pointer hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900"
            >
              <Shield className="mr-2 size-4" />
              <span>Admin Dashboard</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-200" />
          </>
        )}
        <DropdownMenuItem 
          onClick={handleLogout}
          className="cursor-pointer hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900"
        >
          <LogOut className="mr-2 size-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;