import { Metadata } from 'next';
import Link from 'next/link';
import { Star, ArrowRight, Quote } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Testimonials | CommonGround',
  description: 'See what parents and professionals say about CommonGround. Real stories from real families.',
};

/**
 * Testimonials Page
 *
 * Stories and reviews from users.
 */

const featuredTestimonials = [
  {
    quote: "After years of hostile text messages, CommonGround changed everything. ARIA helped me realize how my words sounded, even when I didn't mean them that way. Now my ex and I can actually discuss our kids without fighting.",
    author: "Michelle T.",
    role: "Mother of two",
    location: "Denver, CO",
    image: null,
    rating: 5,
  },
  {
    quote: "The shared calendar and expense tracking saved my sanity. No more 'I thought you were picking them up' arguments. Everything is documented, and if there's ever a question, we just check CommonGround.",
    author: "David R.",
    role: "Father of three",
    location: "Austin, TX",
    image: null,
    rating: 5,
  },
  {
    quote: "As a family law attorney, I recommend CommonGround to every client going through custody proceedings. The documentation is impeccable, and the reduced conflict means faster resolutions.",
    author: "Sarah M., Esq.",
    role: "Family Law Attorney",
    location: "Los Angeles, CA",
    image: null,
    rating: 5,
  },
];

const parentTestimonials = [
  {
    quote: "I was skeptical about AI helping with communication, but ARIA's suggestions are spot-on. It catches things I'd never notice myself.",
    author: "Jennifer L.",
    location: "Seattle, WA",
    useCase: "ARIA Messaging",
  },
  {
    quote: "Building our custody agreement used to require expensive lawyers. CommonGround's wizard helped us create a comprehensive plan ourselves.",
    author: "Marcus J.",
    location: "Chicago, IL",
    useCase: "Agreement Builder",
  },
  {
    quote: "The exchange check-ins give me peace of mind. I always know when my kids were picked up and dropped off, with GPS verification.",
    author: "Amanda K.",
    location: "Phoenix, AZ",
    useCase: "Schedule Tracking",
  },
  {
    quote: "Expense tracking has eliminated 90% of our money arguments. Everything is logged with receipts. No more he-said-she-said.",
    author: "Robert P.",
    location: "Miami, FL",
    useCase: "ClearFund Expenses",
  },
  {
    quote: "My kids noticed the difference. They used to hide in their rooms when I got back from their dad's house. Now transitions are smooth.",
    author: "Lisa M.",
    location: "Portland, OR",
    useCase: "Conflict Reduction",
  },
  {
    quote: "When our modification hearing came up, I had 18 months of documented communication showing I'd always tried to cooperate. The judge was impressed.",
    author: "Chris B.",
    location: "Atlanta, GA",
    useCase: "Court Documentation",
  },
];

const professionalTestimonials = [
  {
    quote: "The compliance metrics and communication logs make my job so much easier. I can see patterns immediately instead of relying on conflicting parent accounts.",
    author: "Dr. Karen H.",
    role: "Custody Evaluator",
    organization: "Family Court Services",
  },
  {
    quote: "CommonGround's professional portal gives me exactly what I need: verified communication records, schedule compliance data, and clear documentation.",
    author: "Michael R.",
    role: "Guardian ad Litem",
    organization: "Independent Practice",
  },
  {
    quote: "Mediation sessions are more productive when I can review the CommonGround history beforehand. I understand the dynamics before we even start.",
    author: "Patricia N.",
    role: "Family Mediator",
    organization: "Mediation Services LLC",
  },
  {
    quote: "I've had clients whose cases settled faster because CommonGround documentation made the facts undeniable. Less discovery, less conflict, lower costs.",
    author: "James W., Esq.",
    role: "Family Law Attorney",
    organization: "Williams Family Law",
  },
];

const stats = [
  { value: '94%', label: 'Report reduced conflict' },
  { value: '89%', label: 'Would recommend to others' },
  { value: '76%', label: 'Fewer arguments about schedules' },
  { value: '82%', label: 'Better co-parent communication' },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

export default function TestimonialsPage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-cg-sage/5 blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-48 h-48 rounded-full bg-cg-amber/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
              Real stories from <span className="text-cg-sage">real families</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              See how CommonGround is helping parents communicate better
              and put their children first.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card rounded-2xl border border-border/50 p-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-4xl font-bold text-cg-sage mb-2">
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
      </section>

      {/* Featured Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Featured Stories
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {featuredTestimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl p-8 border border-border/50 flex flex-col"
              >
                <Quote className="w-10 h-10 text-cg-sage/20 mb-4" />
                <StarRating rating={testimonial.rating} />
                <p className="text-foreground mt-4 mb-6 flex-1">
                  "{testimonial.quote}"
                </p>
                <div className="border-t border-border pt-4">
                  <div className="font-semibold text-foreground">{testimonial.author}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Parent Testimonials */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              What Parents Say
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Hear from parents who've transformed their co-parenting experience.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {parentTestimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-background rounded-xl p-6 border border-border/50"
              >
                <div className="inline-block px-3 py-1 bg-cg-sage-subtle text-cg-sage text-xs font-medium rounded-full mb-4">
                  {testimonial.useCase}
                </div>
                <p className="text-foreground mb-4">"{testimonial.quote}"</p>
                <div className="text-sm">
                  <span className="font-medium text-foreground">{testimonial.author}</span>
                  <span className="text-muted-foreground"> · {testimonial.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Professional Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Trusted by Professionals
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Family law professionals rely on CommonGround for their clients.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {professionalTestimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-card rounded-xl p-6 border border-border/50"
              >
                <p className="text-foreground mb-6">"{testimonial.quote}"</p>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.author}</div>
                  <div className="text-sm text-cg-sage">{testimonial.role}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.organization}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Testimonials Placeholder */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Video Stories
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Watch parents share their CommonGround journey.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-background rounded-xl border border-border/50 overflow-hidden"
              >
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <div className="w-16 h-16 bg-cg-sage/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-8 h-8 text-cg-sage" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <p className="text-sm">Video coming soon</p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="font-medium text-foreground">Parent Story #{i}</div>
                  <div className="text-sm text-muted-foreground">Watch their journey</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Share Your Story CTA */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-cg-sage-subtle to-cg-amber-subtle rounded-2xl p-8 lg:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4">
              Share Your Story
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Has CommonGround helped your family? We'd love to hear from you.
              Your story might help another parent find their common ground.
            </p>
            <Link
              href="/help/contact?type=testimonial"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-3 rounded-full transition-all duration-200 hover:bg-cg-sage-light hover:shadow-lg"
            >
              Share Your Story
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-semibold text-foreground mb-6">
            Ready to join them?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Start your CommonGround journey today. Free to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center gap-2 border-2 border-cg-sage text-cg-sage font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage hover:text-white"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
