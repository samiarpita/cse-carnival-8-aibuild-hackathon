import React from 'react';
import { User, Bot, Wrench } from 'lucide-react';
import ActionCard from './ActionCard';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const actionsTaken = message.actions_taken || [];
  const actionCard = message.action_card;

  const renderFormattedText = (text) => {
    if (!text) return null;

    const paragraphs = text.split('\n\n');

    return (
      <div className="space-y-2 leading-relaxed">
        {paragraphs.map((p, pIdx) => {
          if (p.startsWith('- ') || p.includes('\n- ')) {
            const items = p.split('\n').filter((l) => l.trim().startsWith('- '));
            return (
              <ul key={pIdx} className="space-y-1 my-2 list-none pl-1">
                {items.map((item, iIdx) => {
                  const content = item.replace(/^- /, '');
                  return (
                    <li key={iIdx} className="flex items-start gap-2 text-xs sm:text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                      <span dangerouslySetInnerHTML={{ __html: formatBoldAndCode(content) }} />
                    </li>
                  );
                })}
              </ul>
            );
          }

          if (p.startsWith('> ')) {
            return (
              <blockquote
                key={pIdx}
                className="p-2.5 rounded-xl bg-white dark:bg-emerald-950/60 border-l-4 border-emerald-500 text-xs text-black dark:text-emerald-200 italic font-medium"
                dangerouslySetInnerHTML={{ __html: formatBoldAndCode(p.replace(/^>\s*/, '')) }}
              />
            );
          }

          return (
            <p
              key={pIdx}
              className="text-xs sm:text-sm whitespace-pre-line text-black dark:text-emerald-50"
              dangerouslySetInnerHTML={{ __html: formatBoldAndCode(p) }}
            />
          );
        })}
      </div>
    );
  };

  const formatBoldAndCode = (str) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-black dark:text-white">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white dark:bg-[#0a0a0a] border border-emerald-200 dark:border-emerald-800 text-black dark:text-emerald-300 font-mono text-xs">$1</code>');
  };

  return (
    <div
      className={`flex items-start gap-3.5 my-4 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      } animate-in fade-in duration-200`}
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
          isUser
            ? 'bg-emerald-700 text-white shadow-emerald-700/25'
            : 'bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white shadow-emerald-600/25'
        }`}
      >
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      {/* Message Bubble Container */}
      <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Author Label & Timestamp */}
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-[11px] font-bold text-black dark:text-emerald-400/80">
            {isUser ? 'You (Student)' : 'CampusCopilot AI'}
          </span>
          <span className="text-[10px] text-black/70 dark:text-emerald-500/60 font-mono">
            {message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Bubble */}
        <div
          className={`p-4 sm:p-5 rounded-2xl shadow-sm ${
            isUser
              ? 'bg-emerald-600 text-white rounded-tr-none shadow-emerald-600/20'
              : 'glass-card border border-emerald-200 dark:border-emerald-800/80 text-black dark:text-emerald-50 rounded-tl-none bg-white dark:bg-[#0a0a0a]'
          }`}
        >
          {/* Tool Calls Inspector Badge */}
          {!isUser && actionsTaken.length > 0 && (
            <div className="mb-3 pb-2.5 border-b border-emerald-100 dark:border-emerald-800/60 flex flex-wrap gap-1.5">
              {actionsTaken.map((action, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60"
                >
                  <Wrench className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  tool: {action.tool || action.name || action.type}
                </span>
              ))}
            </div>
          )}

          {/* Formatted Text Content */}
          {renderFormattedText(message.content || message.reply)}

          {/* Action Card Rendering */}
          {actionCard && <ActionCard card={actionCard} />}
        </div>
      </div>
    </div>
  );
}
