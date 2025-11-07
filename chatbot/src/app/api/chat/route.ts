import { NextResponse } from "next/server";

type ChatRole = "user" | "assistant" | "system";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

const KEYWORD_RESPONSES: { keywords: string[]; response: string }[] = [
  {
    keywords: ["hello", "hi", "hey"],
    response:
      "Hello! 👋 I’m tuned in and ready to collaborate. What are we exploring today?",
  },
  {
    keywords: ["thanks", "thank you", "appreciate"],
    response:
      "Happy to help! If there’s anything else you’d like to iterate on, just let me know.",
  },
  {
    keywords: ["help", "stuck", "support"],
    response:
      "I’ve got your back. Share where things feel fuzzy and we’ll carve a clearer path together.",
  },
  {
    keywords: ["who are you", "what are you"],
    response:
      "I’m your conversation partner—part coach, part co-creator—here to help you untangle ideas and move them forward.",
  },
  {
    keywords: ["idea", "brainstorm", "concept"],
    response:
      "Let’s brainstorm! Give me a bit more context, like the audience or goal, and I’ll throw out a few angles.",
  },
];

const PROMPT_TEMPLATES = {
  framing:
    "Here’s how I’m understanding what you’re aiming for based on our conversation:",
  blockers:
    "Potential blockers to watch out for (and how you might address them):",
  nextSteps: "Next steps you can take right away:",
};

const IDEA_STARTERS = [
  "Consider reframing the idea around a specific persona to make it tangible.",
  "Test the concept with a low-stakes pilot—collect fast feedback before investing heavily.",
  "Pair the idea with a simple narrative that explains the before/after transformation.",
  "Break the big concept into a three-step journey so it feels more approachable.",
  "Contrast the current status quo with the change you want to introduce.",
];

const normalize = (value: unknown): ChatMessage[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const record = raw as Partial<ChatMessage>;
      if (
        (record.role === "user" ||
          record.role === "assistant" ||
          record.role === "system") &&
        typeof record.content === "string"
      ) {
        return { role: record.role, content: record.content.trim() };
      }
      return null;
    })
    .filter((item): item is ChatMessage => Boolean(item?.content));
};

const pickKeywordReply = (message: string): string | null => {
  const normalized = message.toLowerCase();
  for (const entry of KEYWORD_RESPONSES) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      return entry.response;
    }
  }
  return null;
};

const summarizeFocus = (messages: ChatMessage[]): string | null => {
  const userMessages = messages.filter((message) => message.role === "user");
  if (userMessages.length === 0) return null;

  const distilled = userMessages
    .slice(-3)
    .map((message) => message.content.replace(/\s+/g, " ").trim())
    .join(" • ");

  return distilled.length > 0 ? distilled : null;
};

const surfaceBlockers = (message: string): string[] => {
  const blockers: string[] = [];

  if (message.match(/\btime\b|\bschedule\b|\bbusy\b/i)) {
    blockers.push(
      "Time: carve out a focused micro-sprint (30–60 minutes) and define a single milestone.",
    );
  }

  if (message.match(/\bmoney\b|\bbudget\b|\bcost\b/i)) {
    blockers.push(
      "Budget: validate the idea with zero- or low-cost experiments before investing further.",
    );
  }

  if (message.match(/\bconfidence\b|\bunsure\b|\bworry\b/i)) {
    blockers.push(
      "Confidence: outline the riskiest assumption and design a lightweight test to confirm or refute it.",
    );
  }

  if (blockers.length === 0) {
    blockers.push(
      "Momentum: decide on a measurable outcome for your next action so you can celebrate progress quickly.",
    );
  }

  return blockers;
};

const craftReply = (messages: ChatMessage[]): string => {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  if (!lastUserMessage) {
    return "I’m here whenever you’re ready to chat. Share a question, an idea, or anything you’d like to unpack.";
  }

  const keywordHit = pickKeywordReply(lastUserMessage.content);
  if (keywordHit) {
    return keywordHit;
  }

  const focus = summarizeFocus(messages);
  const blockers = surfaceBlockers(lastUserMessage.content);
  const nextStepIdeas = [...IDEA_STARTERS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  const bodySegments = [
    focus ? `${PROMPT_TEMPLATES.framing}\n• ${focus}` : null,
    `${PROMPT_TEMPLATES.blockers}\n${blockers
      .map((item) => `• ${item}`)
      .join("\n")}`,
    `${PROMPT_TEMPLATES.nextSteps}\n${nextStepIdeas
      .map((item) => `• ${item}`)
      .join("\n")}`,
    "When you’re ready, share how these land—or drop fresh details and we’ll iterate further.",
  ].filter(Boolean);

  return bodySegments.join("\n\n");
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    messages?: unknown;
  } | null;

  const messages = normalize(body?.messages);

  if (!messages || messages.length === 0) {
    return NextResponse.json(
      {
        reply:
          "Hi there! Describe what you’re working on or what you need help with, and I’ll jump in.",
      },
      { status: 200 },
    );
  }

  const reply = craftReply(messages);

  return NextResponse.json({ reply });
}
