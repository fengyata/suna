'use client';

import React, { useMemo, useState } from 'react';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  LineChart,
  UserCheck,
  Presentation,
  Briefcase,
  Table,
  MapPin,
  Share2,
  Search,
  Rocket,
  FileCodeIcon,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type CategoryType = 'ALL' | 'SALES' | 'MARKETING' | 'CX' | 'OPS';

type SuperModeId =
  | 'image'
  | 'video'
  | 'pipeline'
  | 'ae'
  | 'strategist'
  | 'people'
  | 'icp'
  | 'socialselling'
  | 'research'
  | 'ads'
  | 'slides'
  | 'website';

type SuperMode = {
  id: SuperModeId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  categories: Array<'Sales' | 'Marketing' | 'CX' | 'Ops'>;
};

export function SuperModesPanel(props: {
  selectedMode: string | null;
  onModeSelect: (mode: string | null) => void;
  className?: string;
}) {
  const t = useTranslations('dashboard');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('ALL');
  const flashrev = process.env.NEXT_PUBLIC_FLASHREV_FRONTEND;
  const slidesUrl = flashrev ? `${flashrev}/chat` : '#';

  const modes = useMemo<SuperMode[]>(
    () => [
      { id: 'image', label: t('image'), icon: ImageIcon, categories: ['Marketing'] },
      { id: 'video', label: t('video'), icon: VideoIcon, categories: ['Marketing', 'CX'] },
      { id: 'pipeline', label: t('pipeline'), icon: LineChart, categories: ['Sales', 'Ops'] },
      { id: 'ae', label: t('account_exec'), icon: UserCheck, categories: ['Sales'] },
      { id: 'strategist', label: t('deal_strategist'), icon: Briefcase, categories: ['Sales', 'CX'] },
      { id: 'people', label: t('data'), icon: Table, categories: ['Ops', 'Marketing', 'CX'] },
      { id: 'icp', label: t('territory_icp'), icon: MapPin, categories: ['Sales', 'Marketing'] },
      { id: 'socialselling', label: t('social_selling'), icon: Share2, categories: ['Marketing', 'Sales'] },
      { id: 'research', label: t('research'), icon: Search, categories: ['Sales', 'Marketing'] },
      { id: 'ads', label: t('ad_studio'), icon: Rocket, categories: ['Marketing'] },
      { id: 'slides', label: t('gtm_decks'), icon: Presentation, categories: ['Sales', 'Marketing', 'CX'] },
      { id: 'website', label: t('website'), icon: FileCodeIcon, categories: ['Marketing'] },
    ],
    [t],
  );

  const filteredModes = useMemo(() => {
    if (activeCategory === 'ALL') return modes;
    const key = activeCategory === 'OPS' ? 'Ops' : activeCategory === 'SALES' ? 'Sales' : activeCategory === 'CX' ? 'CX' : 'Marketing';
    return modes.filter((m) => m.categories.includes(key));
  }, [activeCategory, modes]);

  const toggleMode = (modeId: SuperModeId) => {
    if (props.selectedMode === modeId) {
      props.onModeSelect(null);
      return;
    }
    props.onModeSelect(modeId);
  };

  return (
    <div className={cn('w-full', props.className)}>
      <div className="mb-3 flex justify-center">
        <div className="inline-flex bg-gray-100/80 p-1 rounded-xl overflow-x-auto max-w-full">
          {(['ALL', 'SALES', 'MARKETING', 'CX', 'OPS'] as CategoryType[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'cursor-pointer px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap',
                activeCategory === cat
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50',
              )}
            >
              {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 px-1 pb-2">
        {filteredModes.map((mode) => {
          const Icon = mode.icon;
          const selected = props.selectedMode === mode.id;
          const isSlides = mode.id === 'slides';
          const isDisabled = isSlides && slidesUrl === '#';

          return (
            <button
              key={mode.id}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (isSlides) {
                  if (isDisabled) return;
                  window.open(slidesUrl, '_blank');
                  return;
                }
                toggleMode(mode.id);
              }}
              className={cn(
                'cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap border animate-fade-in',
                isDisabled && 'opacity-50 cursor-not-allowed',
                selected
                  ? 'bg-gray-900 text-white border-gray-900 shadow-md transform scale-105'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300',
              )}
            >
              <Icon className="!w-3.5 !h-3.5" />
              {mode.label}
              {['slides'].includes(mode.id) && <ExternalLink size={12} className="text-gray-400" />}
              {selected && <div className="w-1.5 h-1.5 bg-green-400 rounded-full ml-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

