import { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, ArrowRight, User, Share2, Shield, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Managing High-Conflict Co-Parenting: A Survival Guide | CommonGround Blog',
  description: 'Strategies for protecting yourself and your children when co-parenting with a difficult ex-partner.',
};

/**
 * Blog Post: Managing High-Conflict Co-Parenting
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

          <div className="inline-block px-3 py-1 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm font-medium rounded-full mb-4">
            High-Conflict
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground mb-6">
            Managing High-Conflict Co-Parenting: A Survival Guide
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              CommonGround Team
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              December 28, 2024
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              12 min read
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <article className="prose prose-gray dark:prose-invert max-w-none">
            <p className="lead text-xl text-muted-foreground">
              Not every co-parenting situation can become amicable. When your co-parent is
              high-conflict, hostile, or uncooperative, traditional advice about &quot;communicating
              better&quot; may not work. This guide is for parents who need different strategies.
            </p>

            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-6 my-8 not-prose border border-amber-200 dark:border-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Important Note</h3>
                  <p className="text-muted-foreground text-sm">
                    If you are experiencing domestic violence, threats, or fear for your safety,
                    please contact the National Domestic Violence Hotline at 1-800-799-7233 or
                    visit thehotline.org. Your safety is the priority.
                  </p>
                </div>
              </div>
            </div>

            <h2>Recognizing High-Conflict Co-Parenting</h2>
            <p>
              High-conflict co-parenting goes beyond normal disagreements. Signs include:
            </p>
            <ul>
              <li>Every interaction becomes an argument, regardless of topic</li>
              <li>The other parent refuses to follow the custody agreement</li>
              <li>Constant criticism, blame, and accusations</li>
              <li>Attempts to turn children against you</li>
              <li>Using children as messengers or spies</li>
              <li>Interference with your parenting time</li>
              <li>False allegations or threats of legal action</li>
              <li>Ignoring boundaries repeatedly despite requests</li>
            </ul>
            <p>
              If three or more of these are regular occurrences, you&apos;re likely in a
              high-conflict co-parenting situation.
            </p>

            <h2>The Parallel Parenting Approach</h2>
            <p>
              When cooperative co-parenting isn&apos;t possible, <strong>parallel parenting</strong>
              becomes the healthier alternative. In parallel parenting:
            </p>
            <ul>
              <li><strong>Minimal direct contact:</strong> Communication is limited to essential child-related matters only</li>
              <li><strong>Written communication:</strong> All communication is documented (email, apps like CommonGround)</li>
              <li><strong>Business-like tone:</strong> Interactions are factual and emotion-free</li>
              <li><strong>Separate rules:</strong> Each parent manages their own household without interference</li>
              <li><strong>No joint events:</strong> Separate celebrations, conferences, and activities when needed</li>
              <li><strong>Structured exchanges:</strong> Handoffs happen in public places with minimal interaction</li>
            </ul>

            <div className="bg-cg-sage-subtle rounded-xl p-6 my-8 not-prose">
              <h3 className="text-lg font-semibold text-foreground mb-2">Parallel vs. Cooperative Parenting</h3>
              <p className="text-muted-foreground mb-4">
                Parallel parenting isn&apos;t a failure—it&apos;s a strategic choice to protect your children
                from conflict while still ensuring they have relationships with both parents.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-background rounded-lg p-4">
                  <p className="font-medium text-foreground mb-2">Cooperative Parenting</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>Joint decisions</li>
                    <li>Flexible scheduling</li>
                    <li>Regular communication</li>
                    <li>Shared events</li>
                  </ul>
                </div>
                <div className="bg-background rounded-lg p-4">
                  <p className="font-medium text-foreground mb-2">Parallel Parenting</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>Independent decisions</li>
                    <li>Strict schedule adherence</li>
                    <li>Minimal contact</li>
                    <li>Separate events</li>
                  </ul>
                </div>
              </div>
            </div>

            <h2>Protecting Yourself Through Documentation</h2>
            <p>
              In high-conflict situations, documentation is your strongest protection. Document everything:
            </p>

            <h3>What to Document</h3>
            <ul>
              <li><strong>All communications:</strong> Save every text, email, and voicemail</li>
              <li><strong>Schedule violations:</strong> Late pickups, early drop-offs, missed visits</li>
              <li><strong>Agreement violations:</strong> Any breach of your custody order</li>
              <li><strong>Children&apos;s statements:</strong> Concerning things children say (date, context, exact words)</li>
              <li><strong>Witness accounts:</strong> Third-party observations</li>
              <li><strong>Financial records:</strong> Expenses, unpaid support, reimbursement denials</li>
            </ul>

            <h3>How to Document Effectively</h3>
            <ul>
              <li><strong>Be factual:</strong> &quot;Pickup was at 6:47 PM instead of 5:00 PM&quot; not &quot;They were late AGAIN&quot;</li>
              <li><strong>Include context:</strong> Date, time, location, witnesses present</li>
              <li><strong>Note impact:</strong> How the incident affected the children or schedule</li>
              <li><strong>Avoid opinions:</strong> Courts want facts, not interpretations</li>
              <li><strong>Be consistent:</strong> Document every incident, not just major ones</li>
            </ul>

            <h2>Communication Strategies That Work</h2>

            <h3>The BIFF Method (Essential for High-Conflict)</h3>
            <p>
              When you must communicate, use BIFF responses:
            </p>
            <ul>
              <li><strong>Brief:</strong> Keep it short—2-3 sentences maximum</li>
              <li><strong>Informative:</strong> Only include necessary facts</li>
              <li><strong>Friendly:</strong> Neutral, professional tone (&quot;Thank you&quot; is enough)</li>
              <li><strong>Firm:</strong> End the conversation; don&apos;t invite further debate</li>
            </ul>

            <div className="bg-card rounded-xl p-6 my-6 border border-border not-prose">
              <h3 className="text-lg font-semibold text-foreground mb-4">BIFF Response Examples</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Incoming hostile message:</p>
                  <p className="text-muted-foreground italic text-sm">
                    &quot;You&apos;re ALWAYS doing this. You don&apos;t care about the kids at all.
                    I&apos;m done trying to work with you. You&apos;re going to hear from my lawyer.&quot;
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">BIFF response:</p>
                  <p className="text-muted-foreground italic text-sm">
                    &quot;I received your message. If you have specific concerns about Saturday&apos;s
                    pickup time, I&apos;m happy to discuss. Let me know. Thanks.&quot;
                  </p>
                </div>
              </div>
            </div>

            <h3>What NOT to Do</h3>
            <ul>
              <li><strong>Don&apos;t JADE:</strong> Don&apos;t Justify, Argue, Defend, or Explain</li>
              <li><strong>Don&apos;t match energy:</strong> If they send hostile messages, don&apos;t respond in kind</li>
              <li><strong>Don&apos;t respond immediately:</strong> Wait until emotions subside</li>
              <li><strong>Don&apos;t threaten:</strong> Even legitimate legal actions shouldn&apos;t be threats</li>
              <li><strong>Don&apos;t over-explain:</strong> Excessive detail invites more conflict</li>
            </ul>

            <h2>Setting and Enforcing Boundaries</h2>
            <p>
              Clear boundaries are essential. Examples include:
            </p>
            <ul>
              <li>&quot;I will only respond to communication about the children&quot;</li>
              <li>&quot;I will not discuss our past relationship&quot;</li>
              <li>&quot;Messages sent after 9 PM will be answered the next day&quot;</li>
              <li>&quot;I will communicate through CommonGround/email only, not text&quot;</li>
              <li>&quot;I will not respond to hostile or insulting messages&quot;</li>
            </ul>

            <p>
              <strong>Key principle:</strong> State your boundary once, then enforce it through action,
              not repeated explanations.
            </p>

            <div className="bg-card rounded-xl p-6 my-6 border border-border not-prose">
              <h3 className="text-lg font-semibold text-foreground mb-4">Boundary Enforcement Example</h3>
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <span className="text-muted-foreground">1.</span>
                  <span className="text-foreground">They send a hostile message at 11 PM</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground">2.</span>
                  <span className="text-foreground">You respond the next morning: &quot;Regarding your message—I can confirm 3 PM pickup works.&quot;</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground">3.</span>
                  <span className="text-foreground">They complain about the delayed response</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground">4.</span>
                  <span className="text-foreground">You don&apos;t address the complaint—just continue with logistics</span>
                </div>
              </div>
            </div>

            <h2>Protecting Your Children</h2>
            <p>
              Children in high-conflict situations need extra support:
            </p>

            <h3>Do:</h3>
            <ul>
              <li>Maintain stability and routine in your home</li>
              <li>Never speak negatively about their other parent</li>
              <li>Let them love their other parent without guilt</li>
              <li>Validate their feelings without solving &quot;the problem&quot;</li>
              <li>Consider family therapy with a child specialist</li>
              <li>Prepare them for transitions (&quot;You&apos;ll see Dad tomorrow&quot;)</li>
            </ul>

            <h3>Don&apos;t:</h3>
            <ul>
              <li>Ask children to carry messages between homes</li>
              <li>Quiz them about what happens at the other parent&apos;s house</li>
              <li>Put them in the middle of adult disputes</li>
              <li>Make them feel responsible for your feelings</li>
              <li>Share court documents or adult details with them</li>
            </ul>

            <h2>Using Technology as a Buffer</h2>
            <p>
              Communication apps designed for co-parenting can significantly reduce conflict:
            </p>

            <ul>
              <li><strong>Written record:</strong> Everything is automatically documented</li>
              <li><strong>Processing time:</strong> No real-time confrontation</li>
              <li><strong>AI assistance:</strong> Tools like ARIA can help rephrase hostile language</li>
              <li><strong>Third-party access:</strong> Attorneys, GALs, and courts can review if needed</li>
              <li><strong>Reduced emotional charge:</strong> Structure limits escalation opportunities</li>
            </ul>

            <div className="bg-cg-sage-subtle rounded-xl p-6 my-8 not-prose">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-cg-sage flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">How CommonGround Helps</h3>
                  <p className="text-muted-foreground text-sm">
                    CommonGround was designed with high-conflict situations in mind. ARIA analyzes
                    messages before sending, helping you maintain composure. Every message, schedule
                    change, and expense is documented with timestamps. If your case ever goes to
                    court, you have a complete, verified record of your attempts to cooperate.
                  </p>
                </div>
              </div>
            </div>

            <h2>When to Involve Professionals</h2>
            <p>
              Consider professional help when:
            </p>

            <h3>Parenting Coordinator</h3>
            <p>
              A parenting coordinator (PC) is a neutral professional who helps make day-to-day
              decisions when parents can&apos;t agree. Many courts can order PC involvement in
              high-conflict cases.
            </p>

            <h3>Family Therapist</h3>
            <p>
              A therapist who specializes in high-conflict divorce can help both you and your
              children cope with the stress.
            </p>

            <h3>Attorney</h3>
            <p>
              If the other parent consistently violates court orders, consult an attorney about
              enforcement options. Document violations systematically.
            </p>

            <h3>Guardian ad Litem (GAL)</h3>
            <p>
              In cases where children&apos;s wellbeing is at risk, a GAL can advocate for their
              interests independently.
            </p>

            <h2>Taking Care of Yourself</h2>
            <p>
              High-conflict co-parenting is exhausting. You can&apos;t take care of your children
              if you&apos;re running on empty.
            </p>
            <ul>
              <li><strong>Therapy:</strong> A professional can help you develop coping strategies</li>
              <li><strong>Support groups:</strong> Others in similar situations understand</li>
              <li><strong>Exercise:</strong> Physical activity reduces stress</li>
              <li><strong>Boundaries with yourself:</strong> Limit rumination time</li>
              <li><strong>Celebrate small wins:</strong> A conflict-free exchange is progress</li>
              <li><strong>Accept what you can&apos;t control:</strong> You can only manage your own behavior</li>
            </ul>

            <h2>The Long View</h2>
            <p>
              High-conflict co-parenting is often a marathon, not a sprint. Some important perspectives:
            </p>
            <ul>
              <li>Children eventually grow up and form their own opinions</li>
              <li>Your calm, consistent presence matters more than winning arguments</li>
              <li>Courts notice patterns over time—keep documenting</li>
              <li>Some high-conflict behaviors decrease as time passes</li>
              <li>Your children will remember who was the stable parent</li>
            </ul>

            <div className="bg-cg-amber-subtle rounded-xl p-6 my-8 not-prose">
              <h3 className="text-lg font-semibold text-foreground mb-2">Remember This</h3>
              <p className="text-muted-foreground">
                You cannot change your co-parent&apos;s behavior. You can only control your responses,
                protect your children, and document everything. Stay calm, stay consistent, and keep
                your focus on what you can actually influence: your own home, your own choices,
                your own relationship with your children.
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
              href="/blog/communication-tool-for-progress"
              className="group p-4 rounded-xl bg-background border border-border/50 hover:border-cg-sage/30 transition-colors"
            >
              <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-2">
                Using Communication as a Tool for Progress
              </h3>
              <p className="text-sm text-muted-foreground">
                Learn the BIFF method and other strategies for more effective co-parent communication.
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
                How documentation can protect you in high-conflict situations.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-cg-slate-subtle to-cg-sage-subtle rounded-2xl p-8 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Need better documentation for your situation?
            </h2>
            <p className="text-muted-foreground mb-6">
              CommonGround provides court-ready documentation of all communications,
              schedules, and agreements. ARIA helps you maintain composure under pressure.
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
