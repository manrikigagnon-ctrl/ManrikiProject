"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ParsedCommitment {
  description: string;
  deadline: string;
  alreadySaved: boolean;
}

function resolveRelativeDate(whenStr: string): string {
  const parts = whenStr.trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return new Date().toISOString();

  const dayWord = parts[0];
  const timePart = parts[1];
  const [hours, minutes] = timePart.split(":").map(Number);

  const now = new Date();
  const target = new Date();
  target.setHours(hours || 0, minutes || 0, 0, 0);

  const dayMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  if (dayWord === "today") {
    // Already set to today
  } else if (dayWord === "tomorrow") {
    target.setDate(target.getDate() + 1);
  } else if (dayMap[dayWord] !== undefined) {
    const targetDay = dayMap[dayWord];
    const currentDay = now.getDay();
    let daysAhead = targetDay - currentDay;
    if (daysAhead <= 0) daysAhead += 7;
    target.setDate(target.getDate() + daysAhead);
  }

  return target.toISOString();
}

function parseCommitment(content: string): ParsedCommitment | null {
  // Check for already-saved commitments first
  const savedNewMatch = content.match(
    /\[SAVED_COMMITMENT:\s*(.+?)\s*\|\s*WHEN:\s*(.+?)\s*\]/
  );
  if (savedNewMatch) {
    return {
      description: savedNewMatch[1],
      deadline: resolveRelativeDate(savedNewMatch[2]),
      alreadySaved: true,
    };
  }

  const savedOldMatch = content.match(
    /\[SAVED_COMMITMENT:\s*(.+?)\s*\|\s*DEADLINE:\s*(.+?)\s*\]/
  );
  if (savedOldMatch) {
    return {
      description: savedOldMatch[1],
      deadline: new Date(savedOldMatch[2]).toISOString(),
      alreadySaved: true,
    };
  }

  // New format: [COMMITMENT: desc | WHEN: relative_day HH:MM]
  const newMatch = content.match(
    /\[COMMITMENT:\s*(.+?)\s*\|\s*WHEN:\s*(.+?)\s*\]/
  );
  if (newMatch) {
    return {
      description: newMatch[1],
      deadline: resolveRelativeDate(newMatch[2]),
      alreadySaved: false,
    };
  }

  // Old format: [COMMITMENT: desc | DEADLINE: YYYY-MM-DD HH:MM]
  const oldMatch = content.match(
    /\[COMMITMENT:\s*(.+?)\s*\|\s*DEADLINE:\s*(.+?)\s*\]/
  );
  if (oldMatch) {
    return {
      description: oldMatch[1],
      deadline: new Date(oldMatch[2]).toISOString(),
      alreadySaved: false,
    };
  }

  return null;
}

function stripCommitmentTag(content: string): string {
  return content
    .replace(/\[(?:SAVED_)?COMMITMENT:\s*.+?\|\s*(?:DEADLINE|WHEN):\s*.+?\]/, "")
    .trim();
}

function CommitmentCard({
  commitment,
  onSave,
  onDismiss,
  saved,
}: {
  commitment: ParsedCommitment;
  onSave: () => void;
  onDismiss: () => void;
  saved: boolean;
}) {
  const deadlineDate = new Date(commitment.deadline);
  const formatted = deadlineDate.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      style={{
        background: saved ? "var(--success-bg)" : "var(--bg-elevated)",
        border: `1px solid ${saved ? "var(--success)" : "var(--accent)"}`,
        borderRadius: "12px",
        padding: "14px 16px",
        marginTop: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "6px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontWeight: 600,
            color: saved ? "var(--success)" : "var(--accent)",
          }}
        >
          {saved ? "✓ Commitment locked in" : "New commitment"}
        </span>
      </div>
      <div
        style={{
          fontSize: "15px",
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: "4px",
        }}
      >
        {commitment.description}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-mono)",
          marginBottom: saved ? "0" : "12px",
        }}
      >
        {formatted}
      </div>
      {!saved && (
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-primary" onClick={onSave}>
            Lock it in
          </button>
          <button className="btn" onClick={onDismiss}>
            Not yet
          </button>
        </div>
      )}
    </div>
  );
}

