
import { useState, useRef, useCallback, type Dispatch, type SetStateAction } from "react";
import { useToast } from "./use-toast";
import { generateAudio } from "@/ai/flows/generate-audio";
import { translateText } from "@/ai/flows/translate-text-flow";
import { updateWord, type Word, type CombinedVocabulary } from "@/services/vocabulary";
import { useSettings } from "@/context/settings-context";

type SetWordsAction = Dispatch<SetStateAction<any[]>>;

// --- Audio Playback Helper ---
export const useAudioPlayback = ({ setWords }: { setWords: SetWordsAction }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isLoadingAudio, setIsLoadingAudio] = useState<Record<string, boolean>>({});
    const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
    const [highlightedRange, setHighlightedRange] = useState<{start: number, end: number} | null>(null);
    const [activePlaybackKey, setActivePlaybackKey] = useState<string | null>(null);

    const [translations, setTranslations] = useState<Record<string, string | null>>({});
    const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>({});

    const { toast } = useToast();
    const { speechRate } = useSettings();
    
    const playAudioUrl = (key: string, url: string) => {
        if (audioRef.current) {
            setActivePlaybackKey(key);
            setHighlightedRange(null); // Clear previous highlighting
            audioRef.current.src = url;
            audioRef.current.play().catch(e => console.error("Error playing audio from URL:", e));
            audioRef.current.onended = () => {
                setActivePlaybackKey(null);
            };
        }
    };

    const playWithBrowserTTS = (key: string, text: string) => {
        if ('speechSynthesis' in window) {
            // Cancel any previous speech
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = speechRate;
            
            utterance.onstart = () => {
                 setActivePlaybackKey(key);
            };
            
            utterance.onboundary = (event) => {
                setHighlightedRange({ start: event.charIndex, end: event.charIndex + event.charLength });
            };
            
            utterance.onend = () => {
                setHighlightedRange(null);
                setActivePlaybackKey(null);
            };
            
            utterance.onerror = () => {
                setHighlightedRange(null);
                setActivePlaybackKey(null);
            }

            window.speechSynthesis.speak(utterance);
        } else {
            toast({
                variant: "destructive",
                title: "Browser Not Supported",
                description: "Your browser does not support text-to-speech.",
            });
        }
    };

    const playAudio = async (key: string, text: string) => {
        // Stop any currently playing audio
        if (audioRef.current) audioRef.current.pause();
        window.speechSynthesis.cancel();
        
        // Priority 1: Check for cached URL for general content
        if (audioUrls[key]) {
            playAudioUrl(key, audioUrls[key]);
            return;
        }

        setIsLoadingAudio(prev => ({ ...prev, [key]: true }));
        try {
            // Priority 2: Generate with AI
            const result = await generateAudio({ text });
            if (result.audioUrl) {
                setAudioUrls(prev => ({ ...prev, [key]: result.audioUrl }));
                playAudioUrl(key, result.audioUrl);
            } else {
                 // Priority 3: Fallback to browser TTS if AI returns empty URL
                 playWithBrowserTTS(key, text);
            }
        } catch (error: any) {
             // Also fallback if the flow itself throws an unexpected error
             playWithBrowserTTS(key, text);
        } finally {
            setIsLoadingAudio(prev => ({ ...prev, [key]: false }));
        }
    };
    
    const playTermAudio = useCallback(async (word: CombinedVocabulary) => {
        const audioKey = word.userVocabularyId || word.id;
        
        if (audioRef.current) audioRef.current.pause();
        window.speechSynthesis.cancel();
        
        // Priority 1: Check for saved audio URL on the word object
        if (word.audioUrl) {
             playAudioUrl(audioKey, word.audioUrl);
             return;
        }

        setIsLoadingAudio(prev => ({ ...prev, [audioKey]: true }));
        try {
            // Priority 2: Generate with AI
            const result = await generateAudio({ text: word.term });
            if (result.audioUrl) {
                const newAudioUrl = result.audioUrl;
                playAudioUrl(audioKey, newAudioUrl);
                
                // Save the new URL to the database and update local state
                await updateWord(word.id, { audioUrl: newAudioUrl });
                setWords(prev => prev.map(w => w.id === word.id ? { ...w, audioUrl: newAudioUrl } : w));
            } else {
                 // Priority 3: Fallback to browser TTS
                 playWithBrowserTTS(audioKey, word.term);
            }

        } catch (error: any) {
             // Also fallback if the flow itself throws an unexpected error
             playWithBrowserTTS(audioKey, word.term);
        } finally {
             setIsLoadingAudio(prev => ({ ...prev, [audioKey]: false }));
        }
    }, [setWords, speechRate]);
    
    const playGlobalWordAudio = useCallback(async (word: Word) => {
        const audioKey = word.id;
        if (audioRef.current) audioRef.current.pause();
        window.speechSynthesis.cancel();
        
         if (word.audioUrl) {
            playAudioUrl(audioKey, word.audioUrl);
            return;
        }

        setIsLoadingAudio(prev => ({ ...prev, [audioKey]: true }));
        try {
            const result = await generateAudio({ text: word.term });
            if (result.audioUrl) {
                const newAudioUrl = result.audioUrl;
                playAudioUrl(audioKey, newAudioUrl);
                await updateWord(word.id, { audioUrl: newAudioUrl });
                setWords(prev => prev.map(w => w.id === word.id ? { ...w, audioUrl: newAudioUrl } : w));
            } else {
                 playWithBrowserTTS(audioKey, word.term);
            }
        } catch (error: any) {
             playWithBrowserTTS(audioKey, word.term);
        } finally {
             setIsLoadingAudio(prev => ({ ...prev, [audioKey]: false }));
        }
    }, [setWords, speechRate]);

    const toggleTranslation = async (key: string, text: string) => {
        if (translations[key]) {
            setTranslations(prev => ({ ...prev, [key]: null }));
            return;
        }

        setIsTranslating(prev => ({ ...prev, [key]: true }));
        try {
            const result = await translateText({ text });
            setTranslations(prev => ({ ...prev, [key]: result.translation }));
        } catch (error) {
            console.error("Translation failed:", error);
            toast({ variant: "destructive", title: "Translation Failed" });
        } finally {
            setIsTranslating(prev => ({ ...prev, [key]: false }));
        }
    };


    return { audioRef, isLoadingAudio, playAudio, playTermAudio, playGlobalWordAudio, highlightedRange, activePlaybackKey, translations, isTranslating, toggleTranslation };
};
