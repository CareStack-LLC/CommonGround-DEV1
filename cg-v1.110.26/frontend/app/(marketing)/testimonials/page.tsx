import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Heart,
  MessageCircle,
  Shield,
  Users,
  Scale,
  Quote,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Stories Page
 *
 * Emotionally resonant storytelling page that serves two audiences:
 * - Parents who read it and feel hope ("this could be me")
 * - Organizations who read it and feel impact ("I want to provide this")
 *
 * Neither audience is explicitly addressed — the stories do the work.
 */

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface Story {
  id: string;
  name: string;
  contextLine: string;
  pullQuote: string;
  paragraphs: string[];
  highlight: string;
  icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
}

const stories: Story[] = [
  {
    id: 'marcus',
    name: 'Marcus',
    contextLine: 'Father, program participant',
    pullQuote: 'My son stopped asking "is Mom mad?" That\u2019s when I knew something had changed.',
    paragraphs: [
      'Marcus was sending and receiving fifteen hostile texts a day. Every notification made his stomach drop. He dreaded pickups. His son had started going quiet in the car — the kind of quiet that means a child is holding their breath.',
      'Through a community program for fathers, Marcus got access to CommonGround. ARIA started coaching his messages before he sent them — flagging the sharp edges, suggesting a different way to say the same thing. Within weeks, the tone between both parents shifted completely.',
      'The tension at handoffs disappeared. His son started talking again in the car. Now they have a standing KidSpace movie night every Wednesday — even on weeks when they\u2019re apart.',
    ],
    highlight:
      'Marcus went from fifteen hostile texts a day to a standing movie night with his son.',
    icon: MessageCircle,
    gradientFrom: '#1E3A4A',
    gradientTo: '#2D6A8F',
  },
  {
    id: 'diana',
    name: 'Diana',
    contextLine: 'Mother navigating high-conflict custody',
    pullQuote:
      'For the first time in years, I could open my phone without my hands shaking.',
    paragraphs: [
      'Diana used to feel a wave of dread every time her phone buzzed. In a high-conflict custody situation, every message felt like a potential attack. She\u2019d brace herself before opening anything — heart racing, jaw tight.',
      'With ARIA reviewing incoming messages and helping her compose responses, something shifted. She knew the hostility would be caught before it reached her. She could read what mattered — the logistics about her daughter — without wading through the anger.',
      'For the first time in years, Diana could focus on her daughter. Helping with homework. Planning weekend adventures. Being present instead of bracing for the next fight.',
    ],
    highlight:
      'Diana went from bracing for the next fight to planning the next adventure with her daughter.',
    icon: Heart,
    gradientFrom: '#3DAA8A',
    gradientTo: '#2D6A8F',
  },
  {
    id: 'riveras',
    name: 'The Rivera Family',
    contextLine: 'Court-ordered co-parents, two years of conflict',
    pullQuote:
      'Their mediator said it was the first time she\u2019d seen them cooperate — on anything.',
    paragraphs: [
      'Both Rivera parents were court-ordered to communicate about their children, but every exchange had devolved into arguments for over two years. Their mediator had tried everything. Nothing stuck.',
      'She recommended a structured communication tool. The shared calendar took scheduling off the table. ARIA-assisted messaging gave them a framework that separated the logistics from the emotion. For the first time, they could coordinate without escalating.',
      'After three months, their mediator called it a breakthrough. Not because the parents suddenly liked each other — but because their children finally had two parents who could cooperate on the things that mattered.',
    ],
    highlight:
      'A breakthrough after two years — and two children who finally had parents working together.',
    icon: Users,
    gradientFrom: '#F5A623',
    gradientTo: '#3DAA8A',
  },
  {
    id: 'keisha',
    name: 'Keisha',
    contextLine: 'Single mother, cancer survivor',
    pullQuote:
      'I didn\u2019t have the energy to fight anymore. I just needed to focus on getting better — and being there for my kids.',
    paragraphs: [
      'Keisha was midway through breast cancer treatment when co-parenting communication hit a breaking point. Between chemo appointments and caring for two children, she had nothing left for the constant text arguments with her ex.',
      'A community organization supporting mothers facing illness connected her with CommonGround. The structured messaging meant she could handle custody logistics in minutes instead of hours. ARIA caught the hostile messages before they reached her — and helped her respond without the emotional spiral.',
      'Keisha could put her phone down and focus her limited energy where it mattered: healing, and being present with her kids. The fighting didn\u2019t stop because anyone changed their mind. It stopped because the tool changed the dynamic.',
    ],
    highlight:
      'Through a community organization, Keisha found the space to heal and parent at the same time.',
    icon: Shield,
    gradientFrom: '#FF6B6B',
    gradientTo: '#4ECDC4',
  },
  {
    id: 'mediator',
    name: 'Sarah',
    contextLine: 'Family mediator, 12 years of practice',
    pullQuote:
      'In twelve years of mediation, I\u2019ve never seen a tool change the dynamic between two parents this quickly.',
    paragraphs: [
      'Sarah has mediated hundreds of custody cases. The pattern was always the same: parents would make progress in her office, then undo it all over text before the next session. The communication between sessions was where cases fell apart.',
      'She started recommending CommonGround to her most entrenched couples. What she noticed surprised her. Parents arrived to sessions calmer. They\u2019d already resolved the week\u2019s logistics through the app. The documentation gave both parties confidence that agreements were being honored.',
      'Now it\u2019s a standard recommendation for every high-conflict case in her practice. Not because it fixes the relationship — but because it gives both parents a structure that makes cooperation possible, even when trust is low.',
    ],
    highlight:
      'Now a standard recommendation for every high-conflict case in her practice.',
    icon: Scale,
    gradientFrom: '#2D6A8F',
    gradientTo: '#1E3A4A',
  },
];

