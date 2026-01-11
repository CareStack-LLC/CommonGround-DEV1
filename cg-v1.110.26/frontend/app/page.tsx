'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { MarketingHeader, MarketingFooter } from '@/components/marketing';
import {
  MessageSquare,
  Calendar,
  Wallet,
  FileText,
  ArrowRight,
  Shield,
  Heart,
  Clock,
  CheckCircle2,
} from 'lucide-react';

/**
 * CommonGround Landing Page - "The Sanctuary of Truth"
 *
 * Design: Organic Minimalist
 * Palette: Sage Green, Slate Blue, Warm Sand
 * Vibe: Calming, trustworthy, premium wellness
 */

// Animated wave component for hero background
function HeroWaves() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Wave 1 - Sage Green */}
      <svg
        className="absolute w-[200%] h-auto -bottom-10 left-0 wave-animate opacity-30"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="#4A6C58"
          fillOpacity="0.4"
          d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </svg>
      {/* Wave 2 - Slate Blue */}
      <svg
        className="absolute w-[200%] h-auto -bottom-5 left-0 wave-animate opacity-20"
        style={{ animationDelay: '-2s' }}
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="#475569"
          fillOpacity="0.5"
          d="M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,112C672,128,768,192,864,213.3C960,235,1056,213,1152,181.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </svg>
      {/* Wave 3 - Light Sage */}
      <svg
        className="absolute w-[200%] h-auto bottom-0 left-0 wave-animate opacity-25"
        style={{ animationDelay: '-4s' }}
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="#6B9B7A"
          fillOpacity="0.3"
          d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,224C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </svg>
    </div>
  );
}

// Floating organic shapes for visual interest
function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Shape 1 */}
      <div
        className="absolute top-20 right-[10%] w-64 h-64 rounded-full morph-animate opacity-10"
        style={{
          background: 'linear-gradient(135deg, #4A6C58 0%, #6B9B7A 100%)',
        }}
      />
      {/* Shape 2 */}
      <div
        className="absolute top-40 left-[5%] w-48 h-48 rounded-full morph-animate opacity-8"
        style={{
          background: 'linear-gradient(135deg, #475569 0%, #64748B 100%)',
          animationDelay: '-3s',
        }}
      />
      {/* Shape 3 */}
      <div
        className="absolute bottom-40 right-[20%] w-32 h-32 rounded-full morph-animate opacity-10"
        style={{
          background: 'linear-gradient(135deg, #D4A574 0%, #E5B88A 100%)',
          animationDelay: '-5s',
        }}
      />
    </div>
  );
}

