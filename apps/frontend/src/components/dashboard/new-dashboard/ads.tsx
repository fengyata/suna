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
  Languages,
  Award,
  Sparkles,
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
import { useTranslations } from 'next-intl';
import type { ModePanelProps } from './mode-panel-props';

const AD_PLATFORMS = [
  { id: 'googleAds', name: 'Google Ads', icon: <Globe size={16} />, color: 'text-blue-600 bg-blue-50' },
  { id: 'metaAds', name: 'Meta Ads', icon: <Facebook size={16} />, color: 'text-blue-700 bg-blue-50' },
  { id: 'linkedin', name: 'LinkedIn', icon: <Linkedin size={16} />, color: 'text-blue-800 bg-blue-50' },
  { id: 'instagram', name: 'Instagram', icon: <Instagram size={16} />, color: 'text-pink-600 bg-pink-50' },
  { id: 'tiktok', name: 'TikTok', icon: <Smartphone size={16} />, color: 'text-black bg-gray-100' },
  { id: 'youtube', name: 'YouTube', icon: <MonitorPlay size={16} />, color: 'text-red-600 bg-red-50' },
];

const TARGET_LANGUAGES = [
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'nl', label: 'Dutch' },
  { code: 'sv', label: 'Swedish' },
  { code: 'no', label: 'Norwegian' },
  { code: 'da', label: 'Danish' },
  { code: 'fi', label: 'Finnish' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ru', label: 'Russian' },
  { code: 'tr', label: 'Turkish' },
  { code: 'pl', label: 'Polish' },
  { code: 'id', label: 'Indonesian' },
  { code: 'th', label: 'Thai' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'el', label: 'Greek' },
];

const AD_FORMATS = [
  { id: 'singleImage', name: 'Single Image', icon: <ImageIcon size={16} /> },
  { id: 'carousel', name: 'Carousel', icon: <Layers size={16} /> },
  { id: 'shortVideo', name: 'Short Video', icon: <Smartphone size={16} /> },
  { id: 'story', name: 'Story', icon: <Film size={16} /> },
];

const AD_VISUAL_STYLES = [
  { id: 'minimalist', name: 'Minimalist' },
  { id: 'boldVibrant', name: 'Bold & Vibrant' },
  { id: 'professional', name: 'Professional' },
  { id: 'playful', name: 'Playful' },
  { id: 'luxury', name: 'Luxury' },
  { id: 'futuristic', name: 'Futuristic' },
  { id: 'handDrawn', name: 'Hand-Drawn' },
  { id: 'corporate', name: 'Corporate' },
];

