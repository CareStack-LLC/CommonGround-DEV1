'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Mail, Clock, HelpCircle, Book, Activity } from 'lucide-react';

export default function ContactPage() {
  const router = useRouter();
  const { user } = useAuth();

  const contactMethods = [
    {
      icon: Mail,
      title: 'Support',
      email: 'support@commonground.app',
      description: 'Technical issues, billing questions, or account help',
      color: '#2C5F5D'
    },
    {
      icon: Mail,
      title: 'General Inquiries',
      email: 'hello@commonground.app',
      description: 'Questions about CommonGround or how it works',
      color: '#D97757'
    },
    {
      icon: Mail,
      title: 'Professional Partnerships',
      email: 'partnerships@commonground.app',
      description: 'Law firms, courts, mediators, or organizational access',
      color: '#2C5F5D'
    }
  ];

  const supportResources = [
    {
      icon: Book,
      title: 'Help Documentation',
      description: 'Browse guides and tutorials',
      link: '/help',
      color: '#2C5F5D'
    },
    {
      icon: HelpCircle,
      title: 'FAQs',
      description: 'Common questions answered',
      link: '/pricing', // FAQ section is on pricing page
      color: '#D97757'
    },
    {
      icon: Activity,
      title: 'System Status',
      description: 'Check platform status',
      link: 'https://status.commonground.app',
      color: '#2C5F5D'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FFF8F3]">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#2C5F5D] rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#D97757] rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-serif text-[#2C3E50] mb-6 leading-[1.05]"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            We're here
            <br />
            <span className="text-[#2C5F5D]">to help</span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            Whether you need support, have a question, or want to explore partnerships—
            <span className="font-medium text-[#D97757]"> we're listening.</span>
          </p>
        </div>
      </section>

      {/* Support Hours & Response Times */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-sm flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-4">
              <Clock className="w-8 h-8 text-[#2C5F5D]" />
              <div>
                <div className="font-semibold text-[#2C3E50]">Support Hours</div>
                <div className="text-gray-600">Mon-Fri, 9am-6pm EST</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Mail className="w-8 h-8 text-[#D97757]" />
              <div>
                <div className="font-semibold text-[#2C3E50]">Response Time</div>
                <div className="text-gray-600">Usually within 24 hours</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-3xl sm:text-4xl font-serif text-[#2C3E50] mb-12 text-center"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            Get in touch
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {contactMethods.map((method, idx) => {
              const Icon = method.icon;
              return (
                <div
                  key={method.email}
                  className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300"
                  style={{
                    animationDelay: `${idx * 100}ms`,
                    animation: 'slideUp 0.6s ease-out forwards',
                    opacity: 0
                  }}
                >
                  <div
                    className="inline-flex p-3 rounded-xl mb-4"
                    style={{ backgroundColor: `${method.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: method.color }} />
                  </div>

                  <h3
                    className="text-2xl font-serif text-[#2C3E50] mb-2"
                    style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
                  >
                    {method.title}
                  </h3>

                  <p className="text-gray-600 text-sm mb-4">
                    {method.description}
                  </p>

                  <a
                    href={`mailto:${method.email}`}
                    className="text-sm font-medium hover:underline"
                    style={{ color: method.color }}
                  >
                    {method.email}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Support Resources */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-3xl sm:text-4xl font-serif text-[#2C3E50] mb-12 text-center"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            Self-service resources
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {supportResources.map((resource, idx) => {
              const Icon = resource.icon;
              return (
                <button
                  key={resource.title}
                  onClick={() => {
                    if (resource.link.startsWith('http')) {
                      window.open(resource.link, '_blank');
                    } else {
                      router.push(resource.link);
                    }
                  }}
                  className="bg-[#FFF8F3] rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 text-left"
                  style={{
                    animationDelay: `${idx * 100}ms`,
                    animation: 'slideUp 0.6s ease-out forwards',
                    opacity: 0
                  }}
                >
                  <div
                    className="inline-flex p-3 rounded-xl mb-4"
                    style={{ backgroundColor: `${resource.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: resource.color }} />
                  </div>

                  <h3
                    className="text-xl font-serif text-[#2C3E50] mb-2"
                    style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
                  >
                    {resource.title}
                  </h3>

                  <p className="text-gray-600 text-sm">
                    {resource.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Emergency Support Note */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#2C5F5D]/10 to-[#D97757]/10 rounded-2xl p-8 border-2 border-[#2C5F5D]/20">
            <h3
              className="text-2xl font-serif text-[#2C3E50] mb-4 text-center"
              style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
            >
              Need immediate help?
            </h3>
            <p className="text-gray-700 text-center max-w-2xl mx-auto leading-relaxed">
              If you're experiencing a technical emergency that prevents access to your account or
              critical features, email{' '}
              <a
                href="mailto:support@commonground.app"
                className="font-medium text-[#2C5F5D] hover:underline"
              >
                support@commonground.app
              </a>{' '}
              with "URGENT" in the subject line. We'll prioritize your request.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#2C5F5D] to-[#234846] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#D97757] rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h2
            className="text-4xl sm:text-5xl font-serif mb-6 leading-tight"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            {user ? 'Back to your dashboard' : 'Ready to get started?'}
          </h2>

          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            {user
              ? 'Return to CommonGround and manage your co-parenting.'
              : 'Join thousands of families making co-parenting easier.'}
          </p>

          <button
            onClick={() => router.push(user ? '/dashboard' : '/signup')}
            className="px-8 py-4 bg-white text-[#2C5F5D] rounded-xl font-medium text-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
          >
            {user ? 'Go to Dashboard' : 'Start Free'}
          </button>
        </div>
      </section>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