// Feature item for the grid
function FeatureItem({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 p-4">
      <div className="w-12 h-12 bg-cg-sage-subtle rounded-xl flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-cg-sage" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 bg-cg-sage/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <div className="w-6 h-6 bg-cg-sage rounded-full" />
          </div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <MarketingHeader />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        <FloatingShapes />
        <HeroWaves />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl mx-auto text-center">
            {/* Animated Abstract Art */}
            <div className="relative w-full max-w-md mx-auto mb-10 h-48">
              {/* Organic flowing shape */}
              <div
                className="absolute inset-0 morph-animate gradient-animate opacity-60"
                style={{
                  background:
                    'linear-gradient(135deg, #4A6C58 0%, #6B9B7A 30%, #475569 60%, #64748B 100%)',
                  borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
                }}
              />
              {/* Second layer */}
              <div
                className="absolute inset-4 morph-animate gradient-animate opacity-40"
                style={{
                  background:
                    'linear-gradient(225deg, #D4A574 0%, #E5B88A 40%, #F5F0E8 100%)',
                  borderRadius: '40% 60% 70% 30% / 40% 70% 30% 60%',
                  animationDelay: '-3s',
                }}
              />
              {/* Inner glow */}
              <div
                className="absolute inset-8 morph-animate opacity-30"
                style={{
                  background: 'radial-gradient(circle, #FFFBF5 0%, transparent 70%)',
                  borderRadius: '50% 50% 40% 60% / 60% 40% 60% 40%',
                  animationDelay: '-5s',
                }}
              />
            </div>

            {/* Hero Text */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-6 text-balance">
              Co-parenting without the conflict.
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-4 text-balance">
              Find balance. Build peace. Together.
            </p>

            {/* CTA Button */}
            <div className="mt-10">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]"
              >
                Start Your Journey
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Quick Features */}
            <div className="mt-16 grid grid-cols-2 gap-4 max-w-lg mx-auto">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 bg-cg-sage-subtle rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-cg-sage" />
                </div>
                <span className="text-sm font-medium text-foreground">Shared Calendar</span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 bg-cg-sage-subtle rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-cg-sage" />
                </div>
                <span className="text-sm font-medium text-foreground">Secure Messaging</span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 bg-cg-sage-subtle rounded-xl flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-cg-sage" />
                </div>
                <span className="text-sm font-medium text-foreground">Expense Tracking</span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 bg-cg-sage-subtle rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-cg-sage" />
                </div>
                <span className="text-sm font-medium text-foreground">Resources</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              How CommonGround Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A unified platform designed to reduce conflict and keep focus on what matters most.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="cg-card-interactive p-8 text-center">
              <div className="w-16 h-16 bg-cg-sage rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Create Your Space</h3>
              <p className="text-muted-foreground">
                Set up your co-parenting case and invite the other parent to join your shared space.
              </p>
            </div>

            {/* Step 2 */}
            <div className="cg-card-interactive p-8 text-center">
              <div className="w-16 h-16 bg-cg-sage rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Build Your Agreement</h3>
              <p className="text-muted-foreground">
                Use our guided process to create a comprehensive custody agreement together.
              </p>
            </div>

            {/* Step 3 */}
            <div className="cg-card-interactive p-8 text-center">
              <div className="w-16 h-16 bg-cg-sage rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Communicate in Peace</h3>
              <p className="text-muted-foreground">
                Send messages with AI assistance that helps maintain respectful communication.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
                Everything you need for peaceful co-parenting
              </h2>
              <p className="text-lg text-muted-foreground mb-10">
                CommonGround brings together all the tools separated families need to communicate
                effectively, manage schedules, and keep children at the center.
              </p>

              <div className="space-y-2">
                <FeatureItem
                  icon={MessageSquare}
                  title="ARIA Messaging"
                  description="AI-powered communication that helps prevent conflict before it starts."
                />
                <FeatureItem
                  icon={Calendar}
                  title="TimeBridge Calendar"
                  description="Shared scheduling with custody tracking and exchange coordination."
                />
                <FeatureItem
                  icon={Wallet}
                  title="ClearFund Expenses"
                  description="Transparent expense tracking and reimbursement management."
                />
                <FeatureItem
                  icon={Shield}
                  title="Court-Ready Documentation"
                  description="Generate verified evidence packages when needed."
                />
              </div>
            </div>

            {/* Feature Visual */}
            <div className="relative">
              <div className="cg-card-elevated p-8 max-w-sm mx-auto">
                {/* Mock Dashboard Preview */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Good Morning,</p>
                      <p className="text-xl font-semibold text-foreground">Marcus</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-cg-amber-subtle flex items-center justify-center">
                      <Heart className="w-6 h-6 text-cg-amber" />
                    </div>
                  </div>

                  {/* Status Card */}
                  <div className="bg-cg-sage-subtle rounded-2xl p-4">
                    <p className="text-sm text-cg-sage mb-2">Kids are with You</p>
                    <p className="text-lg font-semibold text-foreground mb-3">
                      until Tuesday 6 PM
                    </p>
                    <div className="cg-progress">
                      <div className="cg-progress-bar" style={{ width: '65%' }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">56 hours remaining</p>
                  </div>

                  {/* Action Items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-background rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-cg-error-subtle rounded-lg flex items-center justify-center">
                          <Wallet className="w-4 h-4 text-cg-error" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Pending Expenses</p>
                          <p className="text-xs text-muted-foreground">2 items to review</p>
                        </div>
                      </div>
                      <div className="w-2 h-2 bg-cg-error rounded-full" />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-cg-slate-subtle rounded-lg flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-cg-slate" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Unread Messages</p>
                          <p className="text-xs text-muted-foreground">3 from Sarah</p>
                        </div>
                      </div>
                      <div className="w-2 h-2 bg-cg-slate rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-cg-sage/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-cg-slate/10 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ARIA Section */}
      <section className="py-20 bg-cg-amber-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 bg-cg-amber/20 rounded-full flex items-center justify-center mx-auto mb-6 aria-glow">
              <div className="w-8 h-8 bg-cg-amber rounded-full" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
              Meet ARIA, Your Communication Guardian
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              ARIA gently analyzes messages before they're sent, suggesting thoughtful rewrites that
              maintain your meaning while reducing the chance of conflict. It's like having a wise
              mediator always by your side.
            </p>

            {/* Example ARIA intervention */}
            <div className="cg-card-elevated p-6 max-w-lg mx-auto text-left">
              <div className="space-y-4">
                <div className="chat-bubble-user">
                  Hi, just confirming the drop-off time for tomorrow.
                </div>
                <div className="chat-bubble-other">
                  Hey. Yes, 5:00 PM at the park is still good.
                </div>
                <div className="chat-bubble-user">Great, thanks. See you then.</div>
              </div>

              {/* ARIA suggestion */}
              <div className="mt-6 aria-guardian p-4 flex items-start gap-3">
                <div className="w-8 h-8 bg-cg-amber/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-3 h-3 bg-cg-amber rounded-full" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    ARIA: Gentle tone check suggestion.
                  </p>
                  <p className="text-sm text-muted-foreground">Consider phrasing.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Built for Trust & Transparency
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every feature is designed with court-readiness and child welfare in mind.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6">
              <div className="w-14 h-14 bg-cg-sage-subtle rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-cg-sage" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Secure & Private</h3>
              <p className="text-sm text-muted-foreground">
                End-to-end encryption protects all communications.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-14 h-14 bg-cg-sage-subtle rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-cg-sage" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Court-Ready</h3>
              <p className="text-sm text-muted-foreground">
                Verified documentation when you need it.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-14 h-14 bg-cg-sage-subtle rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-cg-sage" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Always Available</h3>
              <p className="text-sm text-muted-foreground">Access your information 24/7 on any device.</p>
            </div>

            <div className="text-center p-6">
              <div className="w-14 h-14 bg-cg-sage-subtle rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-7 h-7 text-cg-sage" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Child-First</h3>
              <p className="text-sm text-muted-foreground">
                Every decision prioritizes your children's wellbeing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cg-sage/5 to-cg-slate/5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
            Ready to find your common ground?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join thousands of families who have discovered a better way to co-parent.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]"
            >
              Start Your Journey
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/court-portal"
              className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-cg-sage text-cg-sage font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage hover:text-white active:scale-[0.98]"
            >
              Court Portal Access
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cg-sage" />
              Free to start
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cg-sage" />
              No credit card required
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cg-sage" />
              Court-ready documentation
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}