interface Transformation {
  before: string;
  after: string;
}

const transformations: Transformation[] = [
  {
    before: '15 hostile texts a day',
    after: 'Calm check-ins about the kids',
  },
  {
    before: 'Stomach dropping at every notification',
    after: 'Confidence opening every message',
  },
  {
    before: 'Children asking "is Mom/Dad mad?"',
    after: 'Children asking "what are we doing this weekend?"',
  },
  {
    before: 'Mediators seeing zero cooperation',
    after: 'Mediators calling it a breakthrough',
  },
];

interface PartnerHighlight {
  name: string;
  tagline: string;
  description: string;
  image: string;
  href: string;
  accentFrom: string;
  accentTo: string;
}

const partners: PartnerHighlight[] = [
  {
    name: '4Ever Forward Foundation',
    tagline: 'Strong fathers. Safer families. Calmer co-parenting.',
    description:
      'Supporting fathers rebuilding stability and stepping into respectful, present co-parenting — with tools that make it possible.',
    image: '/assets/marketing/forever-forward-hero.png',
    href: '/foreverforward',
    accentFrom: '#F59E0B',
    accentTo: '#D97706',
  },
  {
    name: 'Left Right 4 U',
    tagline: 'Recover. Refresh. Restore.',
    description:
      'Empowering single mothers facing breast cancer and domestic violence with the resources and support to rebuild their lives.',
    image: '/assets/marketing/lr4u_hero_nano_banana_1772567466304.png',
    href: '/leftright4u',
    accentFrom: '#FF6B6B',
    accentTo: '#4ECDC4',
  },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function StoriesPage() {
  return (
    <div className="min-h-screen bg-[#F4F8F7]">
      {/* ── Section 1: Hero ──────────────────────────────────────── */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-28 overflow-hidden">
        {/* Decorative blurred orbs */}
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-[#3DAA8A]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#F5A623]/6 rounded-full blur-3xl" />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          {/* Decorative quote mark */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 text-[12rem] leading-none text-[#3DAA8A]/[0.07] pointer-events-none select-none"
            style={{ fontFamily: 'Georgia, serif' }}
            aria-hidden="true"
          >
            &ldquo;
          </div>

          <p className="text-[#F5A623] font-medium mb-5 tracking-widest uppercase text-xs flex items-center justify-center gap-3">
            <span className="w-8 h-px bg-[#F5A623]/40" />
            Stories
            <span className="w-8 h-px bg-[#F5A623]/40" />
          </p>

          <h1
            className="text-4xl sm:text-5xl lg:text-[3.5rem] text-[#1E3A4A] mb-7 leading-[1.15]"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            When the fighting stopped,{' '}
            <span className="text-[#3DAA8A]">the family began.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            These are the moments families describe — the first calm
            conversation, the first handoff without tears, the night a child
            stopped asking if Mom and Dad were angry. CommonGround helped make
            them possible.
          </p>
        </div>
      </section>

      {/* ── Section 2: Stories ───────────────────────────────────── */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16 lg:mb-20">
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Every family has a{' '}
              <span className="text-[#3DAA8A]">turning point</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Names have been changed, but these experiences are real — from
              families supported through community programs across Southern
              California.
            </p>
          </div>

          <div className="space-y-16 lg:space-y-24">
            {stories.map((story, index) => {
              const IconComponent = story.icon;
              const isEven = index % 2 === 1;

              return (
                <div
                  key={story.id}
                  className={`flex flex-col ${isEven ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 lg:gap-12 items-center`}
                >
                  {/* Gradient visual panel */}
                  <div className="w-full md:w-5/12 flex-shrink-0">
                    <div
                      className="aspect-[4/3] rounded-2xl flex items-center justify-center relative overflow-hidden shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${story.gradientFrom}, ${story.gradientTo})`,
                      }}
                    >
                      {/* Subtle pattern overlay */}
                      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                      <IconComponent className="w-20 h-20 text-white/20" strokeWidth={1} />
                      {/* Pull quote overlay on panel */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/40 to-transparent">
                        <Quote className="w-5 h-5 text-white/60 mb-2" />
                        <p
                          className="text-white/90 text-sm sm:text-base leading-relaxed italic"
                          style={{
                            fontFamily: "'DM Serif Display', Georgia, serif",
                          }}
                        >
                          {story.pullQuote}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Story content */}
                  <div className="w-full md:w-7/12">
                    <div className="mb-1">
                      <h3
                        className="text-2xl font-semibold text-[#1E3A4A]"
                        style={{
                          fontFamily: "'DM Serif Display', Georgia, serif",
                        }}
                      >
                        {story.name}
                      </h3>
                      <p className="text-sm text-[#3DAA8A] font-medium">
                        {story.contextLine}
                      </p>
                    </div>

                    <div className="space-y-4 mt-5">
                      {story.paragraphs.map((p, i) => (
                        <p
                          key={i}
                          className="text-gray-600 leading-relaxed"
                        >
                          {p}
                        </p>
                      ))}
                    </div>

                    <div className="mt-6 bg-[#3DAA8A]/5 rounded-lg px-5 py-3 border-l-4 border-[#3DAA8A]">
                      <p className="text-[#1E3A4A] font-medium text-sm">
                        {story.highlight}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 3: Before & After ────────────────────────────── */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-[#F4F8F7] to-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              What <span className="text-[#3DAA8A]">changed</span>
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              From families in community programs — in their words, not our
              numbers.
            </p>
          </div>

          <div className="space-y-4">
            {transformations.map((t) => (
              <div
                key={t.before}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0"
              >
                {/* Before */}
                <div className="flex-1 bg-gray-100 rounded-xl sm:rounded-r-none px-6 py-4">
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">
                    Before
                  </p>
                  <p className="text-gray-500 line-through decoration-gray-300 font-medium">
                    {t.before}
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center sm:px-4 text-[#3DAA8A]">
                  <ArrowRight className="w-5 h-5 rotate-90 sm:rotate-0" />
                </div>

                {/* After */}
                <div className="flex-1 bg-[#3DAA8A]/5 border-l-4 border-[#3DAA8A] rounded-xl sm:rounded-l-none px-6 py-4">
                  <p className="text-[#3DAA8A] text-xs font-medium uppercase tracking-wide mb-1">
                    After
                  </p>
                  <p className="text-[#1E3A4A] font-semibold">{t.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Partners Making It Happen ─────────────────── */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              The organizations{' '}
              <span className="text-[#3DAA8A]">bringing this to families</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              CommonGround reaches families through the community organizations
              they already trust.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {partners.map((partner) => (
              <Link
                key={partner.name}
                href={partner.href}
                className="group block bg-[#F4F8F7] rounded-2xl overflow-hidden border border-gray-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={partner.image}
                    alt={partner.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3
                    className="text-xl text-[#1E3A4A] mb-1"
                    style={{
                      fontFamily: "'DM Serif Display', Georgia, serif",
                    }}
                  >
                    {partner.name}
                  </h3>
                  <p
                    className="text-sm font-medium mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${partner.accentFrom}, ${partner.accentTo})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {partner.tagline}
                  </p>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {partner.description}
                  </p>
                  <p className="mt-4 text-[#3DAA8A] text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    Learn more
                    <ArrowRight className="w-4 h-4" />
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <p className="text-center text-gray-500 mt-10 max-w-lg mx-auto leading-relaxed">
            These organizations — and others like them — are how CommonGround
            reaches the families who need it most.
          </p>
        </div>
      </section>

      {/* ── Section 5: Community Invitation ───────────────────────── */}
      <section className="py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] rounded-2xl p-8 lg:p-14 text-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/[0.03] rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Heart className="w-5 h-5 text-[#F5A623]" />
                <span className="text-[#F5A623] text-xs font-medium uppercase tracking-widest">
                  Community Impact
                </span>
              </div>

              <h2
                className="text-2xl sm:text-3xl text-white mb-5"
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                }}
              >
                Every family&rsquo;s story starts somewhere
              </h2>

              <p className="text-white/75 mb-9 max-w-xl mx-auto leading-relaxed">
                For many families, the path to calmer co-parenting began with a
                community organization that believed they deserved better tools.
                If your organization serves families navigating separation,
                divorce, or custody — we&rsquo;d love to explore how we can support
                the people you serve.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/grant-partnership"
                  className="inline-flex items-center justify-center gap-2 bg-white text-[#1E3A4A] font-medium px-8 py-3 rounded-full transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                >
                  Explore Partnership
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/partners"
                  className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-medium px-8 py-3 rounded-full transition-all duration-200 hover:bg-white/10"
                >
                  See Our Partners
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: Final CTA ─────────────────────────────────── */}
      <section className="py-20 border-t border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2
            className="text-3xl sm:text-4xl text-[#1E3A4A] mb-5"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Your turning point is waiting
          </h2>
          <p className="text-lg text-gray-600 mb-10 max-w-xl mx-auto leading-relaxed">
            Every story on this page started with a decision to try something
            different. CommonGround is free to start.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/early-access"
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
          <p className="text-sm text-gray-400 mt-6">
            No credit card required. Free tier forever.
          </p>
        </div>
      </section>
    </div>
  );
}
