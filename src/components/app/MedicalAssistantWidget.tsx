import { useEffect, useMemo, useState } from "react";
import { Bot, Check, Globe2, Loader2, MessageSquareHeart, SendHorizonal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { type Role } from "@/context/AuthContext";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatLanguage = "english" | "hindi" | "punjabi";

type MedicalAssistantWidgetProps = {
  role: Extract<Role, "patient" | "doctor">;
};

const languageLabels: Record<ChatLanguage, string> = {
  english: "English",
  hindi: "Hindi",
  punjabi: "Punjabi",
};

const languageSelections: ChatLanguage[] = ["english", "hindi", "punjabi"];

const starterPrompts: Record<Extract<Role, "patient" | "doctor">, Record<ChatLanguage, string[]>> = {
  patient: {
    english: [
      "Explain my prescription instructions in simple words.",
      "What questions should I ask my doctor about my symptoms?",
      "What does a blood pressure reading usually mean?",
    ],
    hindi: [
      "Meri dawai ki instructions simple words mein samjhaiye.",
      "Mujhe apne symptoms ke baare mein doctor se kya poochna chahiye?",
      "Blood pressure reading ka aam taur par kya matlab hota hai?",
    ],
    punjabi: [
      "Meri davai di instructions simple words vich samjhao.",
      "Main apne symptoms baare doctor nu kehde sawal puchhan?",
      "Blood pressure reading da aam taur te ki matlab hunda hai?",
    ],
  },
  doctor: {
    english: [
      "Give a concise explanation of hypertension for a patient.",
      "List common counseling points for antibiotics.",
      "What are important medication safety questions to review?",
    ],
    hindi: [
      "Patient ke liye hypertension ka short explanation dijiye.",
      "Antibiotics ke common counseling points batayiye.",
      "Medication safety review ke important questions kya hain?",
    ],
    punjabi: [
      "Patient layi hypertension di short explanation deo.",
      "Antibiotics layi common counseling points daso.",
      "Medication safety review layi kehde important sawal ne?",
    ],
  },
};

const createAssistantIntro = (): ChatMessage => ({
  id: "assistant-intro",
  role: "assistant",
  content: "Please choose your preferred language for the medical assistant.",
});

const createLanguageConfirmation = (language: ChatLanguage, role: Extract<Role, "patient" | "doctor">): ChatMessage => {
  const confirmations: Record<ChatLanguage, string> = {
    english:
      role === "doctor"
        ? "English selected. Ask any medical question and I will answer in English. If I do not know something, I will clearly say the data is not available to me."
        : "English selected. Ask any medical question and I will answer in English. If I do not know something, I will clearly say the data is not available to me.",
    hindi:
      role === "doctor"
        ? "Hindi select ho gayi hai. Aap koi bhi medical question pooch sakte hain. Agar mere paas data nahin hoga, to main clearly bata dunga."
        : "Hindi select ho gayi hai. Aap koi bhi medical question pooch sakte hain. Agar mere paas data nahin hoga, to main clearly bata dungi.",
    punjabi:
      role === "doctor"
        ? "Punjabi select ho gayi hai. Tusi medical sawal puchh sakde ho. Je mere kol data nahin hovega, tan main saaf taur te dass dunga."
        : "Punjabi select ho gayi hai. Tusi medical sawal puchh sakde ho. Je mere kol data nahin hovega, tan main saaf taur te dass dungi.",
  };

  return {
    id: `assistant-language-${language}`,
    role: "assistant",
    content: confirmations[language],
  };
};

const formatAssistantError = (error: unknown) => {
  if (!(error instanceof Error) || !error.message) {
    return "The data is not available to me right now, so I cannot answer that safely.";
  }

  if (error.message.includes("Cannot POST /api/chat/medical-assistant") || error.message.includes("Failed to fetch")) {
    return "The connection to the medical assistant was interrupted. Please make sure the backend server is running, then try again.";
  }

  return error.message;
};

export function MedicalAssistantWidget({ role }: MedicalAssistantWidgetProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<ChatLanguage | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([createAssistantIntro()]);

  useEffect(() => {
    setDraft("");
    setSending(false);
    setSelectedLanguage(null);
    setMessages([createAssistantIntro()]);
  }, [role]);

  const prompts = useMemo(() => {
    if (!selectedLanguage) {
      return [];
    }

    return starterPrompts[role][selectedLanguage];
  }, [role, selectedLanguage]);

  const hasUserMessages = messages.some((message) => message.role === "user");

  const handleLanguageSelection = (language: ChatLanguage) => {
    setSelectedLanguage(language);
    setMessages([createAssistantIntro(), createLanguageConfirmation(language, role)]);
  };

  const sendMessage = async (nextMessage?: string) => {
    const trimmed = (nextMessage ?? draft).trim();

    if (!selectedLanguage || !trimmed || sending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setSending(true);

    try {
      const data = await apiFetch("/chat/medical-assistant", {
        method: "POST",
        body: JSON.stringify({
          message: trimmed,
          language: selectedLanguage,
          history: messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content:
            (data as { reply?: string }).reply ||
            "The data is not available to me right now, so I cannot answer that safely.",
        },
      ]);
    } catch (error) {
      const fallback = formatAssistantError(error);

      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: fallback,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          className="fixed bottom-6 right-6 z-30 h-14 rounded-full px-5 shadow-[0_18px_40px_hsl(var(--primary)/0.28)]"
        >
          <MessageSquareHeart className="h-5 w-5" />
          Medical AI
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex h-full w-full flex-col border-white/70 bg-background/95 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-white/60 px-6 py-5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle>Medical Assistant</SheetTitle>
              <SheetDescription>
                Medical questions only. If information is unavailable, the assistant will say so clearly.
              </SheetDescription>
            </div>
          </div>
          {!hasUserMessages && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-muted-foreground">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
              <p>
                This assistant is limited to medical and healthcare support. It does not have automatic access to private records unless you explicitly share details in chat.
              </p>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-5">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={message.role === "assistant" ? "mr-6" : "ml-6"}>
                <div
                  className={
                    message.role === "assistant"
                      ? "rounded-[1.5rem] border border-white/70 bg-white/80 px-4 py-3 text-sm leading-6 dark:border-white/10 dark:bg-slate-900/80"
                      : "rounded-[1.5rem] bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground"
                  }
                >
                  {message.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="mr-6">
                <div className="flex items-center gap-2 rounded-[1.5rem] border border-white/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground dark:border-white/10 dark:bg-slate-900/80">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking through your medical question...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-white/60 px-6 py-4 dark:border-white/10">
          {!selectedLanguage && (
            <div className="mb-4 space-y-3">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <Globe2 className="h-4 w-4" />
                Select Language
              </p>
              <div className="flex flex-wrap gap-2">
                {languageSelections.map((language) => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => handleLanguageSelection(language)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-background/80 px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground dark:border-white/10"
                  >
                    {languageLabels[language]}
                    {selectedLanguage === language && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedLanguage && !hasUserMessages && (
            <div className="mb-3 flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  className="rounded-full border border-white/70 bg-background/80 px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground dark:border-white/10"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={selectedLanguage ? `Ask a medical question in ${languageLabels[selectedLanguage]}...` : "Choose a language to begin..."}
              disabled={!selectedLanguage}
              className="min-h-[110px] rounded-[1.5rem] border-white/70 bg-background/80 dark:border-white/10"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                For emergencies, contact a clinician or emergency services immediately.
              </p>
              <Button
                type="button"
                onClick={() => void sendMessage()}
                disabled={sending || !draft.trim() || !selectedLanguage}
                className="rounded-2xl"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                Send
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
