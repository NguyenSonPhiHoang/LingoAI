
"use client";

import { useState, type FC } from 'react';
import { useSettings } from '@/context/settings-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SettingsView: FC = () => {
    const { speechRate, setSpeechRate } = useSettings();
    // Local state for the slider to provide real-time feedback before saving.
    const [localRate, setLocalRate] = useState(speechRate);
    const { toast } = useToast();

    const handleRateChange = (value: number[]) => {
        setLocalRate(value[0]);
    };

    const handleSave = () => {
        setSpeechRate(localRate);
        toast({
            title: "Settings Saved",
            description: `Speech rate set to ${localRate}x.`,
        });
    };

    const handleTestAudio = () => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance("This is a test of the current speech rate.");
            utterance.lang = 'en-US';
            utterance.rate = localRate;
            window.speechSynthesis.speak(utterance);
        } else {
             toast({
                variant: "destructive",
                title: "Browser Not Supported",
                description: "Your browser does not support text-to-speech.",
            });
        }
    };


    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Application Settings</CardTitle>
                    <CardDescription>Manage your application preferences here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4 p-4 border rounded-lg">
                        <Label htmlFor="speech-rate" className="text-base font-medium">Browser TTS Rate</Label>
                        <p className="text-sm text-muted-foreground">
                            Adjust the speed of the browser's fallback text-to-speech voice. This does not affect the AI-generated audio.
                        </p>
                        <div className="flex items-center gap-4">
                            <Slider
                                id="speech-rate"
                                min={0.5}
                                max={1.5}
                                step={0.1}
                                value={[localRate]}
                                onValueChange={handleRateChange}
                            />
                            <div className="font-mono text-lg w-16 text-center border rounded-md py-1">
                                {localRate.toFixed(1)}x
                            </div>
                            <Button variant="outline" size="icon" onClick={handleTestAudio}>
                                <Volume2 className="h-5 w-5" />
                                <span className="sr-only">Test audio</span>
                            </Button>
                        </div>
                    </div>
                     <Button onClick={handleSave} disabled={speechRate === localRate}>
                        Save Settings
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default SettingsView;
