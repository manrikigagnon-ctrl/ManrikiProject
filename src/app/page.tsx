"use client";

import { useState } from "react";
import ChatView from "@/components/ChatView";
import CommitmentsView from "@/components/CommitmentsView";

type Tab = "chat" | "commitments";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {activeTab === "chat" && <ChatView />}
        {activeTab === "commitments" && <CommitmentsView />}
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
      </nav>
    </div>
  );
}
