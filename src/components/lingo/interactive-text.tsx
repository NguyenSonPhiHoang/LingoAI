
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
        const finalParts: React.ReactNode[] = [];
        if (!text) return finalParts;
        
        let remainingText = text;

        // Apply highlighting first if active for this component
        if (highlightedRange && currentActiveKey === activePlaybackKey) {
            const { start, end } = highlightedRange;
            const before = text.substring(0, start);
            const highlighted = text.substring(start, end);
            const after = text.substring(end);
            remainingText = before + '|||HIGHLIGHTED|||' + after;
        }

        // Create a regex to find all vocabulary terms.
        const vocabTerms = Array.from(vocabMap.keys());
        if (vocabTerms.length === 0 && !remainingText.includes('|||HIGHLIGHTED|||')) {
            return [text]; // No vocab and no highlight, just return the text
        }
        
        const escapedTerms = vocabTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const combinedRegex = new RegExp(`(\\b(?:${escapedTerms.join('|')})\\b|\\|\\|\\|HIGHLIGHTED\\|\\|\\|)`);
        
        const textParts = remainingText.split(combinedRegex).filter(Boolean); // Filter out empty strings
        
        textParts.forEach((part, index) => {
            const lowerPart = part.toLowerCase();
            if (lowerPart === '|||highlighted|||') {
                 const { start, end } = highlightedRange!;
                 finalParts.push(
                    <span key={`highlight-${index}`} className="bg-yellow-200 dark:bg-yellow-700/70 rounded-sm">
                        {text.substring(start, end)}
                    </span>
                 );
            } else if (vocabMap.has(lowerPart)) {
                const vocabWord = vocabMap.get(lowerPart)!;
                const audioKey = vocabWord.userVocabularyId || vocabWord.id;
                const isAudioLoading = isLoadingAudio[audioKey];
                finalParts.push(
                    <TooltipProvider key={`${activePlaybackKey}-vocab-${index}`}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="bg-primary/10 text-primary font-semibold rounded-sm px-1 py-0.5 cursor-pointer">
                                    {part}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <div className="flex items-center gap-2">
                                    <div className="font-bold font-sans text-lg">{vocabWord.pronunciation}</div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => playTermAudio(vocabWord)} disabled={isAudioLoading}>
                                        {isAudioLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            } else {
                finalParts.push(part);
            }
        });

        return finalParts;

    }, [text, vocabMap, playTermAudio, isLoadingAudio, activePlaybackKey, highlightedRange, currentActiveKey]);

    return <>{parts}</>;
});
InteractiveText.displayName = 'InteractiveText';

export default InteractiveText;
