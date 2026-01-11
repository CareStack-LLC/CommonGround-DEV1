'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { quickAccordsAPI, familyFilesAPI, FamilyFileDetail } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer } from '@/components/layout';
import {
  ArrowLeft,
  Zap,
  AlertCircle,
  Send,
  Bot,
  User,
  CheckCircle,
  Plane,
  CalendarSync,
  PartyPopper,
  Moon,
  DollarSign,
  MoreHorizontal,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function NewQuickAccordContent() {
  const router = useRouter();
  const params = useParams();
  const familyFileId = params.id as string;

  const [familyFile, setFamilyFile] = useState<FamilyFileDetail | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [extractedData, setExtractedData] = useState<Record<string, any> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFamilyFile();
  }, [familyFileId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadFamilyFile = async () => {
    try {
      setIsLoading(true);
      const data = await familyFilesAPI.get(familyFileId);
      setFamilyFile(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load family file');
    } finally {
      setIsLoading(false);
    }
  };

  const startConversation = async () => {
    try {
      setIsSending(true);
      const result = await quickAccordsAPI.aria.start(familyFileId);
      setConversationId(result.conversation_id);
      setMessages([{ role: 'assistant', content: result.response }]);
      setExtractedData(result.extracted_data);
      setIsReady(result.is_ready_to_create);
    } catch (err: any) {
      setError(err.message || 'Failed to start ARIA conversation');
    } finally {
      setIsSending(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !conversationId || isSending) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      setIsSending(true);
      const result = await quickAccordsAPI.aria.sendMessage(conversationId, userMessage);
      setMessages((prev) => [...prev, { role: 'assistant', content: result.response }]);
      setExtractedData(result.extracted_data);
      setIsReady(result.is_ready_to_create);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const createQuickAccord = async () => {
    if (!conversationId || !isReady) return;

    try {
      setIsCreating(true);
      const result = await quickAccordsAPI.aria.create(conversationId);
      router.push(`/family-files/${familyFileId}/quick-accord/${result.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create QuickAccord');
    } finally {
      setIsCreating(false);
    }
  };

  const selectCategory = (category: string) => {
    const categoryMessages: Record<string, string> = {
      travel: "I need to arrange a trip with the kids",
      schedule_swap: "I'd like to swap custody days",
      special_event: "There's a special event I want to take the kids to",
      overnight: "I need to arrange an overnight stay",
      expense: "I need to agree on a shared expense",
      other: "I have a situation I need to create an agreement for",
    };
    setInputValue(categoryMessages[category] || '');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!conversationId) {
        startConversation();
      } else {
        sendMessage();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            New QuickAccord
          </h1>
          <p className="text-muted-foreground">
            {familyFile?.title || 'Loading...'}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Category Selector (before conversation starts) */}
      {!conversationId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What type of arrangement do you need?</CardTitle>
            <CardDescription>
              Select a category to get started, or just tell ARIA what you need
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={() => selectCategory('travel')}
              >
                <Plane className="h-6 w-6 text-blue-500" />
                <span>Travel</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={() => selectCategory('schedule_swap')}
              >
                <CalendarSync className="h-6 w-6 text-green-500" />
                <span>Schedule Swap</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={() => selectCategory('special_event')}
              >
                <PartyPopper className="h-6 w-6 text-purple-500" />
                <span>Special Event</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={() => selectCategory('overnight')}
              >
                <Moon className="h-6 w-6 text-indigo-500" />
                <span>Overnight</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={() => selectCategory('expense')}
              >
                <DollarSign className="h-6 w-6 text-emerald-500" />
                <span>Expense</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={() => selectCategory('other')}
              >
                <MoreHorizontal className="h-6 w-6 text-gray-500" />
                <span>Other</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Interface */}
      <Card className="flex flex-col h-[500px]">
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-cg-sage" />
            <CardTitle className="text-lg text-foreground">Chat with ARIA</CardTitle>
          </div>
          <CardDescription>
            Describe your situation and ARIA will help create the agreement
          </CardDescription>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !conversationId && (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 text-cg-sage/50" />
              <p>Select a category above or describe what you need</p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-cg-sage/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-cg-sage" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-cg-sage text-white'
                    : 'bg-card border border-border text-foreground'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-cg-sage/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-cg-sage" />
                </div>
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-cg-sage/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-cg-sage animate-pulse" />
              </div>
              <div className="bg-card border border-border rounded-lg px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-cg-sage rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-cg-sage rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-cg-sage rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <div className="border-t p-4">
          {isReady && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Ready to create! Review the summary above and click "Create QuickAccord" when you're satisfied.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Input
              placeholder={conversationId ? "Type your message..." : "Describe what you need..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSending || isCreating}
              className="flex-1"
            />
            {!conversationId ? (
              <Button
                onClick={startConversation}
                disabled={!inputValue.trim() || isSending}
              >
                Start
              </Button>
            ) : isReady ? (
              <Button
                onClick={createQuickAccord}
                disabled={isCreating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isCreating ? 'Creating...' : 'Create QuickAccord'}
              </Button>
            ) : (
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isSending}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Extracted Data Preview */}
      {extractedData && Object.keys(extractedData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Extracted Information</CardTitle>
            <CardDescription>
              ARIA has gathered this information from your conversation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              {extractedData.title && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Title</span>
                  <span className="font-medium">{extractedData.title}</span>
                </div>
              )}
              {extractedData.purpose_category && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium capitalize">{extractedData.purpose_category.replace('_', ' ')}</span>
                </div>
              )}
              {extractedData.event_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{extractedData.event_date}</span>
                </div>
              )}
              {(extractedData.start_date || extractedData.end_date) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date Range</span>
                  <span className="font-medium">
                    {extractedData.start_date} - {extractedData.end_date}
                  </span>
                </div>
              )}
              {extractedData.child_names?.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Children</span>
                  <span className="font-medium">{extractedData.child_names.join(', ')}</span>
                </div>
              )}
              {extractedData.location && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">{extractedData.location}</span>
                </div>
              )}
              {extractedData.has_shared_expense && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shared Expense</span>
                  <span className="font-medium">
                    ${extractedData.estimated_amount || 'TBD'}
                  </span>
                </div>
              )}
              {extractedData.missing_info?.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <span className="text-muted-foreground">Still needed: </span>
                  <span className="text-yellow-600">{extractedData.missing_info.join(', ')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function NewQuickAccordPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation />
        <PageContainer className="pb-32">
          <NewQuickAccordContent />
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}
