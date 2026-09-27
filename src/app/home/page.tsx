import { auth } from "@/auth";
import prisma from "@/lib/prisma"; // apna path confirm kar lena
import ChatLayout from "@/components/ChatLayout";

export default async function Home() {
  const session = await auth();
  const currentUserId = session!.user!.id!;

  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });

  // current user ke saare messages, sabse naye pehle
  const allMessages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: currentUserId }, { receiverId: currentUserId }],
    },
    orderBy: { createdAt: "desc" },
  });

  // har doosre user ka sabse latest message nikaal lo
  const lastMessageMap = new Map<string, (typeof allMessages)[number]>();
  for (const msg of allMessages) {
    const otherUserId =
      msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
    if (!lastMessageMap.has(otherUserId)) {
      lastMessageMap.set(otherUserId, msg);
    }
  }

  // users list me lastMessage jod do
  const usersWithLastMessage = users.map((user) => {
  const lastMsg = lastMessageMap.get(user.id);
  return {
    ...user,
    lastMessage: lastMsg
      ? { ...lastMsg, createdAt: lastMsg.createdAt.toISOString() }
      : null,
  };
});

  return (
    <ChatLayout
      users={usersWithLastMessage}
      currentUserId={currentUserId}
      currentUserEmail={session!.user!.email ?? ""}
      currentUserName={session!.user!.name ?? null}
      currentUserImage={session!.user!.image}
    />
  );
}