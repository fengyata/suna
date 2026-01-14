'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { PromptExamples } from '@/components/shared/prompt-examples';
import type { ModePanelProps } from './mode-panel-props';
import { sunaModes, type SunaSamplePrompt } from '../suna-modes-data';

const IMAGE_MODELS: Record<
  string,
  {
    model: string;
    name: string;
    aspect_ratio: string[];
    output_format: string[];
    resolution: string[];
    nums: number[];
    background: string[];
  }
> = {
  'gpt-image-1': {
    model: 'gpt-image-1',
    name: 'GPT Image',
    aspect_ratio: ['1:1', '2:3', '3:2'],
    output_format: ['jpeg', 'png', 'webp'],
    resolution: [],
    nums: [1, 2, 3, 4],
    background: ['transparent', 'opaque'],
  },
  'nano-banana-pro': {
    model: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    aspect_ratio: ['16:9', '9:16', '1:1', '4:3', '3:4', '2:3', '3:2'],
    output_format: ['jpeg', 'png', 'webp'],
    resolution: ['1K', '2K', '4K'],
    nums: [1, 2, 3, 4],
    background: [],
  },
  'flux-2': {
    model: 'flux-2',
    name: 'Flux.2',
    aspect_ratio: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    output_format: ['jpeg', 'png'],
    resolution: [],
    nums: [1, 2, 3, 4],
    background: [],
  },
};

function getRandomPrompts(prompts: SunaSamplePrompt[], count: number): SunaSamplePrompt[] {
  const shuffled = [...prompts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function ImageModePanel({ mode, subType, setSubType, setInitialParameters, onPromptSelect }: ModePanelProps) {
  const [model, setModel] = useState<string>('nano-banana-pro');
  const [randomizedPrompts, setRandomizedPrompts] = useState<SunaSamplePrompt[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const modelOptions = useMemo(() => Object.values(IMAGE_MODELS), []);
  const modelConfig = IMAGE_MODELS[model] ?? IMAGE_MODELS['nano-banana-pro'];
  const imageMode = useMemo(() => sunaModes.find((m) => m.id === 'image') ?? null, []);

  const displayedPrompts = randomizedPrompts;

  useEffect(() => {
    if (!imageMode) return;
    setRandomizedPrompts(getRandomPrompts(imageMode.samplePrompts, 4));
  }, [imageMode]);

  const handleRefreshPrompts = () => {
    if (!imageMode) return;
    setIsRefreshing(true);
    setRandomizedPrompts(getRandomPrompts(imageMode.samplePrompts, 4));
    setTimeout(() => setIsRefreshing(false), 300);
  };

  useEffect(() => {
    setInitialParameters({
      model,
      aspect_ratio: modelConfig.aspect_ratio[0] ?? '1:1',
      output_format: modelConfig.output_format[0] ?? 'png',
      resolution: modelConfig.resolution.length > 0 ? modelConfig.resolution[0] : undefined,
      nums: String(modelConfig.nums[0] ?? 1),
      background: modelConfig.background.length > 0 ? undefined : undefined,
      // IMPORTANT: use styleId (subType) instead of the prompt text
      styles: subType || undefined,
      source_from: ['user'],
      mode,
    });
  }, [mode, model, subType, modelConfig, setInitialParameters]);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Banner */}
      <div className="mb-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white flex flex-col md:flex-row md:justify-between md:items-center shadow-lg gap-4 relative overflow-hidden">
        <div>
          <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
            <Sparkles size={20} className="text-yellow-300" />
            Image Studio
          </h2>
          <p className="text-purple-100 text-sm max-w-md">
            Generate photorealistic marketing assets, complex diagrams, and text-heavy posters.
          </p>
        </div>

        <div className="w-full md:w-[260px]">
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

        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-900/40 to-transparent pointer-events-none" />
      </div>

      {imageMode?.options && (
        <div className="space-y-3 animate-in fade-in-0 zoom-in-95 duration-300 delay-75 mb-8">
          <p className="text-xs text-muted-foreground/60">{imageMode.options.title}</p>
          <ScrollArea className="w-full">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pb-2">
              {imageMode.options.items.map((item) => {
                const active = subType === item.id;
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      'flex flex-col items-center gap-2 cursor-pointer group p-2 transition-all duration-200 border rounded-xl overflow-hidden',
                      active
                        ? 'bg-primary/5 border-primary/40'
                        : 'hover:bg-muted border-border hover:border-primary/30',
                    )}
                    onClick={() => {
                      setSubType(item.id);
                      onPromptSelect(`Generate an image using ${item.name.toLowerCase()} style`, item.id);
                    }}
                  >
                    <div className="w-full aspect-square bg-gradient-to-br from-muted/50 to-muted rounded-lg border border-border/50 group-hover:border-primary/50 group-hover:scale-105 transition-all duration-200 flex items-center justify-center overflow-hidden relative">
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

      {displayedPrompts && displayedPrompts.length > 0 && (
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
                <span className={cn(isRefreshing && 'animate-spin')}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </span>
              </Button>
            </div>
            <PromptExamples
              prompts={displayedPrompts}
              onPromptClick={(p) => onPromptSelect(p, subType)}
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

