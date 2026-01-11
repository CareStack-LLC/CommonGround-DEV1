'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Navigation } from '@/components/navigation';
import { agreementsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/protected-route';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      }));
      setMessages(typedMessages);
      setSummary(conversation.summary);

      // If no messages yet, show welcome message
      if (!conversation.messages || conversation.messages.length === 0) {
        setMessages([
          {
            role: 'assistant',
            content: `Hi! I'm ARIA, and I'm here to help you create your custody agreement in a way that feels natural.

Instead of filling out forms, just tell me about your custody arrangement in your own words. What matters most to you and your family?

I'll ask questions to make sure we cover everything important, and at the end, I'll create a clear summary for you to review.`,
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
    if (!confirm('Are you sure you want to finalize this agreement? This will populate sections 4-18 with the data shown above.')) {
      return;
    }

    setIsFinalizing(true);
    try {
      // Data already extracted, just finalize
      await agreementsAPI.finalizeAriaAgreement(agreementId);

      // Redirect to agreement builder to review
      router.push(`/agreements/${agreementId}/builder`);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Talk to ARIA</h1>
              <p className="text-gray-600 mt-2">
                Build your custody agreement through conversation
              </p>
            </div>
            <div className="flex gap-3">
              {messages.length > 2 && !showSummary && (
                <Button
                  variant="outline"
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                >
                  {isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => router.push(`/agreements/${agreementId}/builder`)}
              >
                Switch to Wizard
              </Button>
            </div>
          </div>
        </div>

        {/* Summary View */}
        {showSummary && summary && (
          <>
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Agreement Summary</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowSummary(false)}>
                    Back to Chat
                  </Button>
                </div>
                <CardDescription>
                  Review this summary and make sure everything is correct
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
              <Card className="mb-6 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    What ARIA Extracted
                  </CardTitle>
                  <CardDescription>
                    Here's what I found in your conversation and where it will go. If something's missing or wrong, click "Continue Editing" to add more information.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(extractionPreview).map(([sectionName, fields]: [string, any]) => (
                      <div key={sectionName} className="border-l-4 border-green-500 pl-4">
                        <h4 className="font-semibold text-gray-900 mb-2">{sectionName}</h4>
                        <div className="space-y-1">
                          {fields.map((item: any, idx: number) => (
                            <div key={idx} className="text-sm">
                              <span className="text-gray-600">{item.field}:</span>{' '}
                              <span className="font-medium text-gray-900">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <Button
                      onClick={handleFinalize}
                      disabled={isFinalizing}
                      className="bg-green-600 hover:bg-green-700"
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
              <Card className="mb-6 border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <p className="text-yellow-800">
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
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          A
                        </div>
                        <span className="text-xs font-semibold text-gray-600">ARIA</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input Area */}
            <div className="border-t p-4">
              <div className="flex gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                  className="flex-1 px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="self-end"
                >
                  Send
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Speak naturally - ARIA understands casual language and will help organize everything.
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
