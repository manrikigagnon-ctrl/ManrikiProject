"use client";

import { useState, useEffect, useCallback } from "react";

interface Commitment {
  id: string;
  description: string;
  deadline: string;
  status: string;
  times_rescheduled: number;
  created_at: string;
  completed_at?: string;
  missed_reason?: string;
}

export default function CommitmentsView() {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [missReason, setMissReason] = useState("");
  const [showMissDialog, setShowMissDialog] = useState<string | null>(null);

  const loadCommitments = useCallback(async () => {
    const res = await fetch("/api/commitments");
    const data = await res.json();
    if (Array.isArray(data)) setCommitments(data);
  }, []);

  useEffect(() => {
    loadCommitments();
  }, [loadCommitments]);

  const createCommitment = async () => {
    if (!description.trim() || !deadline) return;

    await fetch("/api/commitments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: description.trim(),
        deadline: new Date(deadline).toISOString(),
      }),
    });

    setDescription("");
    setDeadline("");
    setShowForm(false);
    loadCommitments();
  };

  const updateCommitment = async (
    id: string,
    status: string,
    reason?: string
  ) => {
    await fetch("/api/commitments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, missed_reason: reason }),
    });
    setShowMissDialog(null);
    setMissReason("");
    loadCommitments();
  };

  const active = commitments.filter((c) => c.status === "active");
  const completed = commitments.filter((c) => c.status === "done");
  const missed = commitments.filter((c) => c.status === "missed");

  const isOverdue = (deadline: string) => new Date(deadline) < new Date();

  const formatDeadline = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHrs = Math.round(diffMs / (1000 * 60 * 60));

    if (diffHrs < 0) {
      const ago = Math.abs(diffHrs);
      if (ago < 24) return `${ago}h overdue`;
      return `${Math.round(ago / 24)}d overdue`;
    }
    if (diffHrs < 1) return `${Math.round(diffMs / (1000 * 60))}min`;
    if (diffHrs < 24) return `${diffHrs}h`;
    return `${Math.round(diffHrs / 24)}d`;
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Commitments</h1>
        <p>Track what you said you&apos;d do</p>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-number neutral">{active.length}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card">
            <div className="stat-number success">{completed.length}</div>
            <div className="stat-label">Done</div>
          </div>
          <div className="stat-card">
            <div className="stat-number danger">{missed.length}</div>
            <div className="stat-label">Missed</div>
          </div>
        </div>

        {/* New commitment */}
        {showForm ? (
          <div className="new-commitment-form">
            <label className="form-label">What are you committing to?</label>
            <input
              className="form-input"
              type="text"
              placeholder="Be specific: 'Gym at 6am' not 'exercise more'"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoFocus
            />
            <label className="form-label">Deadline</label>
            <input
              className="form-input"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" onClick={createCommitment}>
                Commit
              </button>
              <button className="btn" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            style={{ width: "100%", marginBottom: 20, padding: "12px 16px" }}
            onClick={() => setShowForm(true)}
          >
            + New commitment
          </button>
        )}

        {/* Active commitments */}
        {active.length > 0 && (
          <>
            <div className="section-title">Active</div>
            {active.map((c) => (
              <div
                key={c.id}
                className={`commitment-card ${
                  isOverdue(c.deadline) ? "overdue" : "upcoming"
                }`}
              >
                <div className="commitment-description">{c.description}</div>
                <div className="commitment-deadline">
                  {formatDate(c.deadline)} · {formatDeadline(c.deadline)}
                  {c.times_rescheduled > 0 && (
                    <span style={{ color: "var(--danger)", marginLeft: 8 }}>
                      rescheduled {c.times_rescheduled}x
                    </span>
                  )}
                </div>

                {showMissDialog === c.id ? (
                  <div>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Why? (be honest — the AI reads this)"
                      value={missReason}
                      onChange={(e) => setMissReason(e.target.value)}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn-missed"
                        onClick={() =>
                          updateCommitment(c.id, "missed", missReason)
                        }
                      >
                        Confirm miss
                      </button>
                      <button
                        className="btn"
                        onClick={() => {
                          setShowMissDialog(null);
                          setMissReason("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="commitment-actions">
                    <button
                      className="btn btn-done"
                      onClick={() => updateCommitment(c.id, "done")}
                    >
                      Done
                    </button>
                    <button
                      className="btn btn-missed"
                      onClick={() => setShowMissDialog(c.id)}
                    >
                      Missed
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <>
            <div className="section-title">Completed</div>
            {completed.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="commitment-card"
                style={{ opacity: 0.6 }}
              >
                <div className="commitment-description">
                  <span style={{ color: "var(--success)", marginRight: 6 }}>
                    ✓
                  </span>
                  {c.description}
                </div>
                <div className="commitment-deadline">
                  {formatDate(c.deadline)}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Missed */}
        {missed.length > 0 && (
          <>
            <div className="section-title">Missed</div>
            {missed.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="commitment-card"
                style={{ opacity: 0.6 }}
              >
                <div className="commitment-description">
                  <span style={{ color: "var(--danger)", marginRight: 6 }}>
                    ✗
                  </span>
                  {c.description}
                </div>
                <div className="commitment-deadline">
                  {formatDate(c.deadline)}
                  {c.missed_reason && (
                    <span style={{ marginLeft: 8, color: "var(--text-secondary)" }}>
                      — {c.missed_reason}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Empty state */}
        {commitments.length === 0 && !showForm && (
          <div className="empty-state">
            <div className="empty-state-icon">◎</div>
            <p>
              No commitments yet. What are you going to do today that you
              normally wouldn&apos;t?
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
