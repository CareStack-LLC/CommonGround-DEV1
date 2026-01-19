"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Send,
  Mail,
  User,
  FileText,
  Building2,
  Phone,
  Sparkles,
  CheckCircle2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useProfessionalAuth } from "../../layout";
import { useToast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const INTAKE_TYPES = [
  { value: "custody", label: "Custody Case", description: "Child custody and parenting time matters" },
  { value: "divorce", label: "Divorce", description: "Divorce proceedings with potential custody issues" },
  { value: "mediation", label: "Mediation", description: "Mediation intake for dispute resolution" },
  { value: "modification", label: "Modification", description: "Modification of existing orders" },
  { value: "general", label: "General Consultation", description: "Initial consultation intake" },
];

interface CreatedSession {
  id: string;
  intake_link: string;
  client_name: string;
  client_email: string;
}

export default function NewIntakePage() {
  const router = useRouter();
  const { token, activeFirm, profile } = useProfessionalAuth();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSession, setCreatedSession] = useState<CreatedSession | null>(null);
  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    intake_type: "custody",
    notes: "",
    send_email: true,
    use_firm_template: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/professional/intake/sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: formData.client_name,
          client_email: formData.client_email,
          client_phone: formData.client_phone || null,
          intake_type: formData.intake_type,
          notes: formData.notes || null,
          firm_id: activeFirm?.id,
          send_email: formData.send_email,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedSession(data);
        toast({
          title: "Intake created successfully",
          description: formData.send_email
            ? `An intake link has been sent to ${formData.client_email}`
            : "Intake session created. Copy the link to share with your client.",
        });
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create intake");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create intake session",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = () => {
    if (createdSession?.intake_link) {
      navigator.clipboard.writeText(createdSession.intake_link);
      toast({
        title: "Link copied",
        description: "Intake link copied to clipboard",
      });
    }
  };

  const resetForm = () => {
    setCreatedSession(null);
    setFormData({
      client_name: "",
      client_email: "",
      client_phone: "",
      intake_type: "custody",
      notes: "",
      send_email: true,
      use_firm_template: true,
    });
  };

  // Success state - show created session info
  if (createdSession) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/professional/intake"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Intake Center
        </Link>

        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Intake Created Successfully</h2>
              <p className="text-muted-foreground mb-6">
                {formData.send_email
                  ? `An email with the intake link has been sent to ${createdSession.client_email}`
                  : "Share the link below with your client to begin the intake process"}
              </p>

              <div className="bg-white border rounded-lg p-4 mb-6">
                <Label className="text-xs text-muted-foreground">Intake Link</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={createdSession.intake_link}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(createdSession.intake_link, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={resetForm}>
                  Create Another
                </Button>
                <Button
                  onClick={() => router.push(`/professional/intake/${createdSession.id}`)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  View Session
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/professional/intake"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Intake Center
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
          <Bot className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New ARIA Pro Intake</h1>
          <p className="text-muted-foreground">
            Create an AI-powered intake session for a prospective client
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Information</CardTitle>
            <CardDescription>
              Enter your client's details to generate a personalized intake link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Name */}
            <div className="space-y-2">
              <Label htmlFor="client_name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Client Name *
              </Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, client_name: e.target.value }))}
                placeholder="John Smith"
                required
              />
            </div>

            {/* Client Email */}
            <div className="space-y-2">
              <Label htmlFor="client_email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Client Email *
              </Label>
              <Input
                id="client_email"
                type="email"
                value={formData.client_email}
                onChange={(e) => setFormData((prev) => ({ ...prev, client_email: e.target.value }))}
                placeholder="john@example.com"
                required
              />
            </div>

            {/* Client Phone */}
            <div className="space-y-2">
              <Label htmlFor="client_phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Client Phone (Optional)
              </Label>
              <Input
                id="client_phone"
                type="tel"
                value={formData.client_phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, client_phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Intake Type */}
            <div className="space-y-2">
              <Label htmlFor="intake_type" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Intake Type *
              </Label>
              <Select
                value={formData.intake_type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, intake_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTAKE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Internal Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Internal Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any internal notes for your team about this intake..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                These notes are for internal use only and won't be shared with the client.
              </p>
            </div>

            {/* Options */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Send Email Invitation</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically send the intake link to the client's email
                  </p>
                </div>
                <Switch
                  checked={formData.send_email}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, send_email: checked }))
                  }
                />
              </div>

              {activeFirm && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Use Firm Template
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Use your firm's custom intake template if available
                    </p>
                  </div>
                  <Switch
                    checked={formData.use_firm_template}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, use_firm_template: checked }))
                    }
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ARIA Info */}
        <Card className="bg-purple-50/50 border-purple-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900">Powered by ARIA Pro</h4>
                <p className="text-sm text-purple-700 mt-1">
                  Your client will have a guided conversation with ARIA, our AI assistant.
                  After completion, you'll receive a comprehensive summary, extracted data,
                  and recommended next steps.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/professional/intake")}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.client_name || !formData.client_email}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? (
              "Creating..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Create Intake
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
