import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Send,
  Sparkles,
  RotateCcw,
  Zap,
  Clock,
  Building2,
  PartyPopper,
  Calendar,
} from 'lucide-react';
import ChatMessage from './ChatMessage';
import { useToast } from '../components/Toast';

const SAMPLE_QUERIES = [
  {
    category: 'Lookups',
    text: 'When is my next class?',
    icon: Calendar,
  },
  {
    category: 'Lookups',
    text: 'What classes do I have on Wednesday?',
    icon: Calendar,
  },
  {
    category: 'Lookups',
    text: 'What assignments do I have due this week?',
    icon: Clock,
  },
  {
    category: 'Lookups',
    text: 'Show me all high priority announcements.',
    icon: Zap,
  },
  {
    category: 'Events',
    text: 'What are the upcoming events on campus?',
    icon: PartyPopper,
  },
  {
    category: 'Multi-Source',
    text: "I'm free until 2 PM — is there anything on campus I could drop into?",
    icon: Sparkles,
  },
  {
    category: 'Multi-Source',
    text: 'Which labs have a projector and can fit at least 30 people?',
    icon: Building2,
  },
  {
    category: 'Action',
    text: 'Book Room 7A02 tomorrow from 3 PM to 5 PM.',
    icon: Building2,
  },
  {
    category: 'Action',
    text: 'Register me for the Guest Lecture on Deep Learning.',
    icon: PartyPopper,
  },
];

const CHAT_STORAGE_KEY = 'campusos_chat_history_v1';

const INITIAL_GREETING = {
  role: 'assistant',
  content:
    "👋 Hey there! I'm **CampusCopilot** — your real-time university AI assistant.\n\nI can check live class routines, list upcoming workshops & hackathons, find free labs with projectors, track assignments, reserve study rooms, and register you for events in real time.\n\n*What would you like to explore today?*",
  actions_taken: [],
  timestamp: 'Just now',
};

export default function ChatWidget({ isFullPage = false }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load chat history from localStorage', e);
    }
    return [INITIAL_GREETING];
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Persist messages in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save chat history to localStorage', e);
    }
  }, [messages]);

  const handleSend = async (messageText = inputMessage) => {
    const text = messageText.trim();
    if (!text || isLoading) return;

    // Append user message
    const userMsg = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Send clean, token-efficient history to backend
      const cleanHistoryForBackend = newHistory.slice(-10).map((m) => ({
        role: m.role,
        content: m.content || m.reply || '',
      }));

      // Call Member 2 / Member 3 backend endpoint
      const response = await api.sendAgentChat(text, cleanHistoryForBackend);

      // Invalidate relevant dashboard queries if actions modified database
      const hasMutation = (response.actions_taken && response.actions_taken.some((a) => {
        const name = (a.tool || a.name || '').toLowerCase();
        return name.includes('book') || name.includes('register') || name.includes('create') || name.includes('update') || name.includes('cancel');
      })) || Boolean(response.action_card);

      if (hasMutation) {
        queryClient.invalidateQueries();
        addToast({
          type: 'info',
          title: 'Database Updated by Agent',
          message: 'Live changes reflected across all dashboard sections.',
        });
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.reply,
          actions_taken: response.actions_taken || [],
          action_card: response.action_card || null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error contacting agent service: ${err.message || 'Unknown network error'}. Please ensure the backend server is running.`,
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    const resetState = [INITIAL_GREETING];
    setMessages(resetState);
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear chat history from localStorage', e);
    }
    addToast({
      type: 'info',
      title: 'Chat History Cleared',
      message: 'Started a fresh conversation with CampusCopilot AI.',
    });
  };

  return (
    <div
      className={`glass-card rounded-2xl flex flex-col h-full border border-emerald-200 dark:border-emerald-900/60 shadow-xl overflow-hidden transition-colors duration-300 bg-white ${
        isFullPage ? 'w-full flex-1' : 'h-[650px]'
      }`}
    >
      {/* Chat Window Header */}
      <div className="px-5 py-3.5 border-b border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-[#0a0a0a] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/25">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-black dark:text-white tracking-tight flex items-center gap-2">
              CampusCopilot AI
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h3>
            <p className="text-[11px] text-black/75 dark:text-emerald-400/80 font-medium">
              Live reasoning on 5 campus systems
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 1 && (
            <span className="hidden sm:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
              {messages.length - 1} {messages.length - 1 === 1 ? 'message' : 'messages'} stored
            </span>
          )}
          <button
            onClick={handleResetChat}
            className="p-1.5 px-2.5 rounded-lg text-black hover:text-rose-600 dark:text-emerald-300 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-emerald-100 dark:border-emerald-800/60 hover:border-rose-200 dark:hover:border-rose-800/60 transition flex items-center gap-1.5 text-xs font-semibold shadow-sm"
            title="Clear stored chat history"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2.5 bg-white dark:bg-[#0a0a0a] border-b border-emerald-100 dark:border-emerald-900/40 overflow-x-auto flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-black dark:text-emerald-400/70 shrink-0">
          Try:
        </span>
        {SAMPLE_QUERIES.map((sq, idx) => {
          const Icon = sq.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSend(sq.text)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap bg-white dark:bg-[#111111] text-black dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/60 transition shadow-sm"
            >
              <Icon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>{sq.text}</span>
            </button>
          );
        })}
      </div>

      {/* Messages History List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-white dark:bg-black">
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}

        {isLoading && (
          <div className="flex items-start gap-3 my-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-md">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="glass-card p-4 rounded-2xl rounded-tl-none border border-emerald-200 dark:border-emerald-800/80 text-xs text-black dark:text-emerald-200 flex items-center gap-2 font-medium bg-white dark:bg-[#0a0a0a]">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              </div>
              <span className="font-semibold text-black dark:text-emerald-300">
                Agent checking live database and reasoning...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <div className="p-4 border-t border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-[#0a0a0a]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask anything about classes, room availability, booking, or notices..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 placeholder-black/50 dark:placeholder-emerald-500/60 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm transition"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.03]"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
