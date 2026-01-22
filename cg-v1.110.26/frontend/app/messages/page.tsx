'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useWebSocket } from '@/contexts/websocket-context';
import { familyFilesAPI, agreementsAPI, messagesAPI, FamilyFile, FamilyFileDetail, Agreement, Message } from '@/lib/api';
import { NewMessageEvent, TypingEvent } from '@/lib/websocket';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer } from '@/components/layout';
import { MessageCompose } from '@/components/messages/message-compose';
import {
  MessageSquare,
  Shield,
  Send,
  MoreVertical,
  Phone,
  Video,
  Info,
  ChevronLeft,
  ArrowLeft,
  Clock,
  CheckCheck,
  AlertTriangle,
  Sparkles,
  Users,
  FileText,
  Plus,
} from 'lucide-react';

interface FamilyFileWithAgreements {
  familyFile: FamilyFile | FamilyFileDetail;
  agreements: Agreement[];
}

/**
 * The Neutral Zone - ARIA-Protected Co-Parenting Chat
 *
 * Design Philosophy: Safe space for communication
 * - User bubbles: Teal
 * - Partner bubbles: Neutral Grey
 * - ARIA Guardian: Glowing amber presence
 */

// ARIA Guardian indicator component
function ARIAGuardianBadge() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl shadow-sm">
      <div className="relative">
        <div className="w-2 h-2 bg-amber-500 rounded-full" />
        <div className="absolute inset-0 w-2 h-2 bg-amber-500 rounded-full animate-ping opacity-50" />
      </div>
      <span className="text-xs font-semibold text-amber-600">ARIA Protected</span>
    </div>
  );
}

// Message bubble component
function MessageBubble({
  message,
  isOwn,
  showAvatar = true,
  userName
}: {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  userName?: string;
}) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {showAvatar && (
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
          isOwn ? 'bg-gradient-to-br from-[#2C5F5D] to-[#1f4644]' : 'bg-gradient-to-br from-slate-400 to-slate-500'
        }`}>
          <span className="text-xs font-semibold text-white">
            {isOwn ? 'You' : (userName?.charAt(0) || 'P')}
          </span>
        </div>
      )}
      {!showAvatar && <div className="w-9" />}

      {/* Bubble */}
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`relative group ${
          isOwn
            ? 'bg-gradient-to-br from-[#2C5F5D] to-[#1f4644] text-white px-4 py-3 rounded-2xl shadow-md'
            : 'bg-white text-slate-900 px-4 py-3 rounded-2xl shadow-md border border-slate-200'
        }`}>
          {/* ARIA Review Badge */}
          {message.was_flagged && (
            <div className={`flex items-center gap-1.5 mb-2 pb-2 border-b ${
              isOwn ? 'border-white/20' : 'border-border'
            }`}>
              <Sparkles className="h-3 w-3 text-cg-amber" />
              <span className={`text-xs ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                Reviewed by ARIA
              </span>
            </div>
          )}

          {/* Message Content */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>

          {/* Original Content (if ARIA modified) */}
          {message.original_content && (
            <details className={`mt-2 pt-2 border-t ${
              isOwn ? 'border-white/20' : 'border-border'
            }`}>
              <summary className={`text-xs cursor-pointer ${
                isOwn ? 'text-white/60' : 'text-muted-foreground'
              }`}>
                View original
              </summary>
              <p className={`text-xs mt-1 italic ${
                isOwn ? 'text-white/50' : 'text-muted-foreground'
              }`}>
                "{message.original_content}"
              </p>
            </details>
          )}
        </div>

        {/* Timestamp and Status */}
        <div className={`flex items-center gap-1.5 mt-1 text-xs text-muted-foreground ${
          isOwn ? 'justify-end' : 'justify-start'
        }`}>
          <span>{formatTime(message.sent_at)}</span>
          {isOwn && <CheckCheck className="h-3 w-3 text-[#2C5F5D]" />}
        </div>
      </div>
    </div>
  );
}