export function AdsModePanel({ mode, setInitialParameters, onPromptSelect }: ModePanelProps) {
  const t = useTranslations('dashboard');
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
    () => (adLanguages.size > 0 ? Array.from(adLanguages).join(', ') : t('adsPanel.none')),
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
    const prompt = [
      t('adsPanel.prompt.productUrl', { value: adProductUrl || t('adsPanel.prompt.notProvided') }),
      t('adsPanel.prompt.competitorUrl', { value: adCompetitorUrl || t('adsPanel.prompt.notProvided') }),
      '',
      t('adsPanel.prompt.targetAudienceTitle'),
      t('adsPanel.prompt.targetAudienceAge', { value: adAudienceAge || t('adsPanel.prompt.general') }),
      t('adsPanel.prompt.targetAudienceLocation', { value: adAudienceLocation || t('adsPanel.prompt.global') }),
      t('adsPanel.prompt.targetAudienceInterests', { value: adAudienceInterests || t('adsPanel.prompt.general') }),
      '',
      t('adsPanel.prompt.campaignSpecsTitle'),
      t('adsPanel.prompt.platforms', { value: platformsText }),
      t('adsPanel.prompt.formats', { value: formatsText }),
      t('adsPanel.prompt.callToAction', {
        text: adCtaText || t('adsPanel.prompt.learnMore'),
        link: adCtaLink || t('adsPanel.prompt.na'),
      }),
      t('adsPanel.prompt.visualStyle', { value: adVisualStyle }),
      '',
      t('adsPanel.prompt.settingsTitle'),
      t('adsPanel.prompt.numberOfConcepts', { value: adCreativeCount }),
      t('adsPanel.prompt.translationLanguages', { value: langsText }),
      '',
      t('adsPanel.prompt.instructions'),
      t('adsPanel.prompt.variationsInstruction'),
    ].join('\n');

    onPromptSelect(prompt);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 animate-fade-in">
      <div className="bg-rose-50 border border-rose-100 rounded-xl p-6 mb-8 flex items-start gap-4 shadow-sm">
        <div className="p-3 bg-rose-100 rounded-lg text-rose-700">
          <Rocket size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-rose-900">{t('adsPanel.bannerTitle')}</h3>
          <p className="text-rose-700 text-sm mt-1">{t('adsPanel.bannerDescription')}</p>
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
              {t('adsPanel.steps.strategyTargeting')}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{t('adsPanel.fields.productUrl')}</label>
                  <Input
                    value={adProductUrl}
                    onChange={(e) => setAdProductUrl(e.target.value)}
                    placeholder={t('adsPanel.placeholders.url')}
                    className="focus:ring-2 focus:ring-rose-100 focus:border-rose-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{t('adsPanel.fields.competitorUrl')}</label>
                  <Input
                    value={adCompetitorUrl}
                    onChange={(e) => setAdCompetitorUrl(e.target.value)}
                    placeholder={t('adsPanel.placeholders.url')}
                    className="focus:ring-2 focus:ring-rose-100 focus:border-rose-300"
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <label className="text-xs font-bold text-gray-600 mb-3 block flex items-center gap-1">
                  <Users size={14} /> {t('adsPanel.fields.targetAudience')}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={adAudienceAge}
                    onChange={(e) => setAdAudienceAge(e.target.value)}
                    placeholder={t('adsPanel.placeholders.age')}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-rose-300"
                  />
                  <input
                    type="text"
                    value={adAudienceLocation}
                    onChange={(e) => setAdAudienceLocation(e.target.value)}
                    placeholder={t('adsPanel.placeholders.location')}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-rose-300"
                  />
                  <input
                    type="text"
                    value={adAudienceInterests}
                    onChange={(e) => setAdAudienceInterests(e.target.value)}
                    placeholder={t('adsPanel.placeholders.interests')}
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
              {t('adsPanel.steps.adSpecifications')}
            </h3>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">{t('adsPanel.fields.platforms')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {AD_PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => toggleSingleSelect(adPlatforms, setAdPlatforms, platform.name)}
                      className={cn(
                        'flex items-center gap-2 p-3 border rounded-lg transition-all text-left cursor-pointer',
                        adPlatforms.has(platform.name)
                          ? 'border-rose-300 bg-rose-50 ring-1 ring-rose-200'
                          : 'border-gray-200 hover:bg-gray-50',
                      )}
                    >
                      <div className={cn('p-1.5 rounded-md', platform.color, 'bg-opacity-20')}>{platform.icon}</div>
                      <span className="text-sm font-medium text-gray-700">{t(`adsPanel.platforms.${platform.id}` as any)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">{t('adsPanel.fields.format')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {AD_FORMATS.map((format) => (
                    <button
                      key={format.id}
                      type="button"
                      onClick={() => toggleSingleSelect(adFormats, setAdFormats, format.name)}
                      className={cn(
                        'flex items-center gap-2 p-2.5 border rounded-lg transition-all text-left cursor-pointer',
                        adFormats.has(format.name)
                          ? 'border-rose-300 bg-rose-50 ring-1 ring-rose-200'
                          : 'border-gray-200 hover:bg-gray-50',
                      )}
                    >
                      <div className="text-gray-400">{format.icon}</div>
                      <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{t(`adsPanel.formats.${format.id}` as any)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <label className="text-xs font-bold text-gray-600 mb-3 block flex items-center gap-1">
                  <MousePointerClick size={14} /> {t('adsPanel.fields.callToAction')}
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={adCtaText}
                      onChange={(e) => setAdCtaText(e.target.value)}
                      placeholder={t('adsPanel.placeholders.ctaText')}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-rose-300"
                    />
                    <TypeIcon size={12} className="absolute left-3 top-2.5 text-gray-400" />
                  </div>
                  <div className="flex-[2] relative">
                    <input
                      type="text"
                      value={adCtaLink}
                      onChange={(e) => setAdCtaLink(e.target.value)}
                      placeholder={t('adsPanel.placeholders.destinationLink')}
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
              {t('adsPanel.steps.creativeDirection')}
            </h3>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-gray-500">{t('adsPanel.fields.visualStyle')}</label>
                  </div>
                  <div className="relative">
                    <select
                      value={adVisualStyle}
                      onChange={(e) => setAdVisualStyle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-rose-300 appearance-none cursor-pointer"
                    >
                      {AD_VISUAL_STYLES.map((style) => (
                        <option key={style.id} value={style.name} className="cursor-pointer">
                          {t(`adsPanel.visualStyles.${style.id}` as any)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-gray-500">{t('adsPanel.fields.outputVolume')}</label>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                      {t('adsPanel.outputVolumeConcepts', { count: adCreativeCount })}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={adCreativeCount}
                    onChange={(e) => setAdCreativeCount(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-600 mt-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-3 block flex items-center gap-1">
                  <Languages size={14} /> {t('adsPanel.fields.massTranslation')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {TARGET_LANGUAGES.map((lang) => {
                    const active = adLanguages.has(lang.code);
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => toggleSingleLanguage(lang.code)}
                        className={cn(
                          'text-[11px] font-medium px-3 py-1.5 rounded-full border transition-colors cursor-pointer',
                          active
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700',
                        )}
                      >
                        {t(`adsPanel.languages.${lang.code}` as any)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGeneratePrompt}
            className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles size={18} fill="currentColor" /> {t('adsPanel.generateButton', { count: adCreativeCount })}
          </button>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-lg sticky top-20">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-yellow-400">
              <Award size={16} /> {t('adsPanel.strategyAppliedTitle')}
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              {t('adsPanel.strategyAppliedDescription')}
            </p>
            <div className="space-y-3">
              <div className="bg-white/10 rounded-lg p-3 border border-white/5">
                <div className="text-xs font-bold text-white mb-1">{t('adsPanel.variations.1.title')}</div>
                <div className="text-[10px] text-slate-400">{t('adsPanel.variations.1.description')}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 border border-white/5">
                <div className="text-xs font-bold text-white mb-1">{t('adsPanel.variations.2.title')}</div>
                <div className="text-[10px] text-slate-400">{t('adsPanel.variations.2.description')}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 border border-white/5">
                <div className="text-xs font-bold text-white mb-1">{t('adsPanel.variations.3.title')}</div>
                <div className="text-[10px] text-slate-400">{t('adsPanel.variations.3.description')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

