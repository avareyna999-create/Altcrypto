import { useState, useEffect, useRef, useCallback } from "react";
import { io as socketIO, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/use-auth";
import { getAuthToken } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Loader2, Send, MessageCircle, Circle, XCircle, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: number;
  ticketId: number;
  senderType: "user" | "admin";
  senderId: number;
  message: string;
  attachment?: string | null;
  createdAt: string;
}

interface ChatTicket {
  id: number;
  userId: number | null;
  name: string;
  email: string;
  status: string;
  unreadByAdmin: number;
  lastMessage: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string | null;
}

let adminSocket: Socket | null = null;

function getAdminSocket(userId: number, role: string): Socket {
  if (!adminSocket || !adminSocket.connected) {
    adminSocket = socketIO("/", {
      path: "/socket.io",
      auth: { userId, role },
      transports: ["websocket", "polling"],
    });
  }
  return adminSocket;
}

export function AdminSupportChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<ChatTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);
  const [typingTimer, setTypingTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadTickets = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    setLoadingTickets(true);
    try {
      const res = await fetch("/api/admin/support/chat/tickets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (_) {}
    setLoadingTickets(false);
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Setup socket for admin
  useEffect(() => {
    if (!user) return;
    const socket = getAdminSocket(user.id, user.role);
    socketRef.current = socket;

    socket.on("support_new_message", ({ message, ticket }: { message: ChatMessage; ticket: any }) => {
      if (message.ticketId === selectedTicketId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
      setTickets((prev) =>
        prev.map((t) =>
          t.id === message.ticketId
            ? {
                ...t,
                lastMessage: message.attachment ? "📎 Image attachment" : message.message,
                unreadByAdmin: t.id === selectedTicketId ? 0 : t.unreadByAdmin + 1,
              }
            : t
        )
      );
    });

    socket.on("support_new_attachment", ({ message }: { message: ChatMessage }) => {
      if (message.ticketId === selectedTicketId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    });

    socket.on("support_new_ticket_message", ({ ticketId }: { ticketId: number }) => {
      loadTickets();
    });

    return () => {
      socket.off("support_new_message");
      socket.off("support_new_attachment");
      socket.off("support_new_ticket_message");
    };
  }, [user, selectedTicketId, loadTickets]);

  const openTicket = useCallback(
    async (ticketId: number) => {
      setSelectedTicketId(ticketId);
      setMessages([]);
      setLoadingMessages(true);

      const token = getAuthToken();
      if (!token) return;

      try {
        const res = await fetch(`/api/support/chat/messages/${ticketId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);

        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, unreadByAdmin: 0 } : t))
        );

        if (socketRef.current) {
          socketRef.current.emit("admin_join_ticket", ticketId);
        }
      } catch (_) {}
      setLoadingMessages(false);
    },
    []
  );

  const sendReply = async () => {
    if (!chatInput.trim() || sending || !selectedTicketId) return;
    const token = getAuthToken();
    if (!token) return;

    const text = chatInput.trim();
    setChatInput("");
    setSending(true);

    const optimistic: ChatMessage = {
      id: Date.now(),
      ticketId: selectedTicketId,
      senderType: "admin",
      senderId: user?.id || 0,
      message: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch("/api/admin/support/chat/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ticketId: selectedTicketId, message: text }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? { ...data.message } : m))
        );
        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicketId ? { ...t, lastMessage: text, status: "replied" } : t
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setChatInput(text);
        toast({ title: data.message || "Failed to send reply", variant: "destructive" });
      }
    } catch (_) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setChatInput(text);
    }
    setSending(false);
  };

  const handleTyping = () => {
    if (!socketRef.current || !selectedTicketId) return;
    socketRef.current.emit("support_typing", { ticketId: selectedTicketId, typing: true });
    if (typingTimer) clearTimeout(typingTimer);
    const timer = setTimeout(() => {
      socketRef.current?.emit("support_typing", { ticketId: selectedTicketId, typing: false });
    }, 1500);
    setTypingTimer(timer);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  const closeTicket = async () => {
    if (!selectedTicketId) return;
    const token = getAuthToken();
    if (!token) return;
    setClosingTicket(true);
    try {
      await fetch(`/api/admin/support-tickets/${selectedTicketId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "closed" }),
      });
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicketId ? { ...t, status: "closed" } : t))
      );
      toast({ title: "Ticket closed" });
    } catch (_) {
      toast({ title: "Failed to close ticket", variant: "destructive" });
    }
    setClosingTicket(false);
  };

  const reopenTicket = async () => {
    if (!selectedTicketId) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      await fetch(`/api/admin/support-tickets/${selectedTicketId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "open" }),
      });
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicketId ? { ...t, status: "open" } : t))
      );
      toast({ title: "Ticket reopened" });
    } catch (_) {
      toast({ title: "Failed to reopen ticket", variant: "destructive" });
    }
  };

  const openCount = tickets.filter((t) => t.status === "open").length;
  const totalUnread = tickets.reduce((sum, t) => sum + (t.unreadByAdmin || 0), 0);

  return (
    <>
      {/* Lightbox for full-size image preview */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
          data-testid="admin-chat-lightbox"
        >
          <img
            src={lightboxSrc}
            alt="Full size attachment"
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"
            onClick={() => setLightboxSrc(null)}
            data-testid="button-close-admin-lightbox"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="flex h-[calc(100vh-240px)] min-h-[500px] bg-card border border-border rounded-xl overflow-hidden">
        {/* LEFT: Ticket List */}
        <div className="w-72 border-r border-border flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Support Chats</p>
              <p className="text-xs text-muted-foreground">
                {openCount} open{totalUnread > 0 ? ` · ${totalUnread} unread` : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={loadTickets}
              disabled={loadingTickets}
              data-testid="button-refresh-tickets"
            >
              <RefreshCw className={cn("w-4 h-4", loadingTickets && "animate-spin")} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingTickets && tickets.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground px-4">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No support conversations yet
              </div>
            ) : (
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => openTicket(ticket.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors",
                    selectedTicketId === ticket.id && "bg-primary/10 border-l-2 border-l-primary"
                  )}
                  data-testid={`button-ticket-${ticket.id}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                        {ticket.name}
                      </span>
                      <Circle
                        className={cn(
                          "w-2 h-2 shrink-0",
                          ticket.status === "open"
                            ? "fill-yellow-500 text-yellow-500"
                            : ticket.status === "replied"
                            ? "fill-emerald-500 text-emerald-500"
                            : "fill-muted-foreground text-muted-foreground"
                        )}
                      />
                    </div>
                    {ticket.unreadByAdmin > 0 && (
                      <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 shrink-0">
                        {ticket.unreadByAdmin}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {ticket.lastMessage || "No messages yet"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    #{ticket.id} · User #{ticket.userId}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Chat Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedTicketId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
                <div>
                  <p className="font-semibold text-sm">
                    {selectedTicket?.name || `Ticket #${selectedTicketId}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedTicket?.email} · #{selectedTicketId}
                    <span
                      className={cn(
                        "ml-2 px-1.5 py-0.5 rounded-full text-[10px]",
                        selectedTicket?.status === "open"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : selectedTicket?.status === "replied"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {selectedTicket?.status}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedTicket?.status === "closed" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={reopenTicket}
                      data-testid="button-reopen-ticket"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Reopen
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={closeTicket}
                      disabled={closingTicket}
                      data-testid="button-close-ticket"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Close
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="admin-chat-messages">
                {loadingMessages ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    No messages yet in this conversation.
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.senderType === "admin" ? "justify-end" : "justify-start"
                      )}
                      data-testid={`admin-chat-msg-${msg.id}`}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] px-4 py-2.5 rounded-2xl text-sm",
                          msg.senderType === "admin"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        )}
                      >
                        {msg.attachment && (
                          <img
                            src={msg.attachment}
                            alt="attachment"
                            className="max-w-[200px] rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxSrc(msg.attachment!)}
                            data-testid={`admin-attachment-${msg.id}`}
                          />
                        )}
                        {msg.message && msg.message !== "📎 Image attachment" && (
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        )}
                        <p className="text-[10px] opacity-60 mt-1 text-right">
                          {msg.senderType === "admin" ? "You" : selectedTicket?.name || "User"} ·{" "}
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Closed notice */}
              {selectedTicket?.status === "closed" && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg py-2">
                    This conversation is closed. Reopen to send messages.
                  </p>
                </div>
              )}

              {/* Input */}
              {selectedTicket?.status !== "closed" && (
                <div className="p-3 border-t border-border flex gap-2 shrink-0">
                  <textarea
                    value={chatInput}
                    onChange={(e) => {
                      setChatInput(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a reply... (Enter to send)"
                    rows={2}
                    className="flex-1 bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    data-testid="input-admin-reply"
                  />
                  <Button
                    className="h-auto px-4 rounded-xl self-end"
                    onClick={sendReply}
                    disabled={sending || !chatInput.trim()}
                    data-testid="button-send-admin-reply"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
