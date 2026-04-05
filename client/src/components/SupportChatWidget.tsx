import { useState, useEffect, useRef, useCallback } from "react";
import { io as socketIO, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, Loader2, Minimize2, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@/lib/queryClient";

interface ChatMessage {
  id: number;
  ticketId: number;
  senderType: "user" | "admin";
  senderId: number;
  message: string;
  attachment?: string | null;
  createdAt: string;
}

interface Ticket {
  id: number;
  status: string;
  unreadByUser: number;
}

let globalSocket: Socket | null = null;

function getSocket(userId: number, role: string): Socket {
  if (!globalSocket || !globalSocket.connected) {
    globalSocket = socketIO("/", {
      path: "/socket.io",
      auth: { userId, role },
      transports: ["websocket", "polling"],
    });
  }
  return globalSocket;
}

export function SupportChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [welcomeSent, setWelcomeSent] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, adminTyping]);

  // Revoke object URL when preview changes
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Check admin status and unread count
  useEffect(() => {
    if (!user) return;
    const token = getAuthToken();
    if (!token) return;

    fetch("/api/support/chat/admin-status", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setAdminOnline(d.online))
      .catch(() => {});

    fetch("/api/support/chat/unread", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.unread || 0))
      .catch(() => {});
  }, [user]);

  // Socket setup
  useEffect(() => {
    if (!user) return;

    const socket = getSocket(user.id, user.role);
    socketRef.current = socket;

    socket.on("support_admin_status", ({ online }: { online: boolean }) => {
      setAdminOnline(online);
    });

    socket.on("support_admin_reply", ({ message }: { message: ChatMessage }) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      if (!isOpen || isMinimized) {
        setUnreadCount((c) => c + 1);
      }
    });

    socket.on("support_typing", ({ typing }: { typing: boolean }) => {
      setAdminTyping(typing);
    });

    return () => {
      socket.off("support_admin_status");
      socket.off("support_admin_reply");
      socket.off("support_typing");
    };
  }, [user, isOpen, isMinimized]);

  const loadTicketAndMessages = useCallback(async () => {
    if (!user) return;
    const token = getAuthToken();
    if (!token) return;
    setLoading(true);
    try {
      const ticketRes = await fetch("/api/support/chat/ticket", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ticketData = await ticketRes.json();
      setTicket(ticketData);

      const msgRes = await fetch(`/api/support/chat/messages/${ticketData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const msgData = await msgRes.json();
      setMessages(Array.isArray(msgData) ? msgData : []);
      setUnreadCount(0);

      if (socketRef.current) {
        socketRef.current.emit("user_join_ticket", ticketData.id);
      }

      if ((!Array.isArray(msgData) || msgData.length === 0) && !welcomeSent) {
        setWelcomeSent(true);
        setMessages([
          {
            id: -1,
            ticketId: ticketData.id,
            senderType: "admin",
            senderId: 0,
            message: "Hello! Welcome to customer support. How can we assist you today?",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (_) {}
    setLoading(false);
  }, [user, welcomeSent]);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
    loadTicketAndMessages();
  }, [loadTicketAndMessages]);

  const sendMessage = async () => {
    if ((!inputText.trim() && !previewFile) || sending || !user) return;
    const token = getAuthToken();
    if (!token) return;

    setSending(true);

    if (previewFile) {
      // Upload with attachment
      const optimisticMsg: ChatMessage = {
        id: Date.now(),
        ticketId: ticket?.id || 0,
        senderType: "user",
        senderId: user.id,
        message: inputText.trim() || "📎 Image attachment",
        attachment: previewUrl,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      setInputText("");
      setPreviewFile(null);
      setPreviewUrl(null);

      const formData = new FormData();
      formData.append("file", previewFile);
      if (inputText.trim()) formData.append("message", inputText.trim());

      try {
        const res = await fetch("/api/support/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (data.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === optimisticMsg.id ? { ...data.message } : m))
          );
          setTicket(data.ticket);
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        }
      } catch (_) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      }
    } else {
      // Text-only message
      const text = inputText.trim();
      setInputText("");

      const optimisticMsg: ChatMessage = {
        id: Date.now(),
        ticketId: ticket?.id || 0,
        senderType: "user",
        senderId: user.id,
        message: text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        const res = await fetch("/api/support/chat/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        if (data.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === optimisticMsg.id ? { ...data.message } : m))
          );
          setTicket(data.ticket);
        }
      } catch (_) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        setInputText(text);
      }
    }

    setSending(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    // Reset input so same file can be picked again
    e.target.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user || user.role === "SUPER_ADMIN") return null;

  return (
    <>
      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
          data-testid="chat-lightbox"
        >
          <img
            src={lightboxSrc}
            alt="Full size"
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"
            onClick={() => setLightboxSrc(null)}
            data-testid="button-close-lightbox"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-20 right-4 z-[200] w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl flex flex-col transition-all duration-200",
            isMinimized ? "h-14" : "h-[480px]"
          )}
          data-testid="support-chat-window"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-border rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </div>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
                    adminOnline ? "bg-emerald-500" : "bg-gray-500"
                  )}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Customer Support</p>
                <p className="text-xs text-muted-foreground">
                  {adminOnline ? "Online" : "Offline"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setIsMinimized(!isMinimized)}
                data-testid="button-minimize-chat"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-chat"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3" data-testid="chat-messages">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.senderType === "user" ? "justify-end" : "justify-start"
                        )}
                        data-testid={`chat-message-${msg.id}`}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] px-3 py-2 rounded-2xl text-sm",
                            msg.senderType === "user"
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted text-foreground rounded-bl-sm"
                          )}
                        >
                          {msg.attachment && (
                            <img
                              src={msg.attachment}
                              alt="attachment"
                              className="max-w-[200px] rounded-lg mb-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setLightboxSrc(msg.attachment!)}
                              data-testid={`chat-attachment-${msg.id}`}
                            />
                          )}
                          {msg.message && msg.message !== "📎 Image attachment" && (
                            <p>{msg.message}</p>
                          )}
                          <p className="text-[10px] opacity-60 mt-1 text-right">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {adminTyping && (
                      <div className="flex justify-start">
                        <div className="bg-muted px-3 py-2 rounded-2xl rounded-bl-sm">
                          <div className="flex gap-1 items-center h-4">
                            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Ticket closed notice */}
              {ticket?.status === "closed" && (
                <div className="px-3 pb-2">
                  <p className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg py-2">
                    This conversation is closed.
                  </p>
                </div>
              )}

              {/* Input area */}
              {ticket?.status !== "closed" && (
                <div className="p-3 border-t border-border flex flex-col gap-2">
                  {/* Image preview */}
                  {previewFile && previewUrl && (
                    <div className="relative inline-flex">
                      <img
                        src={previewUrl}
                        alt="preview"
                        className="h-16 w-16 rounded-lg object-cover border border-border"
                        data-testid="chat-attachment-preview"
                      />
                      <button
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                        onClick={() => { setPreviewFile(null); setPreviewUrl(null); }}
                        data-testid="button-remove-attachment"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                      data-testid="input-chat-file"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach image"
                      data-testid="button-attach-file"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={previewFile ? "Add a caption..." : "Type a message..."}
                      className="flex-1 bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      data-testid="input-chat-message"
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 rounded-xl shrink-0"
                      onClick={sendMessage}
                      disabled={sending || (!inputText.trim() && !previewFile)}
                      data-testid="button-send-chat"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={isOpen ? () => setIsOpen(false) : openChat}
        className="fixed bottom-4 right-4 z-[200] w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-all hover:scale-110"
        data-testid="button-toggle-support-chat"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        )}
      </button>
    </>
  );
}