export default function ChatView({ intensity = 3 }: { intensity?: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [savedCommitments, setSavedCommitments] = useState<Set<string>>(
    new Set()
  );
  const [dismissedCommitments, setDismissedCommitments] = useState<Set<string>>(
    new Set()
  );
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isLoadingRef = useRef(false);

  const loadMessages = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(50);

      if (fetchError) {
        console.error("Failed to load messages:", fetchError);
        return;
      }

      if (data) setMessages(data);
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  }, []);

  useEffect(() => {
    loadMessages().then(() => setIsInitialLoad(false));
  }, [loadMessages]);

  // Poll for new messages
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoadingRef.current) {
        loadMessages();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  // Listen for weekly report trigger from settings
  useEffect(() => {
    const handleWeeklyReport = () => {
      requestWeeklyReport();
    };
    window.addEventListener("manriki-weekly-report", handleWeeklyReport);
    return () => window.removeEventListener("manriki-weekly-report", handleWeeklyReport);
  }, [intensity]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      e.target.style.height = "auto";
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    },
    []
  );

  const saveCommitment = async (msgId: string, commitment: ParsedCommitment) => {
    try {
      await fetch("/api/commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: commitment.description,
          deadline: commitment.deadline,
        }),
      });
      setSavedCommitments((prev) => new Set(prev).add(msgId));

      // Mark as saved in Supabase so it persists across tab switches
      const msg = messages.find((m) => m.id === msgId);
      if (msg) {
        const updatedContent = msg.content
          .replace(/\[COMMITMENT:/, "[SAVED_COMMITMENT:")
          .replace(/\[COMMITMENT:/, "[SAVED_COMMITMENT:");
        await supabase
          .from("messages")
          .update({ content: updatedContent })
          .eq("id", msgId);
        // Update local state too
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, content: updatedContent } : m
          )
        );
      }
    } catch (err) {
      console.error("Failed to save commitment:", err);
    }
  };

  const dismissCommitment = (msgId: string) => {
    setDismissedCommitments((prev) => new Set(prev).add(msgId));
  };

  const requestWeeklyReport = async () => {
    if (isLoading) return;

    const reportMsg: Message = {
      id: "temp-report-user-" + Date.now(),
      role: "user",
      content: "Show me my weekly report",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, reportMsg]);
    setIsLoading(true);
    isLoadingRef.current = true;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Show me my weekly report",
          intensity,
          weeklyReport: true,
        }),
        keepalive: true,
      });

      const data = await res.json();

      if (data.message) {
        const assistantMsg: Message = {
          id: "temp-report-ai-" + Date.now(),
          role: "assistant",
          content: data.message,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      console.error("Failed to get weekly report:", err);
      await loadMessages();
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput("");
    setError(null);
    if (inputRef.current) inputRef.current.style.height = "auto";

    const tempUserMsg: Message = {
      id: "temp-user-" + Date.now(),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);
    isLoadingRef.current = true;

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, intensity }),
          signal: controller.signal,
          keepalive: true,
        });

        clearTimeout(timeout);

        const data = await res.json();

        if (data.message) {
          const assistantMsg: Message = {
            id: "temp-ai-" + Date.now(),
            role: "assistant",
            content: data.message,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setIsLoading(false);
          isLoadingRef.current = false;
          return;
        } else if (data.error) {
          throw new Error(data.error);
        }
      } catch (err) {
        console.error(`Attempt ${attempts} failed:`, err);

        if (attempts >= maxAttempts) {
          await new Promise((r) => setTimeout(r, 2000));
          await loadMessages();
          setError("Response may have been delayed. Messages synced from server.");
        } else {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }

    setIsLoading(false);
    isLoadingRef.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-header-icon">M</div>
        <div className="chat-header-info">
          <h1>Manriki</h1>
          <span>
            {isLoading
              ? "thinking..."
              : `intensity ${intensity}/5`}
          </span>
        </div>
      </div>

      <div className="chat-messages">
        {isInitialLoad ? null : messages.length === 0 ? (
          <div className="welcome-message">
            <div className="welcome-icon">M</div>
            <h2>Manriki</h2>
            <p>
              I&apos;m your accountability coach. Tell me what you want to be
              held accountable for, and I&apos;ll make sure you actually do it.
            </p>
            <p style={{ marginTop: 12, color: "var(--accent)", fontSize: 13 }}>
              No sugarcoating. No fake praise. Just honesty.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const commitment =
              msg.role === "assistant" ? parseCommitment(msg.content) : null;
            const isSaved = savedCommitments.has(msg.id) || (commitment?.alreadySaved ?? false);
            const isDismissed = dismissedCommitments.has(msg.id);
            const displayContent = commitment
              ? stripCommitmentTag(msg.content)
              : msg.content;

            return (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="message-bubble">
                  {displayContent.split("\n").map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < displayContent.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
                {commitment && !isDismissed && (
                  <CommitmentCard
                    commitment={commitment}
                    onSave={() => saveCommitment(msg.id, commitment)}
                    onDismiss={() => dismissCommitment(msg.id)}
                    saved={isSaved}
                  />
                )}
                <div className="message-time">{formatTime(msg.created_at)}</div>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="message assistant">
            <div className="typing-indicator">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: "var(--text-tertiary)",
              padding: "8px",
            }}
          >
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Tell me what you're committing to..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="chat-send-btn"
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M12 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
