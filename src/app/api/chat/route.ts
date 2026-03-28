import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import {
  getSystemPrompt,
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

    // Fetch context: recent messages (limited to last 20 to prevent loops),
    // commitments, and check-ins
    const [messagesRes, commitmentsRes, checkInsRes] = await Promise.all([
      supabase
        .from("messages")
        .select("role, content")
        .order("created_at", { ascending: false })
        .limit(20),
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

    // Reverse so they're in chronological order, and skip the message we just saved
    const recentMessages = (messagesRes.data || []).reverse();

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

    // Build messages for Claude — keep it clean and simple
    // First message includes context, then conversation history follows
    const conversationHistory = recentMessages.slice(0, -1); // exclude the message we just saved

    let finalMessages: { role: "user" | "assistant"; content: string }[] = [];

    if (conversationHistory.length > 0) {
      // Take only the last 16 messages to keep context focused
      const trimmedHistory = conversationHistory.slice(-16);

      // Ensure the first message is from the user (required by Claude API)
      let startIdx = 0;
      for (let i = 0; i < trimmedHistory.length; i++) {
        if (trimmedHistory[i].role === "user") {
          startIdx = i;
          break;
        }
      }

      const validHistory = trimmedHistory.slice(startIdx);

      // Build final messages: context injected into first user message
      if (validHistory.length > 0 && validHistory[0].role === "user") {
        finalMessages.push({
          role: "user",
          content: `[CONTEXT]\n${contextMessage}\n[/CONTEXT]\n\n${validHistory[0].content}`,
        });

        // Add remaining history
        for (let i = 1; i < validHistory.length; i++) {
          const msg = validHistory[i];
          // Ensure alternating roles — merge if same role appears twice
          if (
            finalMessages.length > 0 &&
            finalMessages[finalMessages.length - 1].role === msg.role
          ) {
            finalMessages[finalMessages.length - 1].content += "\n" + msg.content;
          } else {
            finalMessages.push({
              role: msg.role as "user" | "assistant",
              content: msg.content,
            });
          }
        }

        // Add current message
        const lastMsg = finalMessages[finalMessages.length - 1];
        if (lastMsg.role === "user") {
          lastMsg.content += "\n" + message;
        } else {
          finalMessages.push({ role: "user", content: message });
        }
      } else {
        // Fallback: just send context + current message
        finalMessages = [
          {
            role: "user",
            content: `[CONTEXT]\n${contextMessage}\n[/CONTEXT]\n\n${message}`,
          },
        ];
      }
    } else {
      // First message ever
      finalMessages = [
        {
          role: "user",
          content: `[CONTEXT]\n${contextMessage}\n[/CONTEXT]\n\n${message}`,
        },
      ];
    }

    // Call Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300, // Reduced from 500 to enforce brevity
      system: getSystemPrompt(),
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