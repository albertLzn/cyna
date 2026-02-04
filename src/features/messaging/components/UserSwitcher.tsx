'use client';

import { useState, useEffect } from 'react';
import { DEMO_USERS } from '../domain/constants';
export function UserSwitcher() {
  const [currentUserId, setCurrentUserId] = useState<string>('1');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('currentUserId') || '1';
    setCurrentUserId(userId);
  }, []);

  const handleSwitch = (userId: string) => {
    localStorage.setItem('currentUserId', userId);
    localStorage.setItem('auth_token', `demo-token-${userId}`);
    
    setCurrentUserId(userId);
    
    window.location.reload();
  };

  const currentUser = DEMO_USERS.find(u => u.id === currentUserId) || DEMO_USERS[0];

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${currentUser.color} text-white px-4 py-2 rounded-lg shadow-lg font-medium hover:opacity-90 transition flex items-center gap-2`}
      >
        <span className="text-sm">Demo: {currentUser.name}</span>
        <span className="text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white border rounded-lg shadow-xl p-3 min-w-[200px]">
          <p className="text-xs font-semibold text-gray-500 mb-2 px-2">
            Switch User
          </p>
          <div className="space-y-1">
            {DEMO_USERS.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSwitch(user.id)}
                className={`w-full px-3 py-2 rounded text-left transition flex items-center gap-3 ${
                  currentUserId === user.id
                    ? `${user.color} text-white`
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{user.name}</div>
                  <div className="text-xs opacity-75">User ID: {user.id}</div>
                </div>
                {currentUserId === user.id && (
                  <span className="text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}