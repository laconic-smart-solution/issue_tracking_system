'use client';
import { useState } from 'react';
import { Ticket, TicketMessage } from '@/lib/types';
import { replyToTicket, getApiBaseUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { Lock, Send, MessageCircle, User2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  ticket: Ticket;
  onMessageSent: () => void;
}

function getBubbleStyle(msg: TicketMessage) {
  if (msg.is_internal_note) return 'bg-yellow-50 border border-yellow-200 text-yellow-900';
  if (msg.sender_type === 'AGENT') return 'bg-blue-600 text-white ml-auto';
  if (msg.sender_type === 'BOT') return 'bg-gray-100 text-gray-600';
  if (msg.sender_type === 'SYSTEM') return 'bg-gray-50 text-gray-500 text-center w-full text-xs italic';
  return 'bg-white border text-gray-800'; // CUSTOMER
}

function SenderLabel({ msg }: { msg: TicketMessage }) {
  const name = msg.sender_user_name || (msg.sender_type === 'CUSTOMER' ? '👤 Customer' : '');
  const icon = msg.sender_type === 'AGENT'
    ? <User2 className="w-3 h-3" />
    : msg.sender_type === 'BOT'
    ? <Bot className="w-3 h-3" />
    : null;

  return (
    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
      {icon}
      <span>{name}</span>
      <span>·</span>
      <span>{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
      {msg.is_internal_note && (
        <span className="flex items-center gap-0.5 text-yellow-600 font-medium ml-1">
          <Lock className="w-3 h-3" /> Internal Note
        </span>
      )}
    </div>
  );
}

export default function ChatPanel({ ticket, onMessageSent }: ChatPanelProps) {
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const API_URL = getApiBaseUrl();

  const messages = ticket.messages || [];

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await replyToTicket(ticket.id, reply.trim(), isInternal);
      setReply('');
      onMessageSent();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50">
        <MessageCircle className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">
          Conversation ({messages.length} messages)
        </span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={cn('flex flex-col max-w-[85%]', msg.sender_type === 'AGENT' ? 'ml-auto items-end' : '')}>
              <SenderLabel msg={msg} />
              <div className={cn('rounded-2xl px-3 py-2 text-sm', getBubbleStyle(msg))}>
                {msg.message_text}
              </div>
              {/* Attachments */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {msg.attachments.map(att => (
                    att.file_type?.startsWith('image/') ? (
                      <img
                        key={att.id}
                        src={`${API_URL}/uploads/${att.file_path.split('uploads/')[1]}`}
                        alt={att.file_name}
                        className="max-w-[200px] rounded-lg border cursor-pointer hover:opacity-90"
                        onClick={() => window.open(`${API_URL}/uploads/${att.file_path.split('uploads/')[1]}`, '_blank')}
                      />
                    ) : (
                      <a
                        key={att.id}
                        href={`${API_URL}/uploads/${att.file_path.split('uploads/')[1]}`}
                        className="text-xs text-blue-600 underline"
                        target="_blank"
                      >
                        📎 {att.file_name}
                      </a>
                    )
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator />

      {/* Reply Box */}
      <div className="p-4 bg-white">
        {/* Toggle: Public vs Internal */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setIsInternal(false)}
            className={cn('text-xs px-3 py-1 rounded-full border transition', !isInternal ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-500 border-gray-300')}
          >
            💬 Reply to LINE
          </button>
          <button
            onClick={() => setIsInternal(true)}
            className={cn('text-xs px-3 py-1 rounded-full border transition', isInternal ? 'bg-yellow-500 text-white border-yellow-500' : 'text-gray-500 border-gray-300')}
          >
            <Lock className="w-3 h-3 inline mr-1" /> Internal Note
          </button>
        </div>

        <Textarea
          value={reply}
          onChange={e => setReply(e.target.value)}
          placeholder={isInternal ? 'Write an internal team note (not sent to customer)...' : 'Write a reply — will be sent to customer\'s LINE Group...'}
          rows={3}
          className={cn('text-sm resize-none', isInternal ? 'bg-yellow-50 border-yellow-300' : '')}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSend(); }}
        />

        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-400">Ctrl+Enter to send</span>
          <Button size="sm" onClick={handleSend} disabled={sending || !reply.trim()} className="gap-2">
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : isInternal ? 'Save Note' : 'Send to LINE'}
          </Button>
        </div>
      </div>
    </div>
  );
}
