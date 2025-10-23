'use client';

import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { User, Check } from 'lucide-react';

interface UserOption {
  id: string;
  name: string;
  initials: string;
}

const MOCK_USERS: UserOption[] = [
  { id: '1', name: 'Sarah Johnson', initials: 'SJ' },
  { id: '2', name: 'Michael Chen', initials: 'MC' },
  { id: '3', name: 'Emma Davis', initials: 'ED' },
  { id: '4', name: 'James Wilson', initials: 'JW' },
  { id: '5', name: 'Olivia Martinez', initials: 'OM' },
];

interface UserAssignmentDropdownProps {
  assignedUserName?: string | null;
  onAssignUser?: (userName: string | null) => void;
}

export function UserAssignmentDropdown({ assignedUserName, onAssignUser }: UserAssignmentDropdownProps) {
  // Get initials from assigned user name
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const currentUserInitials = assignedUserName ? getInitials(assignedUserName) : null;
  const isUnassigned = !assignedUserName || assignedUserName === 'Unassigned';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="h-9 w-9 rounded-full flex items-center justify-center transition-all hover:ring-2 hover:ring-purple-500 hover:ring-offset-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 bg-purple-100 text-purple-900"
          title={assignedUserName || 'Unassigned'}
        >
          {isUnassigned ? (
            <User className="h-4 w-4" />
          ) : (
            <span className="text-sm font-bold">
              {currentUserInitials}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[200px] bg-white rounded-md shadow-lg border border-gray-200 p-1 z-50"
          sideOffset={5}
          align="end"
        >
          {/* Unassign option */}
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-950 rounded cursor-pointer hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            onClick={() => onAssignUser?.(null)}
          >
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <span className="flex-1">Unassigned</span>
            {isUnassigned && <Check className="h-4 w-4 text-purple-900" />}
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

          {/* User options */}
          {MOCK_USERS.map((user) => {
            const isSelected = assignedUserName === user.name;
            return (
              <DropdownMenu.Item
                key={user.id}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-950 rounded cursor-pointer hover:bg-purple-50 focus:bg-purple-50 focus:outline-none"
                onClick={() => onAssignUser?.(user.name)}
              >
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-purple-900">{user.initials}</span>
                </div>
                <span className="flex-1">{user.name}</span>
                {isSelected && <Check className="h-4 w-4 text-purple-900" />}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
