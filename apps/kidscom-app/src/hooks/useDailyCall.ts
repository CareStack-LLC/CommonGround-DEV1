import { useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";

interface CallSession {
  roomUrl: string;
  token: string;
  roomName: string;
}

interface UseDailyCallReturn {
  session: CallSession | null;
  isLoading: boolean;
  error: string | null;
  startCall: (contactId: string) => Promise<boolean>;
  endCall: () => void;
}

const TOKEN_KEY = "kidscom_auth_token";

export function useDailyCall(): UseDailyCallReturn {
  const [session, setSession] = useState<CallSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCall = useCallback(async (contactId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/v1/calls/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contact_id: contactId,
          call_type: "kidscom",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to start call");
      }

      const data = await response.json();
      setSession({
        roomUrl: data.room_url,
        token: data.token,
        roomName: data.room_name,
      });

      return true;
    } catch (err: any) {
      setError(err.message || "Failed to start call");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const endCall = useCallback(() => {
    setSession(null);
    setError(null);
  }, []);

  return {
    session,
    isLoading,
    error,
    startCall,
    endCall,
  };
}
