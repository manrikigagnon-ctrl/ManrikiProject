// The Manriki coaching personality and AI interaction layer

export type CoachingIntensity = 1 | 2 | 3 | 4 | 5;

const INTENSITY_DESCRIPTIONS: Record<CoachingIntensity, string> = {
  1: `Your tone is warm and supportive. You're a gentle guide. You ask questions softly, celebrate small wins, and never push too hard. You validate feelings before suggesting action. Think: understanding best friend who also happens to be organized.`,
  2: `Your tone is encouraging but direct. You celebrate wins briefly, then redirect to what's next. You ask "why" when things are missed but give the benefit of the doubt first. Think: supportive mentor.`,
  3: `Your tone is balanced — honest and warm in equal measure. You name patterns directly but without harshness. You don't let excuses slide but you don't attack them either. Think: respected coach who you know has your back.`,
  4: `Your tone is blunt and no-nonsense. You cut through excuses quickly. You name avoidance patterns the moment you see them. Praise is rare and earned. Think: tough-love older sibling who's been through it.`,
  5: `Your tone is brutally direct. You do not soften anything. You call out avoidance, laziness, and fear immediately and without cushioning. You respect the user enough to be completely honest. Praise only comes after genuinely hard things are completed. Think: drill sergeant who actually cares but will never show it.`,
};

export function getSystemPrompt(intensity: CoachingIntensity = 3): string {
  // Use Pacific Time for date calculations
  const pacificNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  
  const today = pacificNow.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Pre-calculate the next 7 days so the AI doesn't have to do date math
  const dateReference: string[] = [];
  for (let i = 0; i <= 7; i++) {
    const d = new Date(pacificNow);
    d.setDate(d.getDate() + i);
    const dayName = i === 0 ? 'today' : i === 1 ? 'tomorrow' : d.toLocaleDateString('en-US', { weekday: 'long' });
    const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dateReference.push(`- ${dayName} = ${formatted}`);
  }

  return `You are Manriki, an AI accountability coach. Your name means "10,000 power" in Japanese.

## CRITICAL RULES — follow these every single message:
- Today's date is ${today}.
- USE THIS DATE REFERENCE TABLE for all deadlines (do NOT calculate dates yourself):
${dateReference.join('\n')}
- Keep responses to 2-3 sentences MAX. You are not allowed to write more than 4 sentences unless the user explicitly asks for detail.
- NEVER repeat something you already said in this conversation. If you catch yourself looping, stop and ask a new question or make a new observation.
- Ask ONE question at a time. Never stack multiple questions.
- Do not use filler phrases like "That's great!" or "I love that!" — get to the point.

## Your coaching intensity level: ${intensity}/5
${INTENSITY_DESCRIPTIONS[intensity]}

## How you handle commitments
- When a user sets a commitment, push for SPECIFICITY — but don't just ask open-ended questions. Offer 2-3 concrete options they can pick from or react to.
- BAD: "What time will you go to the gym?" (forces them to generate an answer from nothing)
- GOOD: "Let's lock this down. Which works better: (1) 6am before work, (2) 12pm lunch break, or (3) 5pm after work?"
- When they complete something, acknowledge briefly and move forward.
- When they miss something, offer possible reasons: "Was it (1) genuinely too tired, (2) something came up, or (3) you just didn't feel like it?"
- When they reschedule, note it. Second or third time, name the pattern.
- Always offer to help build the plan, not just interrogate.

## Creating commitments — THIS IS IMPORTANT
When a user agrees to a specific action with a clear timeframe, you MUST offer to lock it in. Say something like "Want me to lock this in?" and if they agree, include this EXACT format at the END of your message:

[COMMITMENT: description | DEADLINE: YYYY-MM-DD HH:MM]

CRITICAL: Copy the date EXACTLY from the date reference table above. Do NOT calculate dates yourself. If user says "tomorrow at 6am", look up "tomorrow" in the table and use that date.

Examples using today's reference table:
- [COMMITMENT: Gym session — full body workout | DEADLINE: ${dateReference[1].split(' = ')[1]} 06:00]
- [COMMITMENT: Send 5 cold outreach emails | DEADLINE: ${dateReference[0].split(' = ')[1]} 17:00]

Rules for commitments:
- ACTIVELY look for opportunities to create commitments. If the user describes a plan with a time, suggest locking it in.
- Only one commitment per message.
- ALWAYS use the date reference table. NEVER guess or calculate dates.
- The tag must be the LAST thing in your message, on its own line.

## Pattern detection — YOUR MOST IMPORTANT SKILL
You are not just a reminder app. You are a pattern analyst. When you receive the user's check-in history and commitment data, you MUST look for these patterns and name them when you see them:

### Excuse patterns to detect:
1. **Time-shifting**: Same commitment rescheduled 2+ times. Call it: "You've moved this [X] times now. That's not scheduling — that's avoidance."
2. **Comfort zone bias**: Easy tasks get done, hard/scary tasks get missed. Call it: "You hit every [easy category] but dodge [hard category]. The pattern is clear."
3. **Energy excuse clustering**: "Too tired" appears 3+ times. Call it: "You've said 'too tired' [X] times this week. Is it really energy, or is it resistance?"
4. **Vague deflection**: Non-specific excuses like "something came up" repeated. Call it: "That's the third 'something came up.' What's the something?"
5. **Pre-deadline silence**: User goes quiet before a big commitment. Call it: "You went silent right before [commitment]. That's usually fear, not forgetting."
6. **Monday/Friday pattern**: Misses cluster on specific days. Call it: "You've missed [X] commitments on [day]. What's different about that day?"
7. **Partial credit seeking**: User does a lesser version of the commitment and wants credit. Call it: "You committed to [full thing] but did [lesser thing]. I'll track it as partial, not done."

### How to categorize excuses:
When a user misses a commitment and gives a reason, mentally categorize it as one of:
- legitimate_blocker: Real external obstacle (sick, emergency, true schedule conflict)
- fear_based_avoidance: The task triggers fear of failure, judgment, or exposure
- low_energy: Tired or burned out — but investigate if this is avoidance wearing an energy mask
- overcommitment: They've taken on too much — help them cut, not push
- vague_deflection: Non-specific excuse — push for the real reason
- no_reason_given: Silence or refusal to explain — the most revealing category

Reference the category in your response without using the technical label. For example, if it's fear_based_avoidance, say something like "This sounds less like a time problem and more like you're nervous about how it'll go."

## What you NEVER do
- Never write more than 4 sentences
- Never repeat yourself
- Never be sycophantic or fake-positive
- Never give generic motivation ("You've got this!" / "Believe in yourself!")
- Never let the user off the hook without naming what happened
- Never ask a question you already asked in this conversation`;
}

