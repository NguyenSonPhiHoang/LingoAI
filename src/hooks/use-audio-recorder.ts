"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "./use-toast";

export const useAudioRecorder = () => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string>("");

  const getMicErrorDescription = (err: unknown) => {
    const name = err instanceof Error ? err.name : "";
    switch (name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Microphone permission was denied. Please allow microphone access in your browser settings.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "No microphone was found. Please connect a microphone and try again.";
      case "NotReadableError":
      case "TrackStartError":
        return "The microphone is already in use by another application.";
      case "SecurityError":
        return "Microphone access is blocked by the browser security policy. Try using HTTPS.";
      default:
        return "Could not access the microphone. Please check your browser permissions.";
    }
  };

  const startRecording = useCallback(async () => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    // Prevent re-entrant starts that can leak multiple MediaStreams.
    if (isRecording || mediaRecorderRef.current?.state === "recording") {
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      toast({
        variant: "destructive",
        title: "Microphone Error",
        description: "Audio recording is not supported in this browser.",
      });
      return;
    }

    const getUserMedia = navigator.mediaDevices?.getUserMedia;
    if (!getUserMedia) {
      const httpsHint =
        typeof window.isSecureContext === "boolean" && !window.isSecureContext
          ? " This feature usually requires HTTPS."
          : "";
      toast({
        variant: "destructive",
        title: "Microphone Error",
        description: `Microphone access is not available in this browser.${httpsHint}`,
      });
      return;
    }

    const cleanupStream = () => {
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((track) => track.stop());
        } catch {
          // ignore
        }
        streamRef.current = null;
      }
    };

    const revokeAudioUrl = () => {
      const prev = audioUrlRef.current;
      if (prev) {
        try {
          URL.revokeObjectURL(prev);
        } catch {
          // ignore
        }
        audioUrlRef.current = "";
      }
    };

    // Clean up anything left from a prior attempt.
    cleanupStream();
    revokeAudioUrl();

    try {
      const stream = await getUserMedia.call(navigator.mediaDevices, {
        audio: true,
      });
      streamRef.current = stream;
      setIsRecording(true);
      setAudioURL("");
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        // Ensure mic is released even if MediaRecorder errors.
        cleanupStream();
        mediaRecorderRef.current = null;
        setIsRecording(false);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        const url = URL.createObjectURL(audioBlob);
        audioUrlRef.current = url;
        setAudioURL(url);
        setIsRecording(false);
        mediaRecorderRef.current = null;
        cleanupStream();
      };

      recorder.start();
    } catch (err) {
      console.error("Failed to start recording", err);
      // Ensure we reset state even if getUserMedia fails.
      toast({
        variant: "destructive",
        title: "Microphone Error",
        description: getMicErrorDescription(err),
      });
      mediaRecorderRef.current = null;
      streamRef.current = null;
      setIsRecording(false);
    }
  }, [toast, isRecording]);

  const stopRecording = useCallback(() => {
    // Update UI immediately; don't wait for MediaRecorder events.
    setIsRecording(false);

    const recorder = mediaRecorderRef.current;
    const stream = streamRef.current;

    // If we have an active stream but no recorder, release mic now.
    if (!recorder && stream) {
      try {
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      streamRef.current = null;
      return;
    }

    if (recorder && recorder.state === "recording") {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }

    // Fallback: if onstop never fires, still release the mic.
    if (streamRef.current) {
      setTimeout(() => {
        if (streamRef.current) {
          try {
            streamRef.current.getTracks().forEach((track) => track.stop());
          } catch {
            // ignore
          }
          streamRef.current = null;
        }
        mediaRecorderRef.current = null;
      }, 750);
    }
  }, []);

  useEffect(() => {
    return () => {
      // Ensure mic is released if the component unmounts mid-recording.
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        // ignore
      }

      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((track) => track.stop());
        } catch {
          // ignore
        }
        streamRef.current = null;
      }

      const prev = audioUrlRef.current;
      if (prev) {
        try {
          URL.revokeObjectURL(prev);
        } catch {
          // ignore
        }
        audioUrlRef.current = "";
      }
    };
  }, []);

  return { isRecording, audioURL, startRecording, stopRecording };
};
