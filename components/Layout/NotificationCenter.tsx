import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X, Sparkles, BookOpen, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { notificationsAPI } from '../../services/apiService';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose, onNavigate }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationsAPI.getNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleMarkRead = async (id: number) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div 
      ref={containerRef}
      className="absolute right-0 top-12 w-80 sm:w-96 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-[#0e121b] text-white border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#bbf451]" />
          <span className="text-xs font-bold font-display tracking-tight">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-[#bbf451] text-[#0e121b] text-[9.5px] font-black px-1.5 py-0.2 rounded-full font-mono">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 font-mono transition-colors cursor-pointer"
              title="Mark all as read"
            >
              <CheckCheck className="w-3 h-3 text-[#bbf451]" />
              <span>Mark all read</span>
            </button>
          )}
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 font-mono">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-mono">
            No notifications right now.
          </div>
        ) : (
          notifications.map(n => {
            const dateStr = n.createdAt ? new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            return (
              <div 
                key={n.id}
                onClick={() => !n.read && handleMarkRead(n.id)}
                className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                  n.read ? 'bg-white hover:bg-slate-50 opacity-75' : 'bg-slate-50/80 hover:bg-slate-100/70 border-l-2 border-[#bbf451]'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  n.type === 'agent' 
                    ? 'bg-purple-100 text-purple-700' 
                    : n.type === 'system' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-blue-100 text-blue-700'
                }`}>
                  {n.type === 'agent' ? <Sparkles className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h5 className="text-xs font-bold text-slate-900 truncate">
                      {n.title}
                    </h5>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-[#bbf451] shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug line-clamp-2 font-medium">
                    {n.message}
                  </p>
                  <span className="text-[9.5px] text-slate-400 font-mono mt-1 block">
                    {dateStr}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-center">
        <span className="text-[10px] text-slate-400 font-mono">
          QuantumGuard AI Notification Hub
        </span>
      </div>
    </div>
  );
};
