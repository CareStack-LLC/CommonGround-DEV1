"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
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
  Clock,
  Lock,
  ChevronDown,
  ChevronUp,
  Crown,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useProfessionalAuth } from "../../layout";
import { useToast } from "@/hooks/use-toast";
import {
  INTAKE_TEMPLATES,
  type IntakeTemplate,
  type IntakeTemplateId,
} from "@/lib/intake-templates";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CreatedSession {
  id: string;
  intake_link: string;
  client_name: string;
  client_email: string;
}

// ── Template Card Component ────────────────────────────────────────

function TemplateCard({
  template,
  isSelected,
  isLocked,
  onSelect,
}: {
  template: IntakeTemplate;
  isSelected: boolean;
  isLocked: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        if (!isLocked) onSelect();
      }}
      disabled={isLocked}
      className={`
        relative w-full text-left rounded-xl border-2 p-4 transition-all duration-200
        ${isSelected
          ? "border-emerald-500 bg-emerald-50/80 shadow-md ring-1 ring-emerald-200"
          : isLocked
            ? "border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 cursor-pointer"
        }
      `}
    >
      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            <Crown className="h-3 w-3" />
            Pro
          </div>
        </div>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <span className="text-2xl" role="img">
          {template.icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm leading-tight">
            {template.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {template.description}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              ~{template.estimatedTime} min
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              {template.sections.length} sections
            </span>
            {template.formTargets.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {template.formTargets.length} form{template.formTargets.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Expandable sections preview */}
          {isSelected && (
            <div className="mt-3 pt-3 border-t border-emerald-200">
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Hide sections
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> View {template.sections.length} sections
                  </>
                )}
              </button>
              {expanded && (
                <ul className="mt-2 space-y-1">
                  {template.sections.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-xs text-emerald-900">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span>{s.title}</span>
                      {s.required ? (
                        <Badge variant="outline" className="text-[10px] py-0 px-1 h-4 border-emerald-300 text-emerald-700">
                          Required
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] py-0 px-1 h-4 text-muted-foreground">
                          Optional
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Main Page Component ─────────────────────────────────────────────

export default function NewIntakePage() {
  const router = useRouter();
  const { token, activeFirm, profile } = useProfessionalAuth();
  const { toast } = useToast();

  // Step: 1 = template selection, 2 = client details
  const [step, setStep] = useState(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSession, setCreatedSession] = useState<CreatedSession | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<IntakeTemplateId>("comprehensive-custody");
  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    notes: "",
    send_email: true,
  });

  // Determine tier from profile
  const userTier = (profile as any)?.subscription_tier || "starter";
  const isPaid = !["starter", ""].includes(userTier);

  const selectedTemplate = useMemo(
    () => INTAKE_TEMPLATES.find((t) => t.id === selectedTemplateId),
    [selectedTemplateId]
  );

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
          intake_type: selectedTemplate?.formTargets[0] || "custody",
          template_id: selectedTemplateId,
          notes: formData.notes || null,
          target_forms: selectedTemplate?.formTargets || [],
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
    setStep(1);
    setSelectedTemplateId("comprehensive-custody");
    setFormData({
      client_name: "",
      client_email: "",
      client_phone: "",
      notes: "",
      send_email: true,
    });
  };

  // ── Success State ──────────────────────────────────────────────────

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
              <p className="text-muted-foreground mb-2">
                {formData.send_email
                  ? `An email with the intake link has been sent to ${createdSession.client_email}`
                  : "Share the link below with your client to begin the intake process"}
              </p>
              {selectedTemplate && (
                <p className="text-sm text-emerald-700 mb-6">
                  Template: <strong>{selectedTemplate.icon} {selectedTemplate.name}</strong> (~{selectedTemplate.estimatedTime} min)
                </p>
              )}

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

  // ── Step 1: Template Selection ──────────────────────────────────────

  if (step === 1) {
    // Separate free and paid templates
    const freeTemplates = INTAKE_TEMPLATES.filter((t) => t.tier === "free");
    const paidTemplates = INTAKE_TEMPLATES.filter((t) => t.tier === "paid");

    return (
      <div className="max-w-3xl mx-auto space-y-6">
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
              Step 1 of 2 — Choose an intake template
            </p>
          </div>
        </div>

        {/* Free Templates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              Intake Templates
            </CardTitle>
            <CardDescription>
              Choose an intake template to guide ARIA's conversation with your client
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {freeTemplates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  isSelected={selectedTemplateId === t.id}
                  isLocked={false}
                  onSelect={() => setSelectedTemplateId(t.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Paid Templates */}
        {paidTemplates.length > 0 && (
          <Card className={!isPaid ? "border-amber-200" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                Professional Templates
                {!isPaid && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">
                    Upgrade Required
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isPaid
                  ? "Specialized templates available with your Professional plan"
                  : "Upgrade to Professional to access specialized templates"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paidTemplates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    isSelected={selectedTemplateId === t.id}
                    isLocked={!isPaid}
                    onSelect={() => setSelectedTemplateId(t.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Continue Button */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/professional/intake")}
          >
            Cancel
          </Button>
          <Button
            onClick={() => setStep(2)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 2: Client Details ──────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => setStep(1)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Template Selection
      </button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
          <Bot className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New ARIA Pro Intake</h1>
          <p className="text-muted-foreground">
            Step 2 of 2 — Enter client details
          </p>
        </div>
      </div>

      {/* Selected Template Summary */}
      {selectedTemplate && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{selectedTemplate.icon}</span>
                <div>
                  <p className="font-medium text-sm">{selectedTemplate.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ~{selectedTemplate.estimatedTime} min · {selectedTemplate.sections.length} sections
                    {selectedTemplate.formTargets.length > 0 && ` · ${selectedTemplate.formTargets.join(", ")}`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="text-xs text-emerald-700 hover:text-emerald-800"
              >
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
            </div>
          </CardContent>
        </Card>

        {/* ARIA Info */}
        <Card className="bg-purple-50/50 border-purple-200 mt-6">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900">Powered by ARIA Pro</h4>
                <p className="text-sm text-purple-700 mt-1">
                  Your client will have a guided conversation with ARIA using the{" "}
                  <strong>{selectedTemplate?.name}</strong> template.
                  After completion, you'll receive a comprehensive summary, extracted data,
                  and recommended next steps.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={() => setStep(1)}>
            Back
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
