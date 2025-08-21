
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
    const { playTermAudio, isPlaying, highlightedRange, activePlaybackKey: currentActiveKey } = playbackHook;

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
            const highlightRegex = /<mark>(.*?)<\/mark>/g;
            let lastIndex = 0;
            let match;

            while((match = highlightRegex.exec(segment)) !== null) {
                // Push text before the mark
                if (match.index > lastIndex) {
                    finalParts.push(<span key={`${activePlaybackKey}-pre-${lastIndex}`}>{segment.substring(lastIndex, match.index)}</span>);
                }
                // Push the marked text
                finalParts.push(<mark key={`${activePlaybackKey}-mark-${match.index}`} className="bg-primary/30 text-primary-foreground p-0.5 rounded-sm">{match[1]}</mark>);
                lastIndex = match.index + match[0].length;
            }

            // Push text after the last mark
            if (lastIndex < segment.length) {
                finalParts.push(<span key={`${activePlaybackKey}-post-${lastIndex}`}>{segment.substring(lastIndex)}</span>);
            }

            // Highlighting for audio playback (This part is a simplification. Real-time audio sync needs more complex logic which we already have)
            // For now, we will just render the text with marks and vocab tooltips.
        };
        
         const processAndSplitText = (textToProcess: string) => {
            // Regex to find vocabulary terms or the <mark> tags
            const vocabTerms = Array.from(vocabMap.keys());
            if (vocabTerms.length === 0) {
                 processSegment(textToProcess, 0);
                 return;
            }
            const escapedTerms = vocabTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            const combinedRegex = new RegExp(`(<mark>.*?</mark>|\\b(${escapedTerms.join('|')})\\b)`, 'gi');

            let lastIndex = 0;
            let matchResult;
            while ((matchResult = combinedRegex.exec(textToProcess)) !== null) {
                // Process text before the match
                if (matchResult.index > lastIndex) {
                    processSegment(textToProcess.substring(lastIndex, matchResult.index), 0);
                }

                const matchedTerm = matchResult[0];
                const isMarkTag = matchedTerm.startsWith('<mark>');
                
                if (isMarkTag) {
                    // It's a highlight, process the content inside
                     processSegment(matchedTerm, 0);
                } else {
                     // It's a vocabulary word
                    const vocabWord = vocabMap.get(matchedTerm.toLowerCase());
                    if(vocabWord) {
                        const audioKey = vocabWord.userVocabularyId || vocabWord.id;
                        const isTermPlaying = isPlaying[audioKey];
                        finalParts.push(
                            <TooltipProvider key={`${activePlaybackKey}-vocab-${matchResult.index}`}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="bg-primary/10 text-primary font-semibold rounded-sm px-1 py-0.5 cursor-pointer">
                                            {matchedTerm}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold font-sans text-lg">{vocabWord.pronunciation}</div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => playTermAudio(vocabWord)} disabled={isTermPlaying}>
                                                {isTermPlaying ? <Loader2 className="animate-spin h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    }
                }
                lastIndex = matchResult.index + matchedTerm.length;
            }
            // Process remaining text
            if (lastIndex < textToProcess.length) {
                processSegment(textToProcess.substring(lastIndex), 0);
            }
        };

        if(text) processAndSplitText(text);
        return finalParts;

    }, [text, vocabMap, playTermAudio, isPlaying, activePlaybackKey]);

    return <>{parts}</>;
});
InteractiveText.displayName = 'InteractiveText';

export default InteractiveText;
