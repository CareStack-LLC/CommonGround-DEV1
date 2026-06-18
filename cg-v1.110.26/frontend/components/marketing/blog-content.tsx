'use client';

import { Heart, CheckCircle, XCircle, Shield, AlertTriangle, Gift, Star } from 'lucide-react';

/**
 * Blog Post Content Components
 *
 * Contains the article content for each blog post, separated by slug.
 * This keeps the rich JSX formatting while allowing for dynamic routing.
 */

interface BlogContentProps {
  slug: string;
}

export function BlogContent({ slug }: BlogContentProps) {
  switch (slug) {
    case '10-coparenting-best-practices':
      return <CoParentingBestPractices />;
    case 'communication-tool-for-progress':
      return <CommunicationProgress />;
    case 'why-written-agreements-matter':
      return <WrittenAgreements />;
    case 'managing-high-conflict-coparenting':
      return <HighConflictGuide />;
    case 'putting-children-first':
      return <ChildrenFirst />;
    case 'holiday-custody-planning':
      return <HolidayPlanning />;
    case 'custody-schedule-types-guide':
      return <CustodyScheduleGuide />;
    case 'splitting-child-expenses-fairly':
      return <SplittingExpenses />;
    case 'coparenting-with-a-difficult-ex':
      return <DifficultEx />;
    case 'helping-kids-thrive-two-homes':
      return <TwoHomes />;
    case 'fathers-mental-health-awareness-month':
      return <FathersMentalHealthAwareness />;
    case 'fathers-mental-health-self-care':
      return <FatherMentalHealthSelfCare />;
    default:
      return null;
  }
}

function CoParentingBestPractices() {
  return (
    <article className="max-w-none">
      <p className="lead text-xl text-gray-600">
        Co-parenting after separation isn&apos;t easy, but it doesn&apos;t have to be a constant battle.
        These ten evidence-based practices can help you build a healthier co-parenting relationship
        and create a more stable environment for your children.
      </p>

      <h2>1. Keep Communication Business-Like</h2>
      <p>
        Think of your co-parent as a business partner in the shared venture of raising your children.
        This mental shift helps remove emotional charge from everyday interactions. Keep communications
        focused, professional, and centered on the children&apos;s needs.
      </p>
      <p>
        <strong>Practical tip:</strong> Before sending any message, ask yourself: &quot;Would I send this
        to a colleague at work?&quot; If the answer is no, revise it.
      </p>

      <h2>2. Use Written Communication</h2>
      <p>
        Documented communication prevents the &quot;I never said that&quot; disputes that plague many
        co-parenting relationships. Text messages, emails, or platforms like CommonGround create
        a clear record that both parents can reference.
      </p>
      <p>
        Written communication also gives you time to think before responding, reducing the
        likelihood of saying something you&apos;ll regret.
      </p>

      <h2>3. Create and Follow a Detailed Parenting Plan</h2>
      <p>
        Ambiguity breeds conflict. A comprehensive parenting plan that covers schedules, holidays,
        decision-making, and expenses eliminates most day-to-day disagreements before they start.
      </p>
      <p>Your plan should address:</p>
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
      <p>Children should never be messengers, spies, or confidants about adult matters. This includes:</p>
      <ul>
        <li>Don&apos;t ask children to relay messages to the other parent</li>
        <li>Don&apos;t quiz them about what happens at the other house</li>
        <li>Don&apos;t discuss financial matters or legal issues in front of them</li>
        <li>Don&apos;t speak negatively about the other parent</li>
        <li>Don&apos;t make them choose sides or express preferences</li>
      </ul>
      <p>
        Children who feel caught between parents experience higher rates of anxiety,
        depression, and behavioral issues.
      </p>

      <h2>5. Be Flexible When It Matters</h2>
      <p>
        Rigid adherence to schedules can sometimes harm children. A grandparent&apos;s 80th birthday
        or a once-in-a-lifetime opportunity shouldn&apos;t be missed because &quot;it&apos;s not your day.&quot;
      </p>
      <p>Build flexibility into your relationship by:</p>
      <ul>
        <li>Giving reasonable notice for schedule change requests</li>
        <li>Being willing to swap days when it benefits the children</li>
        <li>Acknowledging that life sometimes disrupts plans</li>
        <li>Keeping a record of accommodations made by both sides</li>
      </ul>
      <p>
        <strong>Important:</strong> Flexibility should go both ways. If one parent is always
        accommodating and the other never reciprocates, that&apos;s a pattern to address.
      </p>

      <h2>6. Respect Boundaries</h2>
      <p>Healthy boundaries are essential for co-parenting success. This means:</p>
      <ul>
        <li>Accepting that you can&apos;t control what happens at the other parent&apos;s home</li>
        <li>Not showing up unannounced or letting yourself into their space</li>
        <li>Limiting communication to child-related matters</li>
        <li>Respecting each other&apos;s personal lives and new relationships</li>
        <li>Not using children to gather information about the other household</li>
      </ul>

      <h2>7. Present a United Front on Big Issues</h2>
      <p>
        While you don&apos;t need to agree on everything, consistency on major rules helps
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
        Your children&apos;s other parent may do things that frustrate, anger, or hurt you.
        That&apos;s normal. What matters is how you respond.
      </p>
      <p>Before reacting to a triggering message or situation:</p>
      <ul>
        <li>Take a pause—wait at least an hour before responding to heated messages</li>
        <li>Vent to a friend, therapist, or journal—not to your children</li>
        <li>Ask yourself: &quot;Will this matter in five years?&quot;</li>
        <li>Focus on what you can control: your own behavior</li>
      </ul>

      <h2>9. Acknowledge the Other Parent&apos;s Importance</h2>
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
      <p>There&apos;s no shame in getting support. Options include:</p>
      <ul>
        <li><strong>Family therapy:</strong> A neutral third party can help you develop better communication patterns</li>
        <li><strong>Parenting coordinators:</strong> For high-conflict situations, a professional can help make decisions</li>
        <li><strong>Co-parenting apps:</strong> Tools like CommonGround can reduce conflict by structuring communication</li>
        <li><strong>Support groups:</strong> Connecting with other co-parents facing similar challenges</li>
        <li><strong>Individual therapy:</strong> Processing your own emotions helps you show up better for your children</li>
      </ul>

      <div className="bg-cg-sage-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">The Bottom Line</h3>
        <p className="text-gray-600">
          Successful co-parenting isn&apos;t about liking your ex or pretending the past didn&apos;t
          happen. It&apos;s about consistently choosing to put your children&apos;s needs above your
          own feelings about the other parent. Every positive interaction, every conflict
          avoided, every moment of cooperation makes a difference in your children&apos;s lives.
        </p>
      </div>

      <p>
        Remember: your children didn&apos;t choose this situation. They deserve parents who can
        work together, even when it&apos;s hard. With practice, patience, and the right tools,
        co-parenting can become not just manageable, but genuinely collaborative.
      </p>
    </article>
  );
}

