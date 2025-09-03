'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ChevronDown, 
  RefreshCw, 
  Filter, 
  Download, 
  ChevronRight,
  MoreHorizontal,
  Reply,
  Forward,
  Paperclip,
  Clock,
  User,
  Plus,
  Users,
  Calendar,
  Search,
  Bell,
  HelpCircle,
  Settings,
  LogOut,
  X,
  Menu,
  PanelRightOpen,
  FileText
} from 'lucide-react';

export function HelpdeskInboxClient() {
  const [selectedTicket, setSelectedTicket] = useState(0);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
  const [showInboxList, setShowInboxList] = useState(true);
  const [screenWidth, setScreenWidth] = useState(1440);
  const [expandedSections, setExpandedSections] = useState<string[]>(['items']);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
      // Auto-hide inbox list on small screens
      if (window.innerWidth < 768) {
        setShowInboxList(false);
      } else {
        setShowInboxList(true);
      }
    };

    // Set initial width
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tickets = [
    {
      id: 1,
      sender: 'Accounts Payable Team Enea; #388867',
      email: 'accounts.receivable@murray-farrell-and-wall.com',
      subject: 'Invoice #ASA199_73778 Issued on 16/08/25',
      preview: 'Dear Genpact Demo, We are sending Invoice #ASA199_73778, issued on 16/08/25, for your records. Kindly process payment before 09/11/25.',
      time: '30/08/2025 at 00:25',
      status: 'New',
      tag: '#388867',
      tagColor: 'text-[#2563EB]',
      badge: 'Invoice',
      badgeColor: 'bg-green-100 text-green-800',
      unread: 1,
      hasAttachment: true
    },
    {
      id: 2,
      sender: 'João Raphael Titão Vale',
      department: 'Extrato de Conta',
      subject: 'Exmo. Departamento de Contas a Pagar, Encontra-se...',
      time: 'Today at 09:09',
      status: 'New',
      tag: '#388975',
      tagColor: 'text-[#2563EB]',
      badge: 'Reminder',
      badgeColor: 'bg-yellow-100 text-yellow-800',
      unread: 1,
      hasAttachment: true
    },
    {
      id: 3,
      sender: 'Li Zhiming',
      department: '账户对账单',
      subject: '你好，应付账款部门。请查收附件中您最新的账...',
      time: 'Today at 09:09',
      status: 'New',
      tag: '#388969',
      tagColor: 'text-[#2563EB]',
      badge: 'Reminder',
      badgeColor: 'bg-yellow-100 text-yellow-800',
      unread: 1
    },
    {
      id: 4,
      sender: 'Aaron Bern',
      department: 'Overdue Invoices',
      subject: 'Hello, What is the status of the following outstand...',
      time: 'Today at 09:09',
      status: 'New',
      tag: '#388866',
      tagColor: 'text-[#2563EB]',
      badge: 'Invoice',
      badgeColor: 'bg-green-100 text-green-800',
      unread: 1
    },
    {
      id: 5,
      sender: 'William Bensley',
      department: '',
      subject: '',
      time: '',
      status: '',
      tag: '',
      tagColor: '',
      badge: '',
      badgeColor: '',
      unread: 0
    }
  ];

  return (
    <div className="h-full w-full bg-white flex flex-col overflow-hidden">
      {/* Mobile Toggle Button */}
      {screenWidth < 768 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
          <button
            onClick={() => setShowInboxList(!showInboxList)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              showInboxList ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {showInboxList ? 'Hide' : 'Show'} Inbox List
          </button>
        </div>
      )}
      
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden w-full">
        {/* Inbox List */}
        <div className={`${
          showInboxList ? 'flex' : 'hidden'
        } ${screenWidth < 768 ? 'absolute left-0 top-0 bottom-0 z-20 w-full' : 'w-80'}
        bg-gray-50 border-r border-gray-200 flex-col flex-shrink-0`}>
          {/* Inbox Header */}
          <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4">
            <span className="text-gray-900 font-medium text-[15px]">Inbox</span>
          </div>

          {/* Toolbar */}
          <div className="h-11 bg-white border-b border-gray-200 flex items-center justify-between px-3">
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-gray-100 rounded">
                <Users className="h-4 w-4 text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded">
                <Clock className="h-4 w-4 text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded">
                <Search className="h-4 w-4 text-gray-600" />
              </button>
              <button className="px-2.5 py-1.5 bg-[#4F46E5] text-white rounded-md flex items-center gap-1.5 text-[13px] font-medium">
                <Filter className="h-3.5 w-3.5" />
                All
              </button>
            </div>
            <div className="flex items-center gap-1">
              <input 
                type="checkbox" 
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                checked={selectAll}
                onChange={(e) => setSelectAll(e.target.checked)}
              />
              <span className="text-[13px] text-gray-600 ml-1.5">Select all</span>
              <button className="ml-3 p-1.5 hover:bg-gray-100 rounded">
                <RefreshCw className="h-4 w-4 text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded">
                <Download className="h-4 w-4 text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded">
                <Filter className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Older Section */}
          <div className="px-3 py-1.5 bg-white flex items-center gap-1 text-[13px] text-gray-600 border-b border-gray-100">
            <ChevronDown className="h-3.5 w-3.5" />
            <span className="font-medium">Older</span>
          </div>

          {/* Ticket List */}
          <div className="flex-1 overflow-y-auto bg-white">
            {tickets.slice(0, 4).map((ticket, index) => (
              <div
                key={ticket.id}
                className={`border-b border-gray-100 px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${
                  selectedTicket === index ? 'bg-blue-50 border-l-4 border-l-[#4F46E5]' : ''
                }`}
                onClick={() => setSelectedTicket(index)}
              >
                <div className="flex items-start gap-2">
                  <input 
                    type="checkbox" 
                    className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500" 
                    checked={selectedTickets.includes(ticket.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTickets([...selectedTickets, ticket.id]);
                      } else {
                        setSelectedTickets(selectedTickets.filter(id => id !== ticket.id));
                      }
                    }}
                  />
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-[13px] text-gray-900">
                            {ticket.sender}
                          </span>
                          {ticket.hasAttachment && (
                            <Paperclip className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                        {ticket.department && (
                          <div className="text-[11px] text-gray-500 mb-0.5">{ticket.department}</div>
                        )}
                        <div className="text-[13px] text-gray-600 truncate leading-tight">{ticket.subject}</div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-[11px] text-gray-500 whitespace-nowrap">{ticket.time}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`px-2 py-0.5 text-[11px] rounded-full font-medium ${ticket.badgeColor}`}>
                        {ticket.badge}
                      </span>
                      <span className="px-1.5 py-0.5 text-[11px] bg-purple-100 text-purple-700 rounded-full font-medium">
                        +1
                      </span>
                      <span className={`text-[11px] ${ticket.tagColor}`}>
                        {ticket.tag} - {ticket.status}
                      </span>
                      {ticket.unread > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[11px] font-medium rounded-full h-4 w-4 flex items-center justify-center">
                          {ticket.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Last ticket item (partial view) */}
            <div className="border-b border-gray-100 px-3 py-2.5 opacity-40">
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1 rounded border-gray-300" disabled />
                <div className="flex-1">
                  <div className="font-medium text-[13px] text-gray-900">William Bensley</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="h-11 bg-white border-t border-gray-200 flex items-center justify-between px-3">
            <div className="flex items-center gap-1 text-[13px] text-gray-600">
              <span className="font-medium">2287</span>
              <span>tickets (5593 messages)</span>
            </div>
            <button className="px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-medium rounded-md flex items-center gap-1.5 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
              Generate Reply
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Main Content - Always visible */}
        <div className="flex-1 bg-white flex flex-col min-w-0 overflow-hidden">
          {/* Ticket Header */}
          <div className="border-b border-gray-200">
            <div className="px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-[13px] text-gray-600">
                    Ticket <span className="text-[#2563EB] font-medium cursor-pointer hover:underline">#389688</span>
                  </span>
                  <span className="text-[13px] text-gray-400">•</span>
                  <span className="text-[13px] text-gray-600">30/08/2025 at 00:25</span>
                  <span className="text-[13px] text-gray-400">•</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FEF3FF] text-[#9333EA] text-[12px] rounded-md font-semibold">
                    <span className="text-[14px]">🎯</span> Focused
                  </span>
                </div>
              </div>
              <h2 className="text-[16px] font-semibold text-gray-900 mt-1.5">
                Invoice #ASA199_73778 Issued on 16/08/25
              </h2>
            </div>
            
            {/* Field Row */}
            <div className="px-6 pb-2.5 flex flex-wrap items-center gap-3 text-[13px]">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">State</span>
                <button className="flex items-center gap-1 text-[#7C3AED] font-medium">
                  Complete
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Priority</span>
                <button className="flex items-center gap-1 text-[#EA580C] font-medium">
                  <span className="text-[14px]">🔥</span> Medium
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Categories</span>
                <button className="flex items-center gap-1 text-[#7C3AED] font-medium">
                  Invoice
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Assignee</span>
                <button className="flex items-center gap-1 text-[#7C3AED] font-medium">
                  CE
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Source</span>
                <button className="flex items-center gap-1 text-gray-500">
                  Select an option
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Vendors</span>
                <button className="flex items-center gap-1 text-[#7C3AED] font-semibold">
                  Lewis and Sons
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Email Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                <span className="text-[12px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium">
                  Inbox
                </span>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold text-[14px] text-gray-900">Murray, Farrell and Wall</div>
                    <div className="text-[13px] text-gray-500">&lt;accounts.receivable@murray-farrell-and-wall.com&gt;</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 hover:bg-gray-200 rounded">
                      <Reply className="h-4 w-4 text-gray-600" />
                    </button>
                    <button className="p-1.5 hover:bg-gray-200 rounded">
                      <Forward className="h-4 w-4 text-gray-600" />
                    </button>
                    <button className="p-1.5 hover:bg-gray-200 rounded">
                      <MoreHorizontal className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                <div className="text-[13px] text-gray-600">
                  To: ap.queries@genpact-demo.com
                </div>
                <div className="text-[13px] text-gray-600">
                  Subject: Invoice #ASA199_73778 Issued on 16/08/25
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  30/08/2025 at 00:25
                </div>
              </div>

              <div className="text-[13px] text-gray-700 leading-relaxed">
                Dear Genpact Demo, We are sending Invoice #ASA199_73778, issued on 16/08/25, for your records.
                Kindly process payment before 09/11/25.
              </div>
            </div>
          </div>

          {/* Generate Summary Button */}
          <div className="border-t border-gray-200 px-4 py-3">
            <button className="text-[#7C3AED] text-[13px] font-medium flex items-center gap-1.5 hover:text-[#6D28D9] transition-colors">
              Generate Summary
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Right Panel - Always visible except on mobile */}
        <div className={`${
          screenWidth < 768 ? 'hidden' : 'flex'
        } w-72 bg-white border-l border-gray-200 flex-col flex-shrink-0`}>
          {/* Tabs */}
          <div className="border-b border-gray-200 bg-white">
            <div className="flex">
              <button className="relative flex-1 px-4 py-2.5 text-[13px] font-semibold text-[#7C3AED]">
                Activity
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#7C3AED]"></span>
              </button>
              <button className="flex-1 px-4 py-2.5 text-[13px] font-medium text-gray-500 hover:text-gray-700">
                Comments (0)
              </button>
            </div>
          </div>


          {/* Activity Content */}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="py-3">
              {/* Items Section */}
              <div>
                <div 
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setExpandedSections(prev => 
                      prev.includes('items') 
                        ? prev.filter(s => s !== 'items')
                        : [...prev, 'items']
                    );
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-[14px] font-medium text-gray-900 flex items-center gap-1.5">
                      <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                        expandedSections.includes('items') ? '' : '-rotate-90'
                      }`} />
                      <span>Items</span>
                    </h3>
                    <span className="bg-purple-100 text-purple-700 text-[12px] font-semibold px-2 py-0.5 rounded-full min-w-[22px] text-center">
                      1
                    </span>
                  </div>
                </div>
                {expandedSections.includes('items') && (
                  <div className="px-4 py-2 border-l-2 border-gray-100 ml-4">
                    <Link 
                      href="/invoices/11100001-1111-1111-1111-111111111111"
                      className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-red-500" />
                          <span className="text-[13px] font-semibold text-purple-600">
                            Invoice #INV-2024-0001
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500">
                          01/12/24
                        </span>
                      </div>
                      <div className="text-[12px] text-gray-600 mb-2">
                        Acme Office Supplies
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-gray-900">
                          $4,860.00
                        </span>
                        <span className="text-[11px] px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                          Processing
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <span className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">
                          View Invoice Details →
                        </span>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              {/* Vendor Record Updates Section */}
              <div 
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setExpandedSections(prev => 
                    prev.includes('vendor') 
                      ? prev.filter(s => s !== 'vendor')
                      : [...prev, 'vendor']
                  );
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-medium text-gray-900 flex items-center gap-1.5 whitespace-nowrap">
                    <ChevronDown className={`h-3.5 w-3.5 text-gray-400 flex-shrink-0 transition-transform ${
                      expandedSections.includes('vendor') ? '' : '-rotate-90'
                    }`} />
                    <span>Vendor Record Updates</span>
                  </h3>
                  <span className="bg-purple-100 text-purple-700 text-[12px] font-semibold px-2 py-0.5 rounded-full min-w-[22px] text-center">
                    0
                  </span>
                </div>
              </div>

              {/* Activity Section */}
              <div 
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setExpandedSections(prev => 
                    prev.includes('activity') 
                      ? prev.filter(s => s !== 'activity')
                      : [...prev, 'activity']
                  );
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-medium text-gray-900 flex items-center gap-1.5">
                    <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                      expandedSections.includes('activity') ? '' : '-rotate-90'
                    }`} />
                    <span>Activity</span>
                  </h3>
                  <span className="bg-purple-100 text-purple-700 text-[12px] font-semibold px-2 py-0.5 rounded-full min-w-[22px] text-center">
                    0
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="border-t border-gray-200 px-3 py-2 bg-white flex justify-end gap-1">
            <button className="p-2 hover:bg-gray-100 rounded transition-colors">
              <MoreHorizontal className="h-4 w-4 text-gray-500" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded transition-colors">
              <Download className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}