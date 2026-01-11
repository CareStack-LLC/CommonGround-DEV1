import { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, ArrowRight, User, Share2 } from 'lucide-react';

export const metadata: Metadata = {
  title: '10 Co-Parenting Best Practices That Actually Work | CommonGround Blog',
  description: 'Practical strategies for building a healthy co-parenting relationship, from communication tips to boundary setting.',
};

/**
 * Blog Post: 10 Co-Parenting Best Practices
 */

export default function BlogPost() {
  return (
    <div className="bg-background">
      {/* Header */}
      <section className="py-12 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          <div className="inline-block px-3 py-1 bg-cg-sage-subtle text-cg-sage text-sm font-medium rounded-full mb-4">
            Co-Parenting Tips
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground mb-6">
            10 Co-Parenting Best Practices That Actually Work
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              CommonGround Team
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              January 6, 2025
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              8 min read
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <article className="prose prose-gray dark:prose-invert max-w-none">
            <p className="lead text-xl text-muted-foreground">
              Co-parenting after separation isn't easy, but it doesn't have to be a constant battle.
              These ten evidence-based practices can help you build a healthier co-parenting relationship
              and create a more stable environment for your children.
            </p>

            <h2>1. Keep Communication Business-Like</h2>
            <p>
              Think of your co-parent as a business partner in the shared venture of raising your children.
              This mental shift helps remove emotional charge from everyday interactions. Keep communications
              focused, professional, and centered on the children's needs.
            </p>
            <p>
              <strong>Practical tip:</strong> Before sending any message, ask yourself: "Would I send this
              to a colleague at work?" If the answer is no, revise it.
            </p>

            <h2>2. Use Written Communication</h2>
            <p>
              Documented communication prevents the "I never said that" disputes that plague many
              co-parenting relationships. Text messages, emails, or platforms like CommonGround create
              a clear record that both parents can reference.
            </p>
            <p>
              Written communication also gives you time to think before responding, reducing the
              likelihood of saying something you'll regret.
            </p>

            <h2>3. Create and Follow a Detailed Parenting Plan</h2>
            <p>
              Ambiguity breeds conflict. A comprehensive parenting plan that covers schedules, holidays,
              decision-making, and expenses eliminates most day-to-day disagreements before they start.
            </p>
            <p>
              Your plan should address:
            </p>
            <ul>
              <li>Regular custody schedule (weekdays, weekends)</li>
              <li>Holiday and vacation rotations</li>
              <li>Pick-up and drop-off procedures</li>
              <li>How major decisions are made (medical, educational, religious)</li>
              <li>How expenses are shared and documented</li>
              <li>Communication expectations between parents</li>
              <li>Rules about introducing new partners</li>
            </ul>

            <h2>4. Never Put Children in the Middle</h2>
            <p>
              Children should never be messengers, spies, or confidants about adult matters.
              This includes:
            </p>
            <ul>
              <li>Don't ask children to relay messages to the other parent</li>
              <li>Don't quiz them about what happens at the other house</li>
              <li>Don't discuss financial matters or legal issues in front of them</li>
              <li>Don't speak negatively about the other parent</li>
              <li>Don't make them choose sides or express preferences</li>
            </ul>
            <p>
              Children who feel caught between parents experience higher rates of anxiety,
              depression, and behavioral issues.
            </p>

            <h2>5. Be Flexible When It Matters</h2>
            <p>
              Rigid adherence to schedules can sometimes harm children. A grandparent's 80th birthday
              or a once-in-a-lifetime opportunity shouldn't be missed because "it's not your day."
            </p>
            <p>
              Build flexibility into your relationship by:
            </p>
            <ul>
              <li>Giving reasonable notice for schedule change requests</li>
              <li>Being willing to swap days when it benefits the children</li>
              <li>Acknowledging that life sometimes disrupts plans</li>
              <li>Keeping a record of accommodations made by both sides</li>
            </ul>
            <p>
              <strong>Important:</strong> Flexibility should go both ways. If one parent is always
              accommodating and the other never reciprocates, that's a pattern to address.
            </p>

            <h2>6. Respect Boundaries</h2>
            <p>
              Healthy boundaries are essential for co-parenting success. This means:
            </p>
            <ul>
              <li>Accepting that you can't control what happens at the other parent's home</li>
              <li>Not showing up unannounced or letting yourself into their space</li>
              <li>Limiting communication to child-related matters</li>
              <li>Respecting each other's personal lives and new relationships</li>
              <li>Not using children to gather information about the other household</li>
            </ul>

            <h2>7. Present a United Front on Big Issues</h2>
            <p>
              While you don't need to agree on everything, consistency on major rules helps
              children feel secure. Try to align on:
            </p>
            <ul>
              <li>Bedtime and screen time expectations</li>
              <li>Academic standards and homework policies</li>
              <li>Discipline approaches</li>
              <li>Health and safety rules</li>
              <li>Age-appropriate privileges and responsibilities</li>
            </ul>
            <p>
              When you disagree, discuss it privately and try to find compromise before
              presenting the decision to your children.
            </p>

            <h2>8. Manage Your Own Emotions</h2>
            <p>
              Your children's other parent may do things that frustrate, anger, or hurt you.
              That's normal. What matters is how you respond.
            </p>
            <p>
              Before reacting to a triggering message or situation:
            </p>
            <ul>
              <li>Take a pause—wait at least an hour before responding to heated messages</li>
              <li>Vent to a friend, therapist, or journal—not to your children</li>
              <li>Ask yourself: "Will this matter in five years?"</li>
              <li>Focus on what you can control: your own behavior</li>
            </ul>

            <h2>9. Acknowledge the Other Parent's Importance</h2>
            <p>
              Even if you struggle with your ex, your children benefit from having a relationship
              with both parents. Actively support this relationship by:
            </p>
            <ul>
              <li>Speaking positively (or at least neutrally) about the other parent</li>
              <li>Encouraging calls and video chats during your parenting time</li>
              <li>Sharing positive moments and achievements with both households</li>
              <li>Ensuring children have photos of both parents</li>
              <li>Celebrating milestones together when possible</li>
            </ul>

            <h2>10. Seek Help When Needed</h2>
            <p>
              There's no shame in getting support. Options include:
            </p>
            <ul>
              <li><strong>Family therapy:</strong> A neutral third party can help you develop better communication patterns</li>
              <li><strong>Parenting coordinators:</strong> For high-conflict situations, a professional can help make decisions</li>
              <li><strong>Co-parenting apps:</strong> Tools like CommonGround can reduce conflict by structuring communication</li>
              <li><strong>Support groups:</strong> Connecting with other co-parents facing similar challenges</li>
              <li><strong>Individual therapy:</strong> Processing your own emotions helps you show up better for your children</li>
            </ul>

            <div className="bg-cg-sage-subtle rounded-xl p-6 my-8 not-prose">
              <h3 className="text-lg font-semibold text-foreground mb-2">The Bottom Line</h3>
              <p className="text-muted-foreground">
                Successful co-parenting isn't about liking your ex or pretending the past didn't
                happen. It's about consistently choosing to put your children's needs above your
                own feelings about the other parent. Every positive interaction, every conflict
                avoided, every moment of cooperation makes a difference in your children's lives.
              </p>
            </div>

            <p>
              Remember: your children didn't choose this situation. They deserve parents who can
              work together, even when it's hard. With practice, patience, and the right tools,
              co-parenting can become not just manageable, but genuinely collaborative.
            </p>
          </article>

          {/* Share */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Share this article:</span>
                <button className="p-2 rounded-lg bg-card border border-border hover:border-cg-sage/30 transition-colors">
                  <Share2 className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Posts */}
      <section className="py-12 bg-card border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold text-foreground mb-6">Related Articles</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <Link
              href="/blog/communication-tool-for-progress"
              className="group p-4 rounded-xl bg-background border border-border/50 hover:border-cg-sage/30 transition-colors"
            >
              <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-2">
                Using Communication as a Tool for Progress
              </h3>
              <p className="text-sm text-muted-foreground">
                Learn how intentional communication strategies can transform your co-parenting relationship.
              </p>
            </Link>
            <Link
              href="/blog/why-written-agreements-matter"
              className="group p-4 rounded-xl bg-background border border-border/50 hover:border-cg-sage/30 transition-colors"
            >
              <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-2">
                Why Written Agreements Matter
              </h3>
              <p className="text-sm text-muted-foreground">
                Discover how clear, documented agreements prevent misunderstandings.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-cg-sage-subtle to-cg-amber-subtle rounded-2xl p-8 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Ready to improve your co-parenting communication?
            </h2>
            <p className="text-muted-foreground mb-6">
              CommonGround helps you put these practices into action with structured messaging,
              shared calendars, and AI-powered communication assistance.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-6 py-3 rounded-full transition-all duration-200 hover:bg-cg-sage-light hover:shadow-lg"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
