'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, Video, Scale, Users, CheckCircle2 } from 'lucide-react';
import { myCircleAPI } from '@/lib/api';

export default function ContactTermsPage() {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    setIsAccepting(true);
    setError('');

    try {
      await myCircleAPI.acceptTerms('1.0');

      // Update localStorage
      const loginData = localStorage.getItem('circle_login_data');
      if (loginData) {
        const parsed = JSON.parse(loginData);
        parsed.terms_accepted = true;
        localStorage.setItem('circle_login_data', JSON.stringify(parsed));
      }

      router.push('/my-circle/contact/dashboard');
    } catch (err) {
      setError('Failed to accept terms. Please try again.');
      console.error('Terms acceptance error:', err);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 to-background dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo + Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              My Circle
            </h1>
          </div>
          <p className="text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
            Welcome! Before you connect, please review and accept these terms.
          </p>
        </div>

        {/* Terms Card */}
        <div className="bg-card rounded-2xl border border-border shadow-lg p-6 space-y-6">
          {/* Shield Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>

          <h2
            className="text-xl font-bold text-foreground text-center"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Communication Safety Terms
          </h2>

          <p className="text-sm text-muted-foreground text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
            CommonGround prioritizes child safety. By using My Circle, you agree to the following:
          </p>

          {/* Terms List */}
          <div className="space-y-4">
            <TermItem
              icon={<Eye className="w-5 h-5" />}
              title="ARIA Safety Monitoring"
              description="All messages, voice calls, and video calls are monitored by ARIA, our child-safety system, to protect children from harmful content."
            />

            <TermItem
              icon={<Video className="w-5 h-5" />}
              title="Call Recording"
              description="Video and voice calls may be recorded for safety and legal documentation purposes. Recordings are securely stored."
            />

            <TermItem
              icon={<Scale className="w-5 h-5" />}
              title="Legal Proceedings"
              description="Communication records, including messages and call logs, may be used as evidence in legal proceedings related to the child's welfare."
            />

            <TermItem
              icon={<Users className="w-5 h-5" />}
              title="Parent Control"
              description="Parents control all access permissions and can review communications at any time. They may adjust or revoke your communication privileges."
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 text-center">
              {error}
            </div>
          )}

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {isAccepting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                I Accept & Continue
              </>
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
            By clicking &quot;I Accept & Continue,&quot; you acknowledge and agree to the terms above.
            These terms are designed to ensure child safety on the CommonGround platform.
          </p>
        </div>
      </div>
    </div>
  );
}

function TermItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3
          className="font-semibold text-foreground text-sm"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {title}
        </h3>
        <p
          className="text-xs text-muted-foreground leading-relaxed"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
