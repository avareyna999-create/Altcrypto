import { useState } from "react";
import { MessageCircle, X, Send, Loader2, CheckCircle, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function SupportWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketId, setTicketId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitName = user?.username || name;
    const submitEmail = user?.email || email;

    if (!submitName || !submitEmail || !subject || !message) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/support/submit", {
        name: submitName,
        email: submitEmail,
        subject,
        message,
      });
      const data = await res.json();
      setTicketId(data.ticketId);
      setIsSuccess(true);
      setSubject("");
      setMessage("");
      setName("");
      setEmail("");
    } catch (err: any) {
      const msg = err.message?.includes(":") ? err.message.split(": ").slice(1).join(": ") : err.message;
      let parsed = msg;
      try { parsed = JSON.parse(msg).message; } catch {}
      toast({ title: "Error", description: parsed || "Failed to send message", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setIsSuccess(false);
      setTicketId(null);
    }, 300);
  };

  return (
    <>
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${isOpen ? "opacity-0 pointer-events-none scale-75" : "opacity-100 scale-100"}`}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 shadow-lg bg-primary"
          data-testid="button-support-open"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>

      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${isOpen ? "opacity-100 scale-100" : "opacity-0 pointer-events-none scale-90"}`}
      >
        <Card className="w-[360px] max-w-[calc(100vw-2rem)] shadow-2xl border-border">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <Headphones className="w-4 h-4 text-primary" /> Customer Support
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              data-testid="button-support-close"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-foreground">Message Sent</h3>
                <p className="text-sm text-muted-foreground">
                  Your ticket <span className="text-primary font-mono">#{ticketId}</span> has been submitted. We'll respond to your email shortly.
                </p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => { setIsSuccess(false); setTicketId(null); }}
                  data-testid="button-send-another"
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {!user && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        data-testid="input-support-name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        data-testid="input-support-email"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Subject</Label>
                  <Input
                    placeholder="How can we help?"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    data-testid="input-support-subject"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Message</Label>
                  <Textarea
                    placeholder="Describe your issue or question..."
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    className="resize-none text-sm"
                    data-testid="input-support-message"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="button-support-submit"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Send Message</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  We typically respond within 24 hours
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
