import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Play,
    Pause,
    ArrowUp,
    ArrowDown,
    RefreshCcw,
} from 'lucide-react';

interface PlaybackFloatingControlsProps {
    messageCount: number;
    currentMessageIndex: number;
    isPlaying: boolean;
    isSidePanelOpen: boolean;
    onTogglePlayback: () => void;
    onReset: () => void;
    onSkipToEnd: () => void;
    onForwardOne: () => void;
    onBackwardOne: () => void;
}

export function PlaybackFloatingControls({
    messageCount,
    currentMessageIndex,
    isPlaying,
    isSidePanelOpen,
    onTogglePlayback,
    onReset,
    onSkipToEnd,
    onForwardOne,
    onBackwardOne,
}: PlaybackFloatingControlsProps) {
    // Match superagent renderFloatingControls container positioning style.
    const controlsPositionClass = isSidePanelOpen
        ? 'left-1/2 -translate-x-1/2 sm:left-[calc(50%-225px)] md:left-[calc(50%-250px)] lg:left-[calc(50%-275px)] xl:left-[calc(50%-325px)]'
        : 'left-1/2 -translate-x-1/2';

    const isPlaybackCompleted = currentMessageIndex >= messageCount && messageCount > 0;

    const makeYours = () => {
        const url = process.env.NEXT_PUBLIC_FLASHREV_FRONTEND;
        if (url) {
            window.open(url, '_blank');
            return;
        }
        window.open('/', '_blank');
    };

    if (messageCount <= 0) return null;

    return (
        <div
            className={`fixed bottom-4 z-10 transform rounded-[18px] border shadow-sm px-4 py-2 bg-background w-[calc(100vw-2rem)] max-w-[450px] ${controlsPositionClass} cursor-default`}
        >
            <div className="flex w-full items-center justify-between gap-3">
                {/* Left: status text + (keep existing controls hidden, to match superagent) */}
                <div className="flex items-center text-sm text-muted-foreground">
                    <span className="!opacity-[0.8]">
                        {isPlaybackCompleted ? 'Task replay completed' : 'Replay in progress'}
                    </span>
                </div>

                {/* Right: actions (match superagent renderFloatingControls) */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={isPlaybackCompleted ? onReset : onSkipToEnd}
                        className="h-8 rounded-[32px] bg-black !px-6 text-xs font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 cursor-pointer"
                    >
                        {isPlaybackCompleted ? (
                            <>
                                <Play className="h-4 w-4" /> Replay
                            </>
                        ) : (
                            <>
                                <ArrowDown className="h-4 w-4" /> Go to results
                            </>
                        )}
                    </Button>

                    <Button
                        variant="default"
                        size="sm"
                        onClick={makeYours}
                        className="h-8 rounded-[32px] bg-[#3270ED] hover:bg-[#3270ED]/90 px-4 text-xs font-medium text-white cursor-pointer"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8.63632 2.27273L8.63632 7.36364L7.82178 7.36364L7.82178 8.63636L8.63632 8.63636L8.63632 13.7273C8.63632 14.4273 9.20905 15 9.90905 15L13.7272 15C14.4272 15 15 14.4273 15 13.7273L15 2.27273C15 1.57273 14.4272 1 13.7272 1L9.90905 1C9.20905 1 8.63632 1.57273 8.63632 2.27273ZM13.7272 13.7273L9.90905 13.7273L9.90905 2.27273L13.7272 2.27273L13.7272 13.7273Z" fill="white" />
                            <path d="M2.27273 9.2538L2.27273 8.47745L1 8.47745L1 9.2538L1 9.76292L1 10.0684L2.27273 10.0684L2.27273 9.76292L2.27273 9.2538Z" fill="white" />
                            <path d="M2.27273 11.0224L1 11.0224L1 12.2378L1 12.6133L2.27273 12.6133L2.27273 12.2378L2.27273 11.0224Z" fill="white" />
                            <path d="M2.27273 13.5682L1 13.5682L1 13.7273C1 14.4273 1.57273 15 2.27273 15L2.27273 13.5682Z" fill="white" />
                            <path d="M2.27273 3.38565L1 3.38565L1 3.76746L1 4.97656L2.27273 4.97656L2.27273 3.76746L2.27273 3.38565Z" fill="white" />
                            <path d="M3.22705 1.00071L3.22705 2.27344L4.49978 2.27344L4.49978 1.00071L3.22705 1.00071Z" fill="white" />
                            <path d="M2.27273 0.999822C1.57273 0.999822 1 1.57255 1 2.27255L1 2.43164L2.27273 2.43164L2.27273 0.999822Z" fill="white" />
                            <path d="M2.27273 6.23797L2.27273 5.93253L1 5.93253L1 6.23797L1 6.74709L1 7.52344L2.27273 7.52344L2.27273 6.74709L2.27273 6.23797Z" fill="white" />
                            <path d="M6.72732 6.23797L6.72732 5.93253L5.45459 5.93253L5.45459 6.23797L5.45459 6.74709L5.45459 7.52344L6.72732 7.52344L6.72732 6.74709L6.72732 6.23797Z" fill="white" />
                            <path d="M6.72732 3.38565L5.45459 3.38565L5.45459 3.76746L5.45459 4.97656L6.72732 4.97656L6.72732 3.76746L6.72732 3.38565Z" fill="white" />
                            <path d="M5.45459 2.43164L6.72732 2.43164L6.72732 2.27255C6.72732 1.57255 6.15459 0.999822 5.45459 0.999822L5.45459 2.43164Z" fill="white" />
                            <path d="M6.72732 11.0224L5.45459 11.0224L5.45459 12.2378L5.45459 12.6133L6.72732 12.6133L6.72732 12.2378L6.72732 11.0224Z" fill="white" />
                            <path d="M6.72732 13.7273L6.72732 13.5682L5.45459 13.5682L5.45459 15C6.15459 15 6.72732 14.4273 6.72732 13.7273Z" fill="white" />
                            <path d="M6.72732 9.2538L6.72732 8.47745L5.45459 8.47745L5.45459 9.2538L5.45459 9.76292L5.45459 10.0684L6.72732 10.0684L6.72732 9.76292L6.72732 9.2538Z" fill="white" />
                            <path d="M3.22705 13.7273L3.22705 15L4.49978 15L4.49978 13.7273L3.22705 13.7273Z" fill="white" />
                        </svg>
                        Make yours
                    </Button>
                </div>
            </div>
        </div>
    );
}
