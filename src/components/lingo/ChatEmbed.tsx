"use client";

import React, { useEffect, useState } from "react";
import { useSettings } from "@/context/settings-context";
import { getUserSettings } from "@/services/settings";
import { useAuth } from "@/context/auth-context";

const CHAT_SCRIPT_SRC = "https://omnichat.fitlhu.com/embed.js";
const DEFAULT_CHATBOT_ID = "user_001";
const TARGET_ID = "omnichat-container";

const THEME_COLOR_MAP: Record<string, string> = {
  default: "#1f5aa8",
  orange: "#ff7a18",
  blue: "#1f5aa8",
  green: "#16a34a",
  rose: "#fb7185",
};

export default function ChatEmbed() {
  const { theme } = useSettings();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [customIcon, setCustomIcon] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [chatBotId, setChatBotId] = useState<string>(DEFAULT_CHATBOT_ID);

  useEffect(() => {
    const existing = document.getElementById("omnichat-embed-script");
    if (existing) {
      existing.setAttribute("data-chatbot-id", chatBotId);
      return;
    }
    const s = document.createElement("script");
    s.id = "omnichat-embed-script";
    s.src = CHAT_SCRIPT_SRC;
    s.defer = true;
    s.setAttribute("data-chatbot-id", chatBotId);
    s.setAttribute("data-target-id", TARGET_ID);
    document.body.appendChild(s);
  }, [chatBotId]);

  useEffect(() => {
    try {
      const icon = localStorage.getItem("lingoai_chatIcon");
      const color = localStorage.getItem("lingoai_chatColor");
      setCustomIcon(icon && icon.length ? icon : null);
      setCustomColor(color && color.length ? color : null);
    } catch (err) {
      // ignore
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const settings = await getUserSettings();
        if (settings?.chatBotId) setChatBotId(settings.chatBotId);
      } catch (err) {
        console.warn("Failed to load chatbot id from settings", err);
      }
    })();
  }, []);

  const bubbleColor =
    customColor || THEME_COLOR_MAP[theme] || THEME_COLOR_MAP.default;

  // Hide chat bubble if admin disabled OmniChat for this user
  if (user && user.omniChatEnabled === false) return null;

  return (
    <>
      <div className={`chat-box ${open ? "open" : ""}`} id="omnichat-box">
        <div id={TARGET_ID} style={{ width: "100%", height: "100%" }} />
      </div>

      <div
        className="chat-bubble"
        id="omnichat-toggle"
        onClick={() => setOpen((v) => !v)}
        role="button"
        aria-label="Open chat"
        style={{ background: bubbleColor }}
      >
        {customIcon ? (
          // If a custom icon URL is set, use it (auto-sized and rounded)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={customIcon}
            alt="chat icon"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              objectFit: "cover",
            }}
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ width: 32, height: 32 }}
          >
            <path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5.2.04.36.2.36.4v1.6c0 .28-.22.5-.5.5h-4a.5.5 0 0 1 0-1h3.5v-1.12c0-.22-.1-.42-.26-.56A8.01 8.01 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 2.05-.78 3.92-2.08 5.34-.16.14-.26.34-.26.56V21.5H20a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5v-1.6c0-.2.16-.36.36-.4C19.13 20.17 22 16.42 22 12A10 10 0 0 0 12 2Zm-1 14H9v-2h2v2Zm4 0h-2v-2h2v2Zm-4-4H9V9h2v3Zm4 0h-2V9h2v3Z" />
          </svg>
        )}
      </div>

      <style jsx>{`
        .chat-bubble {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
          transition: transform 0.3s ease;
          z-index: 1000;
        }
        .chat-bubble:hover {
          transform: scale(1.06);
        }

        .chat-box {
          position: fixed;
          bottom: 90px;
          right: 20px;
          width: 400px;
          height: 600px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
          display: none;
          flex-direction: column;
          overflow: hidden;
          z-index: 999;
        }
        .chat-box.open {
          display: flex;
        }
      `}</style>
    </>
  );
}
