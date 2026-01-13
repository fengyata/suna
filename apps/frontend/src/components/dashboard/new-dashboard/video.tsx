'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Film, Wand2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ModePanelProps } from './mode-panel-props';

const VIDEO_PROMPTS: string[] = [
  'Help me generate an advertising marketing video with cinematic product display, smooth rotating camera around luxury skincare bottle, dramatic lighting transitions, and elegant particle effects highlighting premium quality.',
  'Generate a dynamic social media advertising video showcasing trendy fashion accessories, quick cuts between lifestyle shots, vibrant urban backgrounds, and energetic transitions with brand logo animations.',
  'Generate a professional unboxing video with pristine white studio setup, hands carefully revealing tech products, close-up shots of premium materials, and satisfying unboxing moments.',
  'Generate a tech product demonstration video showcasing smartphone interface, screen recording with gesture interactions, smooth animations, feature highlights, and futuristic visual effects.',
];

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

export function VideoModePanel({ mode, setInitialParameters, onPromptSelect }: ModePanelProps) {
  const [model, setModel] = useState<string>('sora-2');
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [resolution, setResolution] = useState<string | null>(null);
  const [nums, setNums] = useState<string | null>(null);

  const modelOptions = useMemo(() => Object.values(VIDEO_MODELS), []);
  const modelConfig = VIDEO_MODELS[model] ?? VIDEO_MODELS['sora-2'];

  useEffect(() => {
    setAspectRatio(null);
    setDuration(null);
    setResolution(null);
    setNums(null);
  }, [model]);

  useEffect(() => {
    const resolvedAspect = aspectRatio || (modelConfig.aspect_ratio[0] ?? '16:9');
    const resolvedDuration = duration || (modelConfig.duration[0] ?? '4');
    const resolvedModel = getSora2ModelVariant({
      baseModel: model,
      duration: resolvedDuration,
      aspectRatio: resolvedAspect,
    });

    setInitialParameters({
      model: resolvedModel,
      aspect_ratio: resolvedAspect,
      duration: resolvedDuration,
      resolution: modelConfig.resolution.length > 0 ? resolution || modelConfig.resolution[0] : undefined,
      nums: nums || String(modelConfig.nums[0] ?? 1),
      source_from: ['user'],
      mode,
    });
  }, [mode, model, aspectRatio, duration, resolution, nums, modelConfig, setInitialParameters]);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in mt-6">
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
            <SelectTrigger className="w-full bg-white/10 text-white border-white/20">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((m) => (
                <SelectItem key={m.model} value={m.model}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-red-900/40 to-transparent pointer-events-none" />
      </div>

      {/* Quick Creator */}
      <div className="mb-10 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Wand2 size={16} className="text-red-500" /> Quick Creator
        </h3>
        <div className="flex gap-3 items-center flex-col md:flex-nowrap md:flex-row">
          <Select value={aspectRatio ?? ''} onValueChange={(v) => setAspectRatio(v)}>
            <SelectTrigger className="w-full md:w-auto flex-1">
              <SelectValue placeholder="Select aspect ratio" />
            </SelectTrigger>
            <SelectContent>
              {modelConfig.aspect_ratio.map((ar) => (
                <SelectItem key={ar} value={ar}>
                  {ar}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-gray-400 hidden md:inline">+</span>

          <Select value={duration ?? ''} onValueChange={(v) => setDuration(v)}>
            <SelectTrigger className="w-full md:w-auto flex-1">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {modelConfig.duration.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}s
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-gray-400 hidden md:inline">+</span>

          <Select value={nums ?? ''} onValueChange={(v) => setNums(v)}>
            <SelectTrigger className="w-full md:w-auto flex-1">
              <SelectValue placeholder="Select number of videos" />
            </SelectTrigger>
            <SelectContent>
              {modelConfig.nums.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {modelConfig.resolution.length > 0 && (
            <>
              <span className="text-gray-400 hidden md:inline">+</span>
              <Select value={resolution ?? ''} onValueChange={(v) => setResolution(v)}>
                <SelectTrigger className="w-full md:w-auto flex-1">
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  {modelConfig.resolution.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </div>

      {/* Example prompts */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Examples</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {VIDEO_PROMPTS.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPromptSelect(p)}
            className="bg-white p-4 rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-sm transition-all text-left"
          >
            <div className="text-xs text-gray-700 line-clamp-3">{p}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

