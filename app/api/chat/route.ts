import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RagEngine } from "@/modules/ai/rag";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const chat = await db.chatHistory.findUnique({
        where: { id: sessionId },
      });
      if (!chat) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      return NextResponse.json(chat);
    }

    const sessions = await db.chatHistory.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sessionName: true,
        createdAt: true,
      },
    });
    return NextResponse.json(sessions);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg || "Failed to fetch chats" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question, sessionId } = body;

    if (!question) {
      return NextResponse.json({ error: "Question parameter is required" }, { status: 400 });
    }

    const user = await db.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "No user seeded in database" }, { status: 400 });
    }

    const rag = new RagEngine();
    const result = await rag.query(question);

    let chatSession;
    const messages = [];

    if (sessionId) {
      chatSession = await db.chatHistory.findUnique({
        where: { id: sessionId },
      });
      if (chatSession) {
        const existing = JSON.parse(chatSession.messages);
        messages.push(...existing);
      }
    }

    // Append user question
    messages.push({ role: "user", content: question, createdAt: new Date() });

    // Append assistant answer
    messages.push({
      role: "assistant",
      content: result.answer,
      confidence: result.confidence,
      sources: result.sources,
      createdAt: new Date(),
    });

    if (chatSession) {
      chatSession = await db.chatHistory.update({
        where: { id: chatSession.id },
        data: {
          messages: JSON.stringify(messages),
        },
      });
    } else {
      const name = question.length > 35 ? question.substring(0, 35) + "..." : question;
      chatSession = await db.chatHistory.create({
        data: {
          userId: user.id,
          sessionName: name,
          messages: JSON.stringify(messages),
        },
      });
    }

    return NextResponse.json({
      sessionId: chatSession.id,
      sessionName: chatSession.sessionName,
      messages,
      latestResponse: {
        answer: result.answer,
        confidence: result.confidence,
        sources: result.sources,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg || "Failed to query RAG" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    await db.chatHistory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg || "Failed to delete session" }, { status: 500 });
  }
}
