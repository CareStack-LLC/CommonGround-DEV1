"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Scale, Lock, Clock, FileText, CheckCircle, Mail, KeyRound, Shield } from "lucide-react";
import { useCourtAuth } from "../layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CourtLoginPage() {
  const router = useRouter();
  const { login } = useCourtAuth();
  const [step, setStep] = useState<"email" | "verify" | "mfa">("email");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simulate verification
    await new Promise((r) => setTimeout(r, 1000));

    if (email.includes("@")) {
      setStep("verify");
    } else {
      setError("Please enter a valid email address");
    }
    setIsLoading(false);
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simulate access code verification
    await new Promise((r) => setTimeout(r, 1000));

    if (accessCode.length >= 6) {
      setStep("mfa");
    } else {
      setError("Invalid access code");
    }
    setIsLoading(false);
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (mfaCode.length !== 6) {
      setError("Invalid MFA code - enter 6 digits");
      setIsLoading(false);
      return;
    }

    try {
      await login(email, accessCode);
      router.push("/court-portal/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Make sure access code is 123456");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
            <Scale className="h-8 w-8 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl">MediatorMode</CardTitle>
          <CardDescription>
            Secure access for court professionals
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {/* Step indicator */}
          <div className="flex items-center justify-center mb-6">
            <StepIndicator step={1} current={step === "email"} complete={step !== "email"} label="Email" icon={<Mail className="h-3.5 w-3.5" />} />
            <div className="w-8 h-0.5 bg-border" />
            <StepIndicator step={2} current={step === "verify"} complete={step === "mfa"} label="Verify" icon={<KeyRound className="h-3.5 w-3.5" />} />
            <div className="w-8 h-0.5 bg-border" />
            <StepIndicator step={3} current={step === "mfa"} complete={false} label="MFA" icon={<Shield className="h-3.5 w-3.5" />} />
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Professional Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@court.gov"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use your verified court or law firm email
                </p>
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Continue"}
              </Button>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div className="text-center text-sm text-muted-foreground mb-4">
                Enter the access code from your invitation link or email
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessCode">Access Code</Label>
                <Input
                  id="accessCode"
                  type="text"
                  placeholder="Enter access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="text-center text-lg tracking-wider"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("email")}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
                  {isLoading ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </form>
          )}

          {step === "mfa" && (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="text-center text-sm text-muted-foreground mb-4">
                Enter the 6-digit code from your authenticator app
              </div>
              <div className="space-y-2">
                <Label htmlFor="mfaCode">Authentication Code</Label>
                <Input
                  id="mfaCode"
                  type="text"
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground text-center">
                  For demo: enter any 6 digits
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("verify")}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
                  {isLoading ? "Verifying..." : "Sign In"}
                </Button>
              </div>
            </form>
          )}

          {/* Registration link */}
          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/court-portal/register" className="text-indigo-600 hover:underline font-medium">
                Register as a Professional
              </Link>
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground space-y-2">
              <p className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-indigo-500" />
                All access is logged and audited
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                Access is time-limited based on your role
              </p>
              <p className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-indigo-500" />
                Read-only access to case materials
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StepIndicator({
  step,
  current,
  complete,
  label,
  icon,
}: {
  step: number;
  current: boolean;
  complete: boolean;
  label: string;
  icon: React.ReactNode;
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
        {complete ? <CheckCircle className="h-4 w-4" /> : icon}
      </div>
      <span className="text-xs mt-1 text-muted-foreground">{label}</span>
    </div>
  );
}
