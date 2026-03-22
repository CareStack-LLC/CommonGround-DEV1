"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ChatbotVisitorFormProps {
  onSubmit: (info: { name: string; email: string; phone?: string }) => void;
  onSkip: () => void;
}

export function ChatbotVisitorForm({ onSubmit, onSkip }: ChatbotVisitorFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onSubmit({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined });
  };

  return (
    <div className="mx-4 my-2 rounded-xl border border-gray-200 bg-gray-50 p-3.5">
      <p className="text-xs text-gray-500 mb-2.5">
        Share your info so our team can follow up if needed
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-sm px-3 rounded-md border border-gray-300 bg-white text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#3DAA8A] focus:ring-1 focus:ring-[#3DAA8A]/30"
          required
        />
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-8 text-sm px-3 rounded-md border border-gray-300 bg-white text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#3DAA8A] focus:ring-1 focus:ring-[#3DAA8A]/30"
          required
        />
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-8 text-sm px-3 rounded-md border border-gray-300 bg-white text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#3DAA8A] focus:ring-1 focus:ring-[#3DAA8A]/30"
        />
        <div className="flex gap-2 mt-1">
          <Button
            type="submit"
            size="sm"
            className="flex-1 h-8 text-xs bg-[#3DAA8A] hover:bg-[#35977a] text-white"
          >
            Submit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="h-8 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            Skip
          </Button>
        </div>
      </form>
    </div>
  );
}
