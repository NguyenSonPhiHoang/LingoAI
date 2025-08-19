
import { useState, useRef, useCallback, type Dispatch, type SetStateAction } from "react";
import { useToast } from "./use-toast";
import { generateAudio } from "@/ai/flows/generate-audio";
import { updateWord, type Word, type CombinedVocabulary } from "@/services/vocabulary";
import { useSettings } from "@/context/settings-context";

type SetWordsAction = Dispatch<SetStateAction<any[]>>;

// --- Audio Playback Helper ---
export const useAudioPlayback = ({ setWords }: { setWords: SetWordsAction }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});
    const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
    const [highlightedRange, setHighlightedRange] = useState<{start: number, end: number} | null>(null);
    const [activePlaybackKey, setActivePlaybackKey] = useState<string | null>(null);

    const { toast } = useToast();
    const { speechRate } = useSettings();
    
    const playAudioUrl = (key: string) => {
        if (audioRef.current && audioUrls[key]) {
            setActivePlaybackKey(key);
            setHighlightedRange(null); // Clear previous highlighting
            audioRef.current.src = audioUrls[key];
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
            playAudioUrl(key);
            return;
        }

        setIsPlaying(prev => ({ ...prev, [key]: true }));
        try {
            // Priority 2: Generate with AI
            const result = await generateAudio({ text });
            setAudioUrls(prev => ({ ...prev, [key]: result.audioUrl }));
            
            // Need to update state before playing
            if (audioRef.current) {
                 setActivePlaybackKey(key);
                 setHighlightedRange(null);
                 audioRef.current.src = result.audioUrl;
                 audioRef.current.play().catch(e => console.error("Error playing audio from URL:", e));
                 audioRef.current.onended = () => {
                    setActivePlaybackKey(null);
                 };
            }

        } catch (error: any) {
             // Priority 3: Fallback to browser TTS
             playWithBrowserTTS(key, text);
        } finally {
            setIsPlaying(prev => ({ ...prev, [key]: false }));
        }
    };
    
    const playTermAudio = useCallback(async (word: CombinedVocabulary) => {
        const audioKey = word.userVocabularyId || word.id;
        
        if (audioRef.current) audioRef.current.pause();
        window.speechSynthesis.cancel();
        
        // Priority 1: Check for saved audio URL on the word object
        if (word.audioUrl) {
             if (audioRef.current) {
                 setActivePlaybackKey(audioKey);
                 audioRef.current.src = word.audioUrl;
                 audioRef.current.play().catch(e => console.error("Error playing audio from URL:", e));
                  audioRef.current.onended = () => {
                    setActivePlaybackKey(null);
                 };
            }
            return;
        }

        setIsPlaying(prev => ({ ...prev, [audioKey]: true }));
        try {
            // Priority 2: Generate with AI
            const result = await generateAudio({ text: word.term });
            const newAudioUrl = result.audioUrl;
            
             if (audioRef.current) {
                 setActivePlaybackKey(audioKey);
                 audioRef.current.src = newAudioUrl;
                 audioRef.current.play().catch(e => console.error("Error playing audio from URL:", e));
                  audioRef.current.onended = () => {
                    setActivePlaybackKey(null);
                 };
            }
            
            // Save the new URL to the database and update local state
            await updateWord(word.id, { audioUrl: newAudioUrl });
            setWords(prev => prev.map(w => w.id === word.id ? { ...w, audioUrl: newAudioUrl } : w));

        } catch (error: any) {
             // Priority 3: Fallback to browser TTS
             playWithBrowserTTS(audioKey, word.term);
        } finally {
             setIsPlaying(prev => ({ ...prev, [audioKey]: false }));
        }
    }, [setWords, speechRate]);
    
    const playGlobalWordAudio = useCallback(async (word: Word) => {
        const audioKey = word.id;
        if (audioRef.current) audioRef.current.pause();
        window.speechSynthesis.cancel();
        
         if (word.audioUrl) {
            if (audioRef.current) {
                 setActivePlaybackKey(audioKey);
                 audioRef.current.src = word.audioUrl;
                 audioRef.current.play().catch(e => console.error("Error playing audio from URL:", e));
                  audioRef.current.onended = () => {
                    setActivePlaybackKey(null);
                 };
            }
            return;
        }

        setIsPlaying(prev => ({ ...prev, [audioKey]: true }));
        try {
            const result = await generateAudio({ text: word.term });
            const newAudioUrl = result.audioUrl;

             if (audioRef.current) {
                 setActivePlaybackKey(audioKey);
                 audioRef.current.src = newAudioUrl;
                 audioRef.current.play().catch(e => console.error("Error playing audio from URL:", e));
                  audioRef.current.onended = () => {
                    setActivePlaybackKey(null);
                 };
            }
            
            await updateWord(word.id, { audioUrl: newAudioUrl });
            setWords(prev => prev.map(w => w.id === word.id ? { ...w, audioUrl: newAudioUrl } : w));
        } catch (error: any) {
             playWithBrowserTTS(audioKey, word.term);
        } finally {
             setIsPlaying(prev => ({ ...prev, [audioKey]: false }));
        }
    }, [setWords, speechRate]);


    return { audioRef, isPlaying, playAudio, playTermAudio, playGlobalWordAudio, highlightedRange, activePlaybackKey };
};
