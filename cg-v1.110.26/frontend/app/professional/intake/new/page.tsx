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
  Phone,
  Sparkles,
  CheckCircle2,
  Copy,
  ExternalLink,
  Clock,
  ChevronDown,
  ChevronUp,
  Crown,
  Loader2,
  StickyNote,
} from "lucide-react";
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

// ── Step indicator ──────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${current >= 1 ? "bg-[#3DAA8A] text-white" : "bg-slate-200 text-slate-500"}`}>1</div>
      <div className={`w-12 h-0.5 rounded-full ${current >= 2 ? "bg-[#3DAA8A]" : "bg-slate-200"}`} />
      <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${current >= 2 ? "bg-[#3DAA8A] text-white" : "bg-slate-200 text-slate-500"}`}>2</div>
    </div>
  );
}

// ── Template Card ───────────────────────────────────────────────────

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
      onClick={() => { if (!isLocked) onSelect(); }}
      disabled={isLocked}
      className={`
        relative w-full text-left rounded-2xl border p-4 transition-all duration-200
        ${isSelected
          ? "border-[#3DAA8A] bg-[#F4F8F7] shadow-sm ring-1 ring-[#3DAA8A]/20"
          : isLocked
            ? "border-slate-100 bg-slate-50/50 opacity-60 cursor-not-allowed"
            : "border-slate-200 hover:border-[#3DAA8A]/30 hover:bg-[#F4F8F7]/30 cursor-pointer"
        }
      `}
    >
      {isLocked && (
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 rounded-full px-2 py-0.5">
            <Crown className="h-2.5 w-2.5" /> Pro
          </span>
        </div>
      )}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="h-5 w-5 text-[#3DAA8A]" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5 shrink-0" role="img">{template.icon}</span>
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="font-semibold text-slate-900 text-sm leading-tight">{template.name}</h3>
          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{template.description}</p>

          {/* Role badges */}
          {template.bestFor.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {template.bestFor.map((role) => (
                <span key={role} className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-px rounded-md bg-slate-100 text-slate-500">
                  {role}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2.5 mt-2.5">
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="h-3 w-3" /> {template.estimatedTime} min
            </span>
            <span className="w-px h-3 bg-slate-200" />
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <FileText className="h-3 w-3" /> {template.sections.length} sections
            </span>
            {template.formTargets.length > 0 && (
              <>
                <span className="w-px h-3 bg-slate-200" />
                <span className="text-[11px] text-slate-400">
                  {template.formTargets.length} form{template.formTargets.length > 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>

          {/* Expandable sections */}
          {isSelected && (
            <div className="mt-3 pt-3 border-t border-[#3DAA8A]/15">
              <button
                type="button"
                className="flex items-center gap-1 text-[11px] font-medium text-[#3DAA8A] hover:text-[#2D8A6E]"
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              >
                {expanded ? <><ChevronUp className="h-3 w-3" /> Hide sections</> : <><ChevronDown className="h-3 w-3" /> View {template.sections.length} sections</>}
              </button>
              {expanded && (
                <ul className="mt-2 space-y-1">
                  {template.sections.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-[11px] text-slate-600">
                      <span className="w-1 h-1 rounded-full bg-[#3DAA8A] shrink-0" />
                      <span className="flex-1">{s.title}</span>
                      <span className={`text-[9px] font-medium ${s.required ? "text-[#3DAA8A]" : "text-slate-400"}`}>
                        {s.required ? "Required" : "Optional"}
                      </span>
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

// ── Main Page ───────────────────────────────────────────────────────

export default function NewIntakePage() {
  const router = useRouter();
  const { token, activeFirm, profile } = useProfessionalAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
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
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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
          title: "Intake created",
          description: formData.send_email
            ? `Link sent to ${formData.client_email}`
            : "Copy the link to share with your client.",
        });
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create intake");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create intake session", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = () => {
    if (createdSession?.intake_link) {
      navigator.clipboard.writeText(createdSession.intake_link);
      toast({ title: "Copied", description: "Intake link copied to clipboard" });
    }
  };

  const resetForm = () => {
    setCreatedSession(null);
    setStep(1);
    setSelectedTemplateId("comprehensive-custody");
    setFormData({ client_name: "", client_email: "", client_phone: "", notes: "", send_email: true });
  };

  // ── Success ─────────────────────────────────────────────────────────

  if (createdSession) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Link href="/professional/intake" className="inline-flex items-center gap-1.5 text-xs text-[#3DAA8A] hover:text-[#2D8A6E] font-medium">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Intake Center
        </Link>

        <div className="rounded-2xl border border-[#3DAA8A]/20 bg-[#F4F8F7] p-8 text-center">
          <div className="mx-auto w-14 h-14 bg-white text-[#3DAA8A] rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-[#3DAA8A]/10">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-[#1E3A4A]">Intake Created</h2>
          <p className="text-sm text-slate-500 mt-1.5">
            {formData.send_email
              ? `Email sent to ${createdSession.client_email}`
              : "Share the link below with your client"}
          </p>
          {selectedTemplate && (
            <p className="text-xs text-[#3DAA8A] font-medium mt-2">
              {selectedTemplate.icon} {selectedTemplate.name} · ~{selectedTemplate.estimatedTime} min
            </p>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-3 mt-5">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Client Link</label>
            <div className="flex items-center gap-2 mt-1.5">
              <Input value={createdSession.intake_link} readOnly className="font-mono text-xs border-slate-200 bg-slate-50" />
              <Button variant="outline" size="icon" onClick={copyLink} className="h-9 w-9 rounded-lg shrink-0 border-slate-200">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => window.open(createdSession.intake_link, "_blank")} className="h-9 w-9 rounded-lg shrink-0 border-slate-200">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex justify-center gap-3 mt-6">
            <Button variant="outline" onClick={resetForm} className="rounded-xl border-slate-200">Create Another</Button>
            <Button onClick={() => router.push(`/professional/intake/${createdSession.id}`)} className="bg-[#3DAA8A] hover:bg-[#2D8A6E] rounded-xl">View Session</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: Template Selection ────────────────────────────────────

  if (step === 1) {
    const freeTemplates = INTAKE_TEMPLATES.filter((t) => t.tier === "free");
    const paidTemplates = INTAKE_TEMPLATES.filter((t) => t.tier === "paid");

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/professional/intake" className="inline-flex items-center gap-1.5 text-xs text-[#3DAA8A] hover:text-[#2D8A6E] font-medium">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Intake Center
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New ARIA Intake</h1>
            <p className="text-sm text-slate-500 mt-1">Choose a template to guide the client conversation</p>
          </div>
          <StepIndicator current={1} />
        </div>

        {/* Free Templates */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-[#3DAA8A]" />
            <h2 className="text-sm font-semibold text-slate-900">Intake Templates</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {freeTemplates.map((t) => (
              <TemplateCard key={t.id} template={t} isSelected={selectedTemplateId === t.id} isLocked={false} onSelect={() => setSelectedTemplateId(t.id)} />
            ))}
          </div>
        </div>

        {/* Paid Templates */}
        {paidTemplates.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-4 w-4 text-[#D4AF37]" />
              <h2 className="text-sm font-semibold text-slate-900">Professional Templates</h2>
              {!isPaid && (
                <Badge className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200/60 font-semibold">
                  Upgrade Required
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {paidTemplates.map((t) => (
                <TemplateCard key={t.id} template={t} isSelected={selectedTemplateId === t.id} isLocked={!isPaid} onSelect={() => setSelectedTemplateId(t.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Continue */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => router.push("/professional/intake")} className="rounded-xl border-slate-200">Cancel</Button>
          <Button onClick={() => setStep(2)} className="bg-[#3DAA8A] hover:bg-[#2D8A6E] rounded-xl gap-2">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 2: Client Details ────────────────────────────────────────

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 text-xs text-[#3DAA8A] hover:text-[#2D8A6E] font-medium">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Templates
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Client Details</h1>
          <p className="text-sm text-slate-500 mt-1">Enter client info to generate a personalized intake link</p>
        </div>
        <StepIndicator current={2} />
      </div>

      {/* Selected template chip */}
      {selectedTemplate && (
        <div className="flex items-center justify-between rounded-xl bg-[#F4F8F7] border border-[#3DAA8A]/10 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{selectedTemplate.icon}</span>
            <div>
              <p className="text-sm font-semibold text-[#1E3A4A]">{selectedTemplate.name}</p>
              <p className="text-[11px] text-slate-500">
                {selectedTemplate.estimatedTime} min · {selectedTemplate.sections.length} sections
                {selectedTemplate.formTargets.length > 0 && ` · ${selectedTemplate.formTargets.join(", ")}`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs text-[#3DAA8A] hover:text-[#2D8A6E] hover:bg-[#3DAA8A]/5 rounded-lg h-8">
            Change
          </Button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          {/* Name + Email row */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="client_name" className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" /> Client Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, client_name: e.target.value }))}
                placeholder="Jane Smith"
                required
                className="border-slate-200 focus:border-[#3DAA8A] focus:ring-[#3DAA8A]/20 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client_email" className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> Client Email <span className="text-red-400">*</span>
              </Label>
              <Input
                id="client_email"
                type="email"
                value={formData.client_email}
                onChange={(e) => setFormData((prev) => ({ ...prev, client_email: e.target.value }))}
                placeholder="jane@example.com"
                required
                className="border-slate-200 focus:border-[#3DAA8A] focus:ring-[#3DAA8A]/20 rounded-lg"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="client_phone" className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-slate-400" /> Client Phone <span className="text-slate-400 font-normal">(Optional)</span>
            </Label>
            <Input
              id="client_phone"
              type="tel"
              value={formData.client_phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, client_phone: e.target.value }))}
              placeholder="(555) 123-4567"
              className="border-slate-200 focus:border-[#3DAA8A] focus:ring-[#3DAA8A]/20 rounded-lg"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5 text-slate-400" /> Internal Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes for your team about this intake..."
              rows={3}
              className="border-slate-200 focus:border-[#3DAA8A] focus:ring-[#3DAA8A]/20 rounded-lg resize-none"
            />
            <p className="text-[10px] text-slate-400">Not shared with the client.</p>
          </div>

          {/* Send email toggle */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Send Email Invitation</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Automatically email the intake link to your client</p>
            </div>
            <Switch
              checked={formData.send_email}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, send_email: checked }))}
            />
          </div>
        </div>

        {/* ARIA info */}
        <div className="rounded-xl bg-[#F4F8F7] border border-[#3DAA8A]/10 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-[#3DAA8A] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#1E3A4A]">Powered by ARIA Pro</p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Your client will have a guided conversation with ARIA using <strong>{selectedTemplate?.name}</strong>.
                You'll receive a summary, extracted data, and recommended next steps.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setStep(1)} className="rounded-xl border-slate-200">Back</Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.client_name || !formData.client_email}
            className="bg-[#3DAA8A] hover:bg-[#2D8A6E] rounded-xl gap-2 min-w-[140px]"
          >
            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : <><Send className="h-4 w-4" /> Create Intake</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
