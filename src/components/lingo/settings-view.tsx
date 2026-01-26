"use client";

import { useState, useEffect, type FC } from "react";
import { useSettings } from "@/context/settings-context";
import { getUserSettings, saveUserSettings } from "@/services/settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Volume2, Check, KeyRound, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { updateUserProfile } from "@/services/users";
import { Input } from "../ui/input";
import { MessageSquare } from "lucide-react";

const themes = [
  { name: "default", color: "hsl(49, 100%, 50%)" },
  { name: "orange", color: "hsl(19, 90%, 50%)" },
  { name: "blue", color: "hsl(221, 83%, 53%)" },
  { name: "green", color: "hsl(142, 71%, 45%)" },
  { name: "rose", color: "hsl(347, 90%, 58%)" },
];

const SettingsView: FC = () => {
  const { user } = useAuth();
  const { speechRate, setSpeechRate, theme, setTheme } = useSettings();
  const [localRate, setLocalRate] = useState(speechRate);
  const [localTheme, setLocalTheme] = useState(theme);
  const [localApiKey, setLocalApiKey] = useState(user?.geminiApiKey || "");
  const [allowGemini, setAllowGemini] = useState<boolean | null>(null);
  const [localChatBotId, setLocalChatBotId] = useState("");
  const [initialChatBotId, setInitialChatBotId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load Gemini API key from backend settings on mount
  useEffect(() => {
    const load = async () => {
      try {
        const remote = await getUserSettings();
        if (remote?.geminiApiKey) setLocalApiKey(remote.geminiApiKey);
        if ((remote as any)?.allowGeminiApiKey !== undefined)
          setAllowGemini((remote as any).allowGeminiApiKey);
        if (remote?.chatBotId) {
          setLocalChatBotId(remote.chatBotId);
          setInitialChatBotId(remote.chatBotId);
        }
      } catch (error) {
        console.warn("Could not load user settings", error);
      }
    };
    load();
  }, []);

  const handleRateChange = (value: number[]) => {
    setLocalRate(value[0]);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Apply to context (updates local state and localStorage)
      setSpeechRate(localRate);
      setTheme(localTheme);
      // Persist to backend
      await saveUserSettings({
        speechRate: localRate,
        theme: localTheme,
        geminiApiKey: localApiKey,
        chatBotId: localChatBotId,
      });
      toast({
        title: "Settings Saved",
        description: "Your new settings have been applied.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save settings to server.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      // Persist Gemini key along with current settings
      await saveUserSettings({
        geminiApiKey: localApiKey,
        speechRate: localRate,
        theme: localTheme,
        chatBotId: localChatBotId,
      });
      toast({
        title: "API Key Saved",
        description: "Your Gemini API Key has been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save your API key.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveChatBotId = async () => {
    setIsSaving(true);
    try {
      await saveUserSettings({
        chatBotId: localChatBotId || null,
        speechRate: localRate,
        theme: localTheme,
        geminiApiKey: localApiKey,
      });
      setInitialChatBotId(localChatBotId);
      toast({
        title: "Chatbot ID Saved",
        description: "Your chatbot configuration has been updated.",
      });
    } catch (error) {
      console.error("Error saving chatbot id:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save chatbot ID.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestAudio = () => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(
        "This is a test of the current speech rate.",
      );
      utterance.lang = "en-US";
      utterance.rate = localRate;
      window.speechSynthesis.speak(utterance);
    } else {
      toast({
        variant: "destructive",
        title: "Browser Not Supported",
        description: "Your browser does not support text-to-speech.",
      });
    }
  };

  const isSettingsDirty = speechRate !== localRate || theme !== localTheme;
  const isApiKeyDirty = localApiKey !== (user?.geminiApiKey || "");
  const isChatBotDirty = localChatBotId !== initialChatBotId;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>
            Manage your application preferences here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 p-4 border rounded-lg">
            <Label htmlFor="speech-rate" className="text-base font-medium">
              Browser TTS Rate
            </Label>
            <p className="text-sm text-muted-foreground">
              Adjust the speed of the browser's fallback text-to-speech voice.
              This does not affect the AI-generated audio.
            </p>
            <div className="flex items-center gap-4">
              <Slider
                id="speech-rate"
                min={0.5}
                max={1.5}
                step={0.1}
                value={[localRate]}
                onValueChange={handleRateChange}
              />
              <div className="font-mono text-lg w-16 text-center border rounded-md py-1">
                {localRate.toFixed(1)}x
              </div>
              <Button variant="outline" size="icon" onClick={handleTestAudio}>
                <Volume2 className="h-5 w-5" />
                <span className="sr-only">Test audio</span>
              </Button>
            </div>
          </div>
          <div className="space-y-4 p-4 border rounded-lg">
            <Label className="text-base font-medium">Theme Color</Label>
            <p className="text-sm text-muted-foreground">
              Choose a primary color for the application interface.
            </p>
            <div className="flex flex-wrap gap-3">
              {themes.map((t) => (
                <button
                  key={t.name}
                  className={cn(
                    "h-10 w-10 rounded-full border-2 transition-all",
                    localTheme === t.name
                      ? "border-ring"
                      : "border-transparent hover:border-muted-foreground/50",
                  )}
                  style={{ backgroundColor: t.color }}
                  onClick={() => setLocalTheme(t.name)}
                  aria-label={`Select ${t.name} theme`}
                >
                  {localTheme === t.name && (
                    <Check className="h-6 w-6 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={!isSettingsDirty || isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Display Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare /> Chatbot Embed
          </CardTitle>
          <CardDescription>
            Cấu hình Chatbot ID dùng cho widget OmniChat trên trang.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="chatbot-id" className="text-base font-medium">
              ChatBot ID
            </Label>
            <Input
              id="chatbot-id"
              value={localChatBotId}
              onChange={(e) => setLocalChatBotId(e.target.value)}
              placeholder="VD: user_001"
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Giá trị này sẽ được dùng cho bubble chat trên toàn app.
            </p>
          </div>
          <Button
            onClick={handleSaveChatBotId}
            disabled={!isChatBotDirty || isSaving}
          >
            {isSaving && <Loader2 className="mr-2 animate-spin" />} Lưu ChatBot
            ID
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound /> Your Gemini API Key
          </CardTitle>
          <CardDescription>
            <span>
              Provide your own Gemini API key to use for all AI generation. If
              left blank, the system's default key will be used. You can get
              your key from{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Google AI Studio
              </a>
              . Simply click "Create API key in new project" and copy the key
              here.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="api-key" className="text-base font-medium">
              Gemini API Key
            </Label>
            <Input
              id="api-key"
              type="password"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="mt-2"
              disabled={allowGemini === false}
            />
          </div>
          <Button
            onClick={handleSaveApiKey}
            disabled={!isApiKeyDirty || isSaving || allowGemini === false}
          >
            {isSaving && <Loader2 className="mr-2 animate-spin" />}
            Save API Key
          </Button>
          {allowGemini === false && (
            <p className="text-sm text-muted-foreground mt-2">
              Your organization disallows adding a personal Gemini API key.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsView;
