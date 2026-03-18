import Link from 'next/link';
import { ArrowRight, Heart, MessageCircle, Film, Users } from 'lucide-react';

/**
 * Impact Stories Page
 *
 * Case study / impact page telling the story of CommonGround's beta test
 * through the 4Ever Forward Foundation grant program.
 */

const caseStudies = [
  {
    name: 'Marcus',
    icon: MessageCircle,
    tagline: 'From hostile texts to movie nights',
    story:
      'Marcus was sending and receiving upwards of fifteen hostile texts a day with his co-parent. Every notification made his stomach drop. When he joined the grant program, ARIA started coaching his messages before he sent them. Within weeks, the tone shifted completely. His son stopped asking "is Mom mad?" because the tension at handoffs had disappeared. Now Marcus and his son have a standing KidSpace movie night every Wednesday — even on weeks when they are apart.',
    highlight: 'His son stopped asking "is Mom mad?"',
  },
  {
    name: 'Diana',
    icon: Heart,
    tagline: 'From fear to focus',
    story:
      'Diana used to feel a wave of dread every time her phone buzzed. In a high-conflict custody situation, every message felt like a potential attack. With ARIA reviewing incoming messages and helping her compose responses, she finally felt safe opening her inbox. "You knew it wasn\'t going to be a regular hostile message," she said. For the first time in years, Diana could focus on her daughter — helping with homework, planning weekend adventures — instead of bracing for the next fight.',
    highlight: 'She could finally focus on her daughter instead of the conflict.',
  },
  {
    name: 'The Rivera Family',
    icon: Users,
    tagline: 'Structure where there was chaos',
    story:
      'Both Rivera parents were court-ordered to communicate about their children, but every exchange had devolved into arguments for over two years. Their mediator recommended CommonGround through the grant program. The structured messaging, shared calendar, and ARIA-assisted communication gave them a framework that took the emotion out of logistics. After three months, their mediator said it was the first time she had seen them cooperate — on anything.',
    highlight: 'Their mediator called it a breakthrough after two years of conflict.',
  },
];

const impactStatements = [
  {
    icon: MessageCircle,
    statement: 'Parents reported calmer, more structured messaging',
    detail: 'ARIA coaching helped parents pause and rephrase before sending',
  },
  {
    icon: Heart,
    statement: 'Parents felt less anxious opening messages',
    detail: 'Knowing ARIA was there changed the entire experience of co-parent communication',
  },
  {
    icon: Film,
    statement: 'Families stayed connected even when apart',
    detail: 'KidSpace movie nights and shared activities kept bonds strong across households',
  },
  {
    icon: Users,
    statement: 'Fewer arguments, more cooperation',
    detail: 'Structured tools replaced emotional back-and-forth with clear, documented communication',
  },
];

export default function ImpactStoriesPage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-72 h-72 rounded-full bg-[#3DAA8A]/8 blur-3xl" />
          <div className="absolute bottom-10 left-[5%] w-56 h-56 rounded-full bg-[#F5A623]/6 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[#3DAA8A] font-medium mb-4 tracking-wide uppercase text-sm">
              Impact Stories
            </p>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-6"
              style={{ fontFamily: 'var(--font-dm-serif, "DM Serif Display", serif)' }}
            >
              Real families.{' '}
              <span className="text-[#3DAA8A]">Real impact.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Through the 4Ever Forward Foundation grant program, CommonGround helped
              families in high-conflict situations find something they thought they had lost —
              peace of mind.
            </p>
          </div>
        </div>
      </section>

      {/* The Grant Program */}
      <section className="py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card rounded-2xl border border-border/50 p-8 lg:p-12">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#F5A623]/10 flex items-center justify-center flex-shrink-0">
                <Heart className="w-6 h-6 text-[#F5A623]" />
              </div>
              <div>
                <h2
                  className="text-2xl sm:text-3xl font-semibold text-foreground mb-2"
                  style={{ fontFamily: 'var(--font-dm-serif, "DM Serif Display", serif)' }}
                >
                  The 4Ever Forward Foundation Partnership
                </h2>
                <p className="text-sm text-[#3DAA8A] font-medium">Beta Grant Program</p>
              </div>
            </div>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                CommonGround partnered with the 4Ever Forward Foundation — Thomas Wilform's
                nonprofit dedicated to strengthening families — to run a beta grant program
                for parents navigating high-conflict co-parenting situations.
              </p>
              <p>
                The program provided free access to CommonGround's full platform, including
                ARIA-assisted messaging, shared calendars, and KidSpace. The goal was simple:
                could technology genuinely help families who were struggling to communicate?
              </p>
              <p className="text-foreground font-medium">
                The answer was yes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-16 lg:py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-semibold text-foreground mb-4"
              style={{ fontFamily: 'var(--font-dm-serif, "DM Serif Display", serif)' }}
            >
              Stories from the program
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              These are real families from the beta. Names have been changed to
              protect their privacy, but their experiences are genuine.
            </p>
          </div>

          <div className="space-y-8 max-w-4xl mx-auto">
            {caseStudies.map((study) => {
              const IconComponent = study.icon;
              return (
                <div
                  key={study.name}
                  className="bg-background rounded-2xl border border-border/50 p-8 lg:p-10"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-[#3DAA8A]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">
                        {study.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{study.tagline}</p>
                    </div>
                  </div>

                  <p className="text-muted-foreground leading-relaxed mt-4 mb-5">
                    {study.story}
                  </p>

                  <div className="bg-[#3DAA8A]/5 rounded-lg px-5 py-3 border-l-4 border-[#3DAA8A]">
                    <p className="text-foreground font-medium text-sm italic">
                      {study.highlight}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Impact Metrics */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl font-semibold text-foreground mb-4"
              style={{ fontFamily: 'var(--font-dm-serif, "DM Serif Display", serif)' }}
            >
              What parents reported
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From the beta program — in their own words, not our numbers.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {impactStatements.map((item) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={item.statement}
                  className="bg-card rounded-xl border border-border/50 p-6"
                >
                  <div className="w-10 h-10 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center mb-4">
                    <IconComponent className="w-5 h-5 text-[#3DAA8A]" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {item.statement}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Grant Partnership CTA */}
      <section className="py-16 lg:py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto bg-gradient-to-br from-[#1E3A4A] to-[#2a5060] rounded-2xl p-8 lg:p-12 text-center">
            <h2
              className="text-2xl sm:text-3xl font-semibold text-white mb-4"
              style={{ fontFamily: 'var(--font-dm-serif, "DM Serif Display", serif)' }}
            >
              Bring CommonGround to families in your community
            </h2>
            <p className="text-white/80 mb-8 max-w-xl mx-auto">
              If you run a nonprofit, family services organization, or community program,
              we would love to partner with you. The grant program is expanding — and every
              family deserves access to calmer communication.
            </p>
            <Link
              href="/grant-partnership"
              className="inline-flex items-center justify-center gap-2 bg-[#3DAA8A] text-white font-medium px-8 py-3 rounded-full transition-all duration-200 hover:bg-[#34967a] hover:shadow-lg"
            >
              Learn About the Grant Program
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="text-3xl sm:text-4xl font-semibold text-foreground mb-6"
            style={{ fontFamily: 'var(--font-dm-serif, "DM Serif Display", serif)' }}
          >
            Start your own calmer chapter
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Every family's story is different. CommonGround is here to help you
            write a better next page.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-[#3DAA8A] text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-[#34967a] hover:shadow-xl hover:-translate-y-1"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center gap-2 border-2 border-[#3DAA8A] text-[#3DAA8A] font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-[#3DAA8A] hover:text-white"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