// Empty chat state
function EmptyChatState({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-[#2C5F5D]/10 flex items-center justify-center mb-6">
        <Shield className="h-10 w-10 text-[#2C5F5D]" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        The Neutral Zone
      </h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        This is a safe space for co-parenting communication. ARIA Guardian monitors conversations
        to help maintain a constructive tone.
      </p>
      <button
        onClick={onCompose}
        className="cg-btn-primary flex items-center gap-2"
      >
        <Send className="h-4 w-4" />
        Start Conversation
      </button>
    </div>
  );
}

// Chat header component
function ChatHeader({
  familyFileName,
  agreementTitle,
  onBack
}: {
  familyFileName: string;
  agreementTitle: string;
  onBack?: () => void;
}) {
  return (
    <div className="bg-white border-b-2 border-slate-200 flex-shrink-0 shadow-sm">
      <div className="flex items-center justify-between p-4 gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-[#2C5F5D]/10 transition-all duration-200 flex-shrink-0"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </button>
          )}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2C5F5D]/10 to-[#2C5F5D]/5 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Users className="h-5 w-5 text-[#2C5F5D]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-slate-900 truncate">{familyFileName}</h2>
            <p className="text-xs text-slate-600 truncate">{agreementTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ARIAGuardianBadge />
        </div>
      </div>
    </div>
  );
}

