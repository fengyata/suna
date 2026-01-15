'use client';

import React from 'react';
import { LineChart, BarChart, Megaphone, PieChart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ModePanelProps } from './mode-panel-props';

export function PipelineModePanel({ onPromptSelect }: ModePanelProps) {
  const t = useTranslations('dashboard');
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 animate-fade-in">
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 mb-8 flex items-start gap-4">
        <div className="p-3 bg-emerald-100 rounded-lg text-emerald-700">
          <LineChart size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-emerald-900">{t('pipelinePanel.bannerTitle')}</h3>
          <p className="text-emerald-700 text-sm mt-1">{t('pipelinePanel.bannerDescription')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect(t('pipelinePanel.cards.q4Forecast.prompt'))}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <BarChart size={20} />
            </div>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">{t('tags.sales')}</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">{t('pipelinePanel.cards.q4Forecast.title')}</h4>
          <p className="text-xs text-gray-500">{t('pipelinePanel.cards.q4Forecast.description')}</p>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect(t('pipelinePanel.cards.campaignRoi.prompt'))}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <Megaphone size={20} />
            </div>
            <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded">{t('tags.mktg')}</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">{t('pipelinePanel.cards.campaignRoi.title')}</h4>
          <p className="text-xs text-gray-500">{t('pipelinePanel.cards.campaignRoi.description')}</p>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect(t('pipelinePanel.cards.churnForecast.prompt'))}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
              <PieChart size={20} />
            </div>
            <span className="text-[10px] font-bold bg-orange-50 text-orange-600 px-2 py-1 rounded">{t('tags.cx')}</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">{t('pipelinePanel.cards.churnForecast.title')}</h4>
          <p className="text-xs text-gray-500">{t('pipelinePanel.cards.churnForecast.description')}</p>
        </button>
      </div>
    </div>
  );
}

