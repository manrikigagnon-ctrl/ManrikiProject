import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET: fetch all commitments
export async function GET() {
  const { data, error } = await supabase
    .from("commitments")
    .select("*")
    .order("deadline", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: create a new commitment
export async function POST(req: NextRequest) {
  const { description, deadline } = await req.json();

  if (!description || !deadline) {
    return NextResponse.json(
      { error: "Description and deadline are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("commitments")
    .insert({ description, deadline, status: "active" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PATCH: update a commitment (mark done, missed, or reschedule)
export async function PATCH(req: NextRequest) {
  const { id, status, missed_reason, new_deadline } = await req.json();

  if (!id || !status) {
    return NextResponse.json(
      { error: "ID and status are required" },
      { status: 400 }
    );
  }

  // If rescheduling, increment the counter and update deadline
  if (status === "rescheduled" || (status === "active" && new_deadline)) {
    // Get current commitment
    const { data: current } = await supabase
      .from("commitments")
      .select("times_rescheduled")
      .eq("id", id)
      .single();

    const updates: Record<string, unknown> = {
      status: "active",
      times_rescheduled: (current?.times_rescheduled || 0) + 1,
    };
    if (new_deadline) updates.deadline = new_deadline;

    // Log the reschedule as a check-in
    await supabase.from("check_ins").insert({
      commitment_id: id,
      outcome: "rescheduled",
      reason: missed_reason || null,
    });

    const { data, error } = await supabase
      .from("commitments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Mark as done or missed
  const updates: Record<string, unknown> = { status };
  if (status === "done") updates.completed_at = new Date().toISOString();
  if (status === "missed" && missed_reason) updates.missed_reason = missed_reason;

  // Log check-in
  await supabase.from("check_ins").insert({
    commitment_id: id,
    outcome: status,
    reason: missed_reason || null,
  });

  const { data, error } = await supabase
    .from("commitments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
