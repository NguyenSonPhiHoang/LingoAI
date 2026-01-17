"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Loader2,
  X,
  Languages,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import {
  sendAiChatMessage,
  translateAiText,
  getAiReplySuggestions,
  type AiChatMessage,
  type AiConversationMode,
} from "@/services/ai-chat";

type SpeechRecognitionCtor = new () => any;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionCtor;
    SpeechRecognition?: SpeechRecognitionCtor;
  }
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

type ConversationMode = AiConversationMode;

export default function AiAssistant() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const [conversationMode, setConversationMode] =
    useState<ConversationMode>("natural");

  const conversationModeRef = useRef<ConversationMode>("natural");

  const [translations, setTranslations] = useState<
    Record<
      number,
      {
        open: boolean;
        loading: boolean;
        text: string;
      }
    >
  >({});

  const [suggestions, setSuggestions] = useState<
    Record<
      number,
      {
        open: boolean;
        loading: boolean;
        items: string[];
      }
    >
  >({});

  const [voiceInputEnabled, setVoiceInputEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [continuousVoice, setContinuousVoice] = useState(true);

  const listRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const messagesRef = useRef<AiChatMessage[]>([]);
  const openRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const isSendingRef = useRef(false);
  const continuousVoiceRef = useRef(true);
  const voiceOutputEnabledRef = useRef(true);
  const shouldBeListeningRef = useRef(false);
  const startingRecognitionRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const lastFinalTranscriptRef = useRef<string>("");
  const suppressNextVoiceErrorToastRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const lastInterimRef = useRef<string>("");

  const userId = user?.uid || user?.id || null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("aiConversationMode");
      if (raw === "guided" || raw === "natural") {
        setConversationMode(raw);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("aiConversationMode", conversationMode);
    } catch {
      // ignore
    }

    if (conversationMode === "natural") {
      // Keep the UI minimal in Natural mode.
      setSuggestions({});
    }
  }, [conversationMode]);

  useEffect(() => {
    conversationModeRef.current = conversationMode;
  }, [conversationMode]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    isSendingRef.current = isSending;
  }, [isSending]);

  useEffect(() => {
    continuousVoiceRef.current = continuousVoice;
  }, [continuousVoice]);

  useEffect(() => {
    voiceOutputEnabledRef.current = voiceOutputEnabled;
  }, [voiceOutputEnabled]);

  const canUseSpeechRecognition = useMemo(() => {
    return Boolean(getSpeechRecognitionCtor());
  }, []);

  useEffect(() => {
    if (!open) return;
    // Scroll to bottom when opening
    setTimeout(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
  }, [open]);

  useEffect(() => {
    // init recognition once
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    // We'll auto-restart manually for continuous mode.
    recognition.continuous = false;

    const markIntentionalStop = () => {
      suppressNextVoiceErrorToastRef.current = true;
      setTimeout(() => {
        suppressNextVoiceErrorToastRef.current = false;
      }, 400);
    };

    const safeStop = () => {
      markIntentionalStop();
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };

    const safeStart = () => {
      if (startingRecognitionRef.current) return;
      if (!openRef.current) return;
      if (!shouldBeListeningRef.current) return;
      if (!continuousVoiceRef.current && !voiceInputEnabled) return;
      if (isSpeakingRef.current) return;

      startingRecognitionRef.current = true;
      try {
        recognition.start();
      } catch {
        // start can throw if already started; ignore.
      } finally {
        setTimeout(() => {
          startingRecognitionRef.current = false;
        }, 200);
      }
    };

    const sendMessageText = async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const currentUserId = userIdRef.current;
      if (!currentUserId) return;

      if (isSendingRef.current) return;
      isSendingRef.current = true;
      setIsSending(true);

      // Stop listening while sending / speaking (avoid capturing TTS)
      safeStop();

      const nextHistory: AiChatMessage[] = [
        ...messagesRef.current,
        { role: "user" as const, content: trimmed },
      ].slice(-12);
      setMessages(nextHistory);
      setInput("");

      try {
        const res = await sendAiChatMessage({
          message: trimmed,
          history: nextHistory,
          mode: conversationModeRef.current,
        });
        const reply = (res.reply || "").trim();
        const updated: AiChatMessage[] = [
          ...nextHistory,
          { role: "model" as const, content: reply || "(no reply)" },
        ];
        setMessages(updated);

        if (
          voiceOutputEnabledRef.current &&
          reply &&
          typeof window !== "undefined"
        ) {
          try {
            if (window.speechSynthesis) {
              isSpeakingRef.current = true;
              window.speechSynthesis.cancel();
              const utter = new SpeechSynthesisUtterance(reply);
              utter.lang = "en-US";
              utter.onend = () => {
                isSpeakingRef.current = false;
                // Resume listening if continuous mode is enabled.
                if (continuousVoiceRef.current) {
                  shouldBeListeningRef.current = true;
                  safeStart();
                }
              };
              utter.onerror = () => {
                isSpeakingRef.current = false;
                if (continuousVoiceRef.current) {
                  shouldBeListeningRef.current = true;
                  safeStart();
                }
              };
              window.speechSynthesis.speak(utter);
            }
          } catch {
            isSpeakingRef.current = false;
          }
        } else {
          // No voice output; resume immediately in continuous mode.
          if (continuousVoiceRef.current) {
            shouldBeListeningRef.current = true;
            safeStart();
          }
        }
      } catch (err: any) {
        const msg =
          typeof err?.message === "string" ? err.message : "AI request failed";
        toast({
          variant: "destructive",
          title: "AI error",
          description: msg,
        });
        // Try to resume listening in continuous mode even if send failed.
        if (continuousVoiceRef.current) {
          shouldBeListeningRef.current = true;
          safeStart();
        }
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
      }
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const part = r?.[0]?.transcript || "";
        if (r?.isFinal) finalText += part;
        else interim += part;
      }

      const combined = (finalText || interim).trim();
      if (combined) setInput(combined);
      lastInterimRef.current = interim.trim();

      // Reset silence timer whenever we get new partial/final results.
      try {
        if (silenceTimerRef.current) {
          window.clearTimeout(silenceTimerRef.current as any);
          silenceTimerRef.current = null;
        }
      } catch {
        silenceTimerRef.current = null;
      }

      // In continuous mode, auto-send when we get a final transcript.
      const shouldAuto =
        continuousVoiceRef.current &&
        openRef.current &&
        !!userIdRef.current &&
        !isSpeakingRef.current;
      const cleanedFinal = finalText.trim();
      if (shouldAuto && cleanedFinal) {
        // Prevent duplicate sends from repeated final result events.
        if (cleanedFinal === lastFinalTranscriptRef.current) return;
        lastFinalTranscriptRef.current = cleanedFinal;
        void sendMessageText(cleanedFinal);
        return;
      }

      // If we have only interim results in continuous mode, wait a short
      // silence timeout before treating the interim as final. This avoids
      // cutting the user mid-sentence when they pause briefly.
      if (
        shouldAuto &&
        !cleanedFinal &&
        interim.trim() &&
        continuousVoiceRef.current
      ) {
        try {
          silenceTimerRef.current = window.setTimeout(() => {
            const text = lastInterimRef.current.trim();
            if (!text) return;
            if (text === lastFinalTranscriptRef.current) return;
            lastFinalTranscriptRef.current = text;
            void sendMessageText(text);
          }, 3000) as unknown as number;
        } catch {
          silenceTimerRef.current = null;
        }
      }
    };

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onend = () => {
      setListening(false);

      // Clear any pending silence timer when recognition ends.
      try {
        if (silenceTimerRef.current) {
          window.clearTimeout(silenceTimerRef.current as any);
          silenceTimerRef.current = null;
        }
      } catch {
        silenceTimerRef.current = null;
      }

      // Auto-restart for continuous mode if we still want to listen.
      if (continuousVoiceRef.current) {
        safeStart();
      }
    };

    recognition.onerror = () => {
      setListening(false);

      // Stop any auto-restart attempts if the browser blocks mic/recognition.
      shouldBeListeningRef.current = false;
      setVoiceInputEnabled(false);
      if (continuousVoiceRef.current) {
        setContinuousVoice(false);
      }

      // Many browsers fire an error event when we intentionally stop.
      // Do not show toast for these programmatic stops.
      if (suppressNextVoiceErrorToastRef.current) {
        return;
      }

      // User requested: do not show voice input error notifications.
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [toast]);

  useEffect(() => {
    // When the dialog closes, ensure we stop listening and release the mic.
    if (open) return;
    if (!listening) return;

    try {
      suppressNextVoiceErrorToastRef.current = true;
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }, [open, listening]);

  useEffect(() => {
    // scroll on new messages
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const toggleTranslate = async (idx: number, text: string) => {
    if (!text?.trim()) return;

    // Toggle open/close.
    const current = translations[idx];
    const nextOpen = !current?.open;
    setTranslations((prev) => ({
      ...prev,
      [idx]: {
        open: nextOpen,
        loading: current?.loading || false,
        text: current?.text || "",
      },
    }));

    // If opening and we already have translation, do nothing.
    if (!nextOpen || (current?.text && current.text.trim())) return;

    try {
      setTranslations((prev) => ({
        ...prev,
        [idx]: {
          open: true,
          loading: true,
          text: "",
        },
      }));

      const res = await translateAiText({ text, targetLanguage: "vi" });
      setTranslations((prev) => ({
        ...prev,
        [idx]: {
          open: true,
          loading: false,
          text: (res.translation || "").trim() || "(no translation)",
        },
      }));
    } catch (err: any) {
      const msg =
        typeof err?.message === "string" ? err.message : "Translate failed";
      toast({
        variant: "destructive",
        title: "Translate failed",
        description: msg,
      });
      setTranslations((prev) => ({
        ...prev,
        [idx]: {
          open: true,
          loading: false,
          text: "(translation failed)",
        },
      }));
    }
  };

  const toggleSuggestions = async (
    idx: number,
    aiText: string,
    history: AiChatMessage[]
  ) => {
    if (!aiText?.trim()) return;

    const current = suggestions[idx];
    const nextOpen = !current?.open;
    setSuggestions((prev) => ({
      ...prev,
      [idx]: {
        open: nextOpen,
        loading: current?.loading || false,
        items: current?.items || [],
      },
    }));

    if (!nextOpen || (current?.items && current.items.length > 0)) return;

    try {
      setSuggestions((prev) => ({
        ...prev,
        [idx]: { open: true, loading: true, items: [] },
      }));

      const res = await getAiReplySuggestions({
        message: aiText,
        history,
        maxSuggestions: 5,
      });
      const items = Array.isArray(res.suggestions)
        ? res.suggestions.map((s) => String(s).trim()).filter(Boolean)
        : [];
      setSuggestions((prev) => ({
        ...prev,
        [idx]: {
          open: true,
          loading: false,
          items: items.length ? items : ["Could you repeat that, please?"],
        },
      }));
    } catch (err: any) {
      const msg =
        typeof err?.message === "string" ? err.message : "Suggestion failed";
      toast({
        variant: "destructive",
        title: "Suggestion failed",
        description: msg,
      });
      setSuggestions((prev) => ({
        ...prev,
        [idx]: {
          open: true,
          loading: false,
          items: ["Could you explain it again?"],
        },
      }));
    }
  };

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    if (!window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // Continuous voice mode default: start listening automatically when opened.
    if (!open) {
      shouldBeListeningRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }

      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
      return;
    }

    if (!continuousVoice) return;
    if (!canUseSpeechRecognition) return;
    if (!userId) return;

    setVoiceInputEnabled(true);
    shouldBeListeningRef.current = true;
    // Delay a tick so the dialog is mounted; start may require a user gesture.
    setTimeout(() => {
      try {
        recognitionRef.current?.start();
      } catch {
        // If auto-start is blocked, user can still click the mic button.
      }
    }, 50);
  }, [open, continuousVoice, canUseSpeechRecognition, userId]);

  const handleContinuousModeChange = (checked: boolean) => {
    setContinuousVoice(checked);

    if (!checked) {
      // Switch off: require mouse control, stop listening now.
      shouldBeListeningRef.current = false;
      try {
        suppressNextVoiceErrorToastRef.current = true;
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setListening(false);
      return;
    }

    // Switch on: auto listen.
    setVoiceInputEnabled(true);
    shouldBeListeningRef.current = true;
    if (open && canUseSpeechRecognition && userId) {
      try {
        recognitionRef.current?.start();
      } catch {
        // ignore
      }
    }
  };

  const handleToggleListening = async () => {
    if (!voiceInputEnabled) {
      setVoiceInputEnabled(true);
    }

    const recognition = recognitionRef.current;
    if (!recognition) {
      return;
    }

    if (listening) {
      try {
        suppressNextVoiceErrorToastRef.current = true;
        recognition.stop();
      } catch {
        // ignore
      }
      shouldBeListeningRef.current = false;
      setListening(false);
      return;
    }

    try {
      shouldBeListeningRef.current = true;
      recognition.start();
    } catch {
      setListening(false);
      // User requested: do not show voice input error notifications.
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    if (!userId) {
      toast({
        variant: "destructive",
        title: "Login required",
        description: "Please log in to chat with the AI.",
      });
      return;
    }

    setIsSending(true);

    const nextHistory: AiChatMessage[] = [
      ...messages,
      { role: "user" as const, content: text },
    ].slice(-12);
    setMessages(nextHistory);
    setInput("");

    try {
      const res = await sendAiChatMessage({
        message: text,
        history: nextHistory,
        mode: conversationMode,
      });
      const reply = (res.reply || "").trim();
      const updated: AiChatMessage[] = [
        ...nextHistory,
        { role: "model" as const, content: reply || "(no reply)" },
      ];
      setMessages(updated);

      if (voiceOutputEnabled && reply) {
        speak(reply);
      }
    } catch (err: any) {
      const msg =
        typeof err?.message === "string" ? err.message : "AI request failed";
      toast({
        variant: "destructive",
        title: "AI error",
        description: msg,
      });
    } finally {
      setIsSending(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending) void sendMessage();
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          // Place above the existing chat bubble (which sits at bottom-5 right-5)
          "fixed bottom-24 right-5 h-14 w-14 rounded-full p-0",
          "shadow-lg z-[1001]"
        )}
        aria-label="Open AI assistant"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0">
          <div className="flex items-center justify-between border-b p-4">
            <DialogHeader className="p-0">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" /> AI Assistant
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="conversation-mode"
                  className="text-xs text-muted-foreground"
                >
                  {conversationMode === "guided" ? "Guided" : "Natural"}
                </Label>
                <Switch
                  id="conversation-mode"
                  checked={conversationMode === "guided"}
                  onCheckedChange={(checked) =>
                    setConversationMode(checked ? "guided" : "natural")
                  }
                  aria-label="Conversation mode"
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            ref={listRef}
            className="max-h-[60vh] min-h-[320px] overflow-y-auto p-4 space-y-3"
          >
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {conversationMode === "guided"
                  ? "Ask me anything in English. I can correct your sentences and suggest replies for you to repeat."
                  : "Talk with me in English (Natural mode)."}
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={cn(
                    m.role === "user" ? "ml-auto" : "mr-auto",
                    "max-w-[85%]"
                  )}
                >
                  <div
                    className={cn(
                      "relative rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {m.role === "model" ? (
                      <div className="absolute top-1 right-1 flex items-center gap-1">
                        {conversationMode === "guided" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-7 w-7",
                              "text-muted-foreground hover:text-foreground",
                              "bg-background/40 hover:bg-background/60"
                            )}
                            onClick={() =>
                              void toggleSuggestions(idx, m.content, messages)
                            }
                            aria-label="Reply suggestions"
                            title="Reply suggestions"
                          >
                            <Lightbulb className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-7 w-7",
                            "text-muted-foreground hover:text-foreground",
                            "bg-background/40 hover:bg-background/60"
                          )}
                          onClick={() => void toggleTranslate(idx, m.content)}
                          aria-label="Translate"
                          title="Translate to Vietnamese"
                        >
                          <Languages className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}

                    {m.content}
                  </div>

                  {conversationMode === "guided" &&
                  m.role === "model" &&
                  suggestions[idx]?.open ? (
                    <div className="mt-2 rounded-lg border bg-background px-3 py-2 text-sm">
                      {suggestions[idx].loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading
                          suggestions…
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(suggestions[idx].items || []).map((s, i) => (
                            <div
                              key={`${idx}-s-${i}`}
                              className="flex items-center gap-1"
                            >
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setInput(s)}
                                className="h-auto py-1"
                                title="Use this suggestion"
                              >
                                {s}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => speak(s)}
                                aria-label="Listen to suggestion"
                                title="Listen"
                              >
                                <Volume2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {m.role === "model" && translations[idx]?.open ? (
                    <div className="mt-2 rounded-lg border bg-background px-3 py-2 text-sm">
                      {translations[idx].loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />{" "}
                          Translating…
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">
                          {translations[idx].text}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="border-t p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="continuous-voice"
                  checked={continuousVoice}
                  onCheckedChange={handleContinuousModeChange}
                  disabled={!canUseSpeechRecognition}
                />
                <Label htmlFor="continuous-voice">Continuous</Label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleToggleListening}
                disabled={!canUseSpeechRecognition}
                aria-label="Voice input"
                title={
                  canUseSpeechRecognition
                    ? listening
                      ? "Stop voice input"
                      : "Start voice input"
                    : "Voice input not supported"
                }
              >
                {listening ? (
                  <Mic className="h-4 w-4" />
                ) : (
                  <MicOff className="h-4 w-4" />
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setVoiceOutputEnabled((v) => !v)}
                aria-label="Voice output"
                title={
                  voiceOutputEnabled ? "Voice output on" : "Voice output off"
                }
              >
                {voiceOutputEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={userId ? "Type your message…" : "Log in to chat…"}
                disabled={!userId || isSending}
              />

              <Button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!userId || isSending || !input.trim()}
                aria-label="Send"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {!canUseSpeechRecognition ? (
              <div className="text-xs text-muted-foreground">
                Voice input requires Chrome/Edge (speech recognition support).
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