// Conversation selector for sidebar
function ConversationSelector({
  familyFilesWithAgreements,
  selectedFamilyFile,
  selectedAgreement,
  onSelectFamilyFile,
  onSelectAgreement,
  isLoading,
}: {
  familyFilesWithAgreements: FamilyFileWithAgreements[];
  selectedFamilyFile: FamilyFile | FamilyFileDetail | null;
  selectedAgreement: Agreement | null;
  onSelectFamilyFile: (ff: FamilyFile | FamilyFileDetail) => void;
  onSelectAgreement: (agreement: Agreement, ff?: FamilyFile | FamilyFileDetail) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#2C5F5D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (familyFilesWithAgreements.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <div className="w-16 h-16 rounded-full bg-[#2C5F5D]/10 flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-[#2C5F5D]" />
        </div>
        <h3 className="font-medium text-foreground mb-2">No Family Files</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create a family file to start messaging
        </p>
        <Link href="/family-files/new" className="cg-btn-primary text-sm py-2 px-4">
          Create Family File
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {familyFilesWithAgreements.map((item) => (
        <div key={item.familyFile.id}>
          {/* Family File Header */}
          <button
            onClick={() => onSelectFamilyFile(item.familyFile)}
            className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
              selectedFamilyFile?.id === item.familyFile.id && !selectedAgreement
                ? 'bg-gradient-to-r from-[#2C5F5D]/10 to-[#2C5F5D]/5 border-2 border-[#2C5F5D]/30 shadow-sm'
                : 'hover:bg-slate-50 border-2 border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2C5F5D]/10 to-[#2C5F5D]/5 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Users className="h-5 w-5 text-[#2C5F5D]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">{item.familyFile.title}</p>
                <p className="text-xs text-slate-600">
                  {item.agreements.length} agreement{item.agreements.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </button>

          {/* Agreements under this family file */}
          {selectedFamilyFile?.id === item.familyFile.id && item.agreements.length > 0 && (
            <div className="ml-6 mt-2 space-y-1 border-l-2 border-border pl-3">
              {item.agreements.map((agreement) => (
                <button
                  key={agreement.id}
                  onClick={() => onSelectAgreement(agreement)}
                  className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 shadow-sm ${
                    selectedAgreement?.id === agreement.id
                      ? 'bg-gradient-to-br from-[#2C5F5D] to-[#1f4644] text-white scale-[1.02]'
                      : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 hover:border-[#2C5F5D]/30'
                  }`}
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{agreement.title}</p>
                    <span className={`text-xs font-medium ${
                      selectedAgreement?.id === agreement.id ? 'text-white/80' : 'text-slate-600'
                    }`}>
                      {agreement.status === 'approved' || agreement.status === 'active' ? 'Active' : agreement.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No agreements message */}
          {selectedFamilyFile?.id === item.familyFile.id && item.agreements.length === 0 && (
            <div className="ml-6 mt-2 border-l-2 border-border pl-3">
              <div className="p-3 text-center">
                <p className="text-xs text-muted-foreground mb-2">No agreements yet</p>
                <Link
                  href={`/agreements?familyFileId=${item.familyFile.id}`}
                  className="text-xs font-medium text-[#2C5F5D] hover:underline"
                >
                  Create Agreement
                </Link>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MessagesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscribe, unsubscribe, onNewMessage, onTyping, isConnected } = useWebSocket();
  const agreementIdParam = searchParams.get('agreement');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [familyFilesWithAgreements, setFamilyFilesWithAgreements] = useState<FamilyFileWithAgreements[]>([]);
  const [selectedFamilyFile, setSelectedFamilyFile] = useState<FamilyFile | FamilyFileDetail | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingFamilyFiles, setIsLoadingFamilyFiles] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Subscribe to case for real-time updates
  useEffect(() => {
    const caseId = selectedAgreement?.case_id;
    if (!caseId || !isConnected) return;

    subscribe(caseId);

    return () => {
      unsubscribe(caseId);
    };
  }, [selectedAgreement?.case_id, isConnected, subscribe, unsubscribe]);

  // Handle incoming new messages via WebSocket
  useEffect(() => {
    if (!selectedAgreement) return;

    const unsubscribeMessage = onNewMessage((data: NewMessageEvent) => {
      // Only add if it's for the current agreement (via case_id match)
      // and not already in messages
      if (data.sender_id !== user?.id) {
        const newMessage: Message = {
          id: data.message_id,
          sender_id: data.sender_id,
          content: data.content,
          sent_at: data.sent_at,
          was_flagged: data.was_flagged,
          message_type: 'text',
        } as Message;

        setMessages((prev) => {
          // Check if message already exists
          if (prev.some((m) => m.id === data.message_id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      }
    });

    return unsubscribeMessage;
  }, [selectedAgreement, user?.id, onNewMessage]);

  // Handle typing indicator
  useEffect(() => {
    if (!selectedAgreement) return;

    const unsubscribeTyping = onTyping((data: TypingEvent) => {
      // Only show typing for other users
      if (data.user_id !== user?.id) {
        setIsOtherTyping(data.is_typing);

        // Auto-clear typing after 3 seconds of inactivity
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        if (data.is_typing) {
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false);
          }, 3000);
        }
      }
    });

    return () => {
      unsubscribeTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [selectedAgreement, user?.id, onTyping]);

  useEffect(() => {
    loadFamilyFilesAndAgreements();
  }, []);

  useEffect(() => {
    if (familyFilesWithAgreements.length > 0 && agreementIdParam) {
      for (const item of familyFilesWithAgreements) {
        const agreement = item.agreements.find(a => a.id === agreementIdParam);
        if (agreement) {
          setSelectedFamilyFile(item.familyFile);
          handleSelectAgreement(agreement, item.familyFile);
          break;
        }
      }
    }
  }, [agreementIdParam, familyFilesWithAgreements]);

  const loadFamilyFilesAndAgreements = async () => {
    try {
      setIsLoadingFamilyFiles(true);
      setError(null);

      const familyFilesResponse = await familyFilesAPI.list();
      const familyFiles = familyFilesResponse.items || [];

      const filesWithAgreements: FamilyFileWithAgreements[] = [];

      for (const ff of familyFiles) {
        try {
          const agreementsResponse = await agreementsAPI.listForFamilyFile(ff.id);
          filesWithAgreements.push({
            familyFile: ff,
            agreements: agreementsResponse.items || [],
          });
        } catch (err) {
          console.error(`Failed to load agreements for family file ${ff.id}:`, err);
          filesWithAgreements.push({
            familyFile: ff,
            agreements: [],
          });
        }
      }

      setFamilyFilesWithAgreements(filesWithAgreements);

      if (filesWithAgreements.length > 0 && !selectedFamilyFile) {
        const firstWithAgreements = filesWithAgreements.find(f => f.agreements.length > 0);
        if (firstWithAgreements) {
          setSelectedFamilyFile(firstWithAgreements.familyFile);
          if (firstWithAgreements.agreements.length > 0) {
            handleSelectAgreement(firstWithAgreements.agreements[0], firstWithAgreements.familyFile);
          }
        } else {
          setSelectedFamilyFile(filesWithAgreements[0].familyFile);
        }
      }
    } catch (err: any) {
      console.error('Failed to load family files:', err);
      setError(err.message || 'Failed to load family files');
    } finally {
      setIsLoadingFamilyFiles(false);
    }
  };

  const handleSelectFamilyFile = (familyFile: FamilyFile | FamilyFileDetail) => {
    setSelectedFamilyFile(familyFile);
    setSelectedAgreement(null);
    setMessages([]);
    setShowCompose(false);
  };

  const handleSelectAgreement = async (agreement: Agreement, familyFile?: FamilyFile | FamilyFileDetail) => {
    const fileToUse = familyFile || selectedFamilyFile;
    if (familyFile) {
      setSelectedFamilyFile(familyFile);
    }
    setSelectedAgreement(agreement);
    setShowCompose(false);
    setShowSidebar(false); // Hide sidebar on mobile when selecting

    // Load messages
    try {
      setIsLoadingMessages(true);
      setError(null);
      const data = await messagesAPI.listByAgreement(agreement.id);
      setMessages(data.reverse());

      // Mark messages as read when viewing them
      if (fileToUse?.id) {
        try {
          await messagesAPI.markAsRead(fileToUse.id);
        } catch (markErr) {
          console.log('Could not mark messages as read:', markErr);
        }
      }
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const loadMessages = async (agreementId: string) => {
    try {
      setIsLoadingMessages(true);
      setError(null);
      const data = await messagesAPI.listByAgreement(agreementId);
      setMessages(data.reverse());

      // Mark messages as read when viewing them
      if (selectedFamilyFile?.id) {
        try {
          await messagesAPI.markAsRead(selectedFamilyFile.id);
        } catch (markErr) {
          console.log('Could not mark messages as read:', markErr);
        }
      }
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleMessageSent = () => {
    setShowCompose(false);
    if (selectedAgreement) {
      loadMessages(selectedAgreement.id);
    }
  };

  const getOtherParentId = () => {
    if (!selectedFamilyFile || !user) return '';
    if (selectedFamilyFile.parent_a_id === user.id) {
      return selectedFamilyFile.parent_b_id || '';
    } else {
      return selectedFamilyFile.parent_a_id;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <div className="flex-1 max-w-7xl mx-auto w-full">
        {/* Height: viewport - top nav (4rem) - bottom nav (~5rem on mobile, 0 on desktop) */}
        <div className="flex h-[calc(100dvh-4rem-5rem)] lg:h-[calc(100dvh-4rem)]">
          {/* Sidebar - Conversations */}
          <aside className={`
            ${showSidebar ? 'flex' : 'hidden lg:flex'}
            w-full lg:w-80 flex-col border-r border-border bg-card
            absolute lg:relative inset-0 lg:inset-auto z-20 lg:z-auto
          `}>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                </button>
                <h1 className="text-xl font-semibold text-foreground flex items-center gap-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  <MessageSquare className="h-5 w-5 text-[#2C5F5D]" />
                  Comms
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1 ml-9">The Neutral Zone</p>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              <ConversationSelector
                familyFilesWithAgreements={familyFilesWithAgreements}
                selectedFamilyFile={selectedFamilyFile}
                selectedAgreement={selectedAgreement}
                onSelectFamilyFile={handleSelectFamilyFile}
                onSelectAgreement={handleSelectAgreement}
                isLoading={isLoadingFamilyFiles}
              />
            </div>
          </aside>

          {/* Main Chat Area */}
          <main className={`
            ${!showSidebar || selectedAgreement ? 'flex' : 'hidden lg:flex'}
            flex-1 flex flex-col bg-background overflow-hidden
          `}>
            {!selectedAgreement ? (
              /* No Agreement Selected */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 rounded-full bg-[#2C5F5D]/10 flex items-center justify-center mb-6">
                  <Shield className="h-12 w-12 text-[#2C5F5D]" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-3" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  Welcome to The Neutral Zone
                </h2>
                <p className="text-muted-foreground max-w-md mb-2">
                  A safe space for co-parenting communication, protected by ARIA Guardian.
                </p>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  Select a family file and agreement from the sidebar to start messaging.
                </p>
                <button
                  onClick={() => setShowSidebar(true)}
                  className="lg:hidden cg-btn-primary"
                >
                  Select Conversation
                </button>
              </div>
            ) : (
              /* Chat View */
              <>
                {/* Chat Header */}
                <ChatHeader
                  familyFileName={selectedFamilyFile?.title || 'Family'}
                  agreementTitle={selectedAgreement.title}
                  onBack={() => setShowSidebar(true)}
                />

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-8 h-8 border-2 border-cg-sage border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <EmptyChatState onCompose={() => setShowCompose(true)} />
                  ) : (
                    <>
                      {/* ARIA Welcome Message */}
                      <div className="flex justify-center mb-6">
                        <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl px-5 py-4 flex items-center gap-3 max-w-md shadow-md">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Sparkles className="h-5 w-5 text-amber-600" />
                          </div>
                          <p className="text-sm font-medium text-slate-700 leading-relaxed">
                            ARIA Guardian is monitoring this conversation to help maintain a constructive tone.
                          </p>
                        </div>
                      </div>

                      {/* Messages */}
                      {messages.map((message, index) => {
                        const isOwn = message.sender_id === user?.id;
                        const prevMessage = index > 0 ? messages[index - 1] : null;
                        const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id;

                        return (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            isOwn={isOwn}
                            showAvatar={showAvatar}
                            userName={isOwn ? undefined : 'Co-Parent'}
                          />
                        );
                      })}

                      {/* Typing Indicator */}
                      {isOtherTyping && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-cg-slate flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-white">P</span>
                          </div>
                          <div className="chat-bubble-other">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Compose Area */}
                {showCompose ? (
                  <div className="border-t border-border p-4 bg-card flex-shrink-0">
                    {getOtherParentId() ? (
                      <MessageCompose
                        caseId={selectedAgreement.case_id || undefined}
                        familyFileId={selectedFamilyFile?.id}
                        agreementId={selectedAgreement.id}
                        recipientId={getOtherParentId()}
                        onMessageSent={handleMessageSent}
                        ariaEnabled={true}
                      />
                    ) : (
                      <div className="aria-guardian p-4 flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-cg-amber flex-shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">Waiting for co-parent</p>
                          <p className="text-sm text-muted-foreground">
                            The other parent needs to join before you can exchange messages.
                          </p>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => setShowCompose(false)}
                      className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-smooth"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  /* Quick Compose Button */
                  <div className="border-t border-border p-4 bg-card flex-shrink-0">
                    <button
                      onClick={() => setShowCompose(true)}
                      disabled={!getOtherParentId()}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-smooth ${
                        getOtherParentId()
                          ? 'border-border hover:border-cg-sage hover:bg-cg-sage-subtle/50 cursor-pointer'
                          : 'border-border bg-muted cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-cg-sage-subtle flex items-center justify-center">
                        <Send className="h-4 w-4 text-cg-sage" />
                      </div>
                      <span className="text-muted-foreground">
                        {getOtherParentId() ? 'Write a message...' : 'Waiting for co-parent to join'}
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <MessagesContent />
    </ProtectedRoute>
  );
}
