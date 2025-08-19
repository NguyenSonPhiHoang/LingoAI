
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
    const { playTermAudio, isPlaying: isTermPlaying, highlightedRange, activePlaybackKey: currentActiveKey } = playbackHook;

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
        let currentIndex = 0;

        const processSegment = (segment: string, segmentOffset: number) => {
            // Regex to split by words and capture delimiters (spaces, punctuation)
            const wordRegex = /([\w'-]+)|([^\w'-]+)/g;
            let match;
            while ((match = wordRegex.exec(segment)) !== null) {
                const part = match[0];
                const start = segmentOffset + match.index;
                const end = start + part.length;
                const isHighlighted = activePlaybackKey && currentActiveKey === activePlaybackKey && highlightedRange && start < highlightedRange.end && end > highlightedRange.start;
                
                finalParts.push(
                    <span key={`${activePlaybackKey}-${start}`} className={cn(isHighlighted && "bg-primary/20 rounded")}>
                        {part}
                    </span>
                );
            }
        };

        const vocabTerms = Array.from(vocabMap.keys());
        if (vocabTerms.length === 0) {
            processSegment(text, 0);
            return finalParts;
        }

        const escapedTerms = vocabTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const regex = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');

        let match;
        let lastIndex = 0;
        while ((match = regex.exec(text)) !== null) {
            // Process text before the match
            if (match.index > lastIndex) {
                processSegment(text.substring(lastIndex, match.index), lastIndex);
            }

            const matchedTerm = match[0];
            const vocabWord = vocabMap.get(matchedTerm.toLowerCase());
            
            if (vocabWord) {
                const isPlaying = isTermPlaying[vocabWord.userVocabularyId];
                finalParts.push(
                    <TooltipProvider key={`${activePlaybackKey}-vocab-${match.index}`}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="bg-primary/10 text-primary font-semibold rounded-sm px-1 py-0.5 cursor-pointer">
                                    {matchedTerm}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <div className="flex items-center gap-2">
                                    <div className="font-bold font-sans">{vocabWord.pronunciation}</div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => playTermAudio(vocabWord)} disabled={isPlaying}>
                                        {isPlaying ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            } else {
                 finalParts.push(matchedTerm);
            }
            lastIndex = match.index + matchedTerm.length;
        }

        // Process remaining text
        if (lastIndex < text.length) {
            processSegment(text.substring(lastIndex), lastIndex);
        }

        return finalParts;

    }, [text, vocabMap, playTermAudio, isTermPlaying, highlightedRange, activePlaybackKey, currentActiveKey]);

    return <>{parts}</>;
});
InteractiveText.displayName = 'InteractiveText';

export default InteractiveText;
