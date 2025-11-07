"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type MessageRole = "user" | "assistant" | "system";

type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
};

const PLACEHOLDER_SUGGESTIONS = [
  "Give me three ideas for a weekend side project.",
  "Help me turn this product idea into a pitch.",
  "Summarize the highlights of remote-first collaboration.",
];

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const starterMessage: Message = {
  id: createId(),
  role: "assistant",
  content:
    "Hey there! I’m your collaborative thinking partner. Share a topic, a challenge, or even a half-baked idea and I’ll help you shape it.",
  createdAt: Date.now(),
};

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex w-full gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm sm:text-base ${
          isUser
            ? "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/20"
            : "bg-white/80 ring-1 ring-zinc-200/80 backdrop-blur"
        }`}
      >
        <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([starterMessage]);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = useMemo(
    () =>
      [...PLACEHOLDER_SUGGESTIONS]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(3, PLACEHOLDER_SUGGESTIONS.length)),
    [],
  );

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || pending) return;

    const userMessage: Message = {
      id: createId(),
      role: "user",
      content: input.trim(),
      createdAt: Date.now(),
    };

    const optimisticMessages = [...messages, userMessage];
    setMessages(optimisticMessages);
    setInput("");
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: optimisticMessages.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Unexpected response status");
      }

      const data = (await response.json()) as { reply: string };

      const assistantMessage: Message = {
        id: createId(),
        role: "assistant",
        content: data.reply,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      setError(
        "I hit a bump while thinking that through. Give it another try?",
      );
    } finally {
      setPending(false);
      textareaRef.current?.focus();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex min-h-screen bg-slate-950/95 text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.25)_0,_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(236,72,153,0.18)_0,_transparent_60%)]" />
      </div>
      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-6 pt-10 sm:px-10 sm:pt-16">
        <header className="mb-8 flex flex-col gap-3 text-center sm:text-left">
          <span className="mx-auto inline-flex items-center rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-[0.24em] text-white/70 sm:mx-0">
            Conversational Studio
          </span>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl md:text-5xl">
            Chatbot that helps you ideate, refine, and move forward.
          </h1>
          <p className="text-sm text-white/70 sm:max-w-2xl sm:text-base">
            Ask me questions, explore possibilities, and I&apos;ll respond with
            thoughtful, actionable insights tailored to the conversation.
          </p>
        </header>

        <section
          ref={listRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-3xl border border-white/5 bg-white/5 p-4 shadow-[0_30px_120px_-60px_rgba(37,99,235,0.65)] backdrop-blur-lg sm:p-8"
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {pending && (
            <div className="flex items-center gap-3 text-sm text-white/80">
              <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-indigo-300" />
              Thinking…
            </div>
          )}
        </section>

        <div className="mt-6 flex flex-col gap-4">
          {error && (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 transition hover:border-white/30 hover:bg-white/10"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:flex-row sm:items-end sm:p-6"
          >
            <textarea
              ref={textareaRef}
              required
              rows={2}
              maxLength={1000}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Share your idea or ask for guidance..."
              className="w-full resize-none rounded-2xl border border-white/0 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 sm:text-base"
            />
            <button
              type="submit"
              disabled={pending}
              className="flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:from-indigo-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