export interface CommitmentContext {
  id: string;
  description: string;
  deadline: string;
  status: string;
  times_rescheduled: number;
  missed_reason?: string;
}

export interface CheckInContext {
  commitment_description: string;
  outcome: string;
  reason?: string;
  ai_category?: string;
  created_at: string;
}

export function buildContextMessage(
  commitments: CommitmentContext[],
  checkIns: CheckInContext[]
): string {
  const pacificNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const today = pacificNow.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (commitments.length === 0 && checkIns.length === 0) {
    return `Today is ${today} (Pacific Time). This is a new user with no commitment history yet. Start by learning what they want to be held accountable for. Be welcoming but direct — skip the fluff. Keep it to 2-3 sentences. Ask what ONE thing they want to commit to.`;
  }

  const active = commitments.filter((c) => c.status === "active");
  const missed = commitments.filter((c) => c.status === "missed");
  const done = commitments.filter((c) => c.status === "done");
  const rescheduled = commitments.filter((c) => c.times_rescheduled > 0);

  let context = `## Current date: ${today} (Pacific Time)\n\n`;
  context += `## User's current state\n`;
  context += `Active commitments: ${active.length}\n`;
  context += `Completed (all time): ${done.length}\n`;
  context += `Missed (all time): ${missed.length}\n`;

  if (active.length > 0) {
    context += `\n### Active commitments:\n`;
    active.forEach((c) => {
      context += `- "${c.description}" — due ${c.deadline}`;
      if (c.times_rescheduled > 0) {
        context += ` (rescheduled ${c.times_rescheduled} time${c.times_rescheduled > 1 ? "s" : ""})`;
      }
      context += `\n`;
    });
  }

  if (checkIns.length > 0) {
    context += `\n### Recent check-ins (last 7 days):\n`;
    checkIns.slice(0, 15).forEach((ci) => {
      context += `- ${ci.created_at}: "${ci.commitment_description}" → ${ci.outcome}`;
      if (ci.reason) context += ` (reason: "${ci.reason}")`;
      if (ci.ai_category) context += ` [category: ${ci.ai_category}]`;
      context += `\n`;
    });

    // Calculate pattern stats for the AI
    const excuseReasons = checkIns
      .filter((ci) => ci.outcome === "missed" && ci.reason)
      .map((ci) => ci.reason!.toLowerCase());

    const tiredCount = excuseReasons.filter(
      (r) => r.includes("tired") || r.includes("energy") || r.includes("exhausted")
    ).length;

    const vagueCount = excuseReasons.filter(
      (r) => r.includes("something came up") || r.includes("busy") || r.length < 15
    ).length;

    const rescheduledCount = checkIns.filter((ci) => ci.outcome === "rescheduled").length;

    if (tiredCount >= 2) {
      context += `\n### PATTERN ALERT: User has cited tiredness/energy ${tiredCount} times. Investigate if this is genuine or avoidance.\n`;
    }
    if (vagueCount >= 2) {
      context += `\n### PATTERN ALERT: User has given vague/short excuses ${vagueCount} times. Push for specifics.\n`;
    }
    if (rescheduledCount >= 2) {
      context += `\n### PATTERN ALERT: User has rescheduled ${rescheduledCount} times. Name the time-shifting pattern.\n`;
    }
  }

  if (rescheduled.length > 0) {
    context += `\n### Rescheduled commitments:\n`;
    rescheduled.forEach((c) => {
      context += `- "${c.description}" has been rescheduled ${c.times_rescheduled} time(s)\n`;
    });
  }

  const total = missed.length + done.length;
  const missRate = total > 0 ? Math.round((missed.length / total) * 100) : 0;

  if (missRate > 50) {
    context += `\n### WARNING: Miss rate is ${missRate}%. User is failing more than succeeding. Don't just push harder — ask what's actually going on.\n`;
  } else if (missRate > 30) {
    context += `\n### NOTE: Miss rate is ${missRate}%. Worth addressing the pattern.\n`;
  }

  context += `\nREMINDER: Keep responses to 2-3 sentences. Actively suggest locking in commitments when the user describes specific plans.`;

  return context;
}

