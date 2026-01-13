'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Globe,
  Facebook,
  Linkedin,
  Instagram,
  Smartphone,
  MonitorPlay,
  Rocket,
  Users,
  MousePointerClick,
  Link as LinkIcon,
  ChevronDown,
  TypeIcon,
  ImageIcon,
  Layers,
  Film,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ModePanelProps } from './mode-panel-props';

const AD_PLATFORMS = [
  { name: 'Google Ads', icon: <Globe size={16} />, color: 'text-blue-600 bg-blue-50' },
  { name: 'Meta Ads', icon: <Facebook size={16} />, color: 'text-blue-700 bg-blue-50' },
  { name: 'LinkedIn', icon: <Linkedin size={16} />, color: 'text-blue-800 bg-blue-50' },
  { name: 'Instagram', icon: <Instagram size={16} />, color: 'text-pink-600 bg-pink-50' },
  { name: 'TikTok', icon: <Smartphone size={16} />, color: 'text-black bg-gray-100' },
  { name: 'YouTube', icon: <MonitorPlay size={16} />, color: 'text-red-600 bg-red-50' },
];

const TARGET_LANGUAGES = [
  { code: 'zh', label: 'Chinese' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
];

const AD_FORMATS = [
  { name: 'Single Image', icon: <ImageIcon size={16} /> },
  { name: 'Carousel', icon: <Layers size={16} /> },
  { name: 'Short Video', icon: <Smartphone size={16} /> },
  { name: 'Story', icon: <Film size={16} /> },
];

const AD_VISUAL_STYLES = ['Minimalist', 'Bold & Vibrant', 'Professional', 'Playful', 'Luxury', 'Futuristic', 'Corporate'];

export function AdsModePanel({ mode, setInitialParameters, onPromptSelect }: ModePanelProps) {
  const [adProductUrl, setAdProductUrl] = useState('');
  const [adCompetitorUrl, setAdCompetitorUrl] = useState('');
  const [adPlatforms, setAdPlatforms] = useState<Set<string>>(() => new Set(['Google Ads']));
  const [adFormats, setAdFormats] = useState<Set<string>>(() => new Set(['Single Image']));
  const [adCreativeCount, setAdCreativeCount] = useState<number>(3);
  const [adLanguages, setAdLanguages] = useState<Set<string>>(() => new Set());
  const [adVisualStyle, setAdVisualStyle] = useState('Professional');
  const [adCtaText, setAdCtaText] = useState('');
  const [adCtaLink, setAdCtaLink] = useState('');
  const [adAudienceAge, setAdAudienceAge] = useState('');
  const [adAudienceLocation, setAdAudienceLocation] = useState('');
  const [adAudienceInterests, setAdAudienceInterests] = useState('');

  const platformsText = useMemo(() => Array.from(adPlatforms).join(', '), [adPlatforms]);
  const formatsText = useMemo(() => Array.from(adFormats).join(', '), [adFormats]);
  const langsText = useMemo(
    () => (adLanguages.size > 0 ? Array.from(adLanguages).join(', ') : 'None'),
    [adLanguages],
  );

  const toggleSingleSelect = (
    set: Set<string>,
    setter: (next: Set<string>) => void,
    value: string,
  ) => {
    if (set.has(value)) return;
    setter(new Set([value]));
  };

  const toggleSingleLanguage = (lang: string) => {
    if (adLanguages.has(lang)) return;
    setAdLanguages(new Set([lang]));
  };

  useEffect(() => {
    setInitialParameters({
      product_url: adProductUrl || null,
      competitor_url: adCompetitorUrl || null,
      age: adAudienceAge || null,
      location: adAudienceLocation || null,
      interests: adAudienceInterests || null,
      platforms: Array.from(adPlatforms),
      format: Array.from(adFormats),
      call_to_action: adCtaText || null,
      destination_link: adCtaLink || null,
      visual_style: adVisualStyle || null,
      output_volume: adCreativeCount || null,
      translate_language: Array.from(adLanguages),
      source_from: ['user'],
      mode,
    });
  }, [
    mode,
    adProductUrl,
    adCompetitorUrl,
    adAudienceAge,
    adAudienceLocation,
    adAudienceInterests,
    adPlatforms,
    adFormats,
    adCtaText,
    adCtaLink,
    adVisualStyle,
    adCreativeCount,
    adLanguages,
    setInitialParameters,
  ]);

  const handleGeneratePrompt = () => {
    const prompt = `
Product URL: ${adProductUrl || 'Not provided'}
Competitor URL: ${adCompetitorUrl || 'Not provided'}
Target Audience:
- Age: ${adAudienceAge || 'General'}
- Location: ${adAudienceLocation || 'Global'}
- Interests: ${adAudienceInterests || 'General'}

Campaign Specs:
- Platforms: ${platformsText}
- Formats: ${formatsText}
- Call to Action: "${adCtaText || 'Learn More'}" (Link: ${adCtaLink || 'N/A'})
- Visual Style: ${adVisualStyle}

Settings:
- Number of Concepts: ${adCreativeCount}
- Translation Languages: ${langsText}

Please generate high-converting ad concepts based on these inputs.
Ensure you provide 3 distinct copy variations (Scarcity, Benefit, Social Proof) for each concept.
`.trim();

    onPromptSelect(prompt);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 animate-fade-in mt-6">
      <div className="bg-rose-50 border border-rose-100 rounded-xl p-6 mb-8 flex items-start gap-4 shadow-sm">
        <div className="p-3 bg-rose-100 rounded-lg text-rose-700">
          <Rocket size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-rose-900">Ad Studio</h3>
          <p className="text-rose-700 text-sm mt-1">Generate high-converting ads with clear targeting & creative direction.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Strategy & Targeting */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center text-xs">
                1
              </span>
              Strategy & Targeting
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Product landing page URL</label>
                  <Input value={adProductUrl} onChange={(e) => setAdProductUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Competitor URL</label>
                  <Input value={adCompetitorUrl} onChange={(e) => setAdCompetitorUrl(e.target.value)} placeholder="https://..." />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <label className="text-xs font-bold text-gray-600 mb-3 block flex items-center gap-1">
                  <Users size={14} /> Target audience
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={adAudienceAge}
                    onChange={(e) => setAdAudienceAge(e.target.value)}
                    placeholder="Age (e.g. 25-45)"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-rose-300"
                  />
                  <input
                    type="text"
                    value={adAudienceLocation}
                    onChange={(e) => setAdAudienceLocation(e.target.value)}
                    placeholder="Location (e.g. US, EMEA)"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-rose-300"
                  />
                  <input
                    type="text"
                    value={adAudienceInterests}
                    onChange={(e) => setAdAudienceInterests(e.target.value)}
                    placeholder="Interests (e.g. SaaS, Tech)"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-rose-300"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Ad Specifications */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center text-xs">
                2
              </span>
              Ad specifications
            </h3>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Platforms</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {AD_PLATFORMS.map((platform) => (
                    <button
                      key={platform.name}
                      type="button"
                      onClick={() => toggleSingleSelect(adPlatforms, setAdPlatforms, platform.name)}
                      className={cn(
                        'flex items-center gap-2 p-3 border rounded-lg transition-all text-left',
                        adPlatforms.has(platform.name)
                          ? 'border-rose-300 bg-rose-50 ring-1 ring-rose-200'
                          : 'border-gray-200 hover:bg-gray-50',
                      )}
                    >
                      <div className={cn('p-1.5 rounded-md', platform.color, 'bg-opacity-20')}>{platform.icon}</div>
                      <span className="text-sm font-medium text-gray-700">{platform.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Format</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {AD_FORMATS.map((format) => (
                    <button
                      key={format.name}
                      type="button"
                      onClick={() => toggleSingleSelect(adFormats, setAdFormats, format.name)}
                      className={cn(
                        'flex items-center gap-2 p-2.5 border rounded-lg transition-all text-left',
                        adFormats.has(format.name)
                          ? 'border-rose-300 bg-rose-50 ring-1 ring-rose-200'
                          : 'border-gray-200 hover:bg-gray-50',
                      )}
                    >
                      <div className="text-gray-400">{format.icon}</div>
                      <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{format.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <label className="text-xs font-bold text-gray-600 mb-3 block flex items-center gap-1">
                  <MousePointerClick size={14} /> Call to action
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={adCtaText}
                      onChange={(e) => setAdCtaText(e.target.value)}
                      placeholder="Button Text (e.g. Sign Up)"
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-rose-300"
                    />
                    <TypeIcon size={12} className="absolute left-3 top-2.5 text-gray-400" />
                  </div>
                  <div className="flex-[2] relative">
                    <input
                      type="text"
                      value={adCtaLink}
                      onChange={(e) => setAdCtaLink(e.target.value)}
                      placeholder="Destination Link (e.g. https://...)"
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-rose-300"
                    />
                    <LinkIcon size={12} className="absolute left-3 top-2.5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Creative Direction */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center text-xs">
                3
              </span>
              Creative direction
            </h3>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-gray-500">Visual style</label>
                  </div>
                  <div className="relative">
                    <select
                      value={adVisualStyle}
                      onChange={(e) => setAdVisualStyle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-rose-300 appearance-none cursor-pointer"
                    >
                      {AD_VISUAL_STYLES.map((style) => (
                        <option key={style} value={style}>
                          {style}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-gray-500">Output volume</label>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                      {adCreativeCount} Concepts
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={adCreativeCount}
                    onChange={(e) => setAdCreativeCount(Number(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Translate</label>
                <div className="flex flex-wrap gap-2">
                  {TARGET_LANGUAGES.map((lang) => {
                    const active = adLanguages.has(lang.code);
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => toggleSingleLanguage(lang.code)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs border transition-colors',
                          active ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                        )}
                      >
                        {lang.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center text-xs">
                4
              </span>
              Generate
            </h3>
            <button
              type="button"
              onClick={handleGeneratePrompt}
              className="w-full py-3 bg-gray-900 hover:bg-black text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Rocket size={16} /> Fill prompt
            </button>
            <p className="text-xs text-gray-500 mt-3">
              Click to generate a structured prompt from the form and auto-fill the input box below.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

