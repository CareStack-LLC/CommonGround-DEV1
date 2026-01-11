import { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, ArrowRight, User, Share2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Using Communication as a Tool for Progress, Not Conflict | CommonGround Blog',
  description: 'Learn how intentional communication strategies can transform your co-parenting relationship and benefit your children.',
};

/**
 * Blog Post: Communication as a Tool for Progress
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

          <div className="inline-block px-3 py-1 bg-cg-amber-subtle text-cg-amber text-sm font-medium rounded-full mb-4">
            Communication
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground mb-6">
            Using Communication as a Tool for Progress, Not Conflict
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              CommonGround Team
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              January 4, 2025
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              10 min read
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <article className="prose prose-gray dark:prose-invert max-w-none">
            <p className="lead text-xl text-muted-foreground">
              Communication with your co-parent can feel like walking through a minefield.
              But what if you could transform it from a source of stress into a tool that
              actually moves your family forward? Here's how to make that shift.
            </p>

            <h2>The Hidden Cost of Poor Communication</h2>
            <p>
              Before we talk about solutions, let's acknowledge what's at stake. Research
              consistently shows that parental conflict—not divorce itself—is what harms
              children most. Kids who witness ongoing hostility between their parents experience:
            </p>
            <ul>
              <li>Higher rates of anxiety and depression</li>
              <li>Lower academic performance</li>
              <li>Difficulty forming healthy relationships</li>
              <li>Behavioral problems at home and school</li>
              <li>Long-term impacts on their own adult relationships</li>
            </ul>
            <p>
              Every hostile text message, every sarcastic comment, every argument at pickup—your
              children feel it, even when you think they don't notice.
            </p>

            <h2>The BIFF Method: Your Communication Foundation</h2>
            <p>
              Developed by high-conflict expert Bill Eddy, the BIFF method provides a framework
              for responding to difficult messages. BIFF stands for:
            </p>
            <ul>
              <li><strong>Brief:</strong> Keep it short. Long messages invite point-by-point arguments.</li>
              <li><strong>Informative:</strong> Stick to facts and logistics. No opinions, no emotions.</li>
              <li><strong>Friendly:</strong> Maintain a polite, neutral tone. A simple "Thanks" goes far.</li>
              <li><strong>Firm:</strong> End the conversation clearly. Don't leave openings for debate.</li>
            </ul>

            <div className="bg-card rounded-xl p-6 my-8 border border-border not-prose">
              <h3 className="text-lg font-semibold text-foreground mb-4">Example: BIFF in Action</h3>
              <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Before (reactive):</p>
                  <p className="text-red-700 dark:text-red-300 italic">
                    "You ALWAYS change plans at the last minute! I'm so sick of you never
                    thinking about anyone but yourself. The kids were looking forward to this
                    all week. But of course, your schedule is more important than theirs.
                    This is exactly why we got divorced."
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">After (BIFF):</p>
                  <p className="text-green-700 dark:text-green-300 italic">
                    "I understand you need to change Saturday's pickup to 2pm instead of 10am.
                    I can make that work this time. In the future, please let me know schedule
                    changes by Wednesday so we can prepare the kids. Thanks."
                  </p>
                </div>
              </div>
            </div>

            <h2>The Power of the Pause</h2>
            <p>
              The most important communication skill isn't what you say—it's when you don't
              say anything at all. When you receive a message that triggers an emotional response:
            </p>
            <ol>
              <li><strong>Don't respond immediately.</strong> Set the phone down. Walk away.</li>
              <li><strong>Wait at least one hour.</strong> For heated exchanges, wait 24 hours if possible.</li>
              <li><strong>Draft your response elsewhere.</strong> Write it in a notes app first.</li>
              <li><strong>Review before sending.</strong> Read it as if a judge will see it (because they might).</li>
              <li><strong>Ask yourself:</strong> "Does this need to be said? Does it need to be said by me? Does it need to be said right now?"</li>
            </ol>

            <h2>Reframing: Changing the Story You Tell Yourself</h2>
            <p>
              Much of communication conflict stems from the stories we tell ourselves about
              the other person's intentions. Cognitive reframing can help:
            </p>
            <ul>
              <li><strong>Instead of:</strong> "They're doing this to punish me."<br />
                  <strong>Try:</strong> "They may have reasons I don't understand."</li>
              <li><strong>Instead of:</strong> "They never consider my schedule."<br />
                  <strong>Try:</strong> "Coordinating schedules is challenging for both of us."</li>
              <li><strong>Instead of:</strong> "They're trying to turn the kids against me."<br />
                  <strong>Try:</strong> "We both love our children and want what's best for them."</li>
            </ul>
            <p>
              This doesn't mean excusing bad behavior. It means choosing interpretations that
              don't escalate your emotional response.
            </p>

            <h2>The "Businesslike" Approach</h2>
            <p>
              Many co-parents find success by treating their relationship like a business
              partnership. This means:
            </p>
            <ul>
              <li><strong>Formal communication:</strong> Start messages with "Hi [Name]" and end with "Thanks"</li>
              <li><strong>Scheduled check-ins:</strong> Weekly or biweekly updates about the children</li>
              <li><strong>Documentation:</strong> Confirm agreements in writing</li>
              <li><strong>Professional boundaries:</strong> Discuss only child-related matters</li>
              <li><strong>Meetings with agendas:</strong> When in-person discussions are needed, come prepared</li>
            </ul>

            <h2>What to Communicate (And What Not To)</h2>
            <h3>Do Share:</h3>
            <ul>
              <li>Schedule changes and logistics</li>
              <li>Medical appointments and health concerns</li>
              <li>School events and academic updates</li>
              <li>Behavioral issues that need consistent handling</li>
              <li>Positive moments and achievements</li>
              <li>Changes to emergency contacts or important information</li>
            </ul>

            <h3>Don't Share:</h3>
            <ul>
              <li>Details about your dating life</li>
              <li>Financial complaints unrelated to child expenses</li>
              <li>Criticisms of their parenting style (unless safety is at risk)</li>
              <li>Rehashing past relationship issues</li>
              <li>Complaints about what happens at their house (within reason)</li>
              <li>Information gathered from questioning your children</li>
            </ul>

            <h2>Technology as a Buffer</h2>
            <p>
              Sometimes the best way to improve communication is to add structure and
              distance. Technology can help by:
            </p>
            <ul>
              <li><strong>Creating documentation:</strong> Written messages can be reviewed later if needed</li>
              <li><strong>Adding processing time:</strong> Text and email allow you to pause before responding</li>
              <li><strong>Reducing emotional intensity:</strong> Written communication is less charged than face-to-face</li>
              <li><strong>Providing assistance:</strong> AI tools like ARIA can suggest calmer ways to phrase messages</li>
              <li><strong>Centralizing information:</strong> Shared calendars and expense trackers reduce miscommunication</li>
            </ul>

            <h2>When Communication Breaks Down</h2>
            <p>
              Despite best efforts, sometimes communication with your co-parent simply doesn't work.
              Signs that you may need additional support:
            </p>
            <ul>
              <li>Most exchanges escalate into arguments</li>
              <li>You dread every notification from them</li>
              <li>Simple logistics take multiple hostile exchanges to resolve</li>
              <li>Your children are showing signs of stress from parental conflict</li>
              <li>You find yourself constantly venting about your co-parent</li>
            </ul>
            <p>
              In these situations, consider:
            </p>
            <ul>
              <li><strong>A parenting coordinator:</strong> A neutral professional who helps make decisions</li>
              <li><strong>Parallel parenting:</strong> Minimal contact with maximum structure</li>
              <li><strong>Mediation:</strong> Facilitated conversations with a trained mediator</li>
              <li><strong>Family therapy:</strong> Professional help to improve communication patterns</li>
            </ul>

            <div className="bg-cg-sage-subtle rounded-xl p-6 my-8 not-prose">
              <h3 className="text-lg font-semibold text-foreground mb-2">Remember This</h3>
              <p className="text-muted-foreground">
                You can't control how your co-parent communicates. You can only control
                how you respond. Every message you send is a choice. Choose to model the
                communication you want your children to learn. Choose to be the parent who
                stayed calm. Choose progress over being "right."
              </p>
            </div>

            <h2>Building New Patterns</h2>
            <p>
              Changing communication patterns takes time. Don't expect overnight transformation.
              Instead, focus on:
            </p>
            <ul>
              <li><strong>Small wins:</strong> Celebrate when you successfully de-escalate one exchange</li>
              <li><strong>Consistency:</strong> Keep using BIFF even when they don't</li>
              <li><strong>Self-compassion:</strong> You'll slip up. Acknowledge it and do better next time</li>
              <li><strong>Long-term thinking:</strong> In five years, will this argument matter?</li>
              <li><strong>Your children's perspective:</strong> How would they feel reading this message?</li>
            </ul>
            <p>
              Every positive exchange, no matter how small, builds toward a better co-parenting
              relationship. Every conflict you avoid is a gift to your children. Communication
              isn't just a necessity of co-parenting—it's an opportunity to show your children
              what healthy adult relationships look like.
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
              href="/blog/managing-high-conflict-coparenting"
              className="group p-4 rounded-xl bg-background border border-border/50 hover:border-cg-sage/30 transition-colors"
            >
              <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-2">
                Managing High-Conflict Co-Parenting
              </h3>
              <p className="text-sm text-muted-foreground">
                Strategies for protecting yourself when communication is exceptionally difficult.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-cg-amber-subtle to-cg-sage-subtle rounded-2xl p-8 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Need help with difficult conversations?
            </h2>
            <p className="text-muted-foreground mb-6">
              ARIA, our AI communication assistant, helps you phrase messages in ways that
              reduce conflict while keeping your meaning intact.
            </p>
            <Link
              href="/aria"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-6 py-3 rounded-full transition-all duration-200 hover:bg-cg-sage-light hover:shadow-lg"
            >
              Learn About ARIA
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
