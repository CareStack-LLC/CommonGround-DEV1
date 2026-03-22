/**
 * API client for the public-facing Aria chatbot.
 * No authentication required for public endpoints.
 */

let apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
if (apiUrl.endsWith("/")) apiUrl = apiUrl.slice(0, -1);
if (!apiUrl.endsWith("/api/v1")) apiUrl += "/api/v1";
const CHATBOT_API = `${apiUrl}/chatbot`;

export interface StartSessionResponse {
  session_id: string;
  greeting: string;
}

export interface SendMessageResponse {
  message_id: string;
  reply: string;
}

export interface UpdateVisitorResponse {
  success: boolean;
}

export interface EscalateResponse {
  success: boolean;
  message: string;
}

export async function startChatSession(
  sourcePage: string
): Promise<StartSessionResponse> {
  const res = await fetch(`${CHATBOT_API}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_page: sourcePage }),
  });
  if (!res.ok) throw new Error("Failed to start chat session");
  return res.json();
}

export async function sendChatMessage(
  sessionId: string,
  content: string
): Promise<SendMessageResponse> {
  const res = await fetch(`${CHATBOT_API}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, content }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to send message");
  }
  return res.json();
}

export async function updateChatVisitor(
  sessionId: string,
  info: { name?: string; email?: string; phone?: string }
): Promise<UpdateVisitorResponse> {
  const res = await fetch(`${CHATBOT_API}/visitors`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, ...info }),
  });
  if (!res.ok) throw new Error("Failed to update visitor info");
  return res.json();
}

export async function escalateChat(
  sessionId: string,
  reason?: string
): Promise<EscalateResponse> {
  const res = await fetch(`${CHATBOT_API}/escalate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, reason }),
  });
  if (!res.ok) throw new Error("Failed to escalate chat");
  return res.json();
}
