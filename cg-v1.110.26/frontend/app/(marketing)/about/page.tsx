import { Metadata } from 'next';
import Link from 'next/link';
import {
  Heart,
  Scale,
  Shield,
  Eye,
  Users,
  Target,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us | CommonGround',
  description: 'Learn about CommonGround\'s mission to reduce conflict in separated families through technology, transparency, and AI-powered communication.',
};

/**
 * About Us Page
 *
 * Company story, mission, values, and team information.
 */

const values = [
  {
    icon: Heart,
    title: 'Child-First',
    description: 'Every decision we make prioritizes the wellbeing of children. They didn\'t choose this situation, and they deserve parents who can work together.',
  },
  {
    icon: Scale,
    title: 'Neutral & Unbiased',
    description: 'We don\'t take sides. CommonGround provides a balanced platform where both parents have equal voice and visibility.',
  },
  {
    icon: Eye,
    title: 'Transparent',
    description: 'Clear communication, honest documentation, and complete visibility into all shared information. No hidden agendas.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your family\'s information is sacred. We use bank-level encryption and never share or sell your data.',
  },
];

const stats = [
  { value: '750K+', label: 'Divorces per year in the US' },
  { value: '50%', label: 'Involve minor children' },
  { value: '70%', label: 'Report high conflict' },
  { value: '100%', label: 'Of children deserve better' },
];

const milestones = [
  {
    year: '2024',
    title: 'The Beginning',
    description: 'Founded with a mission to transform high-conflict co-parenting into collaborative partnerships.',
  },
  {
    year: '2025',
    title: 'ARIA Launches',
    description: 'Introduced AI-powered communication assistance to help parents communicate more effectively.',
  },
  {
    year: 'Today',
    title: 'Growing Impact',
    description: 'Helping families across the country find common ground and focus on what matters most.',
  },
];

export default function AboutPage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-cg-sage/5 blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-48 h-48 rounded-full bg-cg-amber/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
              Where families find <span className="text-cg-sage">common ground</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              We believe every child deserves parents who can communicate effectively,
              even when they can't be together. CommonGround makes that possible.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-cg-sage-subtle rounded-full mb-6">
                <Target className="w-4 h-4 text-cg-sage" />
                <span className="text-sm font-medium text-cg-sage">Our Mission</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
                Reducing conflict in separated families
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Separation is hard. Co-parenting shouldn't make it harder. We've built
                CommonGround to help families navigate this challenging transition with
                less conflict and more cooperation.
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                Through technology, transparency, and AI-powered communication tools,
                we help parents focus on what really matters: their children's wellbeing.
              </p>
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 text-cg-sage font-medium hover:gap-3 transition-all"
              >
                See how it works
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-cg-sage-subtle to-cg-amber-subtle rounded-3xl p-8 lg:p-12">
                <div className="grid grid-cols-2 gap-6">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                        {stat.value}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Our Core Values
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              These principles guide every decision we make and every feature we build.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div
                  key={index}
                  className="bg-card rounded-2xl p-6 border border-border/50 hover:border-cg-sage/30 transition-colors"
                >
                  <div className="w-12 h-12 bg-cg-sage-subtle rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-cg-sage" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Story Timeline */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Our Journey
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From idea to impact, here's how CommonGround came to be.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex gap-6 mb-8 last:mb-0">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-cg-sage rounded-full flex items-center justify-center text-white font-semibold">
                    {milestone.year.slice(-2)}
                  </div>
                  {index < milestones.length - 1 && (
                    <div className="w-0.5 h-full bg-border mt-4" />
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <div className="text-sm font-medium text-cg-sage mb-1">
                    {milestone.year}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {milestone.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {milestone.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              The Team
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built by people who understand the challenges of co-parenting.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-2xl p-8 border border-border/50 text-center">
              <div className="w-24 h-24 bg-cg-sage-subtle rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-12 h-12 text-cg-sage" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                TJ, Founder
              </h3>
              <p className="text-cg-sage font-medium mb-4">
                IT Project Manager & Cybersecurity Professional
              </p>
              <p className="text-muted-foreground mb-6">
                With experience in both technology and nonprofit leadership through
                Forever Forward 501(c)3, TJ understands that the best solutions come
                from combining technical innovation with genuine human empathy.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-cg-sage" />
                Founder of Forever Forward 501(c)3
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-cg-sage-subtle to-cg-slate-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
            Ready to find your common ground?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join families who have discovered a better way to co-parent.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
            >
              Start Your Journey
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center justify-center gap-2 border-2 border-cg-sage text-cg-sage font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage hover:text-white"
            >
              Explore Features
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