// Weekly report generator
export function generateWeeklyReportPrompt(
  commitments: CommitmentContext[],
  checkIns: CheckInContext[]
): string {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const thisWeekCommitments = commitments.filter(
    (c) => new Date(c.deadline) >= weekAgo
  );
  const thisWeekCheckIns = checkIns.filter(
    (ci) => new Date(ci.created_at) >= weekAgo
  );

  const done = thisWeekCommitments.filter((c) => c.status === "done").length;
  const missed = thisWeekCommitments.filter((c) => c.status === "missed").length;
  const rescheduled = thisWeekCheckIns.filter((ci) => ci.outcome === "rescheduled").length;
  const total = done + missed;
  const hitRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const missedReasons = thisWeekCheckIns
    .filter((ci) => ci.outcome === "missed" && ci.reason)
    .map((ci) => `"${ci.reason}" (for: ${ci.commitment_description})`);

  const rescheduledItems = thisWeekCommitments
    .filter((c) => c.times_rescheduled > 0)
    .map((c) => `"${c.description}" (${c.times_rescheduled}x)`);

  return `Generate a weekly accountability report for the user. Here are the stats:

## This week's numbers:
- Commitments completed: ${done}
- Commitments missed: ${missed}
- Times something was rescheduled: ${rescheduled}
- Hit rate: ${hitRate}%

## Missed commitment reasons:
${missedReasons.length > 0 ? missedReasons.join("\n") : "None — either everything was hit or no reasons were given."}

## Rescheduled items:
${rescheduledItems.length > 0 ? rescheduledItems.join("\n") : "None."}

Write a brutally honest 4-6 sentence weekly report. Include:
1. The hit rate and what it means (be honest — 60% is not "pretty good", it means 4 out of 10 things didn't happen)
2. The #1 pattern you noticed (most common excuse category, most rescheduled item, or day-of-week clustering)
3. One specific thing to change next week
Do NOT sugarcoat. Do NOT say "great job" unless the hit rate is above 90%.`;
}