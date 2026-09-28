"use client";

import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { MessageSquareText } from "lucide-react";
import { pusherClient } from "@/lib/pusher-client";

type Message = {
  id: string;
  clientKey?: string; // NAYA — temp aur real message ke liye same key
  text: string;
  senderId: string;
  receiverId: string;
  seen: boolean;
  createdAt: string;
};

type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  lastMessage: Message | null; // NAYA
};

// chota helper — timestamp ko "1h", "4h", "1d" jaisa dikhata hai
function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

export default function ChatLayout({
  users,
  currentUserId,
  currentUserEmail,
  currentUserName,
  currentUserImage,
}: {
  users: User[];
  currentUserId: string;
  currentUserEmail: string;
  currentUserName: string | null;
  currentUserImage: string | null | undefined;
}) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  // jab bhi selectedUser badle, uske messages fetch karo
  useEffect(() => {
    if (!selectedUser) return;

    const fetchMessages = async () => {
      const res = await fetch(`/api/messages?userId=${selectedUser.id}`);
      const data = await res.json();
      setMessages(data);
    };

    fetchMessages();
  }, [selectedUser]);

  // selectedUser badalte hi uske messages ko seen mark karo
  useEffect(() => {
    if (!selectedUser) return;

    const markAsSeen = async () => {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: selectedUser.id }),
      });
    };

    markAsSeen();
  }, [selectedUser]);

  // real-time listener
  useEffect(() => {
    if (!selectedUser) return;

    const channelName = `chat-${[currentUserId, selectedUser.id].sort().join("-")}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("new-message", (data: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });

      // NAYA — agar yeh message usi user ne bheja jiski chat abhi khuli hai, turant seen mark karo
      if (data.senderId === selectedUser.id) {
        fetch("/api/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senderId: selectedUser.id }),
        });
      }
    });

    return () => {
      pusherClient.unsubscribe(channelName);
    };
  }, [selectedUser, currentUserId]);

  // naya message aane pe neeche scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !selectedUser) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      clientKey: tempId, // NAYA
      text,
      senderId: currentUserId,
      receiverId: selectedUser.id,
      seen: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setInput("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: selectedUser.id, text }),
      });

      if (!res.ok) throw new Error("Send failed");

      const savedMessage: Message = await res.json();

      // real message ko wahi clientKey do, taaki React same element rakhe
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...savedMessage, clientKey: tempId } : m,
        ),
      );
    } catch (error) {
      console.error(error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(text);
    }
  };
  
  return (
    <div className="h-screen w-full flex bg-[#0a0a0a]">
      {/* ============ LEFT SIDEBAR ============ */}
      <aside className="w-full max-w-xs h-full border-r border-[#1f1f1f] flex bg-[#0d0d0d]">
        {/* --- Top: App title + sign out --- */}
        <div className="border border-[#1f1f1f] w-15">
          <div className="flex flex-col h-full justify-between items-center p-4">
            <button
              onClick={() => setActive(!active)}
              className={`relative flex h-12 w-12 items-center justify-center rounded-full ${
                active ? "bg-zinc-700" : "bg-transparent"
              }`}
            >
              <MessageSquareText
                className={`h-6 w-6 ${
                  active ? "fill-white text-white" : "text-zinc-400"
                }`}
              />

              <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-sm text-black">
                3
              </span>
            </button>

            <div className="p-2 hover:bg-[#39393962] rounded-full transition-colors delay-20">
              <span className="relative shrink-0 group">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-700 text-white text-xs font-semibold">
                  {currentUserImage ? (
                    <Image
                      src={currentUserImage}
                      alt={currentUserName ?? "U"}
                      width={44}
                      height={44}
                      className="h-8 rounded-full shrink-0 object-cover"
                    />
                  ) : (
                    currentUserName?.[0]?.toUpperCase()
                  )}
                </span>
                <span className="group absolute top-1.5 left-13 bg-white/50 text-[12px] text-black/80 opacity-0 group-hover:opacity-100 rounded-lg px-1 transition-all delay-400">
                  {currentUserEmail}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <header className="px-5 pt-5 border-b pb-1 border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-xl font-semibold tracking-tight">
                Chats
              </h2>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="cursor-pointer text-xs font-medium text-neutral-500 hover:text-neutral-200 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </header>

          {/* --- Users list --- */}
          <nav className="flex-1 overflow-y-auto px-2 pb-3 pt-3">
            {users.length === 0 ? (
              <p className="text-neutral-600 text-sm text-center mt-8 px-4">
                No other users have signed up yet
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {users.map((user) => {
                  const isSelected = selectedUser?.id === user.id;

                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        isSelected ? "bg-blue-300/8" : "hover:bg-[#151515]"
                      }`}
                    >
                      {/* Avatar */}
                      {user.image ? (
                        <Image
                          src={user.image}
                          alt={user.name ?? "User"}
                          width={44}
                          height={44}
                          className="w-11 h-11 rounded-full shrink-0 object-cover"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                          {user.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}

                      {/* Naam + last message + time */}
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${isSelected ? "text-blue-300" : "text-white"}`}
                          >
                            {user.name ?? "Unnamed User"}
                          </p>
                          <p className="truncate text-xs flex justify-start items-center gap-1">
                            {user.lastMessage ? (
                              <>
                                <span className="text-neutral-400 text-[12px]">
                                  {user.lastMessage.senderId ===
                                    currentUserId && "You: "}
                                  {user.lastMessage.text} ·{" "}
                                </span>
                                <span className="text-neutral-400 text-[10px]">
                                  {formatTime(user.lastMessage.createdAt)}
                                </span>
                              </>
                            ) : (
                              "Tap to chat"
                            )}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </nav>
        </div>
      </aside>

      {/* RIGHT - Chat window */}
      <div className="flex-1 flex flex-col">
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-neutral-600 text-sm text-center mt-10">
              No messages yet. Say hi to start the conversation!
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#262626]">
              {selectedUser.image ? (
                <Image
                  src={selectedUser.image}
                  alt={selectedUser.name ?? "User"}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#262626] text-neutral-100 flex items-center justify-center text-sm font-semibold">
                  {selectedUser.name?.[0] ?? "?"}
                </div>
              )}
              <div className="text-neutral-100 text-sm font-medium">
                {selectedUser.name ?? "Unnamed User"}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col min-h-0">
              {messages.length === 0 && (
                <p className="text-neutral-600 text-sm text-center mt-10">
                  No messages yet. Say hi to start the conversation!
                </p>
              )}

              <div className="mt-auto flex flex-col gap-1">
                {/* NAYA — pehle nikaal lo, mera SABSE AAKHRI bheja message kaunsa hai */}
                {(() => {
                  const lastMyMessageId = [...messages]
                    .filter((m) => m.senderId === currentUserId)
                    .at(-1)?.id;

                  return messages
                    .filter(
                      (msg, index, arr) =>
                        arr.findIndex((m) => m.id === msg.id) === index,
                    )
                    .map((msg) => {
                      const isMe = msg.senderId === currentUserId;
                      const avatarSrc = isMe
                        ? currentUserImage
                        : selectedUser.image;
                      const avatarFallback = isMe
                        ? (currentUserName?.[0]?.toUpperCase() ?? "U")
                        : (selectedUser.name?.[0]?.toUpperCase() ?? "?");

                      return (
                        // NAYA — outer wrapper, bubble + status text dono ke liye
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                          >
                            {avatarSrc ? (
                              <Image
                                src={avatarSrc}
                                alt="avatar"
                                width={28}
                                height={28}
                                className="w-7 h-7 rounded-full shrink-0 object-cover"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-neutral-700 text-white flex items-center justify-center text-[10px] font-semibold shrink-0">
                                {avatarFallback}
                              </div>
                            )}

                            <div
                              className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${
                                isMe
                                  ? "bg-neutral-100 text-black"
                                  : "bg-[#262626] text-neutral-100"
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>

                          {/* NAYA — sirf mera aakhri message hi yeh dikhayega */}
                          {isMe && msg.id === lastMyMessageId && (
                            <span className="text-neutral-500 text-[10px] mt-1 mr-1">
                              {msg.seen ? "Seen" : "Sent"}
                            </span>
                          )}
                        </div>
                      );
                    });
                })()}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Input */}
            <div className="px-5 py-4 border-t border-[#262626] flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Message..."
                className="flex-1 bg-[#151515] border border-[#262626] rounded-full px-4 py-2 text-sm text-neutral-100 outline-none"
              />
              <button
                onClick={sendMessage}
                className="cursor-pointer bg-neutral-100 text-black px-4 py-2 rounded-full text-sm font-medium"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
