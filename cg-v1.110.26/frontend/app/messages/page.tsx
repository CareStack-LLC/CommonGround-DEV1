'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { familyFilesAPI, agreementsAPI, messagesAPI, FamilyFile, FamilyFileDetail, Agreement, Message } from '@/lib/api';
import { useRealtimeMessages } from '@/hooks/use-realtime-messages';
import { useRealtimeTyping } from '@/hooks/use-realtime-typing';
import { useRealtimePresence } from '@/hooks/use-realtime-presence';
import { OnlineDot } from '@/components/presence-indicator';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer } from '@/components/layout';
import { MessageCompose } from '@/components/messages/message-compose';
import { PreCallSettingsDialog } from '@/components/calls/pre-call-settings-dialog';
import { SensitivityLevel } from '@/components/calls/aria-sensitivity-slider';
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
  Music,
  ThumbsUp,
  Lock,
  Scale,
  Eye,
  X,
} from 'lucide-react';

// Welcome Disclaimer Modal
function WelcomeDisclaimer({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-br from-[var(--portal-primary)] to-[#1f4644] p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            Welcome to The Neutral Zone
          </h2>
          <p className="text-white/80 mt-1 text-sm font-medium">
            A safe space for co-parenting communication
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-slate-700 text-center font-medium">
            This secure messaging platform is designed for conversations about your children and custody matters.
          </p>

          {/* Key Points */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 bg-[var(--portal-primary)]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-[var(--portal-primary)]" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">Secure & Documented</p>
                <p className="text-xs text-slate-600">All messages and calls are encrypted, timestamped, and digitally signed for your protection.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Eye className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">ARIA Guardian Active</p>
                <p className="text-xs text-slate-600">Our AI assistant monitors conversations and gently guides toward constructive communication.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Scale className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">Court-Ready Records</p>
                <p className="text-xs text-slate-600">Communication records may be used as documentation in legal proceedings if needed.</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={onAccept}
              className="w-full py-3 px-6 bg-gradient-to-r from-[var(--portal-primary)] to-[#1f4644] text-white font-bold rounded-xl hover:shadow-lg transition-all duration-300"
            >
              I Understand, Continue
            </button>
            <p className="text-xs text-slate-500 text-center mt-3">
              By continuing, you acknowledge these terms for using CommonGround messaging.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl shadow-md">
      <div className="relative">
        <div className="w-2 h-2 bg-amber-500 rounded-full" />
        <div className="absolute inset-0 w-2 h-2 bg-amber-500 rounded-full animate-ping opacity-50" />
      </div>
      <span className="text-xs font-bold text-amber-600 hidden sm:inline">ARIA Protected</span>
      <span className="text-xs font-bold text-amber-600 sm:hidden">ARIA</span>
    </div>
  );
}

// Message bubble component
function MessageBubble({
  message,
  isOwn,
  showAvatar = true,
  userName,
  onAcknowledge,
  isAcknowledging
}: {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  userName?: string;
  onAcknowledge?: (messageId: string) => void;
  isAcknowledging?: boolean;
}) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const canAcknowledge = !isOwn && !message.acknowledged_at && message.id && onAcknowledge;

  return (
    <div className={`flex gap-2 sm:gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {showAvatar && (
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${isOwn ? 'bg-gradient-to-br from-[var(--portal-primary)] to-[#1f4644]' : 'bg-gradient-to-br from-slate-400 to-slate-500'
          }`}>
          <span className="text-xs font-bold text-white">
            {isOwn ? 'You' : (userName?.charAt(0) || 'P')}
          </span>
        </div>
      )}
      {!showAvatar && <div className="w-8 sm:w-9" />}

      {/* Bubble */}
      <div className={`max-w-[80%] sm:max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`relative group ${isOwn
            ? 'bg-gradient-to-br from-[var(--portal-primary)] to-[#1f4644] text-white px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-lg'
            : 'bg-white text-slate-900 px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-lg border-2 border-slate-200'
          }`}>
          {/* ARIA Review Badge */}
          {message.was_flagged && (
            <div className={`flex items-center gap-1.5 mb-2 pb-2 border-b ${isOwn ? 'border-white/20' : 'border-border'
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

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className={`rounded-lg overflow-hidden ${isOwn ? 'bg-white/10' : 'bg-slate-50'
                    }`}
                >
                  {attachment.file_category === 'image' ? (
                    <a
                      href={attachment.storage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={attachment.storage_url}
                        alt={attachment.file_name}
                        className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ maxHeight: '300px' }}
                      />
                    </a>
                  ) : (
                    <a
                      href={attachment.storage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 p-2 hover:opacity-80 transition-opacity ${isOwn ? 'text-white' : 'text-slate-900'
                        }`}
                    >
                      {attachment.file_category === 'video' ? (
                        <Video className="w-5 h-5 flex-shrink-0" />
                      ) : attachment.file_category === 'audio' ? (
                        <Music className="w-5 h-5 flex-shrink-0" />
                      ) : (
                        <FileText className="w-5 h-5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                        <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-slate-600'}`}>
                          {(attachment.file_size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Original Content (if ARIA modified) */}
          {message.original_content && (
            <details className={`mt-2 pt-2 border-t ${isOwn ? 'border-white/20' : 'border-border'
              }`}>
              <summary className={`text-xs cursor-pointer ${isOwn ? 'text-white/60' : 'text-muted-foreground'
                }`}>
                View original
              </summary>
              <p className={`text-xs mt-1 italic ${isOwn ? 'text-white/50' : 'text-muted-foreground'
                }`}>
                "{message.original_content}"
              </p>
            </details>
          )}

          {/* Acknowledge Button - Only for received messages that haven't been acknowledged */}
          {canAcknowledge && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => onAcknowledge(message.id!)}
                disabled={isAcknowledging}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--portal-primary)] hover:text-[var(--portal-primary)]/80 transition-colors disabled:opacity-50"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                {isAcknowledging ? 'Acknowledging...' : 'Acknowledge'}
              </button>
            </div>
          )}
        </div>

        {/* Timestamp and Status */}
        <div className={`flex items-center gap-1.5 mt-1 text-xs text-muted-foreground ${isOwn ? 'justify-end' : 'justify-start'
          }`}>
          <span>{formatTime(message.sent_at)}</span>
          {isOwn && message.acknowledged_at && (
            <div className="flex items-center gap-1 text-emerald-600">
              <ThumbsUp className="h-3 w-3" />
              <span className="text-xs font-medium">Acknowledged</span>
            </div>
          )}
          {isOwn && !message.acknowledged_at && <CheckCheck className="h-3 w-3 text-[var(--portal-primary)]" />}
          {!isOwn && message.acknowledged_at && (
            <div className="flex items-center gap-1 text-emerald-600">
              <ThumbsUp className="h-3 w-3" />
              <span className="text-xs font-medium">Acknowledged</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Empty chat state
function EmptyChatState({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center mb-4 sm:mb-6 shadow-lg">
        <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-[var(--portal-primary)]" />
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
        The Neutral Zone
      </h3>
      <p className="text-sm sm:text-base text-slate-600 font-medium max-w-sm mb-4 sm:mb-6">
        This is a safe space for co-parenting communication. ARIA Guardian monitors conversations
        to help maintain a constructive tone.
      </p>
      <button
        onClick={onCompose}
        className="cg-btn-primary flex items-center gap-2 text-sm sm:text-base px-4 py-2 sm:px-6 sm:py-3"
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
  familyFileId,
  parentBJoined,
  isCoParentOnline,
  onBack,
  onInitiateCall
}: {
  familyFileName: string;
  agreementTitle: string;
  familyFileId?: string;
  parentBJoined?: boolean;
  isCoParentOnline?: boolean;
  onBack?: () => void;
  onInitiateCall?: (callType: 'video' | 'audio') => void;
}) {
  return (
    <div className="bg-white border-b-2 border-slate-200 flex-shrink-0 shadow-md">
      <div className="flex items-center justify-between p-3 sm:p-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Mobile back button - more prominent */}
          {onBack && (
            <button
              onClick={onBack}
              className="lg:hidden p-2 -ml-1 rounded-xl bg-slate-100 hover:bg-[var(--portal-primary)]/10 border border-slate-200 transition-all duration-200 flex-shrink-0"
              aria-label="Back to conversations"
            >
              <ChevronLeft className="h-5 w-5 text-[var(--portal-primary)]" />
            </button>
          )}
          {/* Tappable header area on mobile to go back */}
          <button
            onClick={onBack}
            className="lg:pointer-events-none flex items-center gap-2 sm:gap-3 min-w-0 flex-1 text-left"
          >
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center flex-shrink-0 shadow-md">
              <Users className="h-5 w-5 text-[var(--portal-primary)]" />
              {/* Online status indicator */}
              <div className="absolute -bottom-0.5 -right-0.5">
                <OnlineDot isOnline={isCoParentOnline || false} size="sm" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>{familyFileName}</h2>
                {isCoParentOnline && (
                  <span className="text-xs text-emerald-600 font-medium hidden sm:inline">Online</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <p className="text-xs text-slate-600 truncate font-medium">{agreementTitle}</p>
                <ChevronLeft className="h-3 w-3 text-slate-400 lg:hidden rotate-180" />
              </div>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Call Buttons */}
          {familyFileId && onInitiateCall && (
            <>
              <button
                onClick={() => onInitiateCall('audio')}
                disabled={!parentBJoined}
                className={`p-2 rounded-xl border-2 transition-all duration-200 shadow-sm ${parentBJoined
                    ? 'bg-white border-slate-200 hover:border-[var(--portal-primary)] hover:bg-[var(--portal-primary)]/5 cursor-pointer'
                    : 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                  }`}
                title={parentBJoined ? "Audio call" : "Both parents must join before calling"}
              >
                <Phone className={`h-5 w-5 ${parentBJoined ? 'text-[var(--portal-primary)]' : 'text-slate-400'}`} />
              </button>
              <button
                onClick={() => onInitiateCall('video')}
                disabled={!parentBJoined}
                className={`p-2 rounded-xl border-2 transition-all duration-200 shadow-sm ${parentBJoined
                    ? 'bg-white border-slate-200 hover:border-[var(--portal-primary)] hover:bg-[var(--portal-primary)]/5 cursor-pointer'
                    : 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                  }`}
                title={parentBJoined ? "Video call" : "Both parents must join before calling"}
              >
                <Video className={`h-5 w-5 ${parentBJoined ? 'text-[var(--portal-primary)]' : 'text-slate-400'}`} />
              </button>
            </>
          )}
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
  currentUserId,
}: {
  familyFilesWithAgreements: FamilyFileWithAgreements[];
  selectedFamilyFile: FamilyFile | FamilyFileDetail | null;
  selectedAgreement: Agreement | null;
  onSelectFamilyFile: (ff: FamilyFile | FamilyFileDetail) => void;
  onSelectAgreement: (agreement: Agreement, ff?: FamilyFile | FamilyFileDetail) => void;
  isLoading: boolean;
  currentUserId?: string;
}) {
  // Helper to get co-parent info
  const getCoParentInfo = (ff: FamilyFile | FamilyFileDetail) => {
    const isParentA = ff.parent_a_id === currentUserId;
    const coParentInfo = isParentA ? ff.parent_b_info : ff.parent_a_info;
    const coParentName = coParentInfo?.first_name || (isParentA ? 'Co-Parent' : 'Co-Parent');
    const coParentInitial = coParentName.charAt(0).toUpperCase();
    return { coParentName, coParentInitial, coParentInfo };
  };

  // Get active agreement for a family file
  const getActiveAgreement = (agreements: Agreement[]) => {
    return agreements.find(a => a.status === 'approved' || a.status === 'active') || agreements[0];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin" />
          <p className="text-sm text-slate-600 font-medium">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (familyFilesWithAgreements.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <div className="w-16 h-16 rounded-full bg-[var(--portal-primary)]/10 flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-[var(--portal-primary)]" />
        </div>
        <h3 className="font-semibold text-foreground mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>No Family Files</h3>
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
    <div className="divide-y divide-slate-100">
      {familyFilesWithAgreements.map((item) => {
        const { coParentName, coParentInitial } = getCoParentInfo(item.familyFile);
        const activeAgreement = getActiveAgreement(item.agreements);
        const isSelected = selectedFamilyFile?.id === item.familyFile.id;
        const hasAgreements = item.agreements.length > 0;

        return (
          <div key={item.familyFile.id}>
            {/* Main conversation thread item - looks like phone messages */}
            <button
              onClick={() => {
                if (hasAgreements && activeAgreement) {
                  onSelectAgreement(activeAgreement, item.familyFile);
                } else {
                  onSelectFamilyFile(item.familyFile);
                }
              }}
              className={`w-full text-left p-4 transition-all duration-200 ${isSelected
                  ? 'bg-[var(--portal-primary)]/5'
                  : 'hover:bg-slate-50 active:bg-slate-100'
                }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar with initial */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold ${isSelected
                    ? 'bg-[var(--portal-primary)] text-white'
                    : 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600'
                  }`}>
                  {coParentInitial}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-semibold truncate ${isSelected ? 'text-[var(--portal-primary)]' : 'text-slate-900'}`}>
                      {coParentName}
                    </p>
                    {/* Timestamp placeholder - would show last message time */}
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {item.agreements.length > 0 ? (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {item.agreements.length}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 truncate font-medium">
                    {item.familyFile.title}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {hasAgreements
                      ? `${activeAgreement?.title || 'Agreement'} • ${activeAgreement?.status === 'approved' || activeAgreement?.status === 'active' ? 'Active' : activeAgreement?.status}`
                      : 'No agreements yet - tap to create'
                    }
                  </p>
                </div>

                {/* Chevron */}
                <ChevronLeft className="w-5 h-5 text-slate-400 flex-shrink-0 rotate-180" />
              </div>
            </button>

            {/* Expanded agreements list when selected and multiple agreements */}
            {isSelected && item.agreements.length > 1 && (
              <div className="bg-slate-50 border-t border-slate-100 py-2 px-4">
                <p className="text-xs text-slate-500 font-medium mb-2 px-2">Select Agreement</p>
                <div className="space-y-1">
                  {item.agreements.map((agreement) => (
                    <button
                      key={agreement.id}
                      onClick={() => onSelectAgreement(agreement, item.familyFile)}
                      className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${selectedAgreement?.id === agreement.id
                          ? 'bg-[var(--portal-primary)] text-white shadow-md'
                          : 'bg-white hover:bg-slate-100 text-slate-900 border border-slate-200'
                        }`}
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{agreement.title}</p>
                        <span className={`text-xs ${selectedAgreement?.id === agreement.id ? 'text-white/80' : 'text-slate-500'
                          }`}>
                          {agreement.status === 'approved' || agreement.status === 'active' ? 'Active' : agreement.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No agreements - show create link */}
            {isSelected && !hasAgreements && (
              <div className="bg-slate-50 border-t border-slate-100 p-4">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-2">Create an agreement to start messaging</p>
                  <Link
                    href={`/agreements?familyFileId=${item.familyFile.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--portal-primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--portal-primary)]/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Agreement
                  </Link>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const DISCLAIMER_ACCEPTED_KEY = 'cg_messages_disclaimer_accepted';

function MessagesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [showPreCallDialog, setShowPreCallDialog] = useState(false);
  const [pendingCallType, setPendingCallType] = useState<'video' | 'audio'>('video');
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [acknowledgingMessageId, setAcknowledgingMessageId] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Check if user has accepted disclaimer
  useEffect(() => {
    const accepted = localStorage.getItem(DISCLAIMER_ACCEPTED_KEY);
    if (!accepted) {
      setShowDisclaimer(true);
    }
  }, []);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem(DISCLAIMER_ACCEPTED_KEY, 'true');
    setShowDisclaimer(false);
  };

  // Handle new message from Supabase Realtime
  const handleNewMessage = useCallback((message: Message) => {
    // Only add if not already in messages and not from current user
    if (message.sender_id !== user?.id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    }
  }, [user?.id]);

  // Handle message read receipt updates
  const handleMessageRead = useCallback((messageId: string, readAt: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, read_at: readAt } : msg
      )
    );
  }, []);

  // Handle message acknowledgment updates
  const handleMessageAcknowledged = useCallback((messageId: string, acknowledgedAt: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, acknowledged_at: acknowledgedAt } : msg
      )
    );
  }, []);

  // Supabase Realtime hooks
  useRealtimeMessages({
    familyFileId: selectedFamilyFile?.id || null,
    agreementId: selectedAgreement?.id || null,
    onNewMessage: handleNewMessage,
    onMessageRead: handleMessageRead,
    onMessageAcknowledged: handleMessageAcknowledged,
  });

  const { isPartnerTyping, handleTyping, stopTyping } = useRealtimeTyping({
    familyFileId: selectedFamilyFile?.id || null,
    agreementId: selectedAgreement?.id || null,
  });

  const { isUserOnline } = useRealtimePresence({
    familyFileId: selectedFamilyFile?.id || null,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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

    // Load messages - fetch by family file to include all messages (including those from mobile)
    try {
      setIsLoadingMessages(true);
      setError(null);
      const familyFileIdToUse = fileToUse?.id;
      const data = familyFileIdToUse
        ? await messagesAPI.listByFamilyFile(familyFileIdToUse)
        : await messagesAPI.listByAgreement(agreement.id);
      setMessages(data);

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
      // Fetch by family file to include all messages (including those from mobile without agreement_id)
      const data = selectedFamilyFile?.id
        ? await messagesAPI.listByFamilyFile(selectedFamilyFile.id)
        : await messagesAPI.listByAgreement(agreementId);
      setMessages(data);

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

  const handleMessageSent = (newMessage?: any) => {
    setShowCompose(false);
    if (newMessage) {
      // Optimistically add the message to the list
      setMessages((prev) => {
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      // Optionally scroll to bottom
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else if (selectedAgreement) {
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

  const handleInitiateCall = async (callType: 'video' | 'audio') => {
    if (!selectedFamilyFile?.id) {
      alert('Please select a conversation first');
      return;
    }

    // Check if both parents have joined
    const familyFileDetail = selectedFamilyFile as FamilyFileDetail;
    if (!familyFileDetail.parent_b_id || !familyFileDetail.parent_b_joined_at) {
      alert('Both parents must join the family file before calling is enabled. Only messaging is available until both parents have joined.');
      return;
    }

    // Show pre-call settings dialog
    setPendingCallType(callType);
    setShowPreCallDialog(true);
  };

  const handleStartCallWithSettings = (settings: { callType: 'video' | 'audio'; ariaSensitivity: SensitivityLevel }) => {
    if (!selectedFamilyFile?.id) return;

    setIsStartingCall(true);

    try {
      // Navigate to call page with family file ID, call type, and ARIA sensitivity
      router.push(
        `/messages/call?family_file_id=${selectedFamilyFile.id}&call_type=${settings.callType}&aria_sensitivity=${settings.ariaSensitivity}`
      );
    } catch (error) {
      console.error('Failed to initiate call:', error);
      alert('Failed to initiate call. Please try again.');
      setIsStartingCall(false);
    }
  };

  const getOtherParentName = () => {
    if (!selectedFamilyFile || !user) return 'Co-Parent';
    if (selectedFamilyFile.parent_a_id === user.id) {
      const info = selectedFamilyFile.parent_b_info;
      return info?.first_name ? `${info.first_name} ${info.last_name || ''}`.trim() : 'Co-Parent';
    } else {
      const info = selectedFamilyFile.parent_a_info;
      return info?.first_name ? `${info.first_name} ${info.last_name || ''}`.trim() : 'Co-Parent';
    }
  };

  const handleAcknowledgeMessage = async (messageId: string) => {
    try {
      setAcknowledgingMessageId(messageId);
      const updatedMessage = await messagesAPI.acknowledge(messageId);

      // Update the message in state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, acknowledged_at: updatedMessage.acknowledged_at }
            : msg
        )
      );
    } catch (err: any) {
      console.error('Failed to acknowledge message:', err);
      setError(err.message || 'Failed to acknowledge message');
    } finally {
      setAcknowledgingMessageId(null);
    }
  };

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col overflow-hidden">
      <Navigation />

      <div className="flex-1 max-w-7xl mx-auto w-full overflow-hidden">
        {/* Height: fills remaining space after nav, minus bottom nav on mobile */}
        <div className="flex h-full pb-[5rem] lg:pb-0">
          {/* Sidebar - Conversations */}
          <aside className={`
            ${showSidebar ? 'flex' : 'hidden lg:flex'}
            w-full lg:w-80 flex-col border-r-2 border-slate-200 bg-white shadow-sm
            absolute lg:relative inset-0 lg:inset-auto z-20 lg:z-auto
          `}>
            {/* Sidebar Header */}
            <div className="p-4 border-b-2 border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 -ml-2 rounded-xl hover:bg-[var(--portal-primary)]/10 transition-all duration-200 flex-shrink-0"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5 text-slate-600" />
                </button>
                <div className="flex items-center gap-2 flex-1">
                  <div className="p-2 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-xl shadow-sm">
                    <MessageSquare className="h-5 w-5 text-[var(--portal-primary)]" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                      Comms
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">The Neutral Zone</p>
                  </div>
                </div>
              </div>
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
                currentUserId={user?.id}
              />
            </div>
          </aside>

          {/* Main Chat Area */}
          <main className={`
            ${!showSidebar || selectedAgreement ? 'flex' : 'hidden lg:flex'}
            flex-1 flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-hidden
          `}>
            {!selectedAgreement ? (
              /* No Agreement Selected */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 rounded-full bg-[var(--portal-primary)]/10 flex items-center justify-center mb-6">
                  <Shield className="h-12 w-12 text-[var(--portal-primary)]" />
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
                  familyFileId={selectedFamilyFile?.id}
                  parentBJoined={!!(selectedFamilyFile as FamilyFileDetail)?.parent_b_joined_at}
                  isCoParentOnline={isUserOnline(getOtherParentId())}
                  onBack={() => setShowSidebar(true)}
                  onInitiateCall={handleInitiateCall}
                />

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-10 h-10 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <EmptyChatState onCompose={() => setShowCompose(true)} />
                  ) : (
                    <>
                      {/* ARIA Welcome Message */}
                      <div className="flex justify-center mb-4 sm:mb-6">
                        <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-2 border-amber-500/20 rounded-2xl px-3 py-3 sm:px-5 sm:py-4 flex items-center gap-2 sm:gap-3 max-w-md shadow-lg">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center flex-shrink-0 shadow-md">
                            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
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
                            onAcknowledge={handleAcknowledgeMessage}
                            isAcknowledging={acknowledgingMessageId === message.id}
                          />
                        );
                      })}

                      {/* Typing Indicator */}
                      {isPartnerTyping && (
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
                  <div className="border-t-2 border-slate-200 p-3 sm:p-4 bg-white flex-shrink-0 shadow-inner">
                    {getOtherParentId() ? (
                      <MessageCompose
                        caseId={selectedAgreement.case_id || undefined}
                        familyFileId={selectedFamilyFile?.id}
                        agreementId={selectedAgreement.id}
                        recipientId={getOtherParentId()}
                        onMessageSent={handleMessageSent}
                        ariaEnabled={true}
                        onTyping={handleTyping}
                        onStopTyping={stopTyping}
                      />
                    ) : (
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 shadow-md">
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 text-sm sm:text-base">Waiting for co-parent</p>
                          <p className="text-xs sm:text-sm text-slate-600 font-medium">
                            The other parent needs to join before you can exchange messages.
                          </p>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => setShowCompose(false)}
                      className="mt-3 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  /* Quick Compose Button */
                  <div className="border-t-2 border-slate-200 p-3 sm:p-4 bg-white flex-shrink-0 shadow-inner">
                    <button
                      onClick={() => setShowCompose(true)}
                      disabled={!getOtherParentId()}
                      className={`w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-3.5 rounded-xl border-2 transition-all duration-200 ${getOtherParentId()
                          ? 'border-slate-200 hover:border-[var(--portal-primary)] hover:bg-[var(--portal-primary)]/5 cursor-pointer shadow-md hover:shadow-lg'
                          : 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
                        }`}
                    >
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center shadow-sm">
                        <Send className="h-4 w-4 text-[var(--portal-primary)]" />
                      </div>
                      <span className="text-sm sm:text-base text-slate-600 font-medium">
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

      {/* Pre-Call Settings Dialog */}
      <PreCallSettingsDialog
        open={showPreCallDialog}
        onOpenChange={setShowPreCallDialog}
        onStartCall={handleStartCallWithSettings}
        recipientName={getOtherParentName()}
        defaultCallType={pendingCallType}
        isLoading={isStartingCall}
      />

      {/* Welcome Disclaimer Modal */}
      {showDisclaimer && (
        <WelcomeDisclaimer onAccept={handleAcceptDisclaimer} />
      )}
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
