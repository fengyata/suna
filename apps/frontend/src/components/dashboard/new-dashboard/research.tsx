'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ModePanelProps } from './mode-panel-props';

export function ResearchModePanel({ onPromptSelect }: ModePanelProps) {
  const t = useTranslations('dashboard');
  const items = [
    { id: 'competitorDeepDive', title: t('researchPanel.items.competitorDeepDive') },
    { id: 'marketTrendAnalysis', title: t('researchPanel.items.marketTrendAnalysis') },
    { id: 'accountIntelligenceReport', title: t('researchPanel.items.accountIntelligenceReport') },
    { id: 'regulatoryImpactStudy', title: t('researchPanel.items.regulatoryImpactStudy') },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 animate-fade-in">
      <div className="bg-teal-50 border border-teal-100 rounded-xl p-6 mb-10 flex items-start gap-4">
        <div className="p-3 bg-teal-100 rounded-lg text-teal-700">
          <Search size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-teal-900">{t('researchPanel.bannerTitle')}</h3>
          <p className="text-teal-700 text-sm mt-1">
            {t('researchPanel.bannerDescription')}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{t('researchPanel.sectionTitle')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPromptSelect(t('researchPanel.promptTemplate', { topic: item.title }))}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-teal-50 hover:border-teal-200 transition-all text-left bg-white cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-lg">
                {i + 1}
              </div>
              <span className="font-semibold text-gray-700">{item.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

