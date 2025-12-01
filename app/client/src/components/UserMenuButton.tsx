import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { UserSidebar } from './UserSidebar';

export const UserMenuButton: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-2 left-6 z-30 p-2 text-white hover:text-zinc-300 transition-colors"
        aria-label="User menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      <UserSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
};
