import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

// GET /api/messages?userId=xyz  -> purana chat history
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const otherUserId = req.nextUrl.searchParams.get("userId");
  if (!otherUserId) {
    return NextResponse.json({ error: "userId chahiye" }, { status: 400 });
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: session.user.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: session.user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

// POST /api/messages -> naya message bhejna
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { receiverId, text } = await req.json();
  if (!receiverId || !text?.trim()) {
    return NextResponse.json({ error: "receiverId aur text zaroori hai" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      text,
      senderId: session.user.id,
      receiverId,
    },
  });

  // dono users ke liye ek hi fixed channel naam (IDs sort karke)
  const channelName = `chat-${[session.user.id, receiverId].sort().join("-")}`;
  await pusherServer.trigger(channelName, "new-message", message);

  return NextResponse.json(message);
}

// PATCH /api/messages -> jab chat open ho, unseen messages ko seen mark karo
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { senderId } = await req.json(); // jisne mujhe messages bheje the
  if (!senderId) {
    return NextResponse.json({ error: "senderId chahiye" }, { status: 400 });
  }

  // saare unseen messages jo USNE mujhe bheje the, ab seen mark karo
  await prisma.message.updateMany({
    where: {
      senderId: senderId,
      receiverId: session.user.id,
      seen: false,
    },
    data: { seen: true },
  });

  // sender ko real-time batao ki uske messages seen ho gaye
  const channelName = `chat-${[session.user.id, senderId].sort().join("-")}`;
  await pusherServer.trigger(channelName, "messages-seen", {
    seenBy: session.user.id,
  });

  return NextResponse.json({ success: true });
}