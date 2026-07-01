'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { MessageSquare, Send, X, Sparkles, ArrowUpRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ArchieAssistant() {
  const router = useRouter();
  const { currentUser, currentRole } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message when role changes
  useEffect(() => {
    if (!currentUser) return;
    const name = currentUser.name.split(' ')[0];
    let welcome = '';

    if (currentRole === 'principal') {
      welcome = `Hi ${name}, I'm **Archie**! As a Principal, I can guide you on signing off drawings in the **Design Vault**, checking workloads in [Crews & Workloads](/dashboard/teams), or managing mandates in the [Projects Ledger](/dashboard/projects). How can I assist you today?`;
    } else if (currentRole === 'senior') {
      welcome = `Hi ${name}, I'm **Archie**! As a Senior Lead, I can help you find drawings to review on the [Task Board](/dashboard/tasks), guide you on dropping coordinate pin packages in the **CAD Workspace**, or check team allocations. How can I help you today?`;
    } else if (currentRole === 'junior') {
      welcome = `Hi ${name}, I'm **Archie**! As a Junior, I can show you how to submit tasks on the [Task Board](/dashboard/tasks), upload drafts in the project **Design Vault**, or flag blocking issues. What are we drafting today?`;
    } else {
      welcome = `Hi ${name}, I'm **Archie**! As an Admin, I can guide you to the immutable [Audit Trail](/dashboard/audit) or show you how to reset the sandbox data in [Settings](/dashboard/settings). How can I assist you?`;
    }

    setMessages([
      { role: 'assistant', content: welcome }
    ]);
  }, [currentUser, currentRole]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  if (!currentUser) return null;

  // Suggestion chips based on user role
  const getSuggestions = () => {
    if (currentRole === 'principal') {
      return [
        'How do I sign off on a drawing?',
        'Where do I create a new project?',
        'How do I check staff capacity?'
      ];
    }
    if (currentRole === 'senior') {
      return [
        'How do I review a junior draft?',
        'Where can I drop markup pins?',
        'Where is the crew workload roster?'
      ];
    }
    if (currentRole === 'junior') {
      return [
        'How do I upload my drawing draft?',
        'How do I flag my task as blocked?',
        'Where is my Kanban task list?'
      ];
    }
    return [
      'Where is the activity audit log?',
      'How do I reset mock seed data?'
    ];
  };

  const handleLinkClick = (href: string) => {
    router.push(href);
    // Optionally close chat on navigate to keep screen clear
    // setIsOpen(false);
  };

  // Helper to parse simple markdown bold and navigation links
  const parseMarkdown = (text: string) => {
    // Parse navigation links [Text](/path)
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    // First handle links, then bold
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      parts.push({ type: 'link', text: match[1], href: match[2] });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }

    if (parts.length === 0) {
      // Handle bold **text** for plain messages
      return parseBoldText(text);
    }

    return (
      <>
        {parts.map((p, idx) => {
          if (p.type === 'link') {
            return (
              <button
                key={idx}
                onClick={() => handleLinkClick(p.href!)}
                className="inline-flex items-center gap-0.5 text-primary hover:underline font-bold bg-primary/10 hover:bg-primary/20 border border-primary/20 px-1.5 py-0.5 rounded-lg cursor-pointer transition-all text-[10px] leading-tight select-none my-0.5"
              >
                {p.text}
                <ArrowUpRight size={10} className="shrink-0" />
              </button>
            );
          }
          return parseBoldText(p.content!);
        })}
      </>
    );
  };

  const parseBoldText = (text: string) => {
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const boldParts = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        boldParts.push({ type: 'plain', content: text.substring(lastIndex, match.index) });
      }
      boldParts.push({ type: 'bold', content: match[1] });
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      boldParts.push({ type: 'plain', content: text.substring(lastIndex) });
    }

    if (boldParts.length === 0) return text;

    return (
      <>
        {boldParts.map((bp, bidx) => (
          <span key={bidx} className={bp.type === 'bold' ? 'font-extrabold text-foreground' : ''}>
            {bp.content}
          </span>
        ))}
      </>
    );
  };

  const handleSendMessage = async (msgText: string) => {
    if (!msgText.trim() || isLoading) return;

    const userMsg = msgText.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMsg,
          role: currentRole,
          userName: currentUser.name,
          // Exclude the first message (intro) to keep context cleaner if desired, or send full history
          history: messages.slice(1).map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get assistant response');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Oops! I encountered an error connecting to my core brain. Please check if the backend server is running.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              layoutId="archie-widget"
              onClick={() => setIsOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-2 p-3.5 rounded-full shadow-lg shadow-primary/20 cursor-pointer active:scale-95 transition-all group overflow-hidden"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles size={18} className="animate-pulse" />
              <span className="text-xs font-bold font-sans uppercase tracking-wider pr-1 hidden sm:inline-block max-w-0 group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap opacity-0 group-hover:opacity-100">
                Ask Archie
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Chat window */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              layoutId="archie-widget"
              className="w-[90vw] sm:w-[380px] h-[500px] bg-white/95 border border-outline-variant/60 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden backdrop-blur-md"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            >
              {/* Header */}
              <div className="bg-primary/5 border-b border-outline-variant/50 p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Sparkles size={15} className="animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-foreground uppercase tracking-wide">Archie</h3>
                    <p className="text-[10px] text-muted-foreground font-semibold">AI Studio Assistant</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer shrink-0"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Message scroll container */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 text-xs"
              >
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl border ${
                        m.role === 'user'
                          ? 'bg-primary text-primary-foreground border-primary/20 rounded-tr-none'
                          : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 rounded-tl-none leading-relaxed'
                      }`}
                    >
                      {m.role === 'user' ? m.content : parseMarkdown(m.content)}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-2xl rounded-tl-none border border-outline-variant/30 bg-surface-container-lowest text-muted-foreground flex items-center gap-1.5 font-bold font-sans text-[10px]">
                      <Loader2 size={12} className="animate-spin text-primary" />
                      Archie is thinking...
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestion Chips */}
              {!isLoading && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0 select-none">
                  {getSuggestions().map((s, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => handleSendMessage(s)}
                      className="text-[9px] font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1 transition-all cursor-pointer text-left active:scale-97"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Form */}
              <div className="p-3 border-t border-outline-variant/50 shrink-0 bg-surface-container-lowest">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(inputMessage);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    disabled={isLoading}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask Archie about navigation or workflows..."
                    className="flex-1 bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground/50 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground p-2 rounded-xl flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 transition-all active:scale-95 border border-primary/10"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
