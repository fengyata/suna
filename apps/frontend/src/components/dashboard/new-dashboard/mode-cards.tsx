'use client';

import React, { useMemo } from 'react';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Mic,
  LineChart,
  UserCheck,
  Briefcase,
  Database,
  MapPin,
  Share2,
  Search,
  Rocket,
  Presentation,
  Layout,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardModeAction, DashboardModeCard, DashboardModeId } from './types';

function ModeCardIcon({
  Icon,
  className,
}: {
  Icon: LucideIcon;
  className: string;
}) {
  return (
    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform shadow-sm', className)}>
      <Icon size={20} />
    </div>
  );
}

export function ModeCards(props: {
  onAction: (action: DashboardModeAction) => void;
  className?: string;
}) {
  const cards = useMemo<DashboardModeCard[]>(() => {
    const flashrev = process.env.NEXT_PUBLIC_FLASHREV_FRONTEND;

    return [
      {
        id: 'image',
        title: 'Visuals',
        description: 'Marketing assets',
        icon: ImageIcon,
        accentClassName: 'bg-purple-100 text-purple-600 group-hover:scale-110',
        action: { type: 'select_mode', mode: 'image' },
      },
      {
        id: 'video',
        title: 'Video Studio',
        description: 'Demos & outreach',
        icon: VideoIcon,
        accentClassName: 'bg-red-100 text-red-600 group-hover:scale-110',
        action: { type: 'select_mode', mode: 'video' },
      },
      {
        id: 'meeting_agent',
        title: 'Meeting Agent',
        description: 'Insights & transcripts',
        icon: Mic,
        accentClassName: 'bg-pink-100 text-pink-600 group-hover:scale-110',
        action: {
          type: 'external',
          url: flashrev ? `${flashrev}/engage/meetings/foryou` : '#',
          target: '_blank',
        },
        external: true,
      },
      {
        id: 'pipeline',
        title: 'Pipeline Manager',
        description: 'Forecasting & deal QA',
        icon: LineChart,
        accentClassName: 'bg-emerald-100 text-emerald-600 group-hover:scale-110',
        action: { type: 'select_mode', mode: 'pipeline' },
      },
      {
        id: 'ae',
        title: 'Account Executive',
        description: 'Full-cycle sales agent',
        icon: UserCheck,
        accentClassName: 'bg-blue-100 text-blue-600 group-hover:scale-110',
        action: { type: 'select_mode', mode: 'ae' },
      },
      {
        id: 'strategist',
        title: 'Deal Strategist',
        description: 'Negotiation & closers',
        icon: Briefcase,
        accentClassName: 'bg-emerald-100 text-emerald-600 group-hover:scale-110',
        action: { type: 'select_mode', mode: 'strategist' },
      },
      {
        id: 'people',
        title: 'Data Analyst',
        description: 'Cleaning & enrichment',
        icon: Database,
        accentClassName: 'bg-cyan-100 text-cyan-600 group-hover:scale-110',
        action: { type: 'select_mode', mode: 'people' },
      },
      {
        id: 'icp',
        title: 'Territory & Persona',
        description: 'ICP & market planning',
        icon: MapPin,
        accentClassName: 'bg-purple-100 text-purple-600 group-hover:scale-110',
        action: { type: 'select_mode', mode: 'icp' },
      },
      {
        id: 'socialselling',
        title: 'Social Selling',
        description: 'Brand content',
        icon: Share2,
        accentClassName: 'bg-indigo-100 text-indigo-600 group-hover:scale-110',
        action: { type: 'select_mode', mode: 'socialselling' },
      },
      {
        id: 'research',
        title: 'Deep Research',
        description: 'Market intel & reports',
        icon: Search,
        accentClassName: 'bg-teal-100 text-teal-600 group-hover:scale-110',
        action: { type: 'select_mode', mode: 'research' },
      },
      {
        id: 'ads',
        title: 'Ad Studio',
        description: 'Ads creative & ROI',
        icon: Rocket,
        accentClassName: 'bg-rose-100 text-rose-600 group-hover:scale-110',
        action: { type: 'select_mode', mode: 'ads' },
      },
      {
        id: 'gtm_decks',
        title: 'GTM Decks',
        description: 'Proposals & QBRs',
        icon: Presentation,
        accentClassName: 'bg-orange-100 text-orange-600 group-hover:scale-110',
        action: {
          type: 'external',
          url: flashrev ? `${flashrev}/chat` : '#',
          target: '_blank',
        },
        external: true,
      },
      {
        id: 'website',
        title: 'Web App',
        description: 'Landing pages & sites',
        icon: Layout,
        accentClassName: 'bg-indigo-100 text-indigo-600 group-hover:scale-110',
        action: { type: 'select_mode', mode: 'website' },
      },
    ];
  }, []);

  return (
    <div className={cn('w-full', props.className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
        {cards.map((card) => {
          const Icon = card.icon;
          const isDisabled = card.action.type === 'external' && card.action.url === '#';

          return (
            <button
              key={card.id}
              type="button"
              disabled={isDisabled}
              onClick={() => props.onAction(card.action)}
              className={cn(
                'p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white text-left cursor-pointer group',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <ModeCardIcon Icon={Icon} className={card.accentClassName} />

              <div className="flex items-center gap-1">
                <h3 className="font-semibold text-gray-800 text-sm">{card.title}</h3>
                {card.external && <ExternalLink size={12} className="text-gray-400" />}
              </div>
              <p className="text-gray-400 text-xs mt-1">{card.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function resolveModeFromAction(action: DashboardModeAction): DashboardModeId | null {
  if (action.type === 'select_mode') return action.mode;
  return null;
}

