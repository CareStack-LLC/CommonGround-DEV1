"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  User,
  Building2,
  Award,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PROFESSIONAL_TYPES = [
  {
    value: "attorney",
    label: "Attorney",
    description: "Licensed attorney practicing family law",
    icon: "⚖️",
  },
  {
    value: "paralegal",
    label: "Paralegal",
    description: "Paralegal supporting family law practice",
    icon: "📋",
  },
  {
    value: "mediator",
    label: "Mediator",
    description: "Certified family mediator",
    icon: "🤝",
  },
  {
    value: "parenting_coordinator",
    label: "Parenting Coordinator",
    description: "Court-appointed or private parenting coordinator",
    icon: "👨‍👩‍👧",
  },
  {
    value: "intake_coordinator",
    label: "Intake Coordinator",
    description: "Client intake and case management",
    icon: "📞",
  },
  {
    value: "practice_admin",
    label: "Practice Admin",
    description: "Administrative staff for legal practice",
    icon: "🏢",
  },
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const PRACTICE_AREAS = [
  { value: "custody", label: "Child Custody" },
  { value: "divorce", label: "Divorce" },
  { value: "mediation", label: "Mediation" },
  { value: "child_support", label: "Child Support" },
  { value: "adoption", label: "Adoption" },
  { value: "domestic_violence", label: "Domestic Violence" },
  { value: "paternity", label: "Paternity" },
  { value: "guardianship", label: "Guardianship" },
];

type Step = "type" | "credentials" | "firm" | "complete";

interface FormData {
  professional_type: string;
  license_number: string;
  license_state: string;
  practice_areas: string[];
  create_firm: boolean;
  firm_name: string;
  firm_type: string;
}

export default function ProfessionalOnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("type");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    professional_type: "",
    license_number: "",
    license_state: "",
    practice_areas: [],
    create_firm: false,
    firm_name: "",
    firm_type: "solo_practice",
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const steps: { key: Step; label: string }[] = [
    { key: "type", label: "Role" },
    { key: "credentials", label: "Credentials" },
    { key: "firm", label: "Firm" },
    { key: "complete", label: "Complete" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  const togglePracticeArea = (area: string) => {
    setFormData((prev) => ({
      ...prev,
      practice_areas: prev.practice_areas.includes(area)
        ? prev.practice_areas.filter((a) => a !== area)
        : [...prev.practice_areas, area],
    }));
  };

  const handleSubmit = async () => {
    if (!token) return;

    setIsSubmitting(true);
    try {
      // Create professional profile
      const profileResponse = await fetch(`${API_BASE}/api/v1/professional/profile`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professional_type: formData.professional_type,
          license_number: formData.license_number || null,
          license_state: formData.license_state || null,
          practice_areas: formData.practice_areas,
        }),
      });

      if (!profileResponse.ok) {
        throw new Error("Failed to create profile");
      }

      // Create firm if requested
      if (formData.create_firm && formData.firm_name) {
        await fetch(`${API_BASE}/api/v1/professional/firms`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.firm_name,
            firm_type: formData.firm_type,
          }),
        });
      }

      setCurrentStep("complete");
    } catch (error) {
      console.error("Error creating profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case "type":
        return !!formData.professional_type;
      case "credentials":
        return true; // License is optional
      case "firm":
        return !formData.create_firm || !!formData.firm_name;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep === "type") setCurrentStep("credentials");
    else if (currentStep === "credentials") setCurrentStep("firm");
    else if (currentStep === "firm") handleSubmit();
  };

  const prevStep = () => {
    if (currentStep === "credentials") setCurrentStep("type");
    else if (currentStep === "firm") setCurrentStep("credentials");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 text-emerald-600 rounded-xl mb-4">
            <Briefcase className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to CommonGround Pro</h1>
          <p className="text-muted-foreground mt-2">
            Let's set up your professional profile
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < currentStepIndex
                    ? "bg-emerald-500 text-white"
                    : index === currentStepIndex
                    ? "bg-emerald-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {index < currentStepIndex ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 h-0.5 ${
                    index < currentStepIndex ? "bg-emerald-500" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            {/* Step 1: Professional Type */}
            {currentStep === "type" && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold">What's your role?</h2>
                  <p className="text-muted-foreground mt-1">
                    Select the option that best describes your professional role
                  </p>
                </div>

                <div className="grid gap-3">
                  {PROFESSIONAL_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, professional_type: type.value }))
                      }
                      className={`flex items-center gap-4 p-4 rounded-lg border text-left transition-all ${
                        formData.professional_type === type.value
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                          : "border-border hover:border-emerald-300 hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-2xl">{type.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium">{type.label}</p>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                      {formData.professional_type === type.value && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Credentials */}
            {currentStep === "credentials" && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold">Your Credentials</h2>
                  <p className="text-muted-foreground mt-1">
                    Add your license information for verification (optional)
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="license_number">License/Bar Number</Label>
                      <Input
                        id="license_number"
                        value={formData.license_number}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, license_number: e.target.value }))
                        }
                        placeholder="e.g., 123456"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="license_state">State</Label>
                      <Select
                        value={formData.license_state}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, license_state: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Practice Areas</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRACTICE_AREAS.map((area) => (
                        <Button
                          key={area.value}
                          type="button"
                          variant={
                            formData.practice_areas.includes(area.value) ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => togglePracticeArea(area.value)}
                          className={
                            formData.practice_areas.includes(area.value)
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : ""
                          }
                        >
                          {area.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {formData.license_number && (
                    <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          License Verification
                        </p>
                        <p className="text-sm text-blue-700 mt-0.5">
                          We'll verify your license with state bar records. This typically takes
                          1-2 business days.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Firm */}
            {currentStep === "firm" && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold">Your Firm</h2>
                  <p className="text-muted-foreground mt-1">
                    Create a firm or join one later
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, create_firm: true }))
                      }
                      className={`p-4 rounded-lg border text-center transition-all ${
                        formData.create_firm
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                          : "border-border hover:border-emerald-300"
                      }`}
                    >
                      <Building2 className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                      <p className="font-medium">Create a Firm</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Start your own practice
                      </p>
                    </button>
                    <button
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, create_firm: false }))
                      }
                      className={`p-4 rounded-lg border text-center transition-all ${
                        !formData.create_firm
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                          : "border-border hover:border-emerald-300"
                      }`}
                    >
                      <User className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <p className="font-medium">Skip for Now</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Join a firm later
                      </p>
                    </button>
                  </div>

                  {formData.create_firm && (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="firm_name">Firm Name</Label>
                        <Input
                          id="firm_name"
                          value={formData.firm_name}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, firm_name: e.target.value }))
                          }
                          placeholder="e.g., Smith Family Law"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="firm_type">Firm Type</Label>
                        <Select
                          value={formData.firm_type}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, firm_type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="solo_practice">Solo Practice</SelectItem>
                            <SelectItem value="law_firm">Law Firm</SelectItem>
                            <SelectItem value="mediation_practice">Mediation Practice</SelectItem>
                            <SelectItem value="court_services">Court Services</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {currentStep === "complete" && (
              <div className="text-center space-y-6 py-8">
                <div className="inline-flex items-center justify-center p-4 bg-emerald-100 text-emerald-600 rounded-full">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">You're All Set!</h2>
                  <p className="text-muted-foreground mt-2">
                    Your professional profile has been created successfully.
                  </p>
                </div>

                <div className="space-y-3 pt-4">
                  <Button
                    onClick={() => router.push("/professional/dashboard")}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/professional/profile")}
                    className="w-full"
                  >
                    Complete Your Profile
                  </Button>
                </div>

                <div className="pt-4 text-sm text-muted-foreground">
                  <p>Next steps:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Accept case invitations from clients</li>
                    <li>• Set up your firm and invite team members</li>
                    <li>• Create intake sessions with ARIA Pro</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Navigation */}
            {currentStep !== "complete" && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t">
                <Button
                  variant="ghost"
                  onClick={prevStep}
                  disabled={currentStep === "type"}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={!canProceed() || isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting ? (
                    "Creating..."
                  ) : currentStep === "firm" ? (
                    "Complete Setup"
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
          All professional activities are logged for compliance.
        </p>
      </div>
    </div>
  );
}
