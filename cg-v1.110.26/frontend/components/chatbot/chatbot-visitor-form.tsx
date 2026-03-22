"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="mx-4 my-2 rounded-xl border bg-card p-3.5">
      <p className="text-xs text-muted-foreground mb-2.5">
        Share your info so our team can follow up if needed
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-sm"
          required
        />
        <Input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-8 text-sm"
          required
        />
        <Input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-8 text-sm"
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
            className="h-8 text-xs text-muted-foreground"
          >
            Skip
          </Button>
        </div>
      </form>
    </div>
  );
}
