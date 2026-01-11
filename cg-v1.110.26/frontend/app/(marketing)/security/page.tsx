import { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  Lock,
  Eye,
  Server,
  FileCheck,
  Users,
  Clock,
  ArrowRight,
  Check,
  AlertTriangle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security | CommonGround',
  description: 'Learn how CommonGround protects your family\'s data with bank-level encryption, access controls, and comprehensive audit logging.',
};

/**
 * Security Page
 *
 * Details about data protection, encryption, and compliance.
 */

const securityFeatures = [
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'All data is encrypted at rest using AES-256 and in transit using TLS 1.3. Your information is protected by the same standards used by banks.',
  },
  {
    icon: Eye,
    title: 'Access Control',
    description: 'Strict role-based access ensures only authorized users can view your information. Each parent controls their own access and permissions.',
  },
  {
    icon: Server,
    title: 'Secure Infrastructure',
    description: 'Hosted on enterprise-grade cloud infrastructure with redundancy, regular backups, and 99.9% uptime guarantee.',
  },
  {
    icon: FileCheck,
    title: 'Audit Logging',
    description: 'Every access and modification is logged with timestamps. Complete audit trails are available for court proceedings if needed.',
  },
  {
    icon: Users,
    title: 'Professional Access',
    description: 'Time-limited, verified access for attorneys and GALs. All professional access is logged and can be revoked at any time.',
  },
  {
    icon: Clock,
    title: 'Session Management',
    description: 'Automatic session timeouts, secure token handling, and optional multi-factor authentication for enhanced security.',
  },
];

const dataProtection = [
  'Your data is never sold or shared with third parties',
  'We only access your data to provide our services',
  'You can export all your data at any time',
  'You can request complete data deletion',
  'We comply with applicable privacy laws',
  'Regular security audits and penetration testing',
];

const courtReadiness = [
  {
    title: 'Verified Exports',
    description: 'All court exports include SHA-256 hash verification to prove documents haven\'t been altered.',
  },
  {
    title: 'Timestamped Records',
    description: 'Every message, change, and action is timestamped with UTC time for accurate record-keeping.',
  },
  {
    title: 'Chain of Custody',
    description: 'Immutable event logs maintain a complete chain of custody for all important actions.',
  },
  {
    title: 'Professional Formatting',
    description: 'Exports are formatted for legal proceedings with clear organization and proper citations.',
  },
];

export default function SecurityPage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-cg-sage/5 blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-48 h-48 rounded-full bg-cg-slate/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-20 h-20 bg-cg-sage-subtle rounded-2xl flex items-center justify-center mx-auto mb-8">
              <Shield className="w-10 h-10 text-cg-sage" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
              Your family's data is <span className="text-cg-sage">sacred</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              We take security seriously. CommonGround is built from the ground up
              with privacy and protection as core principles.
            </p>
          </div>
        </div>
      </section>

      {/* Security Features Grid */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Enterprise-Grade Security
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built with the same security standards used by banks and healthcare providers.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {securityFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-background rounded-2xl p-6 border border-border/50"
                >
                  <div className="w-12 h-12 bg-cg-sage-subtle rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-cg-sage" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Data Protection */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
                Your Data, Your Control
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                We believe you should always maintain control over your family's information.
                Here's our commitment to you:
              </p>
              <ul className="space-y-4">
                {dataProtection.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-cg-sage-subtle flex items-center justify-center mt-0.5">
                      <Check className="w-3 h-3 text-cg-sage" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-cg-sage-subtle to-cg-slate-subtle rounded-3xl p-8 lg:p-12">
                <div className="bg-card rounded-2xl p-6 border border-border/50">
                  <div className="flex items-center gap-3 mb-4">
                    <Lock className="w-6 h-6 text-cg-sage" />
                    <span className="font-semibold text-foreground">Data Protection</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Encryption</span>
                      <span className="text-cg-sage font-medium">AES-256</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Transit Security</span>
                      <span className="text-cg-sage font-medium">TLS 1.3</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Backups</span>
                      <span className="text-cg-sage font-medium">Daily</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Uptime SLA</span>
                      <span className="text-cg-sage font-medium">99.9%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Court Readiness */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Court-Ready Documentation
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              When you need evidence for legal proceedings, CommonGround delivers
              verified, admissible documentation.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {courtReadiness.map((item) => (
              <div
                key={item.title}
                className="bg-background rounded-xl p-6 border border-border/50"
              >
                <h3 className="font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Report Vulnerability */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-cg-amber-subtle rounded-2xl p-8 border border-cg-amber/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-cg-amber/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-cg-amber" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Report a Security Vulnerability
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    If you discover a security vulnerability, please report it responsibly.
                    We take all reports seriously and will respond promptly.
                  </p>
                  <Link
                    href="/help/contact"
                    className="inline-flex items-center gap-2 text-cg-amber font-medium hover:gap-3 transition-all"
                  >
                    Contact Security Team
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-cg-sage-subtle to-cg-slate-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
            Ready to get started?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join families who trust CommonGround with their most important information.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/legal/privacy"
              className="inline-flex items-center justify-center gap-2 border-2 border-cg-sage text-cg-sage font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage hover:text-white"
            >
              Read Privacy Policy
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
