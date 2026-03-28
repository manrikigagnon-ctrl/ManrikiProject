"use client";

import { useState, useEffect } from "react";
import ChatView from "@/components/ChatView";
import CommitmentsView from "@/components/CommitmentsView";

type Tab = "chat" | "commitments" | "settings";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [intensity, setIntensity] = useState<number>(3);

  // Load saved intensity
  useEffect(() => {
    try {
      const saved = globalThis?.sessionStorage?.getItem("manriki-intensity");
      if (saved) setIntensity(parseInt(saved));
    } catch {}
  }, []);

  const handleIntensityChange = (val: number) => {
    setIntensity(val);
    try {
      globalThis?.sessionStorage?.setItem("manriki-intensity", val.toString());
    } catch {}
  };

  const intensityLabels: Record<number, { name: string; desc: string }> = {
    1: { name: "Gentle guide", desc: "Warm, supportive, validates feelings first" },
    2: { name: "Encouraging mentor", desc: "Positive but direct, gives benefit of the doubt" },
    3: { name: "Honest coach", desc: "Balanced — names patterns without harshness" },
    4: { name: "Tough love", desc: "Blunt, cuts through excuses quickly" },
    5: { name: "Drill sergeant", desc: "Brutally direct, zero sugarcoating" },
  };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {activeTab === "chat" && <ChatView intensity={intensity} />}
        {activeTab === "commitments" && <CommitmentsView />}
        {activeTab === "settings" && (
          <div className="page-container">
            <div className="page-header">
              <h1>Settings</h1>
              <p>Customize your coach</p>
            </div>
            <div className="page-content">
              {/* Intensity slider */}
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "20px",
                marginBottom: "16px",
              }}>
                <div className="form-label" style={{ marginBottom: "12px" }}>
                  Coaching intensity
                </div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}>
                  <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Gentle</span>
                  <span style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: intensity >= 4 ? "var(--accent)" : "var(--text-primary)",
                  }}>
                    {intensity}
                  </span>
                  <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Brutal</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={intensity}
                  onChange={(e) => handleIntensityChange(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    accentColor: "var(--accent)",
                    height: "6px",
                    cursor: "pointer",
                  }}
                />
                <div style={{
                  marginTop: "16px",
                  padding: "12px",
                  background: "var(--bg-tertiary)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                }}>
                  <div style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: "4px",
                  }}>
                    {intensityLabels[intensity].name}
                  </div>
                  <div style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                  }}>
                    {intensityLabels[intensity].desc}
                  </div>
                </div>
              </div>

              {/* Weekly report button */}
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "20px",
                marginBottom: "16px",
              }}>
                <div className="form-label" style={{ marginBottom: "8px" }}>
                  Weekly report
                </div>
                <p style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  marginBottom: "12px",
                  lineHeight: 1.5,
                }}>
                  Get a brutally honest summary of your week — hit rate, patterns,
                  and what to change.
                </p>
                <button
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  onClick={() => {
                    setActiveTab("chat");
                    // Small delay to let tab switch, then trigger report
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent("manriki-weekly-report"));
                    }, 100);
                  }}
                >
                  Generate weekly report
                </button>
              </div>

              {/* Clear chat history */}
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "20px",
              }}>
                <div className="form-label" style={{ marginBottom: "8px" }}>
                  Danger zone
                </div>
                <p style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  marginBottom: "12px",
                  lineHeight: 1.5,
                }}>
                  Clear chat history to start fresh. Commitments are preserved.
                </p>
                <button
                  className="btn btn-missed"
                  style={{ width: "100%" }}
                  onClick={async () => {
                    if (confirm("Clear all chat history? Commitments will be kept.")) {
                      const { createClient } = await import("@supabase/supabase-js");
                      const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                      );
                      await supabase.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                      alert("Chat history cleared.");
                    }
                  }}
                >
                  Clear chat history
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <nav className="nav-bar">
        <button
          className={`nav-tab ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Coach
        </button>

        <button
          className={`nav-tab ${activeTab === "commitments" ? "active" : ""}`}
          onClick={() => setActiveTab("commitments")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Commitments
        </button>

        <button
          className={`nav-tab ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Settings
        </button>
      </nav>
    </div>
  );
}
