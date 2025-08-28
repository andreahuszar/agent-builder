'use client';

import AppLayout from '@/app/components/AppLayout';

interface HelpdeskContentProps {
  currentView?: string;
  currentModule?: string;
}

function HelpdeskContent({ currentView = 'inbox' }: HelpdeskContentProps) {
  return (
    <div className="w-full p-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        {currentView === 'inbox' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-950">Helpdesk Inbox</h1>
            <p className="mt-1 text-sm text-gray-800">Manage and respond to customer support tickets</p>
          </div>
        )}
        {currentView === 'kanban' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-950">Helpdesk Kanban</h1>
            <p className="mt-1 text-sm text-gray-800">Visualize and track ticket workflow</p>
          </div>
        )}
      </div>
      
      {/* Placeholder content area */}
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">
          {currentView === 'inbox' 
            ? 'Inbox view - Support tickets will appear here' 
            : 'Kanban board - Drag and drop tickets across columns'}
        </p>
      </div>
    </div>
  );
}

export default function HelpdeskPage() {
  return (
    <AppLayout activeModule="helpdesk">
      <HelpdeskContent />
    </AppLayout>
  );
}