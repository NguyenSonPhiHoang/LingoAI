
"use client";

import { useState, type FC } from 'react';
import { useSettings } from '@/context/settings-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const themes = [
    { name: 'default', color: 'hsl(49, 100%, 50%)' },
    { name: 'orange', color: 'hsl(19, 90%, 50%)' },
    { name: 'blue', color: 'hsl(221, 83%, 53%)' },
    { name: 'green', color: 'hsl(142, 71%, 45%)' },
    { name: 'rose', color: 'hsl(347, 90%, 58%)' },
];

const SettingsView: FC = () => {
    const { speechRate, setSpeechRate, theme, setTheme } = useSettings();
    const [localRate, setLocalRate] = useState(speechRate);
    const [localTheme, setLocalTheme] = useState(theme);
    const { toast } = useToast();

    const handleRateChange = (value: number[]) => {
        setLocalRate(value[0]);
    };

    const handleSave = () => {
        setSpeechRate(localRate);
        setTheme(localTheme);
        toast({
            title: "Settings Saved",
            description: "Your new settings have been applied.",
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
    
    const isDirty = speechRate !== localRate || theme !== localTheme;


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
                     <div className="space-y-4 p-4 border rounded-lg">
                        <Label className="text-base font-medium">Theme Color</Label>
                         <p className="text-sm text-muted-foreground">
                            Choose a primary color for the application interface.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {themes.map((t) => (
                                <button
                                    key={t.name}
                                    className={cn(
                                        "h-10 w-10 rounded-full border-2 transition-all",
                                        localTheme === t.name ? 'border-ring' : 'border-transparent hover:border-muted-foreground/50'
                                    )}
                                    style={{ backgroundColor: t.color }}
                                    onClick={() => setLocalTheme(t.name)}
                                    aria-label={`Select ${t.name} theme`}
                                >
                                    {localTheme === t.name && <Check className="h-6 w-6 text-white mx-auto" />}
                                </button>
                            ))}
                        </div>
                    </div>
                     <Button onClick={handleSave} disabled={!isDirty}>
                        Save Settings
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default SettingsView;
