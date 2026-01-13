'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Wand2, TypeIcon, Camera, Layout, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ModePanelProps } from './mode-panel-props';

const IMAGE_PROMPTS: string[] = [
  'Help me generate an image with the theme of professional product photography setup, luxury cosmetics on marble surface, soft studio lighting, and elegant gold accents.',
  'Generate an image of a dynamic social media content scene, with a smartphone displaying vibrant feeds, trendy accessories, and colorful marketing materials.',
  'Generate an image of a modern e-commerce product showcase, with sleek electronic devices elegantly arranged on a minimalist white background with perfect shadows.',
  'Please help me generate an image of a creative brand marketing photoshoot, with models in contemporary fashion, professional studio equipment, and dramatic lighting setup.',
];

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

const STYLE_PRESETS: Array<{ label: string; value: string; imgUrl: string }> = [
  {
    label: 'geometric',
    value: 'Generate an image using geometric style',
    imgUrl:
      'https://flashinfostatic-1305356416.cos.na-siliconvalley.myqcloud.com/trigger/super_agent/style_images/geometric_mountain.webp',
  },
  {
    label: 'minimalist',
    value: 'Generate an image using minimalist style',
    imgUrl:
      'https://flashinfostatic-1305356416.cos.na-siliconvalley.myqcloud.com/trigger/super_agent/style_images/minimalist_mountain.webp',
  },
  {
    label: 'photorealistic',
    value: 'Generate an image using photorealistic style',
    imgUrl:
      'https://flashinfostatic-1305356416.cos.na-siliconvalley.myqcloud.com/trigger/super_agent/style_images/photorealistic_mountain.webp',
  },
  {
    label: 'isometric',
    value: 'Generate an image using isometric style',
    imgUrl:
      'https://flashinfostatic-1305356416.cos.na-siliconvalley.myqcloud.com/trigger/super_agent/style_images/isometric_mountain.webp',
  },
  {
    label: 'comic book',
    value: 'Generate an image using comic book style',
    imgUrl:
      'https://flashinfostatic-1305356416.cos.na-siliconvalley.myqcloud.com/trigger/super_agent/style_images/comic_book_mountain.webp',
  },
  {
    label: 'pixel art',
    value: 'Generate an image using pixel art style',
    imgUrl:
      'https://flashinfostatic-1305356416.cos.na-siliconvalley.myqcloud.com/trigger/super_agent/style_images/pixel_art_mountain.webp',
  },
];

const IMAGE_TEMPLATES = [
  { name: 'Marketing Poster', desc: 'Perfect text rendering', icon: <TypeIcon size={16} /> },
  { name: 'Product Shot', desc: 'Studio lighting', icon: <Camera size={16} /> },
  { name: 'Infographic', desc: 'Complex layouts', icon: <Layout size={16} /> },
  { name: 'Social Media', desc: 'Viral aesthetics', icon: <Users size={16} /> },
];

export function ImageModePanel({ mode, subType, setSubType, setInitialParameters, onPromptSelect }: ModePanelProps) {
  const [model, setModel] = useState<string>('nano-banana-pro');
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<string | null>(null);
  const [resolution, setResolution] = useState<string | null>(null);
  const [nums, setNums] = useState<string | null>(null);
  const [background, setBackground] = useState<string | null>(null);

  const modelOptions = useMemo(() => Object.values(IMAGE_MODELS), []);
  const modelConfig = IMAGE_MODELS[model] ?? IMAGE_MODELS['nano-banana-pro'];

  useEffect(() => {
    // 参考项目：切换 model 时清空依赖字段
    setAspectRatio(null);
    setOutputFormat(null);
    setResolution(null);
    setNums(null);
    setBackground(null);
  }, [model]);

  useEffect(() => {
    setInitialParameters({
      model,
      aspect_ratio: aspectRatio || (modelConfig.aspect_ratio[0] ?? '1:1'),
      output_format: outputFormat || (modelConfig.output_format[0] ?? 'png'),
      resolution: modelConfig.resolution.length > 0 ? resolution || modelConfig.resolution[0] : undefined,
      nums: nums || String(modelConfig.nums[0] ?? 1),
      background: modelConfig.background.length > 0 ? background || undefined : undefined,
      styles: subType || undefined,
      source_from: ['user'],
      mode,
    });
  }, [mode, model, aspectRatio, outputFormat, resolution, nums, background, subType, modelConfig, setInitialParameters]);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in mt-6">
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

        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-900/40 to-transparent pointer-events-none" />
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

          <Select value={outputFormat ?? ''} onValueChange={(v) => setOutputFormat(v)}>
            <SelectTrigger className="w-full md:w-auto flex-1">
              <SelectValue placeholder="Select output format" />
            </SelectTrigger>
            <SelectContent>
              {modelConfig.output_format.map((fmt) => (
                <SelectItem key={fmt} value={fmt}>
                  {fmt}
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

          <span className="text-gray-400 hidden md:inline">+</span>

          <Select value={nums ?? ''} onValueChange={(v) => setNums(v)}>
            <SelectTrigger className="w-full md:w-auto flex-1">
              <SelectValue placeholder="Select number of images" />
            </SelectTrigger>
            <SelectContent>
              {modelConfig.nums.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {modelConfig.background.length > 0 && (
            <>
              <span className="text-gray-400 hidden md:inline">+</span>
              <Select value={background ?? ''} onValueChange={(v) => setBackground(v)}>
                <SelectTrigger className="w-full md:w-auto flex-1">
                  <SelectValue placeholder="Select background" />
                </SelectTrigger>
                <SelectContent>
                  {modelConfig.background.map((bg) => (
                    <SelectItem key={bg} value={bg}>
                      {bg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </div>

      {/* Templates */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Templates</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {IMAGE_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.name}
            type="button"
            onClick={() => onPromptSelect(`Create a ${tmpl.name} image for...`, subType)}
            className="p-4 border border-gray-200 rounded-xl bg-white hover:border-purple-300 hover:shadow-sm transition-all text-left flex flex-col gap-3"
          >
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
              {tmpl.icon}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">{tmpl.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tmpl.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Style presets (subType) */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Styles</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {STYLE_PRESETS.map((s) => {
          const active = subType === s.value;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                setSubType(s.value);
                onPromptSelect(s.value, s.value);
              }}
              className={cn(
                'group border rounded-xl overflow-hidden bg-white hover:shadow-sm transition-all text-left',
                active ? 'border-purple-300 ring-1 ring-purple-200' : 'border-gray-200 hover:border-purple-200',
              )}
            >
              <div className="aspect-square bg-gray-100 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imgUrl} alt={s.label} className="h-full w-full object-cover" />
              </div>
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-800">{s.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Example prompts */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Examples</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {IMAGE_PROMPTS.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPromptSelect(p, subType)}
            className="bg-white p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all text-left"
          >
            <div className="text-xs text-gray-700 line-clamp-3">{p}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

