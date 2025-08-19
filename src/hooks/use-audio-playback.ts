
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
    const { toast } = useToast();
    const { speechRate } = useSettings();
    
    const playAudioUrl = (url: string) => {
        if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.play().catch(e => console.error("Error playing audio from URL:", e));
        }
    };

    const playWithBrowserTTS = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = speechRate;
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
        // Priority 1: Check for cached URL for general content
        if (audioUrls[key]) {
            playAudioUrl(audioUrls[key]);
            return;
        }

        setIsPlaying(prev => ({ ...prev, [key]: true }));
        try {
            // Priority 2: Generate with AI
            const result = await generateAudio({ text });
            setAudioUrls(prev => ({ ...prev, [key]: result.audioUrl }));
            playAudioUrl(result.audioUrl);
        } catch (error: any) {
             // Priority 3: Fallback to browser TTS
             playWithBrowserTTS(text);
        } finally {
            setIsPlaying(prev => ({ ...prev, [key]: false }));
        }
    };
    
    const playTermAudio = useCallback(async (word: CombinedVocabulary) => {
        const audioKey = word.userVocabularyId || word.id;
        
        // Priority 1: Check for saved audio URL on the word object
        if (word.audioUrl) {
            playAudioUrl(word.audioUrl);
            return;
        }

        setIsPlaying(prev => ({ ...prev, [audioKey]: true }));
        try {
            // Priority 2: Generate with AI
            const result = await generateAudio({ text: word.term });
            const newAudioUrl = result.audioUrl;
            playAudioUrl(newAudioUrl);
            
            // Save the new URL to the database and update local state
            await updateWord(word.id, { audioUrl: newAudioUrl });
            setWords(prev => prev.map(w => w.id === word.id ? { ...w, audioUrl: newAudioUrl } : w));

        } catch (error: any) {
             // Priority 3: Fallback to browser TTS
             playWithBrowserTTS(word.term);
        } finally {
             setIsPlaying(prev => ({ ...prev, [audioKey]: false }));
        }
    }, [setWords, toast, speechRate]);
    
    const playGlobalWordAudio = useCallback(async (word: Word) => {
        const audioKey = word.id;
         if (word.audioUrl) {
            playAudioUrl(word.audioUrl);
            return;
        }

        setIsPlaying(prev => ({ ...prev, [audioKey]: true }));
        try {
            const result = await generateAudio({ text: word.term });
            const newAudioUrl = result.audioUrl;
            playAudioUrl(newAudioUrl);
            
            await updateWord(word.id, { audioUrl: newAudioUrl });
            setWords(prev => prev.map(w => w.id === word.id ? { ...w, audioUrl: newAudioUrl } : w));
        } catch (error: any) {
             playWithBrowserTTS(word.term);
        } finally {
             setIsPlaying(prev => ({ ...prev, [audioKey]: false }));
        }
    }, [setWords, speechRate]);


    return { audioRef, isPlaying, playAudio, playAudioUrl, audioUrls, playTermAudio, playGlobalWordAudio };
};
