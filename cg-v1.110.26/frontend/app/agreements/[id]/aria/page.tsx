'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Navigation } from '@/components/navigation';
import { agreementsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/protected-route';
import { Paperclip, FileText } from 'lucide-react';

interface MessageAttachment {
  filename: string;
  file_type: string;
  file_size: number;
  storage_url: string;
  text_length: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  type?: 'document_upload';
  attachment?: MessageAttachment;
}

// Human-readable labels for extraction preview
const SECTION_LABELS: Record<string, string> = {
  parties: 'Parties & Children',
  parties_children: 'Parties & Children',
  scope: 'Scope & Duration',
  scope_duration: 'Scope & Duration',
  schedule: 'Parenting Time',
  parenting_time: 'Parenting Time',
  logistics: 'Logistics & Transitions',
  logistics_transitions: 'Logistics & Transitions',
  decision_making: 'Decision-Making & Communication',
  decision_communication: 'Decision-Making & Communication',
  financial: 'Expenses & Financial',
  expenses_financial: 'Expenses & Financial',
  legal: 'Review & Sign',
  modification_disputes: 'Review & Sign',
};

const FIELD_LABELS: Record<string, string> = {
  custody_type: 'Custody Type',
  parent_a_name: 'Parent A',
  parent_b_name: 'Parent B',
  parent_a_role: 'Parent A Role',
  parent_b_role: 'Parent B Role',
  children: 'Children',
  state: 'State',
  county: 'County',
  effective_date: 'Effective Date',
  end_date: 'End Date',
  schedule_type: 'Schedule Type',
  weekday_schedule: 'Weekday Schedule',
  weekend_schedule: 'Weekend Schedule',
  holiday_schedule: 'Holiday Schedule',
  summer_schedule: 'Summer Schedule',
  pickup_time: 'Pickup Time',
  dropoff_time: 'Drop-off Time',
  pickup_location: 'Pickup Location',
  dropoff_location: 'Drop-off Location',
  transportation: 'Transportation',
  education_decisions: 'Education Decisions',
  healthcare_decisions: 'Healthcare Decisions',
  religious_decisions: 'Religious Decisions',
  communication_method: 'Communication Method',
  child_support: 'Child Support',
  expense_sharing: 'Expense Sharing',
  medical_expenses: 'Medical Expenses',
  dispute_resolution: 'Dispute Resolution',
  modification_process: 'Modification Process',
};

function humanizeFieldName(field: string): string {
  return FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function humanizeSectionName(section: string): string {
  return SECTION_LABELS[section] || section.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function AriaBuilderContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const agreementId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [extractionPreview, setExtractionPreview] = useState<any>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversation();
  }, [agreementId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async () => {
    try {
      const conversation = await agreementsAPI.getAriaConversation(agreementId);
      // Map API response to properly typed messages
      const typedMessages: Message[] = (conversation.messages || []).map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.timestamp,
        type: msg.type as 'document_upload' | undefined,
        attachment: msg.attachment as MessageAttachment | undefined,
      }));
      setMessages(typedMessages);
      setSummary(conversation.summary);

      // If no messages yet, show welcome message
      if (!conversation.messages || conversation.messages.length === 0) {
        setMessages([
          {
            role: 'assistant',
            content: `Hi! I'm ARIA, and I'm here to help you build your SharedCare agreement. There are a couple ways we can get started:

📄 **Upload an existing document** — If you already have a custody agreement, parenting plan, or court order, tap the paperclip button below and I'll read through it, pull out the key details, and use it as our starting point.

💬 **Just tell me about your arrangement** — Describe your custody situation in your own words and I'll ask the right questions to make sure we cover everything.

Either way, I'll organize everything into a clear agreement for you to review. What works best for you?`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await agreementsAPI.sendAriaMessage(agreementId, input);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I'm sorry, I encountered an error: ${error.message || 'Please try again.'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      // Generate summary
      const result = await agreementsAPI.generateAriaSummary(agreementId);
      setSummary(result.summary);

      // Auto-extract data to show preview of what will be mapped
      const extractionResult = await agreementsAPI.extractAriaData(agreementId);
      setExtractionPreview(extractionResult.extracted_data);

      setShowSummary(true);
    } catch (error: any) {
      console.error('Error generating summary:', error);
      alert(`Error generating summary: ${error.message}`);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Create your agreement from the extracted data? You can still review and edit everything in the agreement builder.')) {
      return;
    }

    setIsFinalizing(true);
    try {
      // Data already extracted, just finalize
      await agreementsAPI.finalizeAriaAgreement(agreementId);

      // Redirect to agreement builder to review
      router.push(`/agreements/${agreementId}/builder-v2`);
    } catch (error: any) {
      console.error('Error finalizing:', error);
      alert(`Error finalizing agreement: ${error.message}`);
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = '';

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const allowedExtensions = ['.pdf', '.docx'];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      alert('Please upload a PDF (.pdf) or Word document (.docx).');
      return;
    }

    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File is too large. Maximum size is 20 MB.');
      return;
    }

    // Add a placeholder user message with document card
    const uploadMessage: Message = {
      role: 'user',
      content: `Uploaded document: ${file.name}`,
      timestamp: new Date().toISOString(),
      type: 'document_upload',
      attachment: {
        filename: file.name,
        file_type: file.type || (ext === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        file_size: file.size,
        storage_url: '',
        text_length: 0,
      },
    };

    setMessages((prev) => [...prev, uploadMessage]);
    setIsUploading(true);

    try {
      const response = await agreementsAPI.uploadAriaDocument(agreementId, file);

      // Update the user message with real attachment data
      setMessages((prev) => {
        const updated = [...prev];
        const lastUserIdx = updated.length - 1;
        if (updated[lastUserIdx]?.type === 'document_upload') {
          updated[lastUserIdx] = {
            ...updated[lastUserIdx],
            attachment: response.document,
          };
        }
        return updated;
      });

      // Add ARIA's response
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error uploading document:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I'm sorry, I couldn't process your document: ${error.message || 'Please try again.'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-muted">
      <Navigation />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Talk to ARIA</h1>
              <p className="text-muted-foreground mt-2">
                Build your custody agreement through conversation
              </p>
            </div>
            <div className="flex gap-3">
              {messages.length > 2 && !showSummary && (
                <Button
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                  className="bg-[#2D8A70] hover:bg-[#2D8A70] text-white"
                >
                  {isGeneratingSummary ? 'Reviewing...' : 'Review & Create Agreement'}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => router.push(`/agreements/${agreementId}/builder-v2`)}
              >
                Switch to Wizard
              </Button>
            </div>
          </div>
        </div>

        {/* Summary View */}
        {showSummary && summary && (
          <>
            <Card className="mb-6 border-[#E0EFF8] bg-[#E0EFF8]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Agreement Summary</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowSummary(false)}>
                    Back to Chat
                  </Button>
                </div>
                <CardDescription>
                  Review what ARIA captured from your conversation. You can still edit everything after creating.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none whitespace-pre-wrap">
                  {summary}
                </div>
              </CardContent>
            </Card>

            {/* Extraction Preview - What ARIA Will Map */}
            {extractionPreview && Object.keys(extractionPreview).length > 0 && (
              <Card className="mb-6 border-[#E8F4F0] bg-[#E8F4F0]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-[#2D8A70]">✓</span>
                    What ARIA Extracted
                  </CardTitle>
                  <CardDescription>
                    Here's what I found in your conversation and where it will go. If something's missing or wrong, click "Continue Editing" to add more information.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(extractionPreview).map(([sectionName, fields]: [string, any]) => (
                      <div key={sectionName} className="border-l-4 border-[#3DAA8A] pl-4">
                        <h4 className="font-semibold text-foreground mb-2">{humanizeSectionName(sectionName)}</h4>
                        <div className="space-y-1">
                          {Array.isArray(fields) ? fields.map((item: any, idx: number) => (
                            <div key={idx} className="text-sm">
                              <span className="text-muted-foreground">{humanizeFieldName(item.field)}:</span>{' '}
                              <span className="font-medium text-foreground">
                                {Array.isArray(item.value) ? item.value.join(', ') : String(item.value)}
                              </span>
                            </div>
                          )) : (
                            <div className="text-sm text-muted-foreground">
                              {typeof fields === 'object' ? JSON.stringify(fields) : String(fields)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <Button
                      onClick={handleFinalize}
                      disabled={isFinalizing}
                      className="bg-[#2D8A70] hover:bg-[#2D8A70]"
                    >
                      {isFinalizing ? 'Finalizing...' : 'Looks Good - Create Agreement'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowSummary(false)}
                    >
                      Oops, I Forgot Something - Continue Editing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No extraction */}
            {extractionPreview && Object.keys(extractionPreview).length === 0 && (
              <Card className="mb-6 border-[#FEF7ED] bg-[#FEF7ED]">
                <CardContent className="pt-6">
                  <p className="text-[#E09520]">
                    I couldn't extract specific details yet. Click "Continue Editing" to provide more information about your custody arrangement.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowSummary(false)}
                    className="mt-4"
                  >
                    Continue Editing
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Chat Interface */}
        {!showSummary && (
          <Card className="h-[600px] flex flex-col">
            <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-[#2D6A8F] text-white'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-[#2D6A8F] rounded-full flex items-center justify-center text-white text-xs font-bold">
                          A
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">ARIA</span>
                      </div>
                    )}
                    {/* Document upload card */}
                    {message.type === 'document_upload' && message.attachment ? (
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${
                        message.role === 'user' ? 'bg-[#1E4E6B]/50' : 'bg-background'
                      }`}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          message.role === 'user' ? 'bg-[#2D6A8F]' : 'bg-[#E0EFF8]'
                        }`}>
                          <FileText className={`w-5 h-5 ${
                            message.role === 'user' ? 'text-white' : 'text-[#2D6A8F]'
                          }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${
                            message.role === 'user' ? 'text-white' : 'text-foreground'
                          }`}>
                            {message.attachment.filename}
                          </p>
                          <p className={`text-xs ${
                            message.role === 'user' ? 'text-[#E0EFF8]' : 'text-muted-foreground'
                          }`}>
                            {formatFileSize(message.attachment.file_size)}
                            {message.attachment.text_length > 0 && (
                              <> &middot; {message.attachment.text_length.toLocaleString()} chars extracted</>
                            )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {(isLoading || isUploading) && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    {isUploading && (
                      <p className="text-xs text-muted-foreground mt-1">Reading your document...</p>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input Area */}
            <div className="border-t p-4">
              <div className="flex gap-3 items-end">
                {/* Upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading}
                  className="flex-shrink-0 p-3 rounded-lg border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Upload an existing agreement (PDF or Word)"
                >
                  <Paperclip className="w-5 h-5 text-muted-foreground" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                  className="flex-1 px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#2D6A8F]"
                  rows={3}
                  disabled={isLoading || isUploading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || isUploading}
                  className="self-end"
                >
                  Send
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Speak naturally — or <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[#2D6A8F] hover:underline" disabled={isLoading || isUploading}>upload an existing agreement</button> for ARIA to review.
              </p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

export default function AriaBuilderPage() {
  return (
    <ProtectedRoute>
      <AriaBuilderContent />
    </ProtectedRoute>
  );
}
