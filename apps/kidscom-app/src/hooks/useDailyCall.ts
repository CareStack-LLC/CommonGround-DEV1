import { useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";

interface CallSession {
  sessionId: string;
  roomUrl: string;
  token: string;
  roomName: string;
}

interface UseDailyCallReturn {
  session: CallSession | null;
  isLoading: boolean;
  error: string | null;
  startCall: (contactId: string, callType?: "video" | "voice") => Promise<boolean>;
  endCall: () => Promise<void>;
}

const TOKEN_KEY = "kidscom_auth_token";

export function useDailyCall(): UseDailyCallReturn {
  const [session, setSession] = useState<CallSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCall = useCallback(async (contactId: string, callType: "video" | "voice" = "video"): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";

      // Use the KidComs session creation endpoint
      const response = await fetch(`${apiUrl}/api/v1/kidcoms/sessions/child/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          circle_contact_id: contactId,
          call_type: callType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to start call (${response.status})`);
      }

      const data = await response.json();

      setSession({
        sessionId: data.session_id,
        roomUrl: data.room_url,
        token: data.token,
        roomName: data.room_name,
      });

      return true;
    } catch (err: any) {
      console.error("Failed to start call:", err);
      setError(err.message || "Failed to start call");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const endCall = useCallback(async () => {
    if (session?.sessionId) {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
          const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";
          await fetch(`${apiUrl}/api/v1/kidcoms/sessions/${session.sessionId}/end`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }
      } catch (err) {
        console.error("Error ending call session:", err);
      }
    }
    setSession(null);
    setError(null);
  }, [session?.sessionId]);

  return {
    session,
    isLoading,
    error,
    startCall,
    endCall,
  };
}
