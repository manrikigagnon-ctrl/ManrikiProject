import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import {
  getSystemPrompt,
  buildContextMessage,
  generateWeeklyReportPrompt,
  CoachingIntensity,
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
    const body = await req.json();
    const { message, intensity = 3, weeklyReport = false } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Fetch commitments and check-ins for context
    const [commitmentsRes, checkInsRes] = await Promise.all([
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

    // If weekly report requested, use the report prompt
    if (weeklyReport) {
      const reportPrompt = generateWeeklyReportPrompt(commitments, checkIns);

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        system: getSystemPrompt(intensity as CoachingIntensity),
        messages: [{ role: "user", content: reportPrompt }],
      });

      const reportContent =
        response.content[0].type === "text" ? response.content[0].text : "";

      // Save as messages
      await supabase.from("messages").insert({ role: "user", content: "Show me my weekly report" });
      await supabase.from("messages").insert({ role: "assistant", content: reportContent });

      return NextResponse.json({ message: reportContent });
    }

    // Normal chat flow
    // Save user message
    await supabase.from("messages").insert({ role: "user", content: message });

    // Fetch recent messages
    const messagesRes = await supabase
      .from("messages")
      .select("role, content")
      .order("created_at", { ascending: false })
      .limit(20);

    const recentMessages = (messagesRes.data || []).reverse();

    const contextMessage = buildContextMessage(commitments, checkIns);

    // Build messages for Claude
    const conversationHistory = recentMessages.slice(0, -1);

    let finalMessages: { role: "user" | "assistant"; content: string }[] = [];

    if (conversationHistory.length > 0) {
      const trimmedHistory = conversationHistory.slice(-16);

      let startIdx = 0;
      for (let i = 0; i < trimmedHistory.length; i++) {
        if (trimmedHistory[i].role === "user") {
          startIdx = i;
          break;
        }
      }

      const validHistory = trimmedHistory.slice(startIdx);

      if (validHistory.length > 0 && validHistory[0].role === "user") {
        finalMessages.push({
          role: "user",
          content: `[CONTEXT]\n${contextMessage}\n[/CONTEXT]\n\n${validHistory[0].content}`,
        });

        for (let i = 1; i < validHistory.length; i++) {
          const msg = validHistory[i];
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

        const lastMsg = finalMessages[finalMessages.length - 1];
        if (lastMsg.role === "user") {
          lastMsg.content += "\n" + message;
        } else {
          finalMessages.push({ role: "user", content: message });
        }
      } else {
        finalMessages = [
          {
            role: "user",
            content: `[CONTEXT]\n${contextMessage}\n[/CONTEXT]\n\n${message}`,
          },
        ];
      }
    } else {
      finalMessages = [
        {
          role: "user",
          content: `[CONTEXT]\n${contextMessage}\n[/CONTEXT]\n\n${message}`,
        },
      ];
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: getSystemPrompt(intensity as CoachingIntensity),
      messages: finalMessages,
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

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