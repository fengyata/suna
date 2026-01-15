'use client';

import React from 'react';
import { MapPin, UserCheck, BarChart, Briefcase, Users, LifeBuoy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ModePanelProps } from './mode-panel-props';

export function ICPModePanel({ onPromptSelect }: ModePanelProps) {
  const t = useTranslations('dashboard');
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 animate-fade-in">
      <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 mb-8 flex items-start gap-4">
        <div className="p-3 bg-purple-100 rounded-lg text-purple-700">
          <MapPin size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-purple-900">{t('icpPanel.bannerTitle')}</h3>
          <p className="text-purple-700 text-sm mt-1">{t('icpPanel.bannerDescription')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect(t('icpPanel.cards.repAssignment.prompt'))}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <UserCheck size={20} />
            </div>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">{t('tags.sales')}</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">{t('icpPanel.cards.repAssignment.title')}</h4>
          <p className="text-xs text-gray-500">{t('icpPanel.cards.repAssignment.description')}</p>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect(t('icpPanel.cards.quotaModeling.prompt'))}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <BarChart size={20} />
            </div>
            <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded">{t('tags.ops')}</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">{t('icpPanel.cards.quotaModeling.title')}</h4>
          <p className="text-xs text-gray-500">{t('icpPanel.cards.quotaModeling.description')}</p>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect(t('icpPanel.cards.predictiveHiring.prompt'))}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
              <Briefcase size={20} />
            </div>
            <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-1 rounded">{t('tags.hr')}</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">{t('icpPanel.cards.predictiveHiring.title')}</h4>
          <p className="text-xs text-gray-500">{t('icpPanel.cards.predictiveHiring.description')}</p>
        </button>
      </div>

      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{t('icpPanel.sectionTitle')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect(t('icpPanel.cards.marketSegmentation.prompt'))}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
            <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded">{t('tags.mktg')}</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">{t('icpPanel.cards.marketSegmentation.title')}</h4>
          <p className="text-xs text-gray-500">{t('icpPanel.cards.marketSegmentation.description')}</p>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect(t('icpPanel.cards.customerHealth.prompt'))}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
              <LifeBuoy size={20} />
            </div>
            <span className="text-[10px] font-bold bg-orange-50 text-orange-600 px-2 py-1 rounded">{t('tags.cx')}</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">{t('icpPanel.cards.customerHealth.title')}</h4>
          <p className="text-xs text-gray-500">{t('icpPanel.cards.customerHealth.description')}</p>
        </button>
      </div>
    </div>
  );
}

