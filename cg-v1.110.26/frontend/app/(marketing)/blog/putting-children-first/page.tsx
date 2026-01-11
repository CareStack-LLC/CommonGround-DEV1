import { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, ArrowRight, User, Share2, Heart, CheckCircle, XCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Putting Children First: What It Really Means | CommonGround Blog',
  description: 'Moving beyond the phrase to practical actions that genuinely prioritize your children\'s wellbeing during and after separation.',
};

/**
 * Blog Post: Putting Children First
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
            Parenting
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground mb-6">
            Putting Children First: What It Really Means
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              CommonGround Team
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              December 24, 2024
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              9 min read
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <article className="prose prose-gray dark:prose-invert max-w-none">
            <p className="lead text-xl text-muted-foreground">
              &quot;We just want what&apos;s best for the kids.&quot; It&apos;s a phrase every separating
              parent says. But in the chaos of divorce, &quot;putting children first&quot; can become
              an empty slogan or, worse, a weapon. Here&apos;s what it actually means—and how
              to practice it.
            </p>

            <h2>The Gap Between Words and Actions</h2>
            <p>
              Both parents typically believe they&apos;re putting children first. Yet their actions
              often contradict each other, and both can&apos;t be right. The disconnect usually
              comes from confusing what&apos;s best for the children with:
            </p>
            <ul>
              <li>What&apos;s best for the parent</li>
              <li>What punishes the other parent</li>
              <li>What feels fair</li>
              <li>What makes the parent look better</li>
              <li>What the parent wants the children to want</li>
            </ul>
            <p>
              True child-centered decisions often require sacrificing what feels fair or
              satisfying to the parent.
            </p>

            <h2>What Research Tells Us Children Need</h2>
            <p>
              Decades of research on children of divorce consistently shows that children
              thrive when they have:
            </p>

            <h3>1. Meaningful Relationships with Both Parents</h3>
            <p>
              Except in cases of abuse or neglect, children benefit from substantial time
              with both parents. This means:
            </p>
            <ul>
              <li>Supporting the other parent&apos;s relationship with the children</li>
              <li>Never speaking negatively about the other parent</li>
              <li>Encouraging love for both parents without guilt</li>
              <li>Facilitating (not just allowing) contact during your time</li>
            </ul>

            <h3>2. Protection from Parental Conflict</h3>
            <p>
              The single biggest predictor of child outcomes in divorce is the level of
              conflict between parents. Children need:
            </p>
            <ul>
              <li>Never to witness arguments between parents</li>
              <li>Never to be asked to take sides</li>
              <li>Never to feel responsible for parent emotions</li>
              <li>Parents who can be civil at handoffs and events</li>
            </ul>

            <h3>3. Stability and Predictability</h3>
            <p>
              Chaos is harmful. Children need:
            </p>
            <ul>
              <li>A consistent schedule they can count on</li>
              <li>Clear expectations at both homes</li>
              <li>Advance notice of changes</li>
              <li>Routines that stay similar between households</li>
            </ul>

            <h3>4. Permission to Have Their Own Feelings</h3>
            <p>
              Children experience a range of emotions about divorce—sadness, anger,
              confusion, guilt, relief. They need:
            </p>
            <ul>
              <li>Space to feel without having to protect parents</li>
              <li>Validation that their feelings are normal</li>
              <li>Adults who can handle their emotions without crumbling</li>
              <li>Therapy or support when helpful</li>
            </ul>

            <div className="bg-cg-sage-subtle rounded-xl p-6 my-8 not-prose">
              <div className="flex items-start gap-3">
                <Heart className="w-6 h-6 text-cg-sage flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">The Bottom Line</h3>
                  <p className="text-muted-foreground">
                    Children need two parents who can put aside their own pain, anger, and
                    grievances to cooperate in raising them. This is incredibly hard—and
                    incredibly important.
                  </p>
                </div>
              </div>
            </div>

            <h2>Practical Ways to Put Children First</h2>

            <div className="bg-card rounded-xl p-6 my-8 border border-border not-prose">
              <h3 className="text-lg font-semibold text-foreground mb-4">Child-First Actions</h3>
              <div className="space-y-4">
                {[
                  {
                    right: "Share positive things the child did during your time",
                    wrong: "Only share problems or ask about problems at the other home"
                  },
                  {
                    right: "\"I know you miss Mom/Dad—would you like to call them?\"",
                    wrong: "\"You don't need to call them every day\""
                  },
                  {
                    right: "\"Your dad/mom loves you so much\"",
                    wrong: "Silence or hedging when the child talks about the other parent"
                  },
                  {
                    right: "Drive to the other parent's event to support your child",
                    wrong: "Only attend events during \"your time\""
                  },
                  {
                    right: "Swap days when the other parent has a special opportunity for the child",
                    wrong: "Refuse all flexibility because \"it's my time\""
                  }
                ].map((item, index) => (
                  <div key={index} className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2 bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-green-700 dark:text-green-300">{item.right}</p>
                    </div>
                    <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-300">{item.wrong}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <h2>The Transition Question</h2>
            <p>
              Every time your child transitions between homes, ask yourself:
            </p>
            <blockquote className="border-l-4 border-cg-sage pl-4 italic">
              &quot;What can I do to make this moment easier for my child?&quot;
            </blockquote>
            <p>
              This might mean:
            </p>
            <ul>
              <li>Having them ready on time (not making them wait anxiously)</li>
              <li>Making handoffs brief and pleasant (not awkward or tense)</li>
              <li>Speaking kindly about where they&apos;re going</li>
              <li>Having their belongings organized</li>
              <li>Saying goodbye warmly but not dramatically</li>
              <li>Not asking &quot;Did you miss me?&quot; when they return</li>
            </ul>

            <h2>When &quot;What&apos;s Best&quot; Conflicts with &quot;What&apos;s Fair&quot;</h2>
            <p>
              Sometimes the child-first choice feels unfair to you:
            </p>
            <ul>
              <li>Your child wants to stay for their step-sibling&apos;s birthday, cutting into your time</li>
              <li>The other parent gets the &quot;fun&quot; vacation while you handle school nights</li>
              <li>You drive farther for exchanges because it&apos;s easier on the child</li>
              <li>You attend events together even though it&apos;s uncomfortable</li>
              <li>You don&apos;t correct misconceptions your child has that favor the other parent</li>
            </ul>
            <p>
              <strong>Putting children first means:</strong> Fairness between parents is less
              important than what serves the child.
            </p>

            <h2>The &quot;Would a Judge Approve?&quot; Test</h2>
            <p>
              Before any action involving your children, ask: &quot;If a judge watched this moment,
              would they see a parent putting their child first?&quot;
            </p>
            <p>
              This applies to:
            </p>
            <ul>
              <li>Text messages to your co-parent</li>
              <li>What you say about them in front of children</li>
              <li>How you handle schedule requests</li>
              <li>How you behave at handoffs</li>
              <li>Whether you attend their events</li>
            </ul>

            <h2>Ages and Stages: What &quot;First&quot; Looks Like at Different Ages</h2>

            <h3>Infants and Toddlers (0-3)</h3>
            <ul>
              <li>Need consistent routines between homes</li>
              <li>Benefit from more frequent transitions (shorter time away from either parent)</li>
              <li>Need physical comfort items that travel between homes</li>
              <li>Are highly sensitive to parental stress and tension</li>
            </ul>

            <h3>Preschool (3-5)</h3>
            <ul>
              <li>May blame themselves for the divorce</li>
              <li>Need repeated reassurance that both parents love them</li>
              <li>Benefit from predictable schedules and visual calendars</li>
              <li>May regress developmentally during transitions</li>
            </ul>

            <h3>School Age (6-12)</h3>
            <ul>
              <li>Want to please both parents—don&apos;t put them in loyalty conflicts</li>
              <li>Need to maintain friendships and activities across both households</li>
              <li>May start taking sides—don&apos;t encourage it</li>
              <li>Are old enough to have preferences but shouldn&apos;t have to make decisions</li>
            </ul>

            <h3>Teens (13-18)</h3>
            <ul>
              <li>Need flexibility as their social lives expand</li>
              <li>May have strong opinions—listen, but don&apos;t put adult decisions on them</li>
              <li>Still need structure and boundaries despite push for independence</li>
              <li>Should never be asked to carry messages or play mediator</li>
            </ul>

            <h2>What Putting Children First Is NOT</h2>
            <p>
              Sometimes &quot;for the children&quot; becomes a justification for harmful behavior:
            </p>
            <ul>
              <li><strong>It&apos;s NOT:</strong> &quot;I&apos;m protecting them&quot; when you&apos;re actually alienating them from the other parent</li>
              <li><strong>It&apos;s NOT:</strong> &quot;They want to stay with me&quot; when you&apos;ve coached or pressured them</li>
              <li><strong>It&apos;s NOT:</strong> Fighting for more custody because you don&apos;t want to pay support</li>
              <li><strong>It&apos;s NOT:</strong> Demanding every detail of the other household to &quot;make sure they&apos;re safe&quot;</li>
              <li><strong>It&apos;s NOT:</strong> &quot;They need to know the truth&quot; when sharing adult grievances</li>
            </ul>

            <h2>Signs You&apos;re Actually Putting Children First</h2>
            <ul>
              <li>Your children speak freely about the other parent without watching your reaction</li>
              <li>Transitions are calm and uneventful</li>
              <li>You occasionally sacrifice &quot;your time&quot; for their benefit</li>
              <li>You coordinate with your co-parent on important decisions</li>
              <li>You actively support their relationship with the other parent</li>
              <li>Your children don&apos;t know the details of adult conflicts</li>
              <li>You can be in the same room as your co-parent without tension</li>
              <li>You genuinely want your children to love their other parent</li>
            </ul>

            <h2>The Hardest Part: When Your Co-Parent Doesn&apos;t Reciprocate</h2>
            <p>
              What if you&apos;re putting children first but the other parent isn&apos;t? This is
              genuinely difficult. But remember:
            </p>
            <ul>
              <li><strong>You can only control yourself.</strong> Keep doing the right thing.</li>
              <li><strong>Children notice.</strong> Over time, they recognize which parent was stable.</li>
              <li><strong>Courts notice.</strong> Your documented cooperation matters if issues arise.</li>
              <li><strong>It protects you.</strong> You can look in the mirror knowing you did your best.</li>
            </ul>
            <p>
              You can&apos;t make your co-parent be a better parent. You can only be the best
              parent you can be.
            </p>

            <div className="bg-cg-amber-subtle rounded-xl p-6 my-8 not-prose">
              <h3 className="text-lg font-semibold text-foreground mb-2">A Daily Reminder</h3>
              <p className="text-muted-foreground">
                Your children didn&apos;t choose divorce. They didn&apos;t ask for two homes, shuffled
                schedules, or split holidays. What they need most is two parents who love them
                enough to set aside their own pain and work together. Every time you choose
                cooperation over conflict, you&apos;re putting your children first—for real.
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
              href="/blog/managing-high-conflict-coparenting"
              className="group p-4 rounded-xl bg-background border border-border/50 hover:border-cg-sage/30 transition-colors"
            >
              <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-2">
                Managing High-Conflict Co-Parenting
              </h3>
              <p className="text-sm text-muted-foreground">
                Strategies when the other parent makes cooperation difficult.
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
              Ready to put your children first?
            </h2>
            <p className="text-muted-foreground mb-6">
              CommonGround helps you maintain focus on what matters most—your children&apos;s
              wellbeing—with tools designed to reduce conflict and improve cooperation.
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
