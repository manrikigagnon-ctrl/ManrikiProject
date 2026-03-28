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
}

function parseCommitment(content: string): ParsedCommitment | null {
  const match = content.match(
    /\[COMMITMENT:\s*(.+?)\s*\|\s*DEADLINE:\s*(.+?)\s*\]/
  );
  if (!match) return null;
  return { description: match[1], deadline: match[2] };
}

function stripCommitmentTag(content: string): string {
  return content.replace(/\[COMMITMENT:\s*.+?\|\s*DEADLINE:\s*.+?\]/, "").trim();
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

export default function ChatView() {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function loadMessages() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(50);

      if (data) setMessages(data);
      setIsInitialLoad(false);
    }
    loadMessages();
  }, []);

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
          deadline: new Date(commitment.deadline).toISOString(),
        }),
      });
      setSavedCommitments((prev) => new Set(prev).add(msgId));
    } catch (err) {
      console.error("Failed to save commitment:", err);
    }
  };

  const dismissCommitment = (msgId: string) => {
    setDismissedCommitments((prev) => new Set(prev).add(msgId));
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    const tempUserMsg: Message = {
      id: "temp-user-" + Date.now(),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();

      if (data.message) {
        const assistantMsg: Message = {
          id: "temp-ai-" + Date.now(),
          role: "assistant",
          content: data.message,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      const errorMsg: Message = {
        id: "error-" + Date.now(),
        role: "assistant",
        content: "Connection issue. Check your API keys and try again.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
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
          <span>{isLoading ? "thinking..." : "accountability coach"}</span>
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
            const isSaved = savedCommitments.has(msg.id);
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
