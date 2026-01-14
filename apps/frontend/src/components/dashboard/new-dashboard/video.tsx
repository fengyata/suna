'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Film, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { PromptExamples } from '@/components/shared/prompt-examples';
import type { ModePanelProps } from './mode-panel-props';
import { sunaModes, type SunaSamplePrompt } from '../suna-modes-data';

const VIDEO_MODELS: Record<
  string,
  {
    model: string;
    name: string;
    aspect_ratio: string[];
    duration: string[];
    resolution: string[];
    nums: number[];
  }
> = {
  'sora-2': {
    model: 'sora-2',
    name: 'Sora 2',
    aspect_ratio: ['16:9', '9:16'],
    duration: ['10', '15'],
    resolution: ['720p'],
    nums: [1, 2, 3, 4],
  },
  'veo-3.1': {
    model: 'veo-3.1',
    name: 'Veo 3.1',
    aspect_ratio: ['16:9', '9:16', '1:1'],
    duration: ['4', '8'],
    resolution: ['720p', '1080p'],
    nums: [1, 2, 3, 4],
  },
  'kling-v2.6': {
    model: 'kling-v2.6',
    name: 'Kling v2.6',
    aspect_ratio: ['16:9', '9:16', '1:1'],
    duration: ['4', '8'],
    resolution: [],
    nums: [1, 2, 3, 4],
  },
};

function getSora2ModelVariant(params: { baseModel: string; duration: string; aspectRatio: string }) {
  if (params.baseModel !== 'sora-2') return params.baseModel;
  if (params.duration === '10' && params.aspectRatio === '16:9') return 'sora2-landscape';
  if (params.duration === '10' && params.aspectRatio === '9:16') return 'sora2-portrait';
  if (params.duration === '15' && params.aspectRatio === '16:9') return 'sora2-landscape-15s';
  if (params.duration === '15' && params.aspectRatio === '9:16') return 'sora2-portrait-15s';
  return params.baseModel;
}

function getRandomPrompts(prompts: SunaSamplePrompt[], count: number): SunaSamplePrompt[] {
  const shuffled = [...prompts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function VideoModePanel({ mode, subType, setSubType, setInitialParameters, onPromptSelect }: ModePanelProps) {
  const [model, setModel] = useState<string>('sora-2');
  const [randomizedPrompts, setRandomizedPrompts] = useState<SunaSamplePrompt[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const modelOptions = useMemo(() => Object.values(VIDEO_MODELS), []);
  const modelConfig = VIDEO_MODELS[model] ?? VIDEO_MODELS['sora-2'];
  const videoMode = useMemo(() => sunaModes.find((m) => m.id === 'video') ?? null, []);

  useEffect(() => {
    const resolvedAspect = modelConfig.aspect_ratio[0] ?? '16:9';
    const resolvedDuration = modelConfig.duration[0] ?? '4';
    const resolvedModel = getSora2ModelVariant({
      baseModel: model,
      duration: resolvedDuration,
      aspectRatio: resolvedAspect,
    });

    setInitialParameters({
      model: resolvedModel,
      aspect_ratio: resolvedAspect,
      duration: resolvedDuration,
      resolution: modelConfig.resolution.length > 0 ? modelConfig.resolution[0] : undefined,
      nums: String(modelConfig.nums[0] ?? 1),
      source_from: ['user'],
      mode,
    });
  }, [mode, model, modelConfig, setInitialParameters]);

  useEffect(() => {
    if (!videoMode) return;
    setRandomizedPrompts(getRandomPrompts(videoMode.samplePrompts, 4));
  }, [videoMode]);

  const handleRefreshPrompts = () => {
    if (!videoMode) return;
    setIsRefreshing(true);
    setRandomizedPrompts(getRandomPrompts(videoMode.samplePrompts, 4));
    setTimeout(() => setIsRefreshing(false), 300);
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Banner */}
      <div className="mb-8 bg-black rounded-xl p-6 text-white flex flex-col md:flex-row md:justify-between md:items-center shadow-lg relative overflow-hidden gap-4">
        <div className="relative z-10">
          <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
            <Film size={20} className="text-red-500" />
            Video Creator
          </h2>
          <p className="text-gray-400 text-sm max-w-lg">
            Create cinematic videos with hyper-real lighting and consistent motion.
          </p>
        </div>

        <div className="w-full md:w-[260px] relative z-10">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-full bg-white/10 text-white border-white/20 cursor-pointer">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((m) => (
                <SelectItem key={m.model} value={m.model} className="cursor-pointer">
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-red-900/40 to-transparent pointer-events-none" />
      </div>

      {videoMode?.options && (
        <div className="space-y-3 animate-in fade-in-0 zoom-in-95 duration-300 delay-75 mb-8">
          <p className="text-xs text-muted-foreground/60">{videoMode.options.title}</p>
          <ScrollArea className="w-full">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pb-2">
              {videoMode.options.items.map((item) => {
                const active = subType === item.id;
                return (
                  <Card
                    key={item.id}
                    className={
                      'flex flex-col items-center gap-2 cursor-pointer group p-2 transition-all duration-200 border border-border rounded-xl overflow-hidden relative'
                    }
                    onClick={() => {
                      setSubType(item.id);
                      onPromptSelect(`Generate a ${item.name.toLowerCase()} style video`);
                    }}
                  >
                    <div
                      className={
                        'w-full aspect-square rounded-lg border border-border/50 group-hover:border-primary/50 group-hover:scale-105 transition-all duration-200 flex items-center justify-center overflow-hidden relative'
                      }
                    >
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover"
                          loading="lazy"
                        />
                      ) : null}
                      {active && (
                        <div className="absolute inset-0 ring-2 ring-primary/30 pointer-events-none rounded-lg" />
                      )}
                    </div>
                    <span className="text-xs text-center text-muted-foreground group-hover:text-foreground transition-colors duration-200 font-medium">
                      {item.name}
                    </span>
                  </Card>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {randomizedPrompts.length > 0 && (
        <div className="animate-in fade-in-0 zoom-in-95 duration-300">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground/60">Sample prompts</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshPrompts}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <span className={isRefreshing ? 'animate-spin' : undefined}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </span>
              </Button>
            </div>
            <PromptExamples
              prompts={randomizedPrompts}
              onPromptClick={(p) => onPromptSelect(p)}
              variant="text"
              columns={1}
              showTitle={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

