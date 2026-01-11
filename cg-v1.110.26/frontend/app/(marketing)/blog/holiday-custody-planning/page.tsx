import { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, ArrowRight, User, Share2, Gift, Star } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Holiday Custody Planning: Creating Joy Instead of Stress | CommonGround Blog',
  description: 'Tips for navigating holiday schedules, managing expectations, and making celebrations special for everyone.',
};

/**
 * Blog Post: Holiday Custody Planning
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
            Scheduling
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground mb-6">
            Holiday Custody Planning: Creating Joy Instead of Stress
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              CommonGround Team
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              December 20, 2024
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
              Holidays after separation can feel like navigating a minefield. Between
              conflicting family expectations, schedule logistics, and your own emotions,
              it&apos;s easy to lose sight of what matters: creating positive memories for
              your children. Here&apos;s how to make holidays work for everyone.
            </p>

            <h2>Why Holiday Planning Matters</h2>
            <p>
              Children form lasting memories during holidays. These memories shouldn&apos;t be
              colored by parental conflict, rushed transitions, or feeling torn between homes.
              With thoughtful planning, holidays can be joyful—just different than before.
            </p>
            <p>
              The goal isn&apos;t to replicate pre-separation holidays. It&apos;s to create new
              traditions that work for your family&apos;s new structure.
            </p>

            <h2>Common Holiday Scheduling Approaches</h2>

            <h3>1. Alternating Years</h3>
            <p>
              Parent A has Thanksgiving in odd years; Parent B has it in even years. Simple
              and predictable, but means missing some holidays entirely.
            </p>
            <ul>
              <li><strong>Best for:</strong> Families who live far apart, or when both parents want &quot;full&quot; holidays</li>
              <li><strong>Consider:</strong> The off-year parent can create their own celebration on a different day</li>
            </ul>

            <h3>2. Split Each Holiday</h3>
            <p>
              Morning at one house, afternoon/evening at the other. Children get both parents
              each year, but it can feel rushed.
            </p>
            <ul>
              <li><strong>Best for:</strong> Families who live close together</li>
              <li><strong>Consider:</strong> Keep transition time consistent and build in buffer time</li>
            </ul>

            <h3>3. Divide the Holiday Season</h3>
            <p>
              Parent A has December 23-25; Parent B has December 26-28 plus New Year&apos;s Eve.
              Allows for extended time without mid-day transitions.
            </p>
            <ul>
              <li><strong>Best for:</strong> When extended family celebrations are important</li>
              <li><strong>Consider:</strong> Balance so one parent doesn&apos;t always get the &quot;main&quot; day</li>
            </ul>

            <h3>4. Duplicate Celebrations</h3>
            <p>
              Each parent has their own Thanksgiving dinner on different weekends. Children
              get two celebrations; no one feels they &quot;lost&quot; a holiday.
            </p>
            <ul>
              <li><strong>Best for:</strong> Parents who want full holiday experiences</li>
              <li><strong>Consider:</strong> Can mean more exhaustion for children</li>
            </ul>

            <div className="bg-cg-sage-subtle rounded-xl p-6 my-8 not-prose">
              <div className="flex items-start gap-3">
                <Star className="w-6 h-6 text-cg-sage flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Pro Tip: Be Specific</h3>
                  <p className="text-muted-foreground text-sm">
                    Don&apos;t just say &quot;alternating years.&quot; Specify exact times: &quot;Parent A has
                    children from December 24 at 4:00 PM until December 26 at 4:00 PM in
                    odd-numbered years.&quot; Vague agreements lead to conflicts.
                  </p>
                </div>
              </div>
            </div>

            <h2>Major Holidays to Consider</h2>
            <p>
              Your agreement should address each of these explicitly:
            </p>

            <h3>Winter Holidays</h3>
            <ul>
              <li><strong>Thanksgiving:</strong> Often includes the weekend—define start/end times</li>
              <li><strong>Christmas Eve/Day:</strong> Decide if these are treated together or separately</li>
              <li><strong>Hanukkah:</strong> Consider splitting across the eight nights</li>
              <li><strong>New Year&apos;s Eve/Day:</strong> Often paired with Christmas in alternating patterns</li>
              <li><strong>Winter Break:</strong> School vacation may need its own provisions</li>
            </ul>

            <h3>Spring/Summer</h3>
            <ul>
              <li><strong>Easter/Passover:</strong> May overlap with spring break</li>
              <li><strong>Spring Break:</strong> Often handled separately from regular schedule</li>
              <li><strong>Mother&apos;s Day/Father&apos;s Day:</strong> Typically with the respective parent</li>
              <li><strong>Memorial Day/Labor Day:</strong> Often extends the weekend</li>
              <li><strong>Fourth of July:</strong> Consider when fireworks typically happen</li>
              <li><strong>Summer Vacation:</strong> Extended time that may require advance notice</li>
            </ul>

            <h3>Personal Days</h3>
            <ul>
              <li><strong>Children&apos;s birthdays:</strong> Split the day, alternate years, or share?</li>
              <li><strong>Parent birthdays:</strong> Child with that parent?</li>
              <li><strong>School events:</strong> Both parents attend, or alternate?</li>
            </ul>

            <h2>Making Transitions Smoother</h2>

            <h3>Before the Holiday</h3>
            <ul>
              <li>Confirm the schedule in writing at least two weeks in advance</li>
              <li>Share gift lists so children don&apos;t get duplicates</li>
              <li>Coordinate on special outfits or items that need to travel</li>
              <li>Discuss any changes to traditions (new partner&apos;s family, etc.)</li>
              <li>Prepare children for what to expect at each home</li>
            </ul>

            <h3>During Transitions</h3>
            <ul>
              <li>Keep handoffs brief and positive</li>
              <li>Don&apos;t ask children about the other parent&apos;s celebration</li>
              <li>Let them bring special gifts between homes if they want</li>
              <li>Have something to look forward to at your home</li>
              <li>Don&apos;t compete or compare</li>
            </ul>

            <h3>After the Holiday</h3>
            <ul>
              <li>Let children share their experience if they want (don&apos;t interrogate)</li>
              <li>Avoid &quot;That sounds nice, but WE did...&quot; comparisons</li>
              <li>Thank the other parent for a smooth handoff (if applicable)</li>
              <li>Note what worked and what to adjust for next year</li>
            </ul>

            <h2>Managing Extended Family</h2>
            <p>
              Holidays often involve grandparents, aunts, uncles, and cousins. Consider:
            </p>
            <ul>
              <li><strong>Communicate your schedule:</strong> Share the custody calendar with extended family</li>
              <li><strong>Set expectations:</strong> Extended family may need to adjust their traditions</li>
              <li><strong>Protect your children:</strong> Family members shouldn&apos;t badmouth the other parent</li>
              <li><strong>Be flexible when possible:</strong> A grandparent&apos;s milestone birthday might warrant adjustment</li>
              <li><strong>Create new traditions:</strong> Maybe your family does &quot;December 28 Christmas&quot; now</li>
            </ul>

            <h2>When Your Child Is Sad About Missing a Parent</h2>
            <p>
              It&apos;s normal for children to miss the absent parent during holidays. Don&apos;t try to:
            </p>
            <ul>
              <li>Talk them out of their feelings</li>
              <li>Distract them with gifts or activities</li>
              <li>Make them feel guilty for missing the other parent</li>
            </ul>
            <p>
              Instead:
            </p>
            <ul>
              <li>&quot;I know you miss Mom/Dad. It&apos;s okay to feel that way.&quot;</li>
              <li>&quot;Would you like to call/text them?&quot;</li>
              <li>&quot;You&apos;ll see them on [specific date].&quot;</li>
              <li>Let them express sadness without taking it personally</li>
            </ul>

            <div className="bg-card rounded-xl p-6 my-8 border border-border not-prose">
              <div className="flex items-start gap-3">
                <Gift className="w-6 h-6 text-cg-sage flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Creating New Traditions</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Post-separation holidays are a chance to create traditions unique to your home:
                  </p>
                  <ul className="text-muted-foreground text-sm space-y-1">
                    <li>• &quot;Christmas Movie Marathon Eve&quot; if you have Dec 23</li>
                    <li>• Breakfast-for-dinner Thanksgiving</li>
                    <li>• &quot;Second Christmas&quot; when they return</li>
                    <li>• New Year&apos;s Day adventure tradition</li>
                    <li>• Make cookies for the other parent to take home</li>
                  </ul>
                </div>
              </div>
            </div>

            <h2>Gift Coordination</h2>
            <p>
              Uncoordinated gift-giving can create problems:
            </p>
            <ul>
              <li><strong>Duplicates:</strong> Both parents buy the same toy</li>
              <li><strong>Competition:</strong> One parent outdoes the other</li>
              <li><strong>Logistics:</strong> Large gifts that can&apos;t travel between homes</li>
              <li><strong>Expense disputes:</strong> Who pays for what?</li>
            </ul>

            <h3>Solutions:</h3>
            <ul>
              <li>Share wish lists in advance (apps like Amazon make this easy)</li>
              <li>Agree on spending limits if competition is an issue</li>
              <li>Coordinate on &quot;big&quot; gifts to avoid duplicates</li>
              <li>Decide which gifts &quot;live&quot; at which house</li>
              <li>Consider joint gifts for expensive items</li>
            </ul>

            <h2>The First Holiday Season After Separation</h2>
            <p>
              The first post-separation holidays are often the hardest. Some tips:
            </p>
            <ul>
              <li><strong>Lower expectations:</strong> It won&apos;t be the same—and that&apos;s okay</li>
              <li><strong>Plan for your alone time:</strong> Have something to do when children are with the other parent</li>
              <li><strong>Lean on support:</strong> Friends, family, or a therapist can help</li>
              <li><strong>Focus on moments, not perfection:</strong> One good memory is enough</li>
              <li><strong>Practice self-compassion:</strong> Grief during holidays is normal</li>
            </ul>

            <h2>When Agreements Break Down</h2>
            <p>
              What if the other parent doesn&apos;t follow the holiday agreement?
            </p>
            <ul>
              <li><strong>Document:</strong> Note the date, what was agreed, and what happened</li>
              <li><strong>Stay calm:</strong> Don&apos;t create a scene in front of children</li>
              <li><strong>Address later:</strong> Discuss in writing after the holiday</li>
              <li><strong>Pattern tracking:</strong> Multiple violations may warrant legal consultation</li>
              <li><strong>Focus on children:</strong> Make the best of whatever time you have</li>
            </ul>

            <h2>A Holiday Planning Checklist</h2>
            <div className="bg-card rounded-xl p-6 my-8 border border-border not-prose">
              <h3 className="text-lg font-semibold text-foreground mb-4">6 Weeks Before</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" disabled />
                  <span>Review custody agreement holiday provisions</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" disabled />
                  <span>Confirm dates and times with co-parent in writing</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" disabled />
                  <span>Share schedule with extended family</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" disabled />
                  <span>Begin gift coordination conversation</span>
                </li>
              </ul>

              <h3 className="text-lg font-semibold text-foreground mb-4 mt-6">2 Weeks Before</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" disabled />
                  <span>Finalize any schedule adjustments</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" disabled />
                  <span>Confirm transportation logistics</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" disabled />
                  <span>Prepare children for the schedule</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" disabled />
                  <span>Plan activities for your alone time (if applicable)</span>
                </li>
              </ul>

              <h3 className="text-lg font-semibold text-foreground mb-4 mt-6">Day Before</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" disabled />
                  <span>Pack children&apos;s bags (including any gifts that should travel)</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" disabled />
                  <span>Confirm exchange time and location</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" disabled />
                  <span>Remind children of the schedule in positive terms</span>
                </li>
              </ul>
            </div>

            <div className="bg-cg-amber-subtle rounded-xl p-6 my-8 not-prose">
              <h3 className="text-lg font-semibold text-foreground mb-2">Remember This</h3>
              <p className="text-muted-foreground">
                Holidays are about connection, not perfection. Your children don&apos;t need
                Pinterest-worthy celebrations—they need parents who can cooperate, adults who
                manage their own emotions, and the freedom to love both households without guilt.
                That&apos;s the best gift you can give them.
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
              href="/blog/why-written-agreements-matter"
              className="group p-4 rounded-xl bg-background border border-border/50 hover:border-cg-sage/30 transition-colors"
            >
              <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-2">
                Why Written Agreements Matter
              </h3>
              <p className="text-sm text-muted-foreground">
                How clear, specific agreements prevent holiday conflicts.
              </p>
            </Link>
            <Link
              href="/blog/putting-children-first"
              className="group p-4 rounded-xl bg-background border border-border/50 hover:border-cg-sage/30 transition-colors"
            >
              <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-2">
                Putting Children First
              </h3>
              <p className="text-sm text-muted-foreground">
                What it really means to prioritize your children during separation.
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
              Need help with holiday scheduling?
            </h2>
            <p className="text-muted-foreground mb-6">
              CommonGround&apos;s shared calendar and Agreement Builder help you create clear
              holiday plans that both parents can reference year after year.
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
