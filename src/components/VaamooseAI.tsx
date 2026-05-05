import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Sparkles, Bus, ChevronRight,
  Minimize2, Bot, User, Loader2
} from 'lucide-react';

interface VaamooseAIProps {
  onBook?: () => void;
  onSendPackage?: () => void;
  userEmail?: string;
  userName?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  bookingLink?: boolean;
  deliveryLink?: boolean;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  'Find me a ride to Lagos 🚌',
  'What\'s the cheapest route from Redeemer\'s?',
  'I need to send a package to school',
  'When is the next bus to Ibadan?',
];

const SYSTEM_PROMPT = `You are Vaa, the smart AI assistant for Vaamoose — Nigeria's leading student transport platform.

You help students:
1. Find the best transport options (routes, prices, companies, departure times)
2. Send packages to and from universities
3. Track live buses
4. Handle complaints and issues
5. Understand how Vaamoose works

About Vaamoose:
- A marketplace connecting university students with transport companies and delivery agents
- Universities served: Redeemer's University (Mowe), Covenant University, Bowen University, Babcock University, Adeleke University, Crawford University, and more
- Popular routes: Lagos, Ibadan, Abuja, Port Harcourt, Benin City, Ife
- Payment: via Paystack, split 85% to partner / 15% Vaamoose
- Features: live GPS tracking, seat selection, luggage upload, digital receipts, package delivery

Personality:
- Friendly, energetic, helpful Nigerian tone
- Use occasional Nigerian expressions naturally (e.g. "no wahala", "sharp sharp")
- Keep responses concise and practical
- Always end with a helpful next step or question
- Use emojis naturally but not excessively

When recommending transport:
- Ask for: departure school, destination, date, budget
- Mention that prices vary by vehicle type (sedan, minivan, luxury bus)
- Remind them to book early especially during resumption periods

When helping with packages:
- Ask for: pickup address, delivery address (hostel/room number), item description
- Mention door-to-door delivery feature
- Explain the OTP confirmation system

You cannot access real-time data directly, but you can guide users to the right features in the app. When a user wants to book, tell them to use the booking button. When they want to send a package, direct them to the Send Package feature.

Keep responses under 150 words unless a detailed explanation is truly needed.`;

export function VaamooseAI({ onBook, onSendPackage, userName }: VaamooseAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hey${userName ? ` ${userName.split(' ')[0]}` : ''}! 👋 I'm **Vaa**, your Vaamoose AI assistant.\n\nI can help you find rides, send packages, track your bus, and more. What do you need today?`,
      suggestions: QUICK_PROMPTS,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = messages
        .filter(m => m.id !== '1')
        .map(m => ({ role: m.role, content: m.content }));

      conversationHistory.push({ role: 'user', content: text });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
          'anthropic-dangerous-direct-browser-access': 'true',
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: SYSTEM_PROMPT,
          messages: conversationHistory,
        }),
      });

      const data = await response.json();
      const content = data.content?.[0]?.text || "Sorry, I couldn't process that. Please try again.";

      // Detect if response should show action buttons
      const shouldShowBooking = /book|ride|seat|depart|travel|transport|bus|vehicle/i.test(text);
      const shouldShowDelivery = /send|package|deliver|item|parcel|hostel/i.test(text);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        bookingLink: shouldShowBooking,
        deliveryLink: shouldShowDelivery,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      if (!isOpen) setUnreadCount(prev => prev + 1);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Hmm, something went wrong on my end. Please try again in a moment! 🙏',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatContent = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl flex items-center justify-center group"
            style={{ boxShadow: '0 8px 32px rgba(37, 99, 235, 0.4)' }}
          >
            <Sparkles className="w-7 h-7 text-white" />
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
              >
                {unreadCount}
              </motion.div>
            )}
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-2xl bg-blue-500 animate-ping opacity-20" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] flex flex-col"
            style={{ maxHeight: isMinimized ? 'auto' : '600px' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">Vaa — Vaamoose AI</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <p className="text-blue-200 text-xs">Online — ready to help</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <Minimize2 className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Messages */}
            {!isMinimized && (
              <>
                <div className="bg-slate-50 flex-1 overflow-y-auto p-4 space-y-4"
                  style={{ maxHeight: '420px', minHeight: '300px' }}
                >
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        message.role === 'assistant'
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-700'
                          : 'bg-slate-200'
                      }`}>
                        {message.role === 'assistant'
                          ? <Bot className="w-4 h-4 text-white" />
                          : <User className="w-4 h-4 text-slate-600" />
                        }
                      </div>

                      <div className={`max-w-[80%] space-y-2 ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                        {/* Bubble */}
                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          message.role === 'assistant'
                            ? 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-sm'
                            : 'bg-blue-600 text-white rounded-tr-sm'
                        }`}>
                          <p dangerouslySetInnerHTML={{ __html: formatContent(message.content) }} />
                        </div>

                        {/* Quick suggestions */}
                        {message.suggestions && (
                          <div className="flex flex-wrap gap-1.5">
                            {message.suggestions.map((s) => (
                              <button
                                key={s}
                                onClick={() => sendMessage(s)}
                                className="text-xs bg-white border border-blue-200 text-blue-600 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Action buttons */}
                        {(message.bookingLink || message.deliveryLink) && message.role === 'assistant' && (
                          <div className="flex gap-2 flex-wrap">
                            {message.bookingLink && (
                              <button
                                onClick={() => { onBook?.(); setIsOpen(false); }}
                                className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                              >
                                <Bus className="w-3 h-3" /> Book a Ride
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                            {message.deliveryLink && (
                              <button
                                onClick={() => { onSendPackage?.(); setIsOpen(false); }}
                                className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                              >
                                📦 Send Package
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-slate-300">
                          {message.timestamp.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-2"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="bg-white border-t border-slate-100 rounded-b-2xl p-3">
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                      placeholder="Ask Vaa anything..."
                      className="flex-1 bg-transparent text-sm outline-none text-slate-800 placeholder:text-slate-400"
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || isLoading}
                      className={`p-1.5 rounded-lg transition-all ${
                        input.trim() && !isLoading
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {isLoading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Send className="w-4 h-4" />
                      }
                    </button>
                  </div>
                  <p className="text-center text-xs text-slate-300 mt-2">Powered by Claude AI · Vaamoose</p>
                </div>
              </>
            )}

            {/* Minimized state */}
            {isMinimized && (
              <div
                className="bg-white border border-slate-200 rounded-b-2xl px-4 py-3 cursor-pointer hover:bg-slate-50"
                onClick={() => setIsMinimized(false)}
              >
                <p className="text-sm text-slate-500 text-center">Click to expand chat</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}