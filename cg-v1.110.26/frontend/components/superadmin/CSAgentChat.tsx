'use client';

import { useState } from 'react';
import { Send, User, Bot, Loader2, Search } from 'lucide-react';

interface CSAgentMessage {
  role: 'user' | 'assistant';
  content: string;
  data?: any;
}

interface CSAgentChatProps {
  onSend: (userId: string | null, message: string) => Promise<any>;
  onSearchUser?: (query: string) => Promise<any[]>;
  loading?: boolean;
}

export function CSAgentChat({ onSend, onSearchUser, loading }: CSAgentChatProps) {
  const [messages, setMessages] = useState<CSAgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [sending, setSending] = useState(false);

  const handleSearchUser = async (query: string) => {
    setUserSearch(query);
    if (query.length >= 2 && onSearchUser) {
      const results = await onSearchUser(query);
      setSearchResults(results || []);
    } else {
      setSearchResults([]);
    }
  };

  const selectUser = (user: any) => {
    setSelectedUser(user);
    setUserId(user.id);
    setUserSearch('');
    setSearchResults([]);
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setSending(true);

    try {
      const result = await onSend(userId, userMsg);
      const assistantContent = result.analysis
        ? `**Analysis:** ${result.analysis}\n\n**Root Cause:** ${result.root_cause || 'N/A'}\n\n**Suggestions:**\n${(result.suggestions || []).map((s: any) => `- [${s.priority}] ${s.action}: ${s.reasoning}`).join('\n')}\n\n**Draft Message:**\n${result.draft_message || 'N/A'}`
        : JSON.stringify(result, null, 2);

      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent, data: result }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl overflow-hidden flex flex-col h-[600px]">
      {/* User selector */}
      <div className="px-4 py-3 border-b border-cg-slate/20">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          {selectedUser ? (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm text-cg-slate-tint">
                {selectedUser.first_name} {selectedUser.last_name}
              </span>
              <span className="text-xs text-cg-slate-strong">{selectedUser.email}</span>
              <button
                onClick={() => { setSelectedUser(null); setUserId(null); }}
                className="text-xs text-muted-foreground hover:text-red-400 ml-auto"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="relative flex-1">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => handleSearchUser(e.target.value)}
                placeholder="Search user by name or email (optional)..."
                className="w-full bg-transparent text-sm text-cg-slate-tint placeholder-cg-slate-strong outline-none"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-8 left-0 right-0 bg-foreground border border-cg-slate/30 rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                  {searchResults.map((user: any) => (
                    <button
                      key={user.id}
                      onClick={() => selectUser(user)}
                      className="w-full text-left px-3 py-2 hover:bg-cg-slate/20 flex items-center gap-2"
                    >
                      <span className="text-xs text-cg-slate-tint">{user.first_name} {user.last_name}</span>
                      <span className="text-[10px] text-cg-slate-strong">{user.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-10 h-10 text-cg-sage/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">AI Customer Success Agent</p>
            <p className="text-xs text-cg-slate-strong mt-1">
              Describe a customer issue to get analysis, resolution suggestions, and draft communications.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-cg-sage/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-cg-sage" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-cg-sage/20 text-cg-slate-tint'
                : 'bg-foreground text-cg-slate-muted'
            }`}>
              <div className="text-xs whitespace-pre-wrap leading-relaxed">{msg.content}</div>
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-cg-slate/30 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-cg-sage/20 flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 text-cg-sage animate-spin" />
            </div>
            <div className="bg-foreground rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Analyzing</span>
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-cg-sage rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-cg-sage rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-cg-sage rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-cg-slate/20">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Describe the customer issue..."
            className="flex-1 bg-foreground border border-cg-slate/20 rounded-lg px-3 py-2 text-sm text-cg-slate-tint placeholder-cg-slate-strong outline-none focus:border-cg-sage/40"
            disabled={sending}
          />
          <button aria-label="Send message"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="px-3 py-2 bg-cg-sage hover:bg-cg-sage/80 disabled:bg-cg-sage/30 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
