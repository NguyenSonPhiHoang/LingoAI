"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useToast } from "./use-toast";
import { generateAudio } from "@/ai/flows/generate-audio";
import { translateText } from "@/ai/flows/translate-text-flow";
import {
  updateWord,
  updateUserVocabulary,
  type Word,
  type CombinedVocabulary,
  addWordToVocabulary,
  incrementUserVocabularyLearnCount,
} from "@/services/vocabulary";
import { getUserSettings } from "@/services/settings";
import type { VocabularyEntry } from "@/ai/flows/schemas";

type SetWordsAction = Dispatch<SetStateAction<any[]>>;

const VIETNAMESE_CHAR_REGEX =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const isVietnamese = (text: string) => VIETNAMESE_CHAR_REGEX.test(text);

// --- Audio Playback Helper ---
export const useAudioPlayback = ({
  setWords,
  speechRate,
}: {
  setWords: SetWordsAction;
  speechRate?: number;
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState<Record<string, boolean>>(
    {}
  );
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [highlightedRange, setHighlightedRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [activePlaybackKey, setActivePlaybackKey] = useState<string | null>(
    null
  );
  const [userGeminiKey, setUserGeminiKey] = useState<string | null>(null);

  const [translations, setTranslations] = useState<
    Record<string, string | null>
  >({});
  const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>(
    {}
  );

  const { toast } = useToast();

  const isProbablyUnplayableAudioUrl = (url: string) => {
    if (typeof url !== "string") return true;
    if (!url.startsWith("data:audio/")) return false;
    // Common TTS raw formats that browsers usually cannot play directly.
    return /data:audio\/(pcm|l16)/i.test(url);
  };

  const playAudioUrl = async (key: string, url: string): Promise<boolean> => {
    console.log('🎵 playAudioUrl called:', { key, url });
    
    if (!audioRef.current) {
      console.error('🎵 audioRef.current is null');
      return false;
    }

    setActivePlaybackKey(key);
    setHighlightedRange(null);

    // Ensure we stop any previous playback.
    try {
      audioRef.current.pause();
    } catch {
      // ignore
    }

    console.log('🎵 Setting audio src:', url);
    audioRef.current.src = url;
    audioRef.current.onended = () => {
      setActivePlaybackKey(null);
      setIsLoadingAudio((prev) => ({ ...prev, [key]: false }));
    };
    audioRef.current.onerror = (e) => {
      console.error('🎵 Audio error event:', e);
      console.error('🎵 Audio error - src:', audioRef.current?.src);
      console.error('🎵 Audio error - networkState:', audioRef.current?.networkState);
      console.error('🎵 Audio error - readyState:', audioRef.current?.readyState);
      setActivePlaybackKey(null);
      setIsLoadingAudio((prev) => ({ ...prev, [key]: false }));
    };

    try {
      console.log('🎵 Attempting to play...');
      await audioRef.current.play();
      console.log('🎵 Play successful!');
      return true;
    } catch (e) {
      console.error("🎵 Error playing audio from URL:", e);
      console.error('🎵 Audio element state:', {
        src: audioRef.current?.src,
        networkState: audioRef.current?.networkState,
        readyState: audioRef.current?.readyState,
        error: audioRef.current?.error
      });
      setActivePlaybackKey(null);
      return false;
    }
  };

  // Like playAudioUrl, but resolves only when playback ends (or errors).
  // Used for sequences (term -> sentence) so the second audio doesn't override the first.
  const playAudioUrlAndWait = (key: string, url: string): Promise<boolean> => {
    return new Promise(async (resolve) => {
      if (!audioRef.current) return resolve(false);

      setActivePlaybackKey(key);
      setHighlightedRange(null);

      try {
        audioRef.current.pause();
      } catch {
        // ignore
      }

      audioRef.current.src = url;

      audioRef.current.onended = () => {
        setActivePlaybackKey(null);
        resolve(true);
      };
      audioRef.current.onerror = () => {
        // Recoverable in many cases; avoid noisy console errors.
        setActivePlaybackKey(null);
        resolve(false);
      };

      try {
        await audioRef.current.play();
      } catch (e) {
        console.error("Error playing audio from URL:", e);
        setActivePlaybackKey(null);
        resolve(false);
      }
    });
  };

  const playWithBrowserTTS = (key: string, text: string) => {
    // Add a guard clause to prevent crashes if text is undefined.
    if (typeof text !== "string") {
      console.warn(
        `playWithBrowserTTS called with invalid text for key: ${key}`
      );
      return;
    }

    // Strip HTML tags for accurate playback and highlighting indices
    const plainText = text.replace(/<[^>]+>/g, "");

    if ("speechSynthesis" in window) {
      // Cancel any previous speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(plainText);
      // If Vietnamese characters are present, use Vietnamese voice. Otherwise, default to English.
      if (isVietnamese(plainText)) {
        utterance.lang = "vi-VN";
      } else {
        utterance.lang = "en-US";
      }
      utterance.rate = speechRate && isFinite(speechRate) ? speechRate : 1.0;

      utterance.onstart = () => {
        setActivePlaybackKey(key);
      };

      utterance.onboundary = (event) => {
        setHighlightedRange({
          start: event.charIndex,
          end: event.charIndex + event.charLength,
        });
      };

      utterance.onend = () => {
        setHighlightedRange(null);
        setActivePlaybackKey(null);
      };

      utterance.onerror = () => {
        setHighlightedRange(null);
        setActivePlaybackKey(null);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      toast({
        variant: "destructive",
        title: "Browser Not Supported",
        description: "Your browser does not support text-to-speech.",
      });
    }
  };

  // Generic play function for non-vocabulary text.
  // Policy: do NOT generate AI audio here (token-saving). Use browser TTS only.
  // Vocabulary audio generation/saving is handled by the vocabulary-aware helpers.
  useEffect(() => {
    (async () => {
      try {
        const settings = await getUserSettings();
        if (settings?.geminiApiKey) setUserGeminiKey(settings.geminiApiKey);
      } catch (err) {
        console.warn("Failed to load user settings for Gemini key", err);
      }
    })();
  }, []);

  const playAudio = async (
    key: string,
    text: string,
    existingUrl?: string
  ): Promise<string | undefined> => {
    if (audioRef.current) audioRef.current.pause();
    window.speechSynthesis.cancel();

    console.log('🎵 playAudio called:', { key, text, existingUrl });

    if (existingUrl && !isProbablyUnplayableAudioUrl(existingUrl)) {
      console.log('🎵 Attempting to play existing URL:', existingUrl);
      setIsLoadingAudio((prev) => ({ ...prev, [key]: true }));
      const ok = await playAudioUrl(key, existingUrl);
      console.log('🎵 playAudioUrl result:', ok);
      if (ok) {
        // Success - keep isLoadingAudio true until onended/onerror callbacks
        return existingUrl;
      } else {
        // Failed to play - clear loading state
        setIsLoadingAudio((prev) => ({ ...prev, [key]: false }));
        toast({
          variant: "destructive",
          title: "Audio playback failed",
          description: `Could not play audio from: ${existingUrl}`,
          duration: 5000,
        });
        return undefined;
      }
    }

    if (audioUrls[key]) {
      setIsLoadingAudio((prev) => ({ ...prev, [key]: true }));
      const ok = await playAudioUrl(key, audioUrls[key]);
      if (ok) {
        // Success - keep isLoadingAudio true until callbacks
        return audioUrls[key];
      } else {
        // Failed - clear loading state
        setIsLoadingAudio((prev) => ({ ...prev, [key]: false }));
        return undefined;
      }
    }

    // Browser TTS only (no AI).
    console.log('🎵 Fallback to browser TTS');
    playWithBrowserTTS(key, text);
    return undefined;
  };

  // Generates AI audio and caches it in the session. Returns the URL.
  const generateAndCacheAudio = async (
    key: string,
    text: string
  ): Promise<string | undefined> => {
    setIsLoadingAudio((prev) => ({ ...prev, [key]: true }));
    try {
      const result = await generateAudio({
        text,
        geminiApiKey: userGeminiKey || undefined,
      });
      if (result.audioUrl) {
        setAudioUrls((prev) => ({ ...prev, [key]: result.audioUrl }));
        return result.audioUrl;
      }
    } catch (error: any) {
      console.warn(`Failed to generate AI audio for key "${key}".`, error);
    } finally {
      setIsLoadingAudio((prev) => ({ ...prev, [key]: false }));
    }
    return undefined;
  };

  // Specific function for vocabulary terms with database caching logic.
  const playTermAudio = useCallback(
    async (word: CombinedVocabulary) => {
      const audioKey = word.userVocabularyId || word.id;

      // Count as a "learn" each time user clicks to read the word.
      if (word.userVocabularyId) {
        void incrementUserVocabularyLearnCount(word.userVocabularyId)
          .then((updated) => {
            if (!updated) return;
            setWords((prev) =>
              prev.map((w) =>
                w.userVocabularyId === word.userVocabularyId
                  ? {
                      ...w,
                      learnCount: updated.learnCount,
                      favorite: updated.favorite,
                    }
                  : w
              )
            );
          })
          .catch(() => {
            // ignore learn tracking failures
          });
      }

      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis.cancel();

      if (word.audioUrl && !isProbablyUnplayableAudioUrl(word.audioUrl)) {
        const ok = await playAudioUrl(audioKey, word.audioUrl);
        if (ok) return;
      }

      // Play immediately with browser TTS
      playWithBrowserTTS(audioKey, word.term);

      // Generate high-quality audio in the background
      try {
        const result = await generateAudio({
          text: word.term,
          geminiApiKey: userGeminiKey || undefined,
        });
        if (result.audioUrl) {
          const newAudioUrl = result.audioUrl;
          // Try playing immediately (helps confirm it's playable)
          await playAudioUrl(audioKey, newAudioUrl);
          // Save to DB for future use
          await updateWord(word.id, { audioUrl: newAudioUrl });
          // Update local state so next click uses the cached URL
          setWords((prev) =>
            prev.map((w) =>
              w.id === word.id ? { ...w, audioUrl: newAudioUrl } : w
            )
          );
        }
      } catch (error: any) {
        console.warn(
          `Failed to generate background audio for "${word.term}":`,
          error
        );
      }
    },
    [setWords, speechRate]
  );

  const playAndSaveUnsavedWord = async (
    wordData: {
      word: string;
      definition: string;
      partOfSpeech: string;
      pronunciation: string;
      vietnameseWord: string;
    },
    userId: string,
    audioKey: string
  ) => {
    if (audioRef.current) audioRef.current.pause();
    window.speechSynthesis.cancel();

    setIsLoadingAudio((prev) => ({ ...prev, [audioKey]: true }));
    try {
      // First, try to generate AI audio
      const audioResult = await generateAudio({
        text: wordData.word,
        geminiApiKey: userGeminiKey || undefined,
      });

      if (audioResult.audioUrl) {
        // If successful, create the full vocab entry and save it
        const newWordPayload: VocabularyEntry = {
          term: wordData.word,
          pronunciation: wordData.pronunciation,
          partOfSpeech: wordData.partOfSpeech,
          definition: wordData.definition,
          vietnameseDefinition: wordData.vietnameseWord,
        } as any;

        const savedWord = await addWordToVocabulary(userId, newWordPayload);
        // Update the newly created word with the audio URL
        await updateWord(savedWord.id, { audioUrl: audioResult.audioUrl });

        // Play the new audio
        await playAudioUrl(audioKey, audioResult.audioUrl);

        // Add the fully formed word to the local state to update the UI
        setWords((prev) => [
          ...prev,
          { ...savedWord, audioUrl: audioResult.audioUrl },
        ]);

        toast({
          title: "Word Added & Audio Played",
          description: `"${wordData.word}" has been saved to your vocabulary.`,
        });
      } else {
        // If AI audio fails, fallback to browser TTS
        playWithBrowserTTS(audioKey, wordData.word);
      }
    } catch (error) {
      console.error("Error playing and saving word:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not process audio or save word.",
      });
      // Fallback to browser TTS on any error
      playWithBrowserTTS(audioKey, wordData.word);
    } finally {
      setIsLoadingAudio((prev) => ({ ...prev, [audioKey]: false }));
    }
  };

  // Specific function for example sentences with database caching logic.
  const playSentenceAudio = useCallback(
    async (word: CombinedVocabulary) => {
      const audioKey = `${word.userVocabularyId}-sentence`;

      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis.cancel();

      if (
        word.sentenceAudioUrl &&
        !isProbablyUnplayableAudioUrl(word.sentenceAudioUrl)
      ) {
        const ok = await playAudioUrl(audioKey, word.sentenceAudioUrl);
        if (ok) return;
      }

      // Play immediately with browser TTS
      playWithBrowserTTS(audioKey, word.sentence);

      // Generate high-quality audio in the background
      try {
        const result = await generateAudio({
          text: word.sentence,
          geminiApiKey: userGeminiKey || undefined,
        });
        if (result.audioUrl) {
          const newAudioUrl = result.audioUrl;
          await playAudioUrl(audioKey, newAudioUrl);
          // Save to the user's specific vocabulary entry
          await updateUserVocabulary(word.userVocabularyId, {
            sentenceAudioUrl: newAudioUrl,
          });
          // Update local state
          setWords((prev) =>
            prev.map((w) =>
              w.userVocabularyId === word.userVocabularyId
                ? { ...w, sentenceAudioUrl: newAudioUrl }
                : w
            )
          );
        }
      } catch (error: any) {
        console.warn(
          `Failed to generate background audio for sentence:`,
          error
        );
      }
    },
    [setWords, speechRate]
  );

  // Plays an existing vocabulary word + its example sentence.
  // Policy: only generate AI audio for words that already exist in the user's vocabulary.
  // Caches URLs back to DB (Words.audioUrl and UserVocabulary.sentenceAudioUrl).
  const playExistingVocabularyWordAndSentence = useCallback(
    async (word: CombinedVocabulary, keyBase: string) => {
      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis.cancel();

      // Count as a "learn" once per click.
      if (word.userVocabularyId) {
        void incrementUserVocabularyLearnCount(word.userVocabularyId)
          .then((updated) => {
            if (!updated) return;
            setWords((prev) =>
              prev.map((w) =>
                w.userVocabularyId === word.userVocabularyId
                  ? {
                      ...w,
                      learnCount: updated.learnCount,
                      favorite: updated.favorite,
                    }
                  : w
              )
            );
          })
          .catch(() => {
            // ignore learn tracking failures
          });
      }

      const termKey = `${keyBase}-term`;
      const sentenceKey = `${keyBase}-sentence`;

      const playOrGenerateTerm = async (): Promise<boolean> => {
        if (word.audioUrl && !isProbablyUnplayableAudioUrl(word.audioUrl)) {
          const ok = await playAudioUrlAndWait(termKey, word.audioUrl);
          if (ok) return true;
        }

        setIsLoadingAudio((prev) => ({ ...prev, [termKey]: true }));
        try {
          const result = await generateAudio({
            text: word.term,
            geminiApiKey: userGeminiKey || undefined,
          });

          if (result.audioUrl) {
            await updateWord(word.id, { audioUrl: result.audioUrl });
            setWords((prev) =>
              prev.map((w) =>
                w.id === word.id ? { ...w, audioUrl: result.audioUrl } : w
              )
            );
            const ok = await playAudioUrlAndWait(termKey, result.audioUrl);
            return ok;
          }
        } catch (err) {
          console.warn(
            `Failed to generate AI audio for term: ${word.term}`,
            err
          );
        } finally {
          setIsLoadingAudio((prev) => ({ ...prev, [termKey]: false }));
        }

        // Fallback (no AI URL returned)
        playWithBrowserTTS(termKey, word.term);
        return false;
      };

      const playOrGenerateSentence = async (): Promise<boolean> => {
        if (!word.sentence || typeof word.sentence !== "string") return false;
        const sentenceText = word.sentence.trim();
        if (!sentenceText) return false;

        if (
          word.sentenceAudioUrl &&
          !isProbablyUnplayableAudioUrl(word.sentenceAudioUrl)
        ) {
          const ok = await playAudioUrlAndWait(
            sentenceKey,
            word.sentenceAudioUrl
          );
          if (ok) return true;
        }

        setIsLoadingAudio((prev) => ({ ...prev, [sentenceKey]: true }));
        try {
          const result = await generateAudio({
            text: sentenceText,
            geminiApiKey: userGeminiKey || undefined,
          });

          if (result.audioUrl) {
            await updateUserVocabulary(word.userVocabularyId, {
              sentenceAudioUrl: result.audioUrl,
            });
            setWords((prev) =>
              prev.map((w) =>
                w.userVocabularyId === word.userVocabularyId
                  ? { ...w, sentenceAudioUrl: result.audioUrl }
                  : w
              )
            );
            const ok = await playAudioUrlAndWait(sentenceKey, result.audioUrl);
            return ok;
          }
        } catch (err) {
          console.warn(
            `Failed to generate AI audio for sentence of: ${word.term}`,
            err
          );
        } finally {
          setIsLoadingAudio((prev) => ({ ...prev, [sentenceKey]: false }));
        }

        // Fallback (no AI URL returned)
        playWithBrowserTTS(sentenceKey, sentenceText);
        return false;
      };

      const termPlayedAsAudio = await playOrGenerateTerm();
      // If we had to fall back to browser TTS for term, don't immediately override it.
      if (!termPlayedAsAudio) return;
      await playOrGenerateSentence();
    },
    [setWords]
  );

  const playGlobalWordAudio = useCallback(
    async (word: Word) => {
      const audioKey = word.id;
      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis.cancel();

      if (word.audioUrl && !isProbablyUnplayableAudioUrl(word.audioUrl)) {
        const ok = await playAudioUrl(audioKey, word.audioUrl);
        if (ok) return;
      }

      setIsLoadingAudio((prev) => ({ ...prev, [audioKey]: true }));
      try {
        const result = await generateAudio({
          text: word.term,
          geminiApiKey: userGeminiKey || undefined,
        });
        if (result.audioUrl) {
          const newAudioUrl = result.audioUrl;
          await playAudioUrl(audioKey, newAudioUrl);
          await updateWord(word.id, { audioUrl: newAudioUrl });
          setWords((prev) =>
            prev.map((w) =>
              w.id === word.id ? { ...w, audioUrl: newAudioUrl } : w
            )
          );
        } else {
          playWithBrowserTTS(audioKey, word.term);
        }
      } catch (error: any) {
        playWithBrowserTTS(audioKey, word.term);
      } finally {
        setIsLoadingAudio((prev) => ({ ...prev, [audioKey]: false }));
      }
    },
    [setWords, speechRate]
  );

  const toggleTranslation = async (key: string, text: string) => {
    if (translations[key]) {
      setTranslations((prev) => ({ ...prev, [key]: null }));
      return;
    }

    setIsTranslating((prev) => ({ ...prev, [key]: true }));
    try {
      const result = await translateText({
        text,
        geminiApiKey: userGeminiKey || undefined,
      });
      setTranslations((prev) => ({ ...prev, [key]: result.translation }));
    } catch (error) {
      console.error("Translation failed:", error);
      toast({ variant: "destructive", title: "Translation Failed" });
    } finally {
      setIsTranslating((prev) => ({ ...prev, [key]: false }));
    }
  };

  const stopAudio = (key: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }
    window.speechSynthesis.cancel();
    setActivePlaybackKey(null);
    setIsLoadingAudio((prev) => ({ ...prev, [key]: false }));
  };

  return {
    audioRef,
    isLoadingAudio,
    playAudio,
    stopAudio,
    playWithBrowserTTS,
    playTermAudio,
    playAndSaveUnsavedWord,
    playSentenceAudio,
    playExistingVocabularyWordAndSentence,
    playGlobalWordAudio,
    generateAndCacheAudio,
    highlightedRange,
    activePlaybackKey,
    translations,
    isTranslating,
    toggleTranslation,
  };
};
