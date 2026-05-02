"use client";
import { useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Toast } from '@/components/ui/custom/Toast';
import type { Inquiry } from '@/types';

export function AdminInbox() {
  const { fetchInquiries, updateInquiryStatus, deleteInquiry } = useDatabase();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState<Inquiry | null>(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  const loadInquiries = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchInquiries();
      setInquiries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchInquiries]);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  const handleRead = async (msg: Inquiry) => {
    setSelectedMsg(msg);
    if (msg.status === 'new') {
      await updateInquiryStatus(msg.id, 'read');
      loadInquiries();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this message?')) return;
    await deleteInquiry(id);
    setSelectedMsg(null);
    setToast({ show: true, message: 'Message deleted' });
    loadInquiries();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'read': return 'bg-slate-100 text-slate-600';
      case 'replied': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col sm:flex-row gap-6">
      {/* Sidebar - Message List */}
      <div className="w-full sm:w-80 lg:w-96 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden shrink-0">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Icon name="inbox" size={24} className="text-emerald-500" />
            Inbox
          </h1>
          <button onClick={loadInquiries} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors">
            <Icon name="refresh-cw" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {isLoading ? (
            <div className="py-20 text-center">
              <Icon name="loader-2" size={32} className="animate-spin text-emerald-500 mx-auto" />
            </div>
          ) : inquiries.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {inquiries.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => handleRead(msg)}
                  className={`w-full p-6 text-left hover:bg-slate-50 transition-colors border-l-4 ${
                    selectedMsg?.id === msg.id ? 'bg-emerald-50/50 border-emerald-500' : 
                    msg.status === 'new' ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(msg.status)}`}>
                      {msg.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className={`font-bold text-slate-900 truncate mb-1 ${msg.status === 'new' ? 'font-black' : ''}`}>
                    {msg.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium truncate">{msg.subject}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400">
              <Icon name="mail-x" size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold uppercase text-[10px] tracking-widest">Inbox is empty</p>
            </div>
          )}
        </div>
      </div>

      {/* Main View - Message Content */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {selectedMsg ? (
            <m.div
              key={selectedMsg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{selectedMsg.subject}</h2>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs">
                        {selectedMsg.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-700">{selectedMsg.name}</span>
                    </div>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500 font-medium">{selectedMsg.email}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleDelete(selectedMsg.id)}
                    className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors"
                  >
                    <Icon name="trash-2" size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-8 overflow-y-auto bg-slate-50/30">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 prose prose-slate max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-700 font-medium">
                    {selectedMsg.message}
                  </p>
                </div>
                
                <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
                  <Icon name="info" className="text-blue-500 shrink-0 mt-1" size={20} />
                  <div>
                    <p className="text-sm font-bold text-blue-900 mb-1">Reply via Email</p>
                    <p className="text-xs text-blue-700">
                      Copy the user's email address and reply directly from your admin email to maintain conversation history.
                    </p>
                    <button 
                      onClick={() => window.location.href = `mailto:${selectedMsg.email}?subject=Re: ${selectedMsg.subject}`}
                      className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/10"
                    >
                      Open Mail Client
                    </button>
                  </div>
                </div>
              </div>
            </m.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6">
                <Icon name="mail-open" size={48} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Select a message</h3>
              <p className="text-slate-400 max-w-xs mx-auto">Choose a message from the sidebar to read the full content and details.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <Toast show={toast.show} message={toast.message} onClose={() => setToast({ ...toast, show: false })} />
    </div>
  );
}
