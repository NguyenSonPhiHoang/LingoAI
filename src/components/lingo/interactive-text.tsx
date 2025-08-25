
"use client";

import * as React from "react";
import { useMemo } from "react";
import type { FC } from "react";
import { Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CombinedVocabulary } from "@/services/vocabulary";
import type { useAudioPlayback } from "@/hooks/use-audio-playback";


// --- Interactive Text Component ---
interface InteractiveTextProps {
    text: string;
    vocabulary: CombinedVocabulary[];
    playbackHook: ReturnType<typeof useAudioPlayback>;
    activePlaybackKey: string | null;
}

const InteractiveText: FC<InteractiveTextProps> = React.memo(({ text, vocabulary, playbackHook, activePlaybackKey }) => {
    const { playTermAudio, isLoadingAudio, highlightedRange, activePlaybackKey: currentActiveKey } = playbackHook;

    const vocabMap = useMemo(() => {
        const map = new Map<string, CombinedVocabulary>();
        // Sort by length descending to match longer phrases first
        const sortedVocab = [...vocabulary].sort((a, b) => b.term.length - a.term.length);
        sortedVocab.forEach(word => {
            map.set(word.term.toLowerCase(), word);
        });
        return map;
    }, [vocabulary]);

    const parts = useMemo(() => {
        const finalParts: (string | React.ReactNode)[] = [];
        if (!text) return finalParts;
        
        let remainingText = text;

        // Apply highlighting first if active for this component
        if (highlightedRange && currentActiveKey === activePlaybackKey) {
            const { start, end } = highlightedRange;
            if (start < end) { // Ensure range is valid
                 const before = text.substring(0, start);
                 const highlighted = text.substring(start, end);
                 const after = text.substring(end);
                 
                 finalParts.push(<span key="before" dangerouslySetInnerHTML={{ __html: before }} />);
                 finalParts.push(
                    <span key="highlight" className="bg-yellow-200 dark:bg-yellow-700/70 rounded-sm" dangerouslySetInnerHTML={{ __html: highlighted }} />
                 );
                 finalParts.push(<span key="after" dangerouslySetInnerHTML={{ __html: after }} />);
                 return finalParts;
            }
        }
        
        // If no highlighting, just render the text which might contain <strong> tags
        finalParts.push(<span key="full-text" dangerouslySetInnerHTML={{ __html: text }} />);
        return finalParts;


    }, [text, vocabMap, playTermAudio, isLoadingAudio, activePlaybackKey, highlightedRange, currentActiveKey]);

    return <>{parts}</>;
});
InteractiveText.displayName = 'InteractiveText';

export default InteractiveText;
