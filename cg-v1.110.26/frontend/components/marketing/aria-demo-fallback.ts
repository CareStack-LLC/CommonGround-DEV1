/**
 * Client-side fallback "ARIA" for the marketing live demos.
 *
 * Used only when the live demo backend is unreachable, so the demo still
 * responds instead of doing nothing. This is a lightweight heuristic — the
 * real ARIA (regex + LLM, trained on 127K+ real co-parenting messages) runs
 * in the full app. Keep the shape identical to the API responses so callers
 * can use it as a drop-in.
 */

export interface DemoARIAAnalysis {
  toxicity_level: string;
  toxicity_score: number;
  categories: string[];
  triggers: string[];
  explanation: string;
  suggestion: string | null;
  is_flagged: boolean;
}

export interface DemoCoparentReply {
  reply: string;
  aria_analysis: DemoARIAAnalysis;
  rewritten_reply: string | null;
}

interface Pattern {
  category: string;
  re: RegExp;
  weight: number;
}

// Detection patterns roughly mirror ARIA's toxicity categories.
const PATTERNS: Pattern[] = [
  { category: 'profanity', re: /\b(f+u+c+k+\w*|sh[i1]t+\w*|a+ss+h[o0]les?|b[i1]tch\w*|bastard|piss(ed)?|d[a4]mn|crap)\b/i, weight: 0.55 },
  { category: 'insult', re: /\b(idiot|stupid|pathetic|useless|worthless|moron|loser|dumb\w*|incompetent|failure|clueless|lazy|selfish|childish)\b/i, weight: 0.45 },
  { category: 'hostility', re: /\b(shut up|hate you|hate your|get it together|grow up|are you kidding|sick of you|done with you|so sick of|had enough of you)\b/i, weight: 0.45 },
  { category: 'blame', re: /\b(you always|you never|your fault|because of you|you ruined|you keep|you can'?t even|this is on you|you did this|you made me)\b/i, weight: 0.35 },
  { category: 'passive_aggressive', re: /\b(whatever|must be nice|as usual|good luck with that|if you actually cared|sure you will|thanks a lot|real mature|figures|typical you)\b/i, weight: 0.32 },
  { category: 'dismissive', re: /\b(i don'?t care|not my problem|figure it out|your problem|couldn'?t care less|not my job|deal with it|do whatever)\b/i, weight: 0.35 },
  { category: 'threatening', re: /\b(my lawyer|see you in court|i'?ll take|you'?ll regret|you'?ll be sorry|i'?ll make sure|watch what happens|you'?re done)\b/i, weight: 0.6 },
  { category: 'custody_weaponization', re: /\b(you'?ll never see|keep the kids from|won'?t let you see|take the kids|my kids not yours|they don'?t want to see you|lose custody|not your kids)\b/i, weight: 0.62 },
  { category: 'financial_coercion', re: /\b(won'?t pay|not paying|you owe|where'?s the money|no money for you|cut you off|pay up|good luck getting)\b/i, weight: 0.42 },
];

const CATEGORY_PHRASE: Record<string, string> = {
  profanity: 'profanity',
  insult: 'personal insults',
  hostility: 'hostile language',
  blame: 'blame and absolutes ("always" / "never")',
  passive_aggressive: 'passive-aggressive jabs',
  dismissive: 'dismissiveness',
  threatening: 'threats',
  custody_weaponization: 'using the kids as leverage',
  financial_coercion: 'financial pressure',
  all_caps: 'an aggressive ALL-CAPS tone',
};

function toxicityLevel(score: number): string {
  if (score >= 0.8) return 'severe';
  if (score >= 0.6) return 'high';
  if (score >= 0.45) return 'medium';
  if (score >= 0.3) return 'low';
  return 'none';
}

function detect(text: string): { categories: string[]; triggers: string[]; score: number } {
  const categories: string[] = [];
  const triggers: string[] = [];
  let score = 0;

  for (const p of PATTERNS) {
    const m = text.match(p.re);
    if (m) {
      if (!categories.includes(p.category)) categories.push(p.category);
      triggers.push(m[0]);
      score = Math.max(score, p.weight);
    }
  }

  // Aggressive ALL-CAPS tone (ignore short acronyms; require normal text around it).
  const capsWords = (text.match(/\b[A-Z]{3,}\b/g) || []).filter((w) => w.length >= 3);
  if (capsWords.length && /[a-z]/.test(text)) {
    if (capsWords.length >= 2 || capsWords.some((w) => w.length >= 4)) {
      if (!categories.includes('all_caps')) categories.push('all_caps');
      triggers.push(...capsWords.slice(0, 2));
      score = Math.max(score, 0.34);
    }
  }

  // Multiple distinct issues compound the tone.
  if (categories.length > 1) score += 0.07 * (categories.length - 1);

  return { categories, triggers, score: Math.min(0.97, score) };
}

// Topic-aware civil rewrites — these read cleanly and preserve the apparent
// subject, so the demo always produces a sensible suggestion.
const REWRITE_TOPICS: { test: RegExp; options: string[] }[] = [
  {
    test: /schedul|pick.?up|drop.?off|late|weekend|swap|time|exchange|hand.?off/i,
    options: [
      "I'd like to get the schedule sorted so it's predictable for the kids. Can we confirm pickup and drop-off times that work for both of us?",
      "Can we look at the schedule together? I want to avoid last-minute changes so the kids know what to expect.",
    ],
  },
  {
    test: /pay|money|owe|support|expense|cost|bill|reimburse/i,
    options: [
      "I want to make sure we're aligned on the shared expenses. Can we go over what's owed and set up a simple way to handle it?",
      "Let's review the costs for the kids together so we're both clear and it doesn't keep coming up.",
    ],
  },
  {
    test: /doctor|medical|meds|medication|sick|appointment|insurance|dentist|therap/i,
    options: [
      "I'd like us both to be in the loop on the kids' health. Can you share what the doctor said so we can decide together?",
      "Can we coordinate on the medical appointments? I want to be involved and make these decisions with you.",
    ],
  },
  {
    test: /text|call|respond|reply|message|contact|phone/i,
    options: [
      "I'll do my best to reply promptly. Can we agree on a reasonable window for responses so neither of us feels ignored?",
      "Let's set some simple expectations for messaging so we can keep things about the kids and low-stress.",
    ],
  },
  {
    test: /holiday|thanksgiving|christmas|vacation|break|new year/i,
    options: [
      "I'd love the kids to have a great holiday. Can we talk through where they'll be so it feels fair to everyone?",
      "Holidays can be tricky — can we look at how we split them and find something balanced?",
    ],
  },
  {
    test: /new (partner|guy|girl|boyfriend|girlfriend|someone|person)|dating|seeing someone/i,
    options: [
      "Introductions to new people matter to me too. Can we find a calm time to talk about how and when that happens?",
      "This is important to both of us. Can we talk it through so we're on the same page about the kids?",
    ],
  },
];

const DEFAULT_REWRITES = [
  "I'd like to work this out calmly so we can find something that's best for the kids. When's a good time to talk?",
  "Let's focus on a solution here. I want to keep this civil and centered on the kids — can we talk it through?",
];

function civilRewrite(text: string): string {
  for (const topic of REWRITE_TOPICS) {
    if (topic.test.test(text)) {
      return topic.options[text.length % topic.options.length];
    }
  }
  return DEFAULT_REWRITES[text.length % DEFAULT_REWRITES.length];
}

function buildExplanation(categories: string[]): string {
  const labels = categories
    .filter((c) => CATEGORY_PHRASE[c])
    .map((c) => CATEGORY_PHRASE[c]);
  const list =
    labels.length === 0
      ? 'charged language'
      : labels.length === 1
        ? labels[0]
        : labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1];
  return `This reads as ${list}. In co-parenting, that tends to put the other parent on the defensive and pull the kids into the conflict. A calmer, specific version usually lands better — and keeps a clean record.`;
}

/**
 * Local stand-in for POST /demo/analyze.
 */
export function fallbackAnalyze(content: string, forceRewrite = false): DemoARIAAnalysis {
  const { categories, triggers, score } = detect(content);
  const is_flagged = score >= 0.3;
  // Provide a rewrite when flagged, or when ARIA is ON (forceRewrite) and the
  // message is at least a little pointed. Clearly civil text passes untouched.
  const shouldRewrite = is_flagged || (forceRewrite && score >= 0.22);
  return {
    toxicity_level: toxicityLevel(score),
    toxicity_score: Number(score.toFixed(2)),
    categories,
    triggers: Array.from(new Set(triggers)).slice(0, 6),
    explanation: is_flagged
      ? buildExplanation(categories)
      : 'This message reads as calm and child-focused. Nothing to flag.',
    suggestion: shouldRewrite ? civilRewrite(content) : null,
    is_flagged,
  };
}

// Hostile co-parent replies per scenario, each paired with the civil version
// ARIA would rewrite it into. Rotating through them keeps the demo lively.
const COPARENT_REPLIES: Record<string, { reply: string; civil: string }[]> = {
  schedule: [
    { reply: "I already told you the pickup time. Why is this so hard for you every single week?", civil: "I thought we'd set the pickup time — can we double-check it so we're both on the same page?" },
    { reply: "Typical. You agree to something and then change it last minute. The kids are tired of it.", civil: "It feels like the plan keeps shifting. Can we lock the schedule down so it's steady for the kids?" },
    { reply: "Fine. But if you're late again I'm not going to sit around waiting.", civil: "Okay. If either of us is running late, let's just text ahead so no one's left waiting." },
  ],
  medical: [
    { reply: "I'm the one who actually takes them to the doctor. Maybe show up sometime.", civil: "I'd appreciate a heads-up on appointments so I can be there too — I want to be involved." },
    { reply: "You don't get a say when you're never around for it.", civil: "I know we haven't coordinated well on this. Can we plan the next appointment together?" },
    { reply: "Whatever. I'll handle it like I always do.", civil: "I've been handling these on my own and it's a lot. Can we share this going forward?" },
  ],
  financial: [
    { reply: "Where's the money? The kids need things and you're always late.", civil: "Can we confirm the timing for this month's expenses? I want to make sure the kids have what they need." },
    { reply: "Must be nice not paying your share.", civil: "I feel like the costs aren't splitting evenly. Can we go through them together?" },
    { reply: "I'm done covering for you.", civil: "I've been covering more than my share lately. Can we set up a fair, clear split?" },
  ],
  holiday: [
    { reply: "The kids are staying with me for the holiday. They already said so.", civil: "I'd love the kids to have a great holiday. Can we talk through where they'll be so it's fair?" },
    { reply: "You had them last year, so don't even start.", civil: "I know holidays are tricky. Can we look at last year and find something balanced?" },
    { reply: "Don't turn this into a fight.", civil: "I don't want this to become a fight either — let's find a plan we can both live with." },
  ],
  communication: [
    { reply: "Stop blowing up my phone. I'll answer when I answer.", civil: "I'll try to reply in good time. Can we agree on a reasonable response window?" },
    { reply: "Not everything is an emergency, you know.", civil: "You're right that not everything is urgent — let's flag the ones that are so they don't get lost." },
    { reply: "You're really not my priority right now.", civil: "Let's keep messages focused on the kids so they're easy to stay on top of." },
  ],
  new_partner: [
    { reply: "I don't want some stranger around MY kids.", civil: "Introductions matter to me too. Can we talk about how and when new people meet the kids?" },
    { reply: "You should have asked me first.", civil: "I'd appreciate a heads-up before introductions. Can we agree on how we handle that together?" },
    { reply: "We're talking about this NOW.", civil: "This is important — can we set a calm time to talk it through together?" },
  ],
};

/**
 * Local stand-in for POST /demo/coparent-reply.
 */
export function fallbackCoparentReply(
  scenario: string,
  conversationHistory: { role: string; text: string }[],
  _userMessage: string,
  ariaEnabled: boolean,
): DemoCoparentReply {
  const pool = COPARENT_REPLIES[scenario] || COPARENT_REPLIES.schedule;
  // Advance through the pool based on how many co-parent turns have happened.
  const coparentTurns = conversationHistory.filter((m) => m.role === 'coparent').length;
  const picked = pool[coparentTurns % pool.length];

  const aria_analysis = fallbackAnalyze(picked.reply, false);
  // Ensure the hostile reply is always flagged in the demo.
  if (!aria_analysis.is_flagged) {
    aria_analysis.is_flagged = true;
    aria_analysis.toxicity_score = Math.max(aria_analysis.toxicity_score, 0.55);
    aria_analysis.toxicity_level = toxicityLevel(aria_analysis.toxicity_score);
    if (!aria_analysis.categories.length) aria_analysis.categories = ['hostility'];
  }
  aria_analysis.suggestion = picked.civil;

  return {
    reply: picked.reply,
    aria_analysis,
    rewritten_reply: ariaEnabled ? picked.civil : null,
  };
}
