'use client';

import React from 'react';
import { UserCheck, Search, CheckSquare, Megaphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ModePanelProps } from './mode-panel-props';

export function AEModePanel({ onPromptSelect }: ModePanelProps) {
  const t = useTranslations('dashboard');
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 animate-fade-in">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 flex items-start gap-4">
        <div className="p-3 bg-blue-100 rounded-lg text-blue-700">
          <UserCheck size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-blue-900">{t('aePanel.bannerTitle')}</h3>
          <p className="text-blue-700 text-sm mt-1">{t('aePanel.bannerDescription')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect(t('aePanel.cards.discovery.prompt'))}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <Search size={20} />
            </div>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">{t('tags.sales')}</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">{t('aePanel.cards.discovery.title')}</h4>
          <p className="text-xs text-gray-500">{t('aePanel.cards.discovery.description')}</p>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect(t('aePanel.cards.handoff.prompt'))}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
              <CheckSquare size={20} />
            </div>
            <span className="text-[10px] font-bold bg-orange-50 text-orange-600 px-2 py-1 rounded">{t('tags.cx')}</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">{t('aePanel.cards.handoff.title')}</h4>
          <p className="text-xs text-gray-500">{t('aePanel.cards.handoff.description')}</p>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect(t('aePanel.cards.leadFeedback.prompt'))}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <Megaphone size={20} />
            </div>
            <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded">{t('tags.mktg')}</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">{t('aePanel.cards.leadFeedback.title')}</h4>
          <p className="text-xs text-gray-500">{t('aePanel.cards.leadFeedback.description')}</p>
        </button>
      </div>
    </div>
  );
}

