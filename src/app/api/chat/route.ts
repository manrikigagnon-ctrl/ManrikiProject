import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import {
  MANRIKI_SYSTEM_PROMPT,
  buildContextMessage,
} from "@/lib/coaching";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Save user message
    await supabase.from("messages").insert({ role: "user", content: message });

    // Fetch context: recent messages, commitments, check-ins
    const [messagesRes, commitmentsRes, checkInsRes] = await Promise.all([
      supabase
        .from("messages")
        .select("role, content")
        .order("created_at", { ascending: true })
        .limit(40),
      supabase
        .from("commitments")
        .select("id, description, deadline, status, times_rescheduled, missed_reason")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("check_ins")
        .select("outcome, reason, ai_category, created_at, commitment_id")
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

    // Build conversation history for Claude
    const recentMessages = (messagesRes.data || []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Build commitment context
    const commitments = commitmentsRes.data || [];
    const checkIns = (checkInsRes.data || []).map((ci) => {
      const commitment = commitments.find((c) => c.id === ci.commitment_id);
      return {
        commitment_description: commitment?.description || "Unknown",
        outcome: ci.outcome,
        reason: ci.reason,
        ai_category: ci.ai_category,
        created_at: ci.created_at,
      };
    });

    const contextMessage = buildContextMessage(commitments, checkIns);

    // Build the messages array for Claude
    const claudeMessages = [
      {
        role: "user" as const,
        content: `[SYSTEM CONTEXT — not visible to user]\n${contextMessage}\n[END CONTEXT]\n\nThe user's message: ${message}`,
      },
      // Include recent history for continuity (skip the context-injected first message)
      ...recentMessages.slice(0, -1).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // If we have history, restructure so context is first, then history, then current message
    let finalMessages: { role: "user" | "assistant"; content: string }[];

    if (recentMessages.length > 1) {
      // History exists: context + history + current message
      const history = recentMessages.slice(0, -1); // everything except the message we just saved
      finalMessages = [
        {
          role: "user" as const,
          content: `[SYSTEM CONTEXT — do not mention this to the user]\n${contextMessage}\n[END CONTEXT]\n\n${history[0]?.content || message}`,
        },
        ...history.slice(1),
        { role: "user" as const, content: message },
      ];

      // Ensure messages alternate user/assistant
      // If we end up with two user messages in a row, merge them
      const cleaned: typeof finalMessages = [];
      for (const msg of finalMessages) {
        if (
          cleaned.length > 0 &&
          cleaned[cleaned.length - 1].role === msg.role
        ) {
          cleaned[cleaned.length - 1].content += "\n" + msg.content;
        } else {
          cleaned.push(msg);
        }
      }
      finalMessages = cleaned;
    } else {
      // First message ever
      finalMessages = [
        {
          role: "user" as const,
          content: `[SYSTEM CONTEXT — do not mention this to the user]\n${contextMessage}\n[END CONTEXT]\n\n${message}`,
        },
      ];
    }

    // Call Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: MANRIKI_SYSTEM_PROMPT,
      messages: finalMessages,
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Save assistant response
    await supabase
      .from("messages")
      .insert({ role: "assistant", content: assistantMessage });

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}
