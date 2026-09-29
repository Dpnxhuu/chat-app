"use client";

import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import axios from "axios";
import Image from "next/image";
import {
  MessageSquareText,
  ArrowLeft,
  Camera,
  BadgeCheck,
  Lock,
} from "lucide-react";
import { pusherClient } from "@/lib/pusher-client";
import { useRouter } from "next/navigation";

type Message = {
  id: string;
  clientKey?: string; // temp aur real message ke liye same key
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
  lastMessage: Message | null;
};

// timestamp ko "1h", "4h", "1d" jaisa dikhata hai
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

  // avatar upload
  const [preview, setPreview] = useState<string | null>(null);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const avatarSrc = preview ?? currentUserImage;

  // rail (tablet/desktop) card
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // mobile header card
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useRef<HTMLDivElement>(null);

  // naya image prop aate hi local preview hata do
  useEffect(() => {
    setPreview(null);
  }, [currentUserImage]);

  // bahar click/tap karne pe dono cards band (pointerdown = mouse + touch)
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!dropdownRef.current?.contains(t)) {
        setPinned(false);
        setOpen(false);
      }
      if (!mobileRef.current?.contains(t)) setMobileOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

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
      // apna bheja hua message sendMessage already handle kar raha hai
      if (data.senderId === currentUserId) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });

      // chat khuli hai to turant seen mark karo
      if (data.senderId === selectedUser.id) {
        fetch("/api/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senderId: selectedUser.id }),
        });
      }
    });

    // doosre user ne mere messages dekh liye
    channel.bind("messages-seen", (data: { seenBy: string }) => {
      if (data.seenBy === selectedUser.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === currentUserId ? { ...m, seen: true } : m,
          ),
        );
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
      clientKey: tempId,
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

  const handleMouseEnter = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), 50);
  };

  const handleMouseLeave = () => {
    if (pinned) return; // click karke pin kiya hai toh hover hatne pe band mat karo
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 250);
  };

  const handleClick = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    const next = !pinned;
    setPinned(next);
    setOpen(next);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    e.target.value = ""; // taaki same file dobara select ho sake
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      alert("Sirf image allowed hai");
      return;
    }
    if (selectedFile.size > 2 * 1024 * 1024) {
      alert("Image 2MB se chhoti honi chahiye");
      return;
    }

    const localUrl = URL.createObjectURL(selectedFile);
    setPreview(localUrl);
    await handleUpload(selectedFile, localUrl);
  };

  const handleUpload = async (file: File, localUrl: string) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      await axios.post("/api/upload", formData);
      router.refresh(); // server se naya image prop aa jayega
    } catch (error) {
      setPreview(null); // fail hua toh purani image dikhao
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : "Unknown error!";
      console.error("Error:", message);
      alert(message);
    } finally {
      setUploading(false);
      // preview ko useEffect hatayega jab naya currentUserImage aayega,
      // isliye yahan revoke karne se image toot sakti hai. Chhota leak chalega.
      // URL.revokeObjectURL(localUrl);
    }
  };

  // Profile card: rail aur mobile dono jagah yahi use hoga
  const profileCard = (
    <div className="w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-[#111111] p-5 text-white shadow-2xl shadow-black/60 flex flex-col gap-2 items-center">
      <div className="relative h-20 w-20 rounded-full group/avatar">
        {avatarSrc ? (
          <Image
            src={avatarSrc}
            alt={currentUserName ?? "U"}
            width={80}
            height={80}
            className="h-20 w-20 rounded-full border border-white/15 object-cover ring-2 ring-white/5"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-neutral-700 text-white flex items-center justify-center text-2xl font-semibold border border-white/15 ring-2 ring-white/5">
            {currentUserName?.[0]?.toUpperCase() ?? "U"}
          </div>
        )}

        {/* poore avatar pe tap/click = file picker */}
        <label
          onClick={() => setPinned(true)}
          className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity md:group-hover/avatar:opacity-100"
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Camera size={20} className={uploading ? "animate-pulse" : ""} />
        </label>

        {/* touch screen pe hover nahi hota, isliye chhota camera badge hamesha dikhega */}
        <span className="pointer-events-none absolute top-6 translate-x-[90%] opacity-60 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-neutral-800 text-white md:hidden">
          <Camera size={14} />
        </span>
      </div>

      <p className="text-[11px] text-white/40">
        {uploading ? (
          "Uploading..."
        ) : (
          <>
            <span className="md:hidden">Tap</span>
            <span className="hidden md:inline">Click</span> photo to change
          </>
        )}
      </p>

      <div className="flex w-full flex-col gap-2.5">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wide text-white/40">
              Name
            </span>
            <Lock size={11} className="text-white/30" />
          </div>
          <p className="mt-0.5 truncate text-sm font-semibold text-white">
            {currentUserName}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wide text-white/40">
              Email
            </span>
            <Lock size={11} className="text-white/30" />
          </div>
          <p className="mt-0.5 truncate text-sm text-white/80">
            {currentUserEmail}
          </p>
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-green-500/25 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
            <BadgeCheck size={12} />
            Verified
          </span>
        </div>
      </div>
    </div>
  );

  return (
    // h-dvh: mobile browser ke address bar ke saath bhi sahi height
    <div className="h-dvh w-full flex bg-[#0a0a0a] overflow-hidden">
      {/* ============ LEFT SIDEBAR ============ */}
      {/* mobile: chat select hote hi hide | desktop: hamesha dikhega */}
      <aside
        className={`${
          selectedUser ? "hidden md:flex" : "flex"
        } w-full md:max-w-xs h-full border-r border-[#1f1f1f] bg-[#0d0d0d]`}
      >
        {/* --- Icon rail (sirf tablet/desktop pe) --- */}
        <div className="hidden md:block border border-[#1f1f1f] w-15">
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
                0
              </span>
            </button>

            <div
              ref={dropdownRef}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="p-2 group hover:bg-[#39393962] rounded-full cursor-pointer relative transition-colors delay-10"
            >
              <div
                onClick={handleClick}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-700 text-white text-xs font-semibold"
              >
                {avatarSrc ? (
                  <Image
                    src={avatarSrc}
                    alt={currentUserName ?? "U"}
                    width={44}
                    height={44}
                    className="h-8 w-8 rounded-full shrink-0 object-cover"
                  />
                ) : (
                  currentUserName?.[0]?.toUpperCase()
                )}
              </div>

              {/* Profile */}
              {open && (
                <div className="cursor-default absolute left-full bottom-0 z-50 pl-4">
                  {profileCard}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <header className="px-4 md:px-5 pt-5 border-b pb-1 border-white/10">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* mobile pe apna avatar yaha dikhega (rail hidden hai) */}
                <div ref={mobileRef} className="md:hidden shrink-0 relative">
                  <button
                    type="button"
                    onClick={() => setMobileOpen((v) => !v)}
                    className="block rounded-full"
                    aria-label="Open profile"
                  >
                    {avatarSrc ? (
                      <Image
                        src={avatarSrc}
                        alt={currentUserName ?? "U"}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-700 text-white flex items-center justify-center text-xs font-semibold">
                        {currentUserName?.[0]?.toUpperCase() ?? "U"}
                      </div>
                    )}
                  </button>

                  {mobileOpen && (
                    <div className="absolute left-0 top-full z-50 mt-2">
                      {profileCard}
                    </div>
                  )}
                </div>
                <h2 className="text-white text-xl font-semibold tracking-tight">
                  Chats
                </h2>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="cursor-pointer text-xs font-medium text-neutral-500 hover:text-neutral-200 transition-colors shrink-0"
              >
                Sign Out
              </button>
            </div>
          </header>

          {/* --- Users list --- */}
          <nav className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 pt-3">
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
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${isSelected ? "text-blue-300" : "text-white"}`}
                        >
                          {user.name ?? "Unnamed User"}
                        </p>
                        <p className="text-xs flex items-center gap-1 min-w-0">
                          {user.lastMessage ? (
                            <>
                              <span className="text-neutral-400 text-[12px] truncate">
                                {user.lastMessage.senderId === currentUserId &&
                                  "You: "}
                                {user.lastMessage.text}
                              </span>
                              <span className="text-neutral-400 text-[10px] shrink-0">
                                · {formatTime(user.lastMessage.createdAt)}
                              </span>
                            </>
                          ) : (
                            <span className="text-neutral-500">
                              Tap to chat
                            </span>
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </nav>
        </div>
      </aside>

      {/* ============ RIGHT - Chat window ============ */}
      {/* mobile: chat select hone pe hi dikhega | desktop: hamesha */}
      <div
        className={`${
          selectedUser ? "flex" : "hidden md:flex"
        } flex-1 flex-col min-w-0 min-h-0`}
      >
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-neutral-600 text-sm text-center">
              Select a chat to start messaging
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-3 md:px-5 py-3 md:py-4 border-b border-[#262626]">
              {/* back button — sirf mobile pe */}
              <button
                onClick={() => setSelectedUser(null)}
                className="md:hidden p-2 -ml-1 rounded-full text-neutral-300 hover:bg-[#1c1c1c] transition-colors"
                aria-label="Back to chats"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              {selectedUser.image ? (
                <Image
                  src={selectedUser.image}
                  alt={selectedUser.name ?? "User"}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full shrink-0 object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#262626] text-neutral-100 flex items-center justify-center text-sm font-semibold shrink-0">
                  {selectedUser.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="text-neutral-100 text-sm font-medium truncate">
                {selectedUser.name ?? "Unnamed User"}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 md:px-5 py-4 flex flex-col min-h-0">
              {messages.length === 0 && (
                <p className="text-neutral-600 text-sm text-center mt-10">
                  No messages yet. Say hi to start the conversation!
                </p>
              )}

              <div className="mt-auto flex flex-col gap-1">
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
                      const msgAvatarSrc = isMe
                        ? avatarSrc
                        : selectedUser.image;
                      const avatarFallback = isMe
                        ? (currentUserName?.[0]?.toUpperCase() ?? "U")
                        : (selectedUser.name?.[0]?.toUpperCase() ?? "?");

                      return (
                        <div
                          key={msg.clientKey ?? msg.id}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`flex items-end gap-2 max-w-full ${isMe ? "flex-row-reverse" : ""}`}
                          >
                            {msgAvatarSrc ? (
                              <Image
                                src={msgAvatarSrc}
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

                            {/* mobile pe 75% width, desktop pe max-w-sm; lamba text wrap hoga */}
                            <div
                              className={`max-w-[75%] md:max-w-sm px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap ${
                                isMe
                                  ? "bg-neutral-100 text-black"
                                  : "bg-[#262626] text-neutral-100"
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>

                          {/* sirf mera aakhri message Sent/Seen dikhayega */}
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

            {/* Input — safe-area: iPhone ke bottom bar se na dabe */}
            <div className="px-3 md:px-5 py-3 md:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-[#262626] flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Message..."
                // text-base mobile pe: iOS input focus pe zoom nahi karega
                className="flex-1 min-w-0 bg-[#151515] border border-[#262626] rounded-full px-4 py-2 text-base md:text-sm text-neutral-100 outline-none"
              />
              <button
                onClick={sendMessage}
                className="cursor-pointer bg-neutral-100 text-black px-4 py-2 rounded-full text-sm font-medium shrink-0"
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