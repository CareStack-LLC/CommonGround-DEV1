"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Scale,
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type CourtRole =
  | "court_clerk"
  | "gal"
  | "attorney_petitioner"
  | "attorney_respondent"
  | "mediator"
  | "judge";

interface RegistrationData {
  email: string;
  full_name: string;
  phone: string;
  role: CourtRole;
  organization: string;
  title: string;
  bar_number: string;
  court_id: string;
}

export default function CourtRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"info" | "role" | "verify">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const [formData, setFormData] = useState<RegistrationData>({
    email: "",
    full_name: "",
    phone: "",
    role: "gal",
    organization: "",
    title: "",
    bar_number: "",
    court_id: "",
  });

  const updateForm = (field: keyof RegistrationData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email.trim() || !formData.full_name.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setStep("role");
  };

  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.organization.trim()) {
      setError("Please enter your organization");
      return;
    }

    setStep("verify");
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Create the professional account
      const response = await fetch(`${API_BASE}/court/professionals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone || undefined,
          role: formData.role,
          organization: formData.organization,
          title: formData.title || undefined,
          credentials: {
            bar_number: formData.bar_number || undefined,
            court_id: formData.court_id || undefined,
          },
        }),
      });

      if (response.ok) {
        const professional = await response.json();

        // For MVP, auto-verify the professional
        await fetch(`${API_BASE}/court/professionals/${professional.id}/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            verification_method: "email",
            credentials: { email_verified: true },
          }),
        });

        setRegistrationComplete(true);
      } else {
        const errorData = await response.json();
        if (errorData.detail === "Email already registered") {
          setError("An account with this email already exists. Please log in instead.");
        } else {
          setError(errorData.detail || "Registration failed. Please try again.");
        }
      }
    } catch (err: any) {
      console.error("Registration failed:", err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleLabel = (role: CourtRole) => {
    const labels: Record<CourtRole, string> = {
      gal: "Guardian ad Litem (GAL)",
      attorney_petitioner: "Attorney (Petitioner)",
      attorney_respondent: "Attorney (Respondent)",
      mediator: "Mediator",
      court_clerk: "Court Clerk",
      judge: "Judge",
    };
    return labels[role];
  };

  const getRoleDescription = (role: CourtRole) => {
    const descriptions: Record<CourtRole, string> = {
      gal: "Court-appointed advocate for the child's best interests",
      attorney_petitioner: "Legal representative for the petitioner (filing party)",
      attorney_respondent: "Legal representative for the respondent",
      mediator: "Neutral third party helping resolve disputes",
      court_clerk: "Court administrative staff managing case records",
      judge: "Judicial officer presiding over family court matters",
    };
    return descriptions[role];
  };

  // Success state
  if (registrationComplete) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 bg-cg-success/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-cg-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Registration Complete!</h2>
            <p className="text-muted-foreground mb-6">
              Your account has been created and verified. You can now log in to access the Court Portal.
            </p>
            <div className="space-y-3">
              <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700">
                <Link href="/court-portal/login">
                  Continue to Login
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Use access code <strong>123456</strong> to complete login (demo mode)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
            <Scale className="h-8 w-8 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl">Professional Registration</CardTitle>
          <CardDescription>
            Create your Court Portal account
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-6">
            <StepIndicator
              step={1}
              label="Information"
              current={step === "info"}
              complete={step === "role" || step === "verify"}
            />
            <div className="w-12 h-0.5 bg-border" />
            <StepIndicator
              step={2}
              label="Role"
              current={step === "role"}
              complete={step === "verify"}
            />
            <div className="w-12 h-0.5 bg-border" />
            <StepIndicator
              step={3}
              label="Verify"
              current={step === "verify"}
              complete={false}
            />
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Basic Information */}
          {step === "info" && (
            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="Jane Smith"
                    value={formData.full_name}
                    onChange={(e) => updateForm("full_name", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Professional Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane.smith@lawfirm.com"
                    value={formData.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use your verified court or law firm email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/court-portal/login" className="text-indigo-600 hover:underline">
                  Log in
                </Link>
              </p>
            </form>
          )}

          {/* Step 2: Role & Organization */}
          {step === "role" && (
            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Professional Role *</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => updateForm("role", e.target.value as CourtRole)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="gal">Guardian ad Litem (GAL)</option>
                  <option value="attorney_petitioner">Attorney (Petitioner)</option>
                  <option value="attorney_respondent">Attorney (Respondent)</option>
                  <option value="mediator">Mediator</option>
                  <option value="court_clerk">Court Clerk</option>
                  <option value="judge">Judge</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  {getRoleDescription(formData.role)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization *</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="organization"
                    type="text"
                    placeholder="Law Office of Jane Smith"
                    value={formData.organization}
                    onChange={(e) => updateForm("organization", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="title"
                    type="text"
                    placeholder="Family Law Attorney"
                    value={formData.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Show bar number for attorneys */}
              {(formData.role === "attorney_petitioner" || formData.role === "attorney_respondent") && (
                <div className="space-y-2">
                  <Label htmlFor="bar_number">Bar Number</Label>
                  <Input
                    id="bar_number"
                    type="text"
                    placeholder="CA12345"
                    value={formData.bar_number}
                    onChange={(e) => updateForm("bar_number", e.target.value)}
                  />
                </div>
              )}

              {/* Show court ID for court staff */}
              {(formData.role === "court_clerk" || formData.role === "judge") && (
                <div className="space-y-2">
                  <Label htmlFor="court_id">Court ID</Label>
                  <Input
                    id="court_id"
                    type="text"
                    placeholder="SDFC-001"
                    value={formData.court_id}
                    onChange={(e) => updateForm("court_id", e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("info")}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Review & Verify */}
          {step === "verify" && (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
                <h3 className="font-medium text-foreground">Review Your Information</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Name:</dt>
                    <dd className="font-medium text-foreground">{formData.full_name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Email:</dt>
                    <dd className="font-medium text-foreground">{formData.email}</dd>
                  </div>
                  {formData.phone && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Phone:</dt>
                      <dd className="font-medium text-foreground">{formData.phone}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Role:</dt>
                    <dd className="font-medium text-foreground">{getRoleLabel(formData.role)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Organization:</dt>
                    <dd className="font-medium text-foreground">{formData.organization}</dd>
                  </div>
                  {formData.title && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Title:</dt>
                      <dd className="font-medium text-foreground">{formData.title}</dd>
                    </div>
                  )}
                  {formData.bar_number && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Bar Number:</dt>
                      <dd className="font-medium text-foreground">{formData.bar_number}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="p-3 bg-indigo-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-indigo-800">
                    <p className="font-medium">Professional Verification</p>
                    <p className="text-indigo-700 text-xs mt-1">
                      For MVP demo, your account will be automatically verified.
                      In production, verification would include bar number validation
                      and court email confirmation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("role")}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Footer info */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="text-xs text-muted-foreground space-y-1.5">
              <p>By registering, you agree to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Access case data only for authorized purposes</li>
                <li>Maintain confidentiality of all information</li>
                <li>Allow activity logging and auditing</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StepIndicator({
  step,
  label,
  current,
  complete,
}: {
  step: number;
  label: string;
  current: boolean;
  complete: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
          complete
            ? "bg-cg-success text-white"
            : current
            ? "bg-indigo-600 text-white"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        {complete ? <CheckCircle className="h-4 w-4" /> : step}
      </div>
      <span className="text-xs mt-1 text-muted-foreground">{label}</span>
    </div>
  );
}
