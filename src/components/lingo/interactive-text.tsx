
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

    const parts = useMemo(() => {
        if (!text) return [];
        
        // This is the raw text without any HTML tags, used for highlighting calculation
        const plainText = text.replace(/<[^>]+>/g, '');
        
        // Apply highlighting only if it's for this specific component instance
        if (highlightedRange && currentActiveKey === activePlaybackKey) {
            const { start, end } = highlightedRange;
            if (start < end && end <= plainText.length) {
                 const before = plainText.substring(0, start);
                 const highlighted = plainText.substring(start, end);
                 const after = plainText.substring(end);
                 
                 // Since we stripped tags, we just render the plain text with a highlight
                 return [
                    <span key="before">{before}</span>,
                    <span key="highlight" className="bg-yellow-200 dark:bg-yellow-700/70 rounded-sm">{highlighted}</span>,
                    <span key="after">{after}</span>,
                 ];
            }
        }
        
        // If no active highlighting, render the original text, interpreting HTML tags
        return [<span key="full-text" dangerouslySetInnerHTML={{ __html: text }} />];

    }, [text, activePlaybackKey, highlightedRange, currentActiveKey]);

    return <>{parts}</>;
});
InteractiveText.displayName = 'InteractiveText';

export default InteractiveText;