function CommunicationProgress() {
  return (
    <article className="max-w-none">
      <p className="lead text-xl text-gray-600">
        Communication with your co-parent can feel like walking through a minefield.
        But what if you could transform it from a source of stress into a tool that
        actually moves your family forward? Here&apos;s how to make that shift.
      </p>

      <h2>The Hidden Cost of Poor Communication</h2>
      <p>
        Before we talk about solutions, let&apos;s acknowledge what&apos;s at stake. Research
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
        children feel it, even when you think they don&apos;t notice.
      </p>

      <h2>The BIFF Method: Your Communication Foundation</h2>
      <p>
        Developed by high-conflict expert Bill Eddy, the BIFF method provides a framework
        for responding to difficult messages. BIFF stands for:
      </p>
      <ul>
        <li><strong>Brief:</strong> Keep it short. Long messages invite point-by-point arguments.</li>
        <li><strong>Informative:</strong> Stick to facts and logistics. No opinions, no emotions.</li>
        <li><strong>Friendly:</strong> Maintain a polite, neutral tone. A simple &quot;Thanks&quot; goes far.</li>
        <li><strong>Firm:</strong> End the conversation clearly. Don&apos;t leave openings for debate.</li>
      </ul>

      <div className="my-8 not-prose">
        <p className="text-sm font-semibold uppercase tracking-wide text-cg-sage mb-4">
          Example: BIFF in Action
        </p>
        <div className="mx-auto max-w-sm rounded-[2rem] border border-gray-200 bg-white shadow-xl overflow-hidden">
          {/* Phone header */}
          <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-b from-[#F4F8F7] to-white border-b border-gray-100">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cg-sage to-cg-slate flex items-center justify-center text-white text-xs font-bold">
              CP
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">Co-Parent</p>
              <p className="text-[11px] text-gray-400">Text Message</p>
            </div>
          </div>

          {/* Chat thread */}
          <div className="px-4 py-5 space-y-6 bg-[#FBFCFC]">
            {/* Reactive message — don't send */}
            <div>
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-red-500 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-snug shadow-sm">
                  You ALWAYS change plans at the last minute! I&apos;m so sick of you never
                  thinking about anyone but yourself. The kids were looking forward to this
                  all week. But of course, your schedule is more important than theirs. This
                  is exactly why we got divorced.
                </div>
              </div>
              <p className="flex items-center justify-end gap-1 text-right text-[11px] font-medium text-red-500 mt-1.5 pr-1">
                <XCircle className="w-3.5 h-3.5" /> Reactive — invites a fight
              </p>
            </div>

            {/* BIFF message — send this */}
            <div>
              <div className="flex justify-end">
                <div className="max-w-[85%]">
                  <div className="bg-cg-sage text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-snug shadow-sm">
                    I understand you need to change Saturday&apos;s pickup to 2pm instead of 10am.
                    I can make that work this time. In the future, please let me know schedule
                    changes by Wednesday so we can prepare the kids. Thanks.
                  </div>
                  <p className="text-right text-[11px] text-gray-400 mt-1 pr-1">Delivered</p>
                </div>
              </div>
              <p className="flex items-center justify-end gap-1 text-right text-[11px] font-medium text-cg-sage mt-0.5 pr-1">
                <CheckCircle className="w-3.5 h-3.5" /> BIFF — brief, informative, friendly, firm
              </p>
            </div>
          </div>
        </div>
      </div>

      <h2>The Power of the Pause</h2>
      <p>
        The most important communication skill isn&apos;t what you say—it&apos;s when you don&apos;t
        say anything at all. When you receive a message that triggers an emotional response:
      </p>
      <ol>
        <li><strong>Don&apos;t respond immediately.</strong> Set the phone down. Walk away.</li>
        <li><strong>Wait at least one hour.</strong> For heated exchanges, wait 24 hours if possible.</li>
        <li><strong>Draft your response elsewhere.</strong> Write it in a notes app first.</li>
        <li><strong>Review before sending.</strong> Read it as if a judge will see it (because they might).</li>
        <li><strong>Ask yourself:</strong> &quot;Does this need to be said? Does it need to be said by me? Does it need to be said right now?&quot;</li>
      </ol>

      <h2>Reframing: Changing the Story You Tell Yourself</h2>
      <p>
        Much of communication conflict stems from the stories we tell ourselves about
        the other person&apos;s intentions. Cognitive reframing can help:
      </p>
      <ul>
        <li><strong>Instead of:</strong> &quot;They&apos;re doing this to punish me.&quot;<br />
            <strong>Try:</strong> &quot;They may have reasons I don&apos;t understand.&quot;</li>
        <li><strong>Instead of:</strong> &quot;They never consider my schedule.&quot;<br />
            <strong>Try:</strong> &quot;Coordinating schedules is challenging for both of us.&quot;</li>
        <li><strong>Instead of:</strong> &quot;They&apos;re trying to turn the kids against me.&quot;<br />
            <strong>Try:</strong> &quot;We both love our children and want what&apos;s best for them.&quot;</li>
      </ul>
      <p>
        This doesn&apos;t mean excusing bad behavior. It means choosing interpretations that
        don&apos;t escalate your emotional response.
      </p>

      <h2>The &quot;Businesslike&quot; Approach</h2>
      <p>
        Many co-parents find success by treating their relationship like a business
        partnership. This means:
      </p>
      <ul>
        <li><strong>Formal communication:</strong> Start messages with &quot;Hi [Name]&quot; and end with &quot;Thanks&quot;</li>
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

      <h3>Don&apos;t Share:</h3>
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
        Despite best efforts, sometimes communication with your co-parent simply doesn&apos;t work.
        Signs that you may need additional support:
      </p>
      <ul>
        <li>Most exchanges escalate into arguments</li>
        <li>You dread every notification from them</li>
        <li>Simple logistics take multiple hostile exchanges to resolve</li>
        <li>Your children are showing signs of stress from parental conflict</li>
        <li>You find yourself constantly venting about your co-parent</li>
      </ul>
      <p>In these situations, consider:</p>
      <ul>
        <li><strong>A parenting coordinator:</strong> A neutral professional who helps make decisions</li>
        <li><strong>Parallel parenting:</strong> Minimal contact with maximum structure</li>
        <li><strong>Mediation:</strong> Facilitated conversations with a trained mediator</li>
        <li><strong>Family therapy:</strong> Professional help to improve communication patterns</li>
      </ul>

      <div className="bg-cg-sage-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">Remember This</h3>
        <p className="text-gray-600">
          You can&apos;t control how your co-parent communicates. You can only control
          how you respond. Every message you send is a choice. Choose to model the
          communication you want your children to learn. Choose to be the parent who
          stayed calm. Choose progress over being &quot;right.&quot;
        </p>
      </div>

      <h2>Building New Patterns</h2>
      <p>
        Changing communication patterns takes time. Don&apos;t expect overnight transformation.
        Instead, focus on:
      </p>
      <ul>
        <li><strong>Small wins:</strong> Celebrate when you successfully de-escalate one exchange</li>
        <li><strong>Consistency:</strong> Keep using BIFF even when they don&apos;t</li>
        <li><strong>Self-compassion:</strong> You&apos;ll slip up. Acknowledge it and do better next time</li>
        <li><strong>Long-term thinking:</strong> In five years, will this argument matter?</li>
        <li><strong>Your children&apos;s perspective:</strong> How would they feel reading this message?</li>
      </ul>
      <p>
        Every positive exchange, no matter how small, builds toward a better co-parenting
        relationship. Every conflict you avoid is a gift to your children. Communication
        isn&apos;t just a necessity of co-parenting—it&apos;s an opportunity to show your children
        what healthy adult relationships look like.
      </p>
    </article>
  );
}

function WrittenAgreements() {
  return (
    <article className="max-w-none">
      <p className="lead text-xl text-gray-600">
        &quot;I thought we agreed on that.&quot; These six words have sparked more co-parenting
        conflicts than almost any others. Verbal agreements, no matter how clear they
        seem in the moment, have a way of becoming murky over time. Here&apos;s why written
        agreements are essential for co-parenting success.
      </p>

      <h2>The Problem with &quot;We Agreed&quot;</h2>
      <p>
        Memory is unreliable. Studies consistently show that people remember conversations
        differently, especially emotionally charged ones. In the context of co-parenting:
      </p>
      <ul>
        <li>You remember agreeing to &quot;usually&quot; do Friday pickups; they remember &quot;always&quot;</li>
        <li>You remember the exception; they remember the rule</li>
        <li>Details fade while confidence remains high</li>
        <li>We unconsciously remember things in ways that favor our position</li>
      </ul>
      <p>
        This isn&apos;t about dishonesty—it&apos;s about how human memory works. Without written
        documentation, every disagreement becomes your word against theirs.
      </p>

      <h2>What Written Agreements Provide</h2>

      <h3>1. Clarity and Precision</h3>
      <p>
        Writing forces you to be specific. &quot;I&apos;ll pick up the kids after school&quot; becomes
        &quot;I will pick up the children from school at 3:15 PM at the main entrance on
        Mondays, Wednesdays, and Fridays during the school year.&quot;
      </p>
      <p>This precision eliminates ambiguity that leads to conflict.</p>

      <h3>2. A Reference Point</h3>
      <p>
        When disagreements arise—and they will—you have something concrete to consult.
        Instead of escalating into &quot;you always&quot; and &quot;you never&quot; arguments, you can simply
        refer back to what was actually agreed.
      </p>

      <h3>3. Reduced Conflict</h3>
      <p>
        Most co-parenting arguments aren&apos;t about major philosophical differences—they&apos;re
        about logistics. Who&apos;s picking up? What time? Who pays for what? Written agreements
        answer these questions before they become fights.
      </p>

      <h3>4. Legal Protection</h3>
      <p>If disagreements ever require court intervention, documented agreements show:</p>
      <ul>
        <li>What both parties actually agreed to</li>
        <li>Your attempts to cooperate and be reasonable</li>
        <li>A history of the co-parenting arrangement</li>
        <li>Any violations or patterns of non-compliance</li>
      </ul>

      <h3>5. Stability for Children</h3>
      <p>
        Children thrive on predictability. When parents have clear, written agreements,
        the schedule stays consistent. Kids know what to expect. They don&apos;t get caught
        in the middle of &quot;I thought you were supposed to...&quot; conversations.
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
        <li><strong>Expense sharing:</strong> What&apos;s included, percentages, documentation required</li>
        <li><strong>Medical costs:</strong> Insurance, uncovered expenses, reimbursement process</li>
        <li><strong>Education costs:</strong> Tuition, supplies, activities, college planning</li>
      </ul>

      <h3>Other Important Areas</h3>
      <ul>
        <li><strong>Right of first refusal:</strong> When the other parent gets first option for childcare</li>
        <li><strong>Introducing new partners:</strong> Timeline and expectations</li>
        <li><strong>Relocation:</strong> Notice requirements if either parent plans to move</li>
        <li><strong>Communication with children:</strong> Phone/video call schedules during other parent&apos;s time</li>
        <li><strong>Dispute resolution:</strong> How disagreements will be handled</li>
      </ul>

      <div className="bg-cg-sage-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">Pro Tip: The 18-Section Approach</h3>
        <p className="text-gray-600">
          Comprehensive parenting plans typically cover 18 key areas of co-parenting.
          Missing even one section can create gaps that lead to future conflicts.
          CommonGround&apos;s Agreement Builder walks you through all 18 sections to ensure
          nothing important is overlooked.
        </p>
      </div>

      <h2>Making Agreements Work</h2>

      <h3>Both Parents Must Agree</h3>
      <p>
        An agreement you create alone isn&apos;t really an agreement—it&apos;s a wish list.
        Both parents need to participate in creating the document and formally approve it.
        This creates buy-in and makes compliance more likely.
      </p>

      <h3>Be Specific, Not Vague</h3>
      <p>Compare these two approaches:</p>

      <div className="bg-white rounded-xl p-6 my-6 border border-gray-200 not-prose">
        <div className="grid gap-4">
          <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
            <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Vague (problematic):</p>
            <p className="text-red-700 dark:text-red-300 italic">
              &quot;Parents will share holidays fairly.&quot;
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
            <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Specific (better):</p>
            <p className="text-green-700 dark:text-green-300 italic">
              &quot;Thanksgiving: Parent A has children from Wednesday at 5:00 PM until Friday
              at 5:00 PM in odd-numbered years. Parent B has the same schedule in
              even-numbered years. The parent without Thanksgiving will have the children
              for the following weekend regardless of the regular schedule.&quot;
            </p>
          </div>
        </div>
      </div>

      <h3>Build in Flexibility</h3>
      <p>Rigid agreements can create their own problems. Include provisions for:</p>
      <ul>
        <li>How to request schedule changes</li>
        <li>Required notice periods for modifications</li>
        <li>A process for handling genuine emergencies</li>
        <li>Regular review and update schedules</li>
      </ul>

      <h3>Review and Update Regularly</h3>
      <p>
        Children&apos;s needs change. What works for a toddler won&apos;t work for a teenager.
        Build in annual reviews to ensure your agreement still serves your family.
        Document any agreed changes in writing and have both parents approve.
      </p>

      <h2>When You Can&apos;t Agree</h2>
      <p>Sometimes parents can&apos;t reach agreement on their own. Options include:</p>
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
      <p>If your case ever goes before a judge, documented agreements show that you:</p>
      <ul>
        <li>Are willing to communicate and cooperate</li>
        <li>Put effort into creating stability for your children</li>
        <li>Can articulate and commit to reasonable expectations</li>
        <li>Follow through on commitments (or have evidence when the other parent doesn&apos;t)</li>
      </ul>
      <p>Courts look favorably on parents who demonstrate these qualities.</p>

      <h2>Getting Started</h2>
      <p>If you don&apos;t yet have a comprehensive written agreement, start with what matters most:</p>
      <ol>
        <li><strong>The regular schedule:</strong> Get this in writing first, including exact times and locations</li>
        <li><strong>The next upcoming holiday:</strong> Agree on one holiday at a time if needed</li>
        <li><strong>Exchange procedures:</strong> Where and when, to eliminate day-of confusion</li>
        <li><strong>Emergency contacts:</strong> Who to call and when</li>
      </ol>
      <p>Then build from there, adding sections as you&apos;re able to reach agreement.</p>

      <div className="bg-cg-amber-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">The Bottom Line</h3>
        <p className="text-gray-600">
          Written agreements aren&apos;t about trust or distrust—they&apos;re about clarity.
          The most amicable co-parents benefit from documentation just as much as
          high-conflict ones. When everything is in writing, both parents can focus
          on what really matters: raising happy, healthy children.
        </p>
      </div>
    </article>
  );
}

function HighConflictGuide() {
  return (
    <article className="max-w-none">
      <p className="lead text-xl text-gray-600">
        Not every co-parenting situation can become amicable. When your co-parent is
        high-conflict, hostile, or uncooperative, traditional advice about &quot;communicating
        better&quot; may not work. This guide is for parents who need different strategies.
      </p>

      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-6 my-8 not-prose border border-amber-200 dark:border-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Important Note</h3>
            <p className="text-gray-600 text-sm">
              If you are experiencing domestic violence, threats, or fear for your safety,
              please contact the National Domestic Violence Hotline at 1-800-799-7233 or
              visit thehotline.org. Your safety is the priority.
            </p>
          </div>
        </div>
      </div>

      <h2>Recognizing High-Conflict Co-Parenting</h2>
      <p>High-conflict co-parenting goes beyond normal disagreements. Signs include:</p>
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
        <p className="text-gray-600 mb-4">
          Parallel parenting isn&apos;t a failure—it&apos;s a strategic choice to protect your children
          from conflict while still ensuring they have relationships with both parents.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-cg-sand rounded-lg p-4">
            <p className="font-medium text-foreground mb-2">Cooperative Parenting</p>
            <ul className="text-gray-600 space-y-1">
              <li>Joint decisions</li>
              <li>Flexible scheduling</li>
              <li>Regular communication</li>
              <li>Shared events</li>
            </ul>
          </div>
          <div className="bg-cg-sand rounded-lg p-4">
            <p className="font-medium text-foreground mb-2">Parallel Parenting</p>
            <ul className="text-gray-600 space-y-1">
              <li>Independent decisions</li>
              <li>Strict schedule adherence</li>
              <li>Minimal contact</li>
              <li>Separate events</li>
            </ul>
          </div>
        </div>
      </div>

      <h2>Protecting Yourself Through Documentation</h2>
      <p>In high-conflict situations, documentation is your strongest protection. Document everything:</p>

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
      <p>When you must communicate, use BIFF responses:</p>
      <ul>
        <li><strong>Brief:</strong> Keep it short—2-3 sentences maximum</li>
        <li><strong>Informative:</strong> Only include necessary facts</li>
        <li><strong>Friendly:</strong> Neutral, professional tone (&quot;Thank you&quot; is enough)</li>
        <li><strong>Firm:</strong> End the conversation; don&apos;t invite further debate</li>
      </ul>

      <div className="bg-white rounded-xl p-6 my-6 border border-gray-200 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-4">BIFF Response Examples</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Incoming hostile message:</p>
            <p className="text-gray-600 italic text-sm">
              &quot;You&apos;re ALWAYS doing this. You don&apos;t care about the kids at all.
              I&apos;m done trying to work with you. You&apos;re going to hear from my lawyer.&quot;
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">BIFF response:</p>
            <p className="text-gray-600 italic text-sm">
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
      <p>Clear boundaries are essential. Examples include:</p>
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

      <h2>Protecting Your Children</h2>
      <p>Children in high-conflict situations need extra support:</p>

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
      <p>Communication apps designed for co-parenting can significantly reduce conflict:</p>
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
            <p className="text-gray-600 text-sm">
              CommonGround was designed with high-conflict situations in mind. ARIA analyzes
              messages before sending, helping you maintain composure. Every message, schedule
              change, and expense is documented with timestamps. If your case ever goes to
              court, you have a complete, verified record of your attempts to cooperate.
            </p>
          </div>
        </div>
      </div>

      <h2>When to Involve Professionals</h2>
      <p>Consider professional help when:</p>

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
      <p>High-conflict co-parenting is often a marathon, not a sprint. Some important perspectives:</p>
      <ul>
        <li>Children eventually grow up and form their own opinions</li>
        <li>Your calm, consistent presence matters more than winning arguments</li>
        <li>Courts notice patterns over time—keep documenting</li>
        <li>Some high-conflict behaviors decrease as time passes</li>
        <li>Your children will remember who was the stable parent</li>
      </ul>

      <div className="bg-cg-amber-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">Remember This</h3>
        <p className="text-gray-600">
          You cannot change your co-parent&apos;s behavior. You can only control your responses,
          protect your children, and document everything. Stay calm, stay consistent, and keep
          your focus on what you can actually influence: your own home, your own choices,
          your own relationship with your children.
        </p>
      </div>
    </article>
  );
}

function ChildrenFirst() {
  const comparisons = [
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
  ];

  return (
    <article className="max-w-none">
      <p className="lead text-xl text-gray-600">
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
      <p>Chaos is harmful. Children need:</p>
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
            <p className="text-gray-600">
              Children need two parents who can put aside their own pain, anger, and
              grievances to cooperate in raising them. This is incredibly hard—and
              incredibly important.
            </p>
          </div>
        </div>
      </div>

      <h2>Practical Ways to Put Children First</h2>

      <div className="bg-white rounded-xl p-6 my-8 border border-gray-200 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-4">Child-First Actions</h3>
        <div className="space-y-4">
          {comparisons.map((item, index) => (
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
      <p>Every time your child transitions between homes, ask yourself:</p>
      <blockquote className="border-l-4 border-cg-sage pl-4 italic">
        &quot;What can I do to make this moment easier for my child?&quot;
      </blockquote>
      <p>This might mean:</p>
      <ul>
        <li>Having them ready on time (not making them wait anxiously)</li>
        <li>Making handoffs brief and pleasant (not awkward or tense)</li>
        <li>Speaking kindly about where they&apos;re going</li>
        <li>Having their belongings organized</li>
        <li>Saying goodbye warmly but not dramatically</li>
        <li>Not asking &quot;Did you miss me?&quot; when they return</li>
      </ul>

      <h2>When &quot;What&apos;s Best&quot; Conflicts with &quot;What&apos;s Fair&quot;</h2>
      <p>Sometimes the child-first choice feels unfair to you:</p>
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
      <p>This applies to:</p>
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
      <p>Sometimes &quot;for the children&quot; becomes a justification for harmful behavior:</p>
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
        <p className="text-gray-600">
          Your children didn&apos;t choose divorce. They didn&apos;t ask for two homes, shuffled
          schedules, or split holidays. What they need most is two parents who love them
          enough to set aside their own pain and work together. Every time you choose
          cooperation over conflict, you&apos;re putting your children first—for real.
        </p>
      </div>
    </article>
  );
}

function HolidayPlanning() {
  return (
    <article className="max-w-none">
      <p className="lead text-xl text-gray-600">
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
            <p className="text-gray-600 text-sm">
              Don&apos;t just say &quot;alternating years.&quot; Specify exact times: &quot;Parent A has
              children from December 24 at 4:00 PM until December 26 at 4:00 PM in
              odd-numbered years.&quot; Vague agreements lead to conflicts.
            </p>
          </div>
        </div>
      </div>

      <h2>Major Holidays to Consider</h2>
      <p>Your agreement should address each of these explicitly:</p>

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
      <p>Holidays often involve grandparents, aunts, uncles, and cousins. Consider:</p>
      <ul>
        <li><strong>Communicate your schedule:</strong> Share the custody calendar with extended family</li>
        <li><strong>Set expectations:</strong> Extended family may need to adjust their traditions</li>
        <li><strong>Protect your children:</strong> Family members shouldn&apos;t badmouth the other parent</li>
        <li><strong>Be flexible when possible:</strong> A grandparent&apos;s milestone birthday might warrant adjustment</li>
        <li><strong>Create new traditions:</strong> Maybe your family does &quot;December 28 Christmas&quot; now</li>
      </ul>

      <h2>When Your Child Is Sad About Missing a Parent</h2>
      <p>It&apos;s normal for children to miss the absent parent during holidays. Don&apos;t try to:</p>
      <ul>
        <li>Talk them out of their feelings</li>
        <li>Distract them with gifts or activities</li>
        <li>Make them feel guilty for missing the other parent</li>
      </ul>
      <p>Instead:</p>
      <ul>
        <li>&quot;I know you miss Mom/Dad. It&apos;s okay to feel that way.&quot;</li>
        <li>&quot;Would you like to call/text them?&quot;</li>
        <li>&quot;You&apos;ll see them on [specific date].&quot;</li>
        <li>Let them express sadness without taking it personally</li>
      </ul>

      <div className="bg-white rounded-xl p-6 my-8 border border-gray-200 not-prose">
        <div className="flex items-start gap-3">
          <Gift className="w-6 h-6 text-cg-sage flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Creating New Traditions</h3>
            <p className="text-gray-600 text-sm mb-3">
              Post-separation holidays are a chance to create traditions unique to your home:
            </p>
            <ul className="text-gray-600 text-sm space-y-1">
              <li>&bull; &quot;Christmas Movie Marathon Eve&quot; if you have Dec 23</li>
              <li>&bull; Breakfast-for-dinner Thanksgiving</li>
              <li>&bull; &quot;Second Christmas&quot; when they return</li>
              <li>&bull; New Year&apos;s Day adventure tradition</li>
              <li>&bull; Make cookies for the other parent to take home</li>
            </ul>
          </div>
        </div>
      </div>

      <h2>Gift Coordination</h2>
      <p>Uncoordinated gift-giving can create problems:</p>
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
      <p>The first post-separation holidays are often the hardest. Some tips:</p>
      <ul>
        <li><strong>Lower expectations:</strong> It won&apos;t be the same—and that&apos;s okay</li>
        <li><strong>Plan for your alone time:</strong> Have something to do when children are with the other parent</li>
        <li><strong>Lean on support:</strong> Friends, family, or a therapist can help</li>
        <li><strong>Focus on moments, not perfection:</strong> One good memory is enough</li>
        <li><strong>Practice self-compassion:</strong> Grief during holidays is normal</li>
      </ul>

      <h2>When Agreements Break Down</h2>
      <p>What if the other parent doesn&apos;t follow the holiday agreement?</p>
      <ul>
        <li><strong>Document:</strong> Note the date, what was agreed, and what happened</li>
        <li><strong>Stay calm:</strong> Don&apos;t create a scene in front of children</li>
        <li><strong>Address later:</strong> Discuss in writing after the holiday</li>
        <li><strong>Pattern tracking:</strong> Multiple violations may warrant legal consultation</li>
        <li><strong>Focus on children:</strong> Make the best of whatever time you have</li>
      </ul>

      <div className="bg-cg-amber-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">Remember This</h3>
        <p className="text-gray-600">
          Holidays are about connection, not perfection. Your children don&apos;t need
          Pinterest-worthy celebrations—they need parents who can cooperate, adults who
          manage their own emotions, and the freedom to love both households without guilt.
          That&apos;s the best gift you can give them.
        </p>
      </div>
    </article>
  );
}

function CustodyScheduleGuide() {
  return (
    <article className="max-w-none">
      <p className="lead text-xl text-gray-600">
        When parents separate, the question that keeps everyone up at night is rarely about lawyers or paperwork. It&apos;s simpler and harder than that: when will I see my child, and when will they be with the other parent? The answer lives in your parenting-time schedule, and getting it right is one of the most loving things you can do.
      </p>

      <h2>Why the schedule is the backbone of everything</h2>
      <p>
        A clear, predictable schedule does more than divide days on a calendar. It tells your child exactly what to expect, and children feel safest when they know what comes next. It also removes the single biggest source of co-parenting conflict: the constant back-and-forth over who has the kids and when. When the plan is written down and both parents follow it, there&apos;s nothing left to argue about.
      </p>
      <p>
        Think of the schedule as the floor everyone stands on. Once it&apos;s solid, you can be flexible from a place of calm rather than scrambling week to week. The goal isn&apos;t a perfect split of hours. It&apos;s a rhythm your child can count on and that both parents can actually live with.
      </p>

      <h2>Common 50/50 schedules</h2>
      <p>
        A 50/50 schedule means your child spends roughly equal time with each parent. There are several ways to arrange that equal time, and they feel very different in daily life. Here are the most common ones.
      </p>
      <ul>
        <li>
          <strong>Week-on/week-off.</strong> Your child spends one full week with you, then one full week with the other parent. It has the fewest transitions, which suits older kids and teens who value stability and have busy schedules. The downside: younger children can find a whole week away from one parent too long.
        </li>
        <li>
          <strong>2-2-3.</strong> Over two weeks, your child spends two days with one parent, two days with the other, then three days back with the first, and the pattern flips the next week. Both parents see the child every few days, which helps younger children who don&apos;t do well with long gaps. The trade-off is more frequent transitions.
        </li>
        <li>
          <strong>2-2-5-5.</strong> Two days with one parent, two with the other, then a five-day stretch with each. It gives steady mid-week contact while offering longer blocks than 2-2-3, and the weekday pattern stays the same each week, which is easy to remember.
        </li>
        <li>
          <strong>3-4-4-3.</strong> One parent has three days, the other four, then it reverses. Time is split as evenly as possible while keeping a consistent weekly rhythm. It works well when both parents live close and want near-equal time without a full week apart.
        </li>
        <li>
          <strong>Alternating weeks with a mid-week visit.</strong> A softer version of week-on/week-off. The child spends the week with one parent but has a dinner or overnight with the other in the middle. This keeps the simplicity of weekly blocks while shortening the time away from each parent.
        </li>
      </ul>

      <h2>Common majority-time schedules</h2>
      <p>
        Equal time isn&apos;t right for every family. Sometimes one parent has the child most of the time and the other has regular, meaningful contact. These arrangements are common when parents live far apart, work demanding hours, or when a child is very young. Majority time is not a measure of how much a parent loves their child. It&apos;s a practical fit for the family&apos;s life.
      </p>
      <ul>
        <li>
          <strong>Every other weekend.</strong> The child lives mainly with one parent and stays with the other every second weekend, often Friday evening through Sunday. It&apos;s predictable and easy to plan around school and work.
        </li>
        <li>
          <strong>Extended every other weekend.</strong> The same pattern, stretched to include a Friday or Monday, or a mid-week dinner. The extra hours add up and give the other parent more relaxed, unhurried time rather than just a quick weekend.
        </li>
        <li>
          <strong>80/20.</strong> The child spends about 80 percent of nights with one parent and 20 percent with the other, often one weeknight and alternating weekends. This can be a good starting point that grows into more equal time as a child gets older or as both homes settle into a routine.
        </li>
      </ul>

      <div className="bg-cg-sage-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">How to choose your schedule: a quick checklist</h3>
        <p className="text-gray-600">
          Run your options through these questions before you decide. There are no wrong answers, only better and worse fits for your child.
        </p>
        <ul className="text-gray-600 mt-3 list-disc pl-5 space-y-1">
          <li>How old is my child, and how do they handle time apart from each of us?</li>
          <li>How far apart do we live, and how long is the drive at pickup and drop-off times?</li>
          <li>What do both of our work schedules actually allow on weekdays and weekends?</li>
          <li>How well do we communicate right now, and how many handoffs can we handle calmly?</li>
          <li>Does the plan keep school, activities, and friendships steady and easy to reach?</li>
        </ul>
      </div>

      <h2>How to actually choose</h2>
      <p>
        The best schedule on paper is the one your real life can support. A few factors matter more than the rest.
      </p>
      <ul>
        <li>
          <strong>Your child&apos;s age and temperament.</strong> Babies and toddlers usually need frequent contact with both parents and shorter gaps, which favors schedules like 2-2-3. School-age kids and teens often prefer fewer transitions and longer blocks, like alternating weeks. A sensitive child who needs time to settle may do better with fewer changes, whatever their age.
        </li>
        <li>
          <strong>Distance between homes.</strong> If you live a few minutes apart, frequent transitions are easy. If you&apos;re an hour away or in different school zones, longer blocks reduce hours lost in the car and keep your child near school and friends.
        </li>
        <li>
          <strong>Both parents&apos; work schedules.</strong> Be honest about who can do the morning rush, after-school pickup, and evening routine. A schedule built around the parent who is actually available beats one built around how things feel fair.
        </li>
        <li>
          <strong>Level of conflict.</strong> If handoffs are tense, fewer transitions mean fewer chances for friction in front of your child. Lower-contact schedules and neutral exchange spots, like school, can protect kids from being caught in the middle.
        </li>
        <li>
          <strong>School and activities.</strong> A good schedule keeps homework, sports, and friendships running smoothly from both homes. If a plan means your child constantly misses practice or forgets gear, it isn&apos;t working no matter how even the split looks.
        </li>
      </ul>

      <h2>Making transition days smooth</h2>
      <p>
        Transitions are where even a great schedule can wobble. The handoff is often the only time co-parents are face to face, so it carries a lot of emotion. A little structure goes a long way toward keeping those moments calm for your child.
      </p>
      <ul>
        <li>
          <strong>Keep exchanges brief and friendly.</strong> A warm goodbye and a simple &quot;have a great few days&quot; tells your child it&apos;s okay to enjoy time with the other parent. Save any adult conversation for another channel.
        </li>
        <li>
          <strong>Use a neutral spot when things are tense.</strong> School drop-off or a public place can ease pressure, because the child simply goes from one parent&apos;s morning to the other parent&apos;s afternoon.
        </li>
        <li>
          <strong>Build a packing routine.</strong> A short checklist of clothes, chargers, homework, and a comfort item prevents the last-minute scramble and the &quot;you forgot my stuff&quot; tension.
        </li>
        <li>
          <strong>Protect re-entry time.</strong> Kids often need a quiet hour to settle after a switch. Skip the grilling about the other house and let them land.
        </li>
      </ul>
      <p>
        Consistency between homes matters as much as the schedule itself. You don&apos;t have to run identical households, but similar bedtimes, homework habits, and house rules help your child feel like one whole life rather than two separate worlds. Shared reminders help too: CommonGround&apos;s TimeBridge sends both parents the same automated schedule and pickup and drop-off alerts, so neither parent can &quot;forget&quot; whose day it is or show up late.
      </p>

      <div className="bg-cg-amber-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">Remember: schedules can grow with your child</h3>
        <p className="text-gray-600">
          The plan you choose today doesn&apos;t have to last forever. A toddler&apos;s schedule will look different from a ten-year-old&apos;s, and that&apos;s exactly how it should be. Revisit the arrangement as your child grows, as homes move, and as routines settle. Adjusting the plan isn&apos;t failure. It&apos;s good parenting.
        </p>
      </div>

      <h2>A hopeful note to end on</h2>
      <p>
        Choosing a custody schedule can feel overwhelming, like you&apos;re deciding your child&apos;s whole future in a single chart. You&apos;re not. You&apos;re building a starting point, and starting points can be improved. Children are remarkably resilient when they feel loved by both parents and safe in a routine they can count on. Pick the schedule that fits your child&apos;s real life today, give it an honest try, and adjust with kindness as you go. The fact that you&apos;re thinking this carefully already tells your child everything they need to know.
      </p>
    </article>
  );
}

function SplittingExpenses() {
  return (
    <article className="max-w-none">
      <p className="lead text-xl text-gray-600">
        Few things can turn a calm co-parenting relationship tense faster than a text that starts with &quot;You owe me for...&quot; Money is emotional, and when it involves your kids, the stakes feel even higher. The good news: with a few clear agreements made ahead of time, splitting child expenses can become a quiet routine instead of a recurring fight.
      </p>

      <h2>Why money is the number-one flashpoint</h2>
      <p>
        Almost every co-parenting conflict eventually circles back to money. It is rarely just about the dollars. A surprise bill can feel like a lack of respect. A late reimbursement can feel like being taken for granted. And because expenses come up constantly &mdash; new shoes, a field trip, a dentist visit &mdash; there are endless small chances for misunderstanding.
      </p>
      <p>
        The pattern usually looks the same. One parent spends, assumes the other will pay their share, and feels resentful when the money does not arrive. The other parent feels ambushed by a cost they never agreed to. Both end up frustrated, and the child is the one who absorbs the tension. The fix is not to spend less on your kids. It is to remove the guesswork.
      </p>

      <h2>Know the difference: support versus shared expenses</h2>
      <p>
        A lot of arguments come from blurring two very different things. <strong>Base child support</strong> is the regular, court-ordered or agreed amount one parent pays the other. It is meant to cover everyday basics like housing, food, and routine clothing. It is predictable, and it usually does not change month to month.
      </p>
      <p>
        <strong>Shared or extra expenses</strong> are the costs that fall outside that base amount. These are the ones that need their own plan, because they vary and can add up quickly. They typically include:
      </p>
      <ul>
        <li><strong>Medical and dental:</strong> co-pays, braces, prescriptions, therapy, glasses, and anything insurance does not cover.</li>
        <li><strong>Extracurriculars:</strong> sports fees, music lessons, club dues, uniforms, and equipment.</li>
        <li><strong>School costs:</strong> registration, supplies, field trips, tutoring, technology, and activity fees.</li>
        <li><strong>Clothing beyond the basics:</strong> winter coats, growth spurts, special-occasion outfits.</li>
        <li><strong>Childcare:</strong> daycare, after-school programs, and babysitting tied to work.</li>
      </ul>
      <p>
        When everyone understands which bucket a cost falls into, you stop arguing about whether support &quot;should have covered that&quot; and start talking about how to split the extras fairly.
      </p>

      <h2>Two fair ways to split costs</h2>
      <p>
        There is no single right answer, but most families land on one of two approaches.
      </p>
      <p>
        <strong>The 50/50 split</strong> is simple: each parent pays half of every shared expense. It works best when both parents earn roughly the same income, because it feels balanced and is easy to track. Nobody has to do math beyond dividing by two, and there is little room to argue about fairness.
      </p>
      <p>
        <strong>The income-proportional split</strong> divides costs based on what each parent earns. If one parent brings home 60 percent of the combined income, they cover 60 percent of the shared expenses. This makes more sense when there is a real gap in earnings, so the lower-earning parent is not stretched thin by costs they cannot absorb. It takes a little more setup, but it often feels more genuinely fair, and many court guidelines already use this model.
      </p>
      <p>
        Whichever you choose, write the percentages down. A split you both agreed to in calm moments is much easier to honor when a big bill lands.
      </p>

      <h2>Agree on pre-approval and spending limits first</h2>
      <p>
        Most blowups happen when one parent spends and the other never agreed to it. You can prevent almost all of these by setting two rules in advance.
      </p>
      <p>
        First, decide <strong>what needs pre-approval</strong>. Routine, low-cost items usually do not. But anything large &mdash; a sport that costs hundreds of dollars, an elective medical procedure, a school trip &mdash; should be discussed before either parent commits. Pre-approval is not about control. It is about making sure both of you have a say before money is owed.
      </p>
      <p>
        Second, set a <strong>spending limit</strong>. Pick a dollar amount &mdash; many families use something like 50 or 100 dollars &mdash; under which either parent can spend without checking in. Anything above that line needs a quick conversation first. This single rule prevents the most common complaint in co-parenting: &quot;I never agreed to pay for that.&quot;
      </p>

      <div className="bg-cg-sage-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">Sample expense-sharing ground rules</h3>
        <p className="text-gray-600">
          1. We split shared expenses 60/40 based on income, reviewed each January. 2. Either parent may spend up to 75 dollars on a shared item without pre-approval. 3. Anything over 75 dollars needs a yes in writing before it is purchased. 4. Reimbursement requests include a receipt and are sent within 14 days of the expense. 5. The other parent pays their share within 21 days of receiving the request. 6. We keep all requests in one place so nothing gets lost.
        </p>
      </div>

      <h2>Documentation that protects everyone</h2>
      <p>
        Good records are not about distrust. They are about clarity, so neither parent has to rely on memory. A few simple habits cover almost every situation:
      </p>
      <ul>
        <li><strong>Keep receipts.</strong> Snap a photo as soon as you pay, before it disappears into a bag or a glove box.</li>
        <li><strong>Request in writing.</strong> A text or message with the amount, the date, and the receipt beats a verbal &quot;you owe me.&quot; Writing it down protects both of you.</li>
        <li><strong>Set a reasonable timeline.</strong> Agree on a window for reimbursement &mdash; somewhere between 14 and 30 days is fair. It gives people time to manage cash flow without letting balances pile up.</li>
      </ul>
      <p>
        This is exactly the kind of grind that software can quietly handle: CommonGround&apos;s ClearFund logs each expense, splits it by your agreed percentages, sends the reminders, and keeps a clean record so neither of you has to chase the other.
      </p>

      <h2>Avoiding the nickel-and-dime trap</h2>
      <p>
        There is a difference between sharing real costs and tracking every last dollar. Asking your co-parent to chip in for a 90-cent juice box at a soccer game is technically fair and almost always not worth it. The goodwill you spend is worth more than the change you recover.
      </p>
      <p>
        A simple guardrail helps: only formally split expenses above your agreed limit, and let the small stuff wash out over time. Both parents end up buying snacks, socks, and last-minute supplies. If you trust that it roughly balances, you protect the relationship from a thousand tiny resentments. Save your energy for the costs that actually matter.
      </p>

      <h2>When the other parent will not pay</h2>
      <p>
        Sometimes you do everything right and the reimbursement still does not come. It is frustrating, but how you respond matters &mdash; for your stress level and for your child.
      </p>
      <ul>
        <li><strong>Document calmly.</strong> Keep your receipts and your written requests. A clear record speaks for itself and keeps you out of a he-said-she-said.</li>
        <li><strong>Send a neutral reminder.</strong> Skip the blame. A short &quot;Hi, following up on the 80 dollars from the dentist visit on the 3rd&quot; is harder to ignore and easier to resolve.</li>
        <li><strong>Stay child-focused.</strong> Do not withhold time, swap insults, or vent to your child. The unpaid bill is a logistics problem, not a reason to escalate the whole relationship.</li>
        <li><strong>Escalate appropriately.</strong> If a pattern forms, a mediator can often reset expectations. For ongoing or large amounts, your documentation gives a lawyer or the court exactly what they need.</li>
      </ul>
      <p>
        Most of the time, a clear record and a calm tone solve the problem before it ever needs to go further.
      </p>

      <h2>A calmer way forward</h2>
      <p>
        Splitting child expenses will never be the most fun part of co-parenting, but it does not have to be a battleground. When you agree on the rules early, write things down, and let the small stuff go, money becomes one more thing you simply handle &mdash; together, on behalf of a kid who is counting on you both. That steadiness is a quiet gift, and your child will feel it for years.
      </p>
    </article>
  );
}

function DifficultEx() {
  return (
    <article className="max-w-none">
      <p className="lead text-xl text-gray-600">
        Some co-parenting relationships hum along with a little goodwill and a shared calendar. Others feel like walking through a minefield where every text could go off. If your ex seems to thrive on conflict, this playbook is for you &mdash; not to win the fight, but to step out of it.
      </p>

      <h2>Start with what you can actually control</h2>
      <p>
        When you are dealing with a difficult ex, the most exhausting part is often the fantasy that you can manage their behavior. You cannot. You cannot make them reasonable, punctual, or kind. What you <em>can</em> control is your own side of the fence: your tone, your boundaries, your reliability, and how much of their chaos you let into your home.
      </p>
      <p>
        This is not about giving up or accepting bad behavior. It is about pouring your energy where it actually works. Every minute spent trying to change them is a minute stolen from the one thing that matters most: building a calm, steady life for your child. Trade the goal of &quot;getting them to understand&quot; for the goal of &quot;keeping my side clean and steady.&quot; That shift alone can give you back hours of sleep.
      </p>

      <div className="bg-cg-sage-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">A quick gut-check before you reply</h3>
        <p className="text-gray-600">
          Before you respond to anything that stings, ask yourself one question: <strong>&quot;Does this message serve my child, or does it just feed the conflict?&quot;</strong> If it only feeds the conflict, it can wait &mdash; or it may not need a reply at all.
        </p>
      </div>

      <h2>Grey rock: become unrewarding to provoke</h2>
      <p>
        Some people are fueled by your reaction. A big emotional response &mdash; anger, tears, a long defensive paragraph &mdash; is the payoff they are fishing for. The grey rock method is exactly what it sounds like: you become as interesting to provoke as a plain grey rock.
      </p>
      <p>
        In practice, this means keeping your replies short, factual, and flat. No emotional fuel. No taking the bait. When a message is designed to wound, you answer only the part that involves logistics and let the rest fall to the floor unanswered.
      </p>
      <ul>
        <li><strong>They write:</strong> a paragraph about how you are selfish and a bad parent, ending with a question about the weekend pickup.</li>
        <li><strong>You answer:</strong> only the pickup. &quot;Saturday at 5pm works. I&apos;ll be there.&quot;</li>
      </ul>
      <p>
        It feels strange at first, almost like you are letting them win by not defending yourself. You are not. You are simply refusing to hand over the reaction they were hoping for. Over time, a person who gets no reward for poking often pokes less.
      </p>

      <h2>Parallel parenting: two calm households, not one battlefield</h2>
      <p>
        Co-parenting in the warm, collaborative sense &mdash; joint birthday parties, easy phone calls, flexible swaps &mdash; only works when both adults can stay regulated. When one cannot, forcing that closeness keeps the wound open. This is where <strong>parallel parenting</strong> comes in.
      </p>
      <p>
        In parallel parenting, you disengage from each other and run two largely separate households around the children. You each parent your own way, on your own time, with minimal direct contact. Communication shrinks to the essentials and moves to writing. The handoffs become brief and businesslike. The goal is not friendship; it is two stable homes with as little friction between them as possible.
      </p>
      <p>
        Choosing parallel parenting is not a failure. For many families it is the most loving, sustainable choice available &mdash; because a child does far better with two peaceful homes than with two parents locked in a constant, draining tug-of-war.
      </p>

      <h2>BIFF: the four-word formula for hard messages</h2>
      <p>
        When you do have to respond to something hostile, the <strong>BIFF</strong> method gives you a reliable structure: <strong>Brief, Informative, Friendly, Firm.</strong>
      </p>
      <ul>
        <li><strong>Brief</strong> &mdash; a few sentences, not a wall of text. Length invites argument.</li>
        <li><strong>Informative</strong> &mdash; stick to facts and logistics, not opinions or feelings.</li>
        <li><strong>Friendly</strong> &mdash; a neutral, civil tone, even if theirs was not.</li>
        <li><strong>Firm</strong> &mdash; close the loop so there is nothing to keep arguing about.</li>
      </ul>
      <p>
        A BIFF reply does not defend, explain at length, or fire back. It calmly states what will happen and ends. Here is the same provoking message answered two ways.
      </p>

      <div className="my-8 not-prose">
        <p className="text-sm font-semibold uppercase tracking-wide text-cg-sage mb-4">
          BIFF in Action
        </p>
        <div className="mx-auto max-w-sm rounded-[2rem] border border-gray-200 bg-white shadow-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-b from-[#F4F8F7] to-white border-b border-gray-100">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cg-sage to-cg-slate flex items-center justify-center text-white text-xs font-bold">
              CP
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">Co-Parent</p>
              <p className="text-[11px] text-gray-400">Text Message</p>
            </div>
          </div>
          <div className="px-4 py-5 space-y-6 bg-[#FBFCFC]">
            <div>
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-red-500 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-snug shadow-sm">
                  You&apos;re always late and clearly don&apos;t care about the kids. Don&apos;t even bother showing up Friday if you can&apos;t be on time for once.
                </div>
              </div>
              <p className="flex items-center justify-end gap-1 text-right text-[11px] font-medium text-red-500 mt-1.5 pr-1">
                <XCircle className="w-3.5 h-3.5" /> Reactive &mdash; takes the bait
              </p>
            </div>
            <div>
              <div className="flex justify-end">
                <div className="max-w-[85%]">
                  <div className="bg-cg-sage text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-snug shadow-sm">
                    Thanks for the note. I&apos;ll be there Friday at 5pm as scheduled. If anything changes, I&apos;ll let you know right away.
                  </div>
                  <p className="text-right text-[11px] text-gray-400 mt-1 pr-1">Delivered</p>
                </div>
              </div>
              <p className="flex items-center justify-end gap-1 text-right text-[11px] font-medium text-cg-sage mt-0.5 pr-1">
                <CheckCircle className="w-3.5 h-3.5" /> BIFF &mdash; brief, informative, friendly, firm
              </p>
            </div>
          </div>
        </div>
      </div>

      <p>
        Notice what the calm reply does <em>not</em> do: it does not argue about whether you are always late, it does not defend your character, and it does not match the heat. It acknowledges, states the plan, and closes. Crafting these in the moment is hard when you are upset, which is why CommonGround&apos;s ARIA can flag a hostile or manipulative message, suggest a calmer rewrite, and keep a timestamped record of what was actually said.
      </p>

      <h2>Boundaries are for you, not for them</h2>
      <p>
        A boundary is not a rule you impose on your ex &mdash; you cannot control whether they follow it. A boundary is a decision about what <em>you</em> will do. &quot;I will respond to scheduling messages within 24 hours&quot; is a boundary. &quot;I will not discuss our breakup over text&quot; is a boundary. You hold it by your own actions, not by demanding their cooperation.
      </p>
      <p>
        The hardest part is holding steady when they push. A provoking message is often a test: will you engage this time? Each time you decline the bait calmly, the boundary gets a little more solid. You do not need to announce it, justify it, or win an argument about it. You just quietly keep to it.
      </p>

      <div className="bg-cg-amber-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">Signs you are taking the bait</h3>
        <ul className="text-gray-600 list-disc pl-5 space-y-2">
          <li>You are drafting a reply at midnight, heart pounding.</li>
          <li>Your message is three paragraphs long and full of &quot;you always&quot; and &quot;you never.&quot;</li>
          <li>You are trying to prove you are right rather than solve a logistics problem.</li>
        </ul>
        <p className="text-gray-600 mt-3">
          When you notice these, step back. Draft it, but do not send it tonight. Almost nothing in co-parenting truly needs an instant reply.
        </p>
      </div>

      <h2>Documentation: calm, factual, and timestamped</h2>
      <p>
        Keeping a clear record is not about building a case to attack your ex. It is protection &mdash; for you and for your child. When communication is in writing, calm, and factual, you have an honest account of what was agreed, what was missed, and what was said. Memory fades and stories shift; a timestamped record does not.
      </p>
      <p>
        Aim for the same tone you would use if a judge or a parenting coordinator might read every word someday, because one might. Stick to facts: dates, times, what happened, what was agreed. Skip the insults, the sarcasm, and the score-keeping. A consistent paper trail of your own steady, reasonable behavior is one of the most powerful things you can have.
      </p>

      <h2>Protecting your kids from the adult conflict</h2>
      <p>
        Children are not built to carry adult conflict, and they should never be asked to. The research is clear and consistent: it is not divorce itself that harms kids most, but ongoing conflict between their parents. Shielding them from that conflict is the single most protective thing you can do.
      </p>
      <ul>
        <li>Do not vent about your ex to your child, even when you are right and they would agree.</li>
        <li>Do not use your child as a messenger, a spy, or a go-between for grown-up disputes.</li>
        <li>Let your child love their other parent freely, without guilt or pressure from you.</li>
        <li>Keep handoffs calm and brief &mdash; your child reads your face and your tone.</li>
      </ul>
      <p>
        Your child does not need both parents to be friends. They need to feel free to love both homes without being caught in the middle. When you stay calm and refuse to put them in that position, you give them permission to simply be a kid.
      </p>

      <h2>When to bring in professionals</h2>
      <p>
        You do not have to do this alone, and some situations genuinely need more support than two people can provide. Consider bringing in help when communication keeps breaking down, when agreements are not being honored, or when the conflict is wearing your child down.
      </p>
      <ul>
        <li><strong>A mediator</strong> can help you reach agreements without going to court, in a structured, neutral setting.</li>
        <li><strong>A parenting coordinator</strong> can manage ongoing high-conflict logistics and help resolve day-to-day disputes.</li>
        <li><strong>A family lawyer</strong> can clarify your rights and help formalize a parenting plan that protects everyone.</li>
        <li><strong>A therapist or counselor</strong> can support you and your child in processing the stress.</li>
      </ul>

      <div className="bg-white rounded-xl p-6 my-8 border border-gray-200 not-prose">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">An important safety note</h3>
            <p className="text-gray-600">
              This playbook assumes a difficult but safe situation. If there is abuse, threats, or you ever fear for your own or your child&apos;s safety, that comes first. Grey rock and BIFF are not substitutes for protection. Prioritize a safety plan and reach out to a domestic violence hotline, a lawyer, or local authorities for support tailored to your circumstances.
            </p>
          </div>
        </div>
      </div>

      <p>
        Co-parenting with a difficult ex is genuinely hard, and feeling worn down by it does not make you weak &mdash; it makes you human. But you have more power than it feels like on the bad days. You cannot control them, yet you can control the calm, steady, reliable parent your child gets to come home to. Keep your side clean, protect your child from the storm, and lean on support when you need it. One steady choice at a time, you are building exactly the safe harbor your child needs.
      </p>
    </article>
  );
}

function TwoHomes() {
  return (
    <article className="max-w-none">
      <p className="lead text-xl text-gray-600">
        When kids split their time between two homes, parents often worry that the back-and-forth will leave a mark. Here&apos;s the reassuring truth: children don&apos;t need two identical houses to feel safe. They need to know they&apos;re loved, that the grown-ups have things handled, and that home is wherever they are.
      </p>

      <h2>Security beats sameness</h2>
      <p>
        It&apos;s tempting to think you and your co-parent must match every rule, every meal, every bedtime down to the minute. But kids are more flexible than we give them credit for. What actually keeps them steady isn&apos;t perfect consistency between homes &mdash; it&apos;s feeling secure <em>within</em> each one.
      </p>
      <p>
        Children thrive when the important things are predictable: they know who is picking them up, when they&apos;ll see each parent next, and that both grown-ups are glad to have them. The dishes can be different. The house rules can have their own flavor. What matters is that each home feels calm, warm, and dependable.
      </p>

      <h2>Make transition days gentle</h2>
      <p>
        Moving between homes can be the hardest part of the week for a child, even when they love both parents. The change itself takes energy. A few small habits can soften it:
      </p>
      <ul>
        <li><strong>Keep a predictable rhythm.</strong> The same pickup spot, a familiar song in the car, or a snack waiting at the door tells a child what to expect.</li>
        <li><strong>Let a comfort item travel.</strong> A favorite stuffed animal, blanket, or worn-out hoodie can be a bridge between two places.</li>
        <li><strong>Keep reunions low-key.</strong> A warm but relaxed welcome is easier to handle than big, intense emotions. Save the fireworks for the soccer goal.</li>
        <li><strong>Skip the interrogation.</strong> Resist asking a stream of questions about the other home the moment they walk in. Let them settle first. They&apos;ll share when they&apos;re ready.</li>
      </ul>
      <p>
        If your child is quiet, cranky, or clingy right after a switch, that&apos;s normal. They&apos;re not upset with you &mdash; they&apos;re just resetting. Give them space and a little extra patience.
      </p>

      <h2>Align the big rules, relax the small ones</h2>
      <p>
        Kids do best when the major guideposts are roughly the same in both homes. You don&apos;t need a shared spreadsheet, but a loose agreement on the big stuff helps:
      </p>
      <ul>
        <li><strong>Bedtimes</strong> that land in the same ballpark, so a child isn&apos;t exhausted on Mondays.</li>
        <li><strong>Screen time</strong> limits that don&apos;t swing wildly from one house to the other.</li>
        <li><strong>Homework</strong> expectations, so school doesn&apos;t fall through the cracks between homes.</li>
      </ul>
      <p>
        Beyond those anchors, it&apos;s okay for homes to differ. Maybe one parent does pancakes on Sundays and the other does movie nights. Maybe one house is tidier and the other is cozier. Small differences aren&apos;t failures &mdash; they&apos;re just two people loving the same child in their own way. Kids learn quickly that &quot;at Dad&apos;s we do this, at Mom&apos;s we do that,&quot; and they adapt without harm.
      </p>

      <h2>Help both homes feel like home</h2>
      <p>
        A child shouldn&apos;t feel like a guest in either house. Belongings matter more than we realize &mdash; having their own things in both places sends a quiet message: <em>you live here too.</em>
      </p>
      <ul>
        <li>A drawer or shelf that&apos;s truly theirs.</li>
        <li>A toothbrush, pajamas, and a few clothes they don&apos;t have to pack.</li>
        <li>A spot on the wall for their drawings or photos.</li>
      </ul>
      <p>
        When kids can leave a book half-read or a project half-built and come back to it, both homes start to feel like solid ground rather than a suitcase they live out of.
      </p>

      <h2>Don&apos;t put grown-up weight on small shoulders</h2>
      <p>
        This one is hard, but it&apos;s one of the most protective things you can do. Children should never be pulled into the adult side of a separation. That means:
      </p>
      <ul>
        <li><strong>Not using them as messengers.</strong> &quot;Tell your mother she&apos;s late again&quot; puts a child in the middle of a conflict that isn&apos;t theirs. Talk to your co-parent directly.</li>
        <li><strong>Not turning them into spies.</strong> Asking who the other parent is dating or how they spend money teaches kids that loving one parent means betraying the other.</li>
        <li><strong>Not leaning on them for emotional support.</strong> Your child is not your confidant about adult hurts. They need to be the kid, not the comforter.</li>
      </ul>
      <p>
        When kids are kept out of the crossfire, they&apos;re free to simply love both parents &mdash; which is exactly what they need to do.
      </p>

      <div className="bg-cg-sage-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">What kids need to hear from you</h3>
        <p className="text-gray-600">
          &quot;This is not your fault.&quot; &quot;Both of us love you, and that will never change.&quot; &quot;You don&apos;t have to choose between us.&quot; &quot;It&apos;s okay to have fun and love your time at your other home.&quot; &quot;You can talk to me about anything.&quot; Said often and meant fully, these few sentences carry a child a long way.
        </p>
      </div>

      <h2>Keep the other parent close, even on your time</h2>
      <p>
        It can sting to encourage your child&apos;s bond with someone you&apos;re no longer with. But a child&apos;s love for their other parent is not a threat &mdash; it&apos;s a strength worth protecting. When kids feel free to miss and reach the parent who isn&apos;t in the room, they relax into both homes.
      </p>
      <p>
        Let your child call, text, or share a goodnight with the other parent without making it feel like a betrayal. CommonGround&apos;s KidSpace makes this easy and safe, letting kids video-call the other parent &mdash; and approved grandparents &mdash; during the other household&apos;s time, so connection never has to wait for the calendar. Whatever tools you use, the goal is the same: your child never has to choose whose love to hold.
      </p>

      <h2>What helps at each age</h2>
      <p>
        Kids handle two homes differently as they grow. A few notes for each stage:
      </p>
      <ul>
        <li><strong>Toddlers and preschoolers</strong> live in the present and can struggle when a parent is &quot;gone.&quot; Keep handoffs short and routines steady. A photo of the other parent, a comfort object, and simple words like &quot;Mama comes back after two sleeps&quot; help them feel safe.</li>
        <li><strong>School-age kids</strong> notice fairness and worry about logistics &mdash; lost homework, forgotten gear, missed events. A shared calendar they can see, and reassurance that the adults are coordinating, takes that load off their shoulders.</li>
        <li><strong>Teens</strong> crave independence and a social life that doesn&apos;t bend around the custody schedule. Give them a real voice in plans, flex when you can for friends and activities, and don&apos;t take their pulling-away personally. They still need both parents, even when they act like they don&apos;t.</li>
      </ul>

      <h2>When to reach for more support</h2>
      <p>
        Most kids adjust to two homes with time, patience, and steady love. But it&apos;s wise to watch for signs that a child is carrying more than they can hold:
      </p>
      <ul>
        <li>Big changes in sleep, appetite, or mood that don&apos;t pass.</li>
        <li>Slipping grades or pulling away from friends and activities they used to enjoy.</li>
        <li>New aggression, frequent meltdowns, or a return to younger behaviors.</li>
        <li>Stomachaches or headaches with no medical cause, often around transitions.</li>
        <li>Saying things like &quot;everything is my fault&quot; or seeming to feel responsible for the adults.</li>
      </ul>
      <p>
        If these stick around for weeks, it&apos;s not a sign you&apos;ve failed &mdash; it&apos;s a sign your child could use another caring adult. A school counselor or a family therapist can give kids a safe place to sort out feelings they can&apos;t put into words. Asking for help is one of the most loving moves a parent can make.
      </p>

      <div className="bg-cg-amber-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">A quick gut-check</h3>
        <p className="text-gray-600">
          Before each handoff, ask yourself one question: &quot;Am I making this easier or harder for my child?&quot; You won&apos;t get it perfect, and you don&apos;t need to. Aiming in the right direction, most of the time, is what kids remember.
        </p>
      </div>

      <h2>Two homes, one steady childhood</h2>
      <p>
        Raising a child across two homes asks a lot of you &mdash; patience, grace, and a willingness to put your child&apos;s peace ahead of old hurts. But children are remarkably resilient when the adults around them are kind, predictable, and on their side. Your home doesn&apos;t have to match the other one. It just has to be a place where your child feels safe, known, and loved. Build that, day after ordinary day, and your child can do more than cope with two homes. They can truly thrive in both.
      </p>
    </article>
  );
}

function FathersMentalHealthAwareness() {
  return (
    <article className="max-w-none">
      <p className="lead text-xl text-gray-600">
        June is Men&apos;s Mental Health Awareness Month &mdash; and if you&apos;re a dad, there&apos;s a good chance you&apos;ve been carrying more than you&apos;ve let on. You show up, you keep things running, and you tell everyone you&apos;re fine. This one&apos;s for you.
      </p>

      <h2>The fathers who never ask</h2>
      <p>
        Here&apos;s something that doesn&apos;t get said enough: fathers are often the last people in the house to ask for help. We notice when our kids are off. We notice when our co-parent is stretched thin. But our own struggles? Those get pushed to the bottom of the list, again and again, until they stop feeling like something we&apos;re even allowed to name.
      </p>
      <p>
        That silence isn&apos;t weakness. It&apos;s training. Most of us were raised on a quiet rulebook that said a man &mdash; especially a dad &mdash; is supposed to provide and protect, never flinch, and never need anything for himself. So we learn to swallow it. We call it &quot;just stress&quot; or &quot;a rough patch&quot; and keep moving. The problem is that what gets buried doesn&apos;t disappear. It leaks out sideways, and the people closest to us feel it first.
      </p>

      <h2>Why men hide it</h2>
      <p>
        The pressure to be the strong one is real, and it&apos;s heavy. A lot of dads believe that admitting they&apos;re struggling means letting everyone down &mdash; their kids, their family, themselves. So they don&apos;t say anything. They tough it out. And the longer they stay quiet, the harder it gets to start the conversation at all.
      </p>
      <p>
        There&apos;s also the simple fact that nobody taught us the words. We can describe a problem at work or fix something in the garage, but ask a man how he actually feels and you often get a shrug. That&apos;s not a character flaw. It&apos;s a gap, and gaps can be filled. The first step is just knowing what to look for.
      </p>

      <h2>What it actually looks like in men</h2>
      <p>
        Depression and anxiety don&apos;t always show up as sadness or tears. In men, they often wear a different mask &mdash; one that&apos;s easy to mistake for a personality, a bad mood, or just &quot;being busy.&quot; That&apos;s a big reason so many dads go undiagnosed for years.
      </p>
      <ul>
        <li><strong>Irritability and anger</strong> &mdash; a short fuse over small things, snapping at people you love</li>
        <li><strong>Withdrawal</strong> &mdash; pulling back from friends, family, and the things you used to enjoy</li>
        <li><strong>Overworking</strong> &mdash; burying yourself in the job so you never have to sit still with how you feel</li>
        <li><strong>Numbness</strong> &mdash; feeling flat, empty, or like you&apos;re just going through the motions</li>
        <li><strong>Physical symptoms</strong> &mdash; headaches, gut problems, trouble sleeping, constant fatigue</li>
        <li><strong>Drinking more</strong> &mdash; or leaning harder on anything that takes the edge off</li>
      </ul>
      <p>
        If you read that list and recognized yourself, you&apos;re not broken and you&apos;re not alone. These are some of the most common signals of depression, anxiety, and burnout in men. They&apos;re also signals you can do something about.
      </p>

      <div className="bg-cg-amber-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">Warning signs worth taking seriously</h3>
        <p className="text-gray-600">
          Reach out sooner rather than later if you notice: anger or irritability that keeps escalating; pulling away from your kids or friends; relying on alcohol or substances to cope; sleep that&apos;s wrecked for weeks; a heavy numbness that won&apos;t lift; or any thought that your family would be better off without you. That last one is never true, and it always deserves a phone call &mdash; today.
        </p>
      </div>

      <h2>Your kids feel what you feel</h2>
      <p>
        Children are emotional sponges. Long before they understand words like &quot;stress&quot; or &quot;depression,&quot; they pick up on tone, tension, and the mood in the room. When a dad is running on empty, kids absorb it &mdash; even when he thinks he&apos;s hiding it well. They may not know what&apos;s wrong, but they feel that something is.
      </p>
      <p>
        The flip side is the good news. A steady dad raises steadier kids. When you take care of your own mental health, you&apos;re not being selfish &mdash; you&apos;re giving your children a calmer home and a model of what it looks like to handle hard things in a healthy way. Looking after yourself <em>is</em> looking after them.
      </p>

      <h2>The extra weight separated dads carry</h2>
      <p>
        If you&apos;re a separated or divorced dad, you already know this season can hit differently. On top of everything else, you may be carrying a load that married dads don&apos;t always see.
      </p>
      <ul>
        <li><strong>Less time with your kids</strong> &mdash; the ache of empty days and a quiet house between visits</li>
        <li><strong>Conflict with a co-parent</strong> &mdash; tense messages and arguments that can hang over your whole week</li>
        <li><strong>Financial strain</strong> &mdash; support, two households, legal costs, all at once</li>
        <li><strong>Feeling sidelined</strong> &mdash; the sense of being unseen, second-guessed, or pushed to the edge of your own kids&apos; lives</li>
      </ul>
      <p>
        That&apos;s a lot to hold, and it&apos;s okay to admit it&apos;s heavy. Naming the weight is not complaining. It&apos;s the first honest step toward setting some of it down.
      </p>

      <h2>How to actually ask for help</h2>
      <p>
        Asking for help doesn&apos;t have to be a dramatic, life-changing moment. It can start small. Here are some first steps that real men take every day:
      </p>
      <ol>
        <li><strong>Tell one person.</strong> A friend, a sibling, your co-parent if you&apos;re on good terms &mdash; just saying &quot;I&apos;ve been struggling&quot; out loud breaks the spell of silence.</li>
        <li><strong>Talk to your doctor.</strong> Mention how you&apos;ve been feeling at your next visit. They&apos;ve heard it before, and they can rule out physical causes and point you somewhere useful.</li>
        <li><strong>See a therapist.</strong> You don&apos;t need to be in crisis to go. A good one is like a coach for the parts of life nobody trained you for.</li>
        <li><strong>Find peer support.</strong> Other dads who get it &mdash; a divorced-dads group, a men&apos;s circle, even an online community &mdash; can remind you that you&apos;re not the only one.</li>
      </ol>
      <p>
        Any one of these is a win. You don&apos;t have to do them all at once. You just have to start.
      </p>

      <div className="bg-cg-sage-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">If you&apos;re in crisis right now</h3>
        <p className="text-gray-600">
          If you&apos;re having thoughts of suicide or you feel like you can&apos;t hang on, please reach out immediately. In the US, call or text <strong>988</strong> to reach the Suicide and Crisis Lifeline, any time, day or night. It&apos;s free, it&apos;s confidential, and your kids need you here. Making that call is one of the strongest things a father can do.
        </p>
      </div>

      <h2>How CommonGround can help</h2>
      <p>
        Here&apos;s a source of stress that gets badly underrated: the day-to-day grind of co-parenting after a split. The tense messages, the schedule mix-ups, the arguments over money &mdash; that friction doesn&apos;t just ruin a Tuesday. It sits on your chest and drains the bandwidth you need for your own wellbeing and your kids. We built CommonGround to take some of that weight off your back.
      </p>
      <ul>
        <li><strong>ARIA</strong> helps keep messages calm and takes the heat out of exchanges, so a quick logistics text doesn&apos;t spiral into a fight.</li>
        <li><strong>TimeBridge</strong> handles the schedule and reminders, so pickups, drop-offs, and plans aren&apos;t one more thing to argue about.</li>
        <li><strong>ClearFund</strong> removes the friction around shared expenses, so money stays organized instead of personal.</li>
        <li><strong>A clear record</strong> of agreements and conversations means less anxiety and fewer ambushes &mdash; you always know where things stand.</li>
      </ul>
      <p>
        Less conflict and less mental load won&apos;t fix everything. But it frees up real room &mdash; the kind of room you can spend on rest, on healing, and on actually being present with your kids instead of bracing for the next clash.
      </p>

      <h2>You don&apos;t have to carry it alone</h2>
      <p>
        Reaching out is not the end of being strong &mdash; it&apos;s what real strength looks like up close. The dads your kids remember aren&apos;t the ones who never struggled. They&apos;re the ones who kept showing up, asked for help when they needed it, and got back up. This month, let that be the example you set. Take the one small step. You&apos;re worth it, and the people who love you are glad you&apos;re still here.
      </p>
    </article>
  );
}

function FatherMentalHealthSelfCare() {
  return (
    <article className="max-w-none">
      <p className="lead text-xl text-gray-600">
        June is Men&apos;s Mental Health Awareness Month, and if you&apos;re a dad, this one&apos;s for you. Being a father is one of the best things you&apos;ll ever do &mdash; and one of the hardest. Taking care of your own mind isn&apos;t selfish or soft; it&apos;s how you keep showing up for the people who count on you.
      </p>

      <h2>Start with the basics that actually move the needle</h2>
      <p>
        Before you reach for anything fancy, get the foundation right. The boring stuff is boring because it works. When your body is running on fumes, everything feels heavier &mdash; the traffic, the texts, the toddler meltdown at bedtime. Small, steady habits give you a buffer.
      </p>
      <ul>
        <li><strong>Sleep.</strong> Aim for a consistent bedtime, even on the nights the kids aren&apos;t with you. Seven hours changes how you handle stress more than almost anything else.</li>
        <li><strong>Move your body.</strong> You don&apos;t need a gym membership or a six-day plan. A brisk twenty-minute walk most days lifts your mood and burns off tension.</li>
        <li><strong>Eat real food.</strong> You don&apos;t have to be perfect. Just trade some of the drive-thru and late-night snacking for meals that don&apos;t leave you crashing an hour later.</li>
        <li><strong>Go easy on alcohol.</strong> A drink to unwind is one thing, but using it to numb a hard day tends to make the next day harder. Notice if it&apos;s creeping up.</li>
      </ul>
      <p>
        You won&apos;t nail all four overnight. Pick the one that&apos;s most broken right now and start there.
      </p>

      <h2>Protect time for yourself &mdash; without the guilt</h2>
      <p>
        You cannot pour from an empty cup. That phrase gets repeated so often it stops meaning anything, so let&apos;s be plain: if you never get a minute to yourself, you will run dry, and your kids feel that long before you do.
      </p>
      <p>
        Protecting your own time isn&apos;t taking something away from your children. It&apos;s what lets you come back patient instead of fried. Block out an hour for the thing that recharges you &mdash; a workout, a hobby, a quiet coffee, fishing, music, whatever it is. Put it on the calendar like any other commitment, and don&apos;t apologize for it.
      </p>

      <h2>Stay connected &mdash; isolation is the real risk</h2>
      <p>
        Here&apos;s a hard truth: a lot of men, especially after a separation or divorce, quietly drift away from their friends. The group chat goes silent, the standing plans fade, and one day you realize you haven&apos;t had a real conversation with another guy in weeks. Isolation feeds anxiety and depression, and it sneaks up slowly.
      </p>
      <p>
        Fight it on purpose. You don&apos;t need a big social life &mdash; you need a few real connections you keep up with.
      </p>
      <ul>
        <li>Text one friend today and put something on the calendar, even if it&apos;s just a walk or a game.</li>
        <li>Find a peer group &mdash; a men&apos;s group, a divorced-dads meetup, a sports league, a faith community.</li>
        <li>Set up a regular check-in with one person who actually asks how you&apos;re doing and means it.</li>
      </ul>

      <h2>Manage stress in the moment</h2>
      <p>
        Some days the stress shows up all at once &mdash; a heated handoff, a brutal email, a kid pushing every button you have. You can&apos;t always change what happens, but you can change what you do in the next sixty seconds.
      </p>
      <ul>
        <li><strong>Breathe.</strong> Slow your exhale. Breathe in for four counts, out for six, a few times. It tells your body the threat has passed.</li>
        <li><strong>Get outside.</strong> Step out the door, feel the air, look at something farther than your phone. A few minutes of daylight resets your head.</li>
        <li><strong>Build a daily reset.</strong> Pick one small ritual &mdash; the first coffee, the drive home, ten minutes before bed &mdash; and use it to let the day go.</li>
      </ul>

      <div className="bg-cg-sage-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">A simple daily reset</h3>
        <p className="text-gray-600">
          Try this for one week and see how you feel. It takes five minutes: 1) Step outside and take ten slow breaths. 2) Drink a glass of water before your coffee. 3) Send one text to a friend. 4) Name one thing that went okay today, even a small one. 5) Set a bedtime and stick to it. Don&apos;t aim for perfect &mdash; just aim for most days.
        </p>
      </div>

      <h2>Talk about it &mdash; out loud, to a real person</h2>
      <p>
        A lot of us were raised to handle things by going quiet and toughing it out. But carrying everything alone isn&apos;t strength &mdash; it&apos;s just heavy. Talking about what you&apos;re going through is one of the most useful things you can do for your mental health, and it doesn&apos;t make you any less of a man or a father.
      </p>
      <p>
        That might mean opening up to a friend, your brother, or someone you trust. It might mean seeing a therapist or counselor. Therapy isn&apos;t only for crisis &mdash; plenty of guys use it the way they&apos;d use a coach, to get an outside read and a few better tools. If money is tight, look into sliding-scale clinics, community mental health centers, or your employer&apos;s assistance program. The first conversation is the hardest. It gets easier from there.
      </p>

      <h2>Set boundaries &mdash; and don&apos;t take the bait</h2>
      <p>
        If you&apos;re co-parenting with someone who runs hot, you already know how one message can hijack a whole day. A big part of protecting your mental health is learning what to engage with and what to let slide.
      </p>
      <ul>
        <li>You don&apos;t have to reply to a hostile text the second it lands. Give it an hour. Reply to the logistics, skip the jab.</li>
        <li>Keep your messages short, calm, and about the kids. Don&apos;t defend, don&apos;t escalate, don&apos;t get pulled into old arguments.</li>
        <li>Decide ahead of time what you will and won&apos;t discuss. A boundary isn&apos;t a punishment &mdash; it&apos;s how you keep the peace for everyone.</li>
      </ul>
      <p>
        Not taking the bait is a skill, and you get better at it with practice. Every time you don&apos;t fire back, you keep your own day intact.
      </p>

      <h2>Being present with your kids is its own medicine</h2>
      <p>
        Here&apos;s the part that surprises a lot of dads: time with your kids, when you&apos;re really in it, is good for <em>you</em>, not just them. Building a fort, shooting hoops, reading a bedtime story, cooking dinner together &mdash; those moments pull you out of your own head and remind you what all of this is for.
      </p>
      <p>
        You&apos;re also teaching them. When your kids see you take a walk to cool off, talk about a hard feeling, or own a bad day instead of stuffing it, they learn that coping is something healthy people do. You don&apos;t have to be perfect for them. You just have to show them what it looks like to keep trying.
      </p>

      <h2>How CommonGround can help</h2>
      <p>
        Let&apos;s be honest about where a lot of a separated dad&apos;s daily stress actually comes from. It&apos;s not usually the big stuff &mdash; it&apos;s the steady drip of co-parenting friction. The cutting text, the schedule mix-up, the argument over who owes what. That weight follows you to work, to the gym, into your time with your kids.
      </p>
      <p>
        That&apos;s the load CommonGround is built to lift. ARIA helps keep messages calm and on-topic, so a single text doesn&apos;t blow up your whole afternoon. TimeBridge automates the parenting schedule and reminders, so you&apos;re not living in fear of a missed handoff. ClearFund takes the fight out of shared expenses by keeping it all clear and on the record. And KidSpace keeps you connected to your kids even on the other parent&apos;s days. Fewer fires to fight means more energy left over &mdash; for your health, and for them.
      </p>

      <div className="bg-cg-amber-subtle rounded-xl p-6 my-8 not-prose">
        <h3 className="text-lg font-semibold text-foreground mb-2">If you&apos;re really struggling, reach out</h3>
        <p className="text-gray-600">
          Self-care habits help, but they&apos;re not a substitute for real support when things get dark. If you&apos;re struggling badly, feeling hopeless, or having thoughts of hurting yourself, please reach out to a doctor, a therapist, or a crisis line. In the US, you can call or text 988 anytime to reach the Suicide and Crisis Lifeline. Asking for help is one of the strongest things a father can do.
        </p>
      </div>

      <h2>You don&apos;t have to do it all at once</h2>
      <p>
        Reading a list like this can feel like one more thing to fail at. It isn&apos;t. You don&apos;t have to overhaul your life this month. Pick one thing &mdash; one walk, one honest conversation, one earlier bedtime &mdash; and start there. Your kids don&apos;t need a perfect dad. They need a present one who&apos;s taking care of himself, too. This month, that can start with a single small step. You&apos;ve got this.
      </p>
    </article>
  );
}
