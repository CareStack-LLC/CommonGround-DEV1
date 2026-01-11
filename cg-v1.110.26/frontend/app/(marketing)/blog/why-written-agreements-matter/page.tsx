import { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, ArrowRight, User, Share2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Why Written Agreements Matter in Co-Parenting | CommonGround Blog',
  description: 'Discover how clear, documented agreements prevent misunderstandings and create stability for your children.',
};

/**
 * Blog Post: Why Written Agreements Matter
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
            Agreements
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground mb-6">
            Why Written Agreements Matter in Co-Parenting
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              CommonGround Team
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              January 2, 2025
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              7 min read
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <article className="prose prose-gray dark:prose-invert max-w-none">
            <p className="lead text-xl text-muted-foreground">
              "I thought we agreed on that." These six words have sparked more co-parenting
              conflicts than almost any others. Verbal agreements, no matter how clear they
              seem in the moment, have a way of becoming murky over time. Here's why written
              agreements are essential for co-parenting success.
            </p>

            <h2>The Problem with "We Agreed"</h2>
            <p>
              Memory is unreliable. Studies consistently show that people remember conversations
              differently, especially emotionally charged ones. In the context of co-parenting:
            </p>
            <ul>
              <li>You remember agreeing to "usually" do Friday pickups; they remember "always"</li>
              <li>You remember the exception; they remember the rule</li>
              <li>Details fade while confidence remains high</li>
              <li>We unconsciously remember things in ways that favor our position</li>
            </ul>
            <p>
              This isn't about dishonesty—it's about how human memory works. Without written
              documentation, every disagreement becomes your word against theirs.
            </p>

            <h2>What Written Agreements Provide</h2>

            <h3>1. Clarity and Precision</h3>
            <p>
              Writing forces you to be specific. "I'll pick up the kids after school" becomes
              "I will pick up the children from school at 3:15 PM at the main entrance on
              Mondays, Wednesdays, and Fridays during the school year."
            </p>
            <p>
              This precision eliminates ambiguity that leads to conflict.
            </p>

            <h3>2. A Reference Point</h3>
            <p>
              When disagreements arise—and they will—you have something concrete to consult.
              Instead of escalating into "you always" and "you never" arguments, you can simply
              refer back to what was actually agreed.
            </p>

            <h3>3. Reduced Conflict</h3>
            <p>
              Most co-parenting arguments aren't about major philosophical differences—they're
              about logistics. Who's picking up? What time? Who pays for what? Written agreements
              answer these questions before they become fights.
            </p>

            <h3>4. Legal Protection</h3>
            <p>
              If disagreements ever require court intervention, documented agreements show:
            </p>
            <ul>
              <li>What both parties actually agreed to</li>
              <li>Your attempts to cooperate and be reasonable</li>
              <li>A history of the co-parenting arrangement</li>
              <li>Any violations or patterns of non-compliance</li>
            </ul>

            <h3>5. Stability for Children</h3>
            <p>
              Children thrive on predictability. When parents have clear, written agreements,
              the schedule stays consistent. Kids know what to expect. They don't get caught
              in the middle of "I thought you were supposed to..." conversations.
            </p>

            <h2>What Should Be in Writing</h2>

            <h3>The Essentials</h3>
            <ul>
              <li><strong>Regular parenting schedule:</strong> Which days, which weekends, exact times</li>
              <li><strong>Holiday schedule:</strong> How holidays are divided, with specific dates and times</li>
              <li><strong>Vacation arrangements:</strong> Notice requirements, duration limits, travel rules</li>
              <li><strong>Exchange logistics:</strong> Where, when, and who handles transportation</li>
              <li><strong>Communication expectations:</strong> How and when parents will communicate</li>
            </ul>

            <h3>Decision-Making</h3>
            <ul>
              <li><strong>Medical decisions:</strong> Who decides? How are emergencies handled?</li>
              <li><strong>Educational choices:</strong> School selection, tutoring, special education</li>
              <li><strong>Religious upbringing:</strong> If applicable, how this will be handled</li>
              <li><strong>Extracurricular activities:</strong> Who chooses? Who pays? Schedule impact?</li>
            </ul>

            <h3>Financial Arrangements</h3>
            <ul>
              <li><strong>Child support:</strong> Amount, timing, method of payment</li>
              <li><strong>Expense sharing:</strong> What's included, percentages, documentation required</li>
              <li><strong>Medical costs:</strong> Insurance, uncovered expenses, reimbursement process</li>
              <li><strong>Education costs:</strong> Tuition, supplies, activities, college planning</li>
            </ul>

            <h3>Other Important Areas</h3>
            <ul>
              <li><strong>Right of first refusal:</strong> When the other parent gets first option for childcare</li>
              <li><strong>Introducing new partners:</strong> Timeline and expectations</li>
              <li><strong>Relocation:</strong> Notice requirements if either parent plans to move</li>
              <li><strong>Communication with children:</strong> Phone/video call schedules during other parent's time</li>
              <li><strong>Dispute resolution:</strong> How disagreements will be handled</li>
            </ul>

            <div className="bg-cg-sage-subtle rounded-xl p-6 my-8 not-prose">
              <h3 className="text-lg font-semibold text-foreground mb-2">Pro Tip: The 18-Section Approach</h3>
              <p className="text-muted-foreground">
                Comprehensive parenting plans typically cover 18 key areas of co-parenting.
                Missing even one section can create gaps that lead to future conflicts.
                CommonGround's Agreement Builder walks you through all 18 sections to ensure
                nothing important is overlooked.
              </p>
            </div>

            <h2>Making Agreements Work</h2>

            <h3>Both Parents Must Agree</h3>
            <p>
              An agreement you create alone isn't really an agreement—it's a wish list.
              Both parents need to participate in creating the document and formally approve it.
              This creates buy-in and makes compliance more likely.
            </p>

            <h3>Be Specific, Not Vague</h3>
            <p>
              Compare these two approaches:
            </p>

            <div className="bg-card rounded-xl p-6 my-6 border border-border not-prose">
              <div className="grid gap-4">
                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Vague (problematic):</p>
                  <p className="text-red-700 dark:text-red-300 italic">
                    "Parents will share holidays fairly."
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Specific (better):</p>
                  <p className="text-green-700 dark:text-green-300 italic">
                    "Thanksgiving: Parent A has children from Wednesday at 5:00 PM until Friday
                    at 5:00 PM in odd-numbered years. Parent B has the same schedule in
                    even-numbered years. The parent without Thanksgiving will have the children
                    for the following weekend regardless of the regular schedule."
                  </p>
                </div>
              </div>
            </div>

            <h3>Build in Flexibility</h3>
            <p>
              Rigid agreements can create their own problems. Include provisions for:
            </p>
            <ul>
              <li>How to request schedule changes</li>
              <li>Required notice periods for modifications</li>
              <li>A process for handling genuine emergencies</li>
              <li>Regular review and update schedules</li>
            </ul>

            <h3>Review and Update Regularly</h3>
            <p>
              Children's needs change. What works for a toddler won't work for a teenager.
              Build in annual reviews to ensure your agreement still serves your family.
              Document any agreed changes in writing and have both parents approve.
            </p>

            <h2>When You Can't Agree</h2>
            <p>
              Sometimes parents can't reach agreement on their own. Options include:
            </p>
            <ul>
              <li><strong>Mediation:</strong> A neutral third party helps you find common ground</li>
              <li><strong>Parenting coordinator:</strong> An ongoing professional who helps with disputes</li>
              <li><strong>Collaborative law:</strong> Each parent has an attorney, but you commit to settling out of court</li>
              <li><strong>Court:</strong> A judge decides when parents truly cannot agree</li>
            </ul>
            <p>
              Even if you need professional help to reach agreement, the goal remains the same:
              a clear, written document that both parents understand and accept.
            </p>

            <h2>The Court Perspective</h2>
            <p>
              If your case ever goes before a judge, documented agreements show that you:
            </p>
            <ul>
              <li>Are willing to communicate and cooperate</li>
              <li>Put effort into creating stability for your children</li>
              <li>Can articulate and commit to reasonable expectations</li>
              <li>Follow through on commitments (or have evidence when the other parent doesn't)</li>
            </ul>
            <p>
              Courts look favorably on parents who demonstrate these qualities.
            </p>

            <h2>Getting Started</h2>
            <p>
              If you don't yet have a comprehensive written agreement, start with what matters most:
            </p>
            <ol>
              <li><strong>The regular schedule:</strong> Get this in writing first, including exact times and locations</li>
              <li><strong>The next upcoming holiday:</strong> Agree on one holiday at a time if needed</li>
              <li><strong>Exchange procedures:</strong> Where and when, to eliminate day-of confusion</li>
              <li><strong>Emergency contacts:</strong> Who to call and when</li>
            </ol>
            <p>
              Then build from there, adding sections as you're able to reach agreement.
            </p>

            <div className="bg-cg-amber-subtle rounded-xl p-6 my-8 not-prose">
              <h3 className="text-lg font-semibold text-foreground mb-2">The Bottom Line</h3>
              <p className="text-muted-foreground">
                Written agreements aren't about trust or distrust—they're about clarity.
                The most amicable co-parents benefit from documentation just as much as
                high-conflict ones. When everything is in writing, both parents can focus
                on what really matters: raising happy, healthy children.
              </p>
            </div>
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
              href="/blog/10-coparenting-best-practices"
              className="group p-4 rounded-xl bg-background border border-border/50 hover:border-cg-sage/30 transition-colors"
            >
              <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-2">
                10 Co-Parenting Best Practices
              </h3>
              <p className="text-sm text-muted-foreground">
                Practical strategies for building a healthy co-parenting relationship.
              </p>
            </Link>
            <Link
              href="/blog/putting-children-first"
              className="group p-4 rounded-xl bg-background border border-border/50 hover:border-cg-sage/30 transition-colors"
            >
              <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-2">
                Putting Children First: What It Really Means
              </h3>
              <p className="text-sm text-muted-foreground">
                Moving beyond the phrase to practical actions.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-cg-sage-subtle to-cg-slate-subtle rounded-2xl p-8 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Ready to create your comprehensive agreement?
            </h2>
            <p className="text-muted-foreground mb-6">
              CommonGround's 18-section Agreement Builder walks you through everything
              you need to cover, with both parents contributing and approving.
            </p>
            <Link
              href="/features"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-6 py-3 rounded-full transition-all duration-200 hover:bg-cg-sage-light hover:shadow-lg"
            >
              Learn About Agreement Builder
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
