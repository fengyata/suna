'use client';

import React from 'react';
import { Layout, Megaphone, Building, Globe, ArrowUp, FileCodeIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ModePanelProps } from './mode-panel-props';

const WEBSITE_TEMPLATES: Array<{
  id: string;
  icon: React.ReactNode;
  color: string;
  items: string[];
}> = [
  {
    id: 'marketing',
    icon: <Megaphone size={18} />,
    color: 'bg-pink-50 text-pink-600',
    items: ['landingPage', 'webinarRegistration', 'productLaunchCountdown', 'eventMicrosite', 'newsletterSignup'],
  },
  {
    id: 'corporate',
    icon: <Building size={18} />,
    color: 'bg-blue-50 text-blue-600',
    items: ['corporateHomepage', 'aboutLeadership', 'careersCulture', 'pressMediaKit'],
  },
  {
    id: 'saas',
    icon: <Layout size={18} />,
    color: 'bg-indigo-50 text-indigo-600',
    items: ['saasHomepage', 'pricingComparison', 'featureDeepDive', 'docsHelpCenter'],
  },
  {
    id: 'content',
    icon: <Globe size={18} />,
    color: 'bg-emerald-50 text-emerald-600',
    items: ['personalPortfolio', 'agencyShowcase', 'consultantBooking', 'resourceLibraryBlog'],
  },
];

export function WebsiteModePanel({ onPromptSelect }: ModePanelProps) {
  const t = useTranslations('dashboard');
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 animate-fade-in">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8 flex items-start gap-4">
        <div className="p-3 bg-indigo-100 rounded-lg text-indigo-700">
          <FileCodeIcon size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-indigo-900">{t('websitePanel.bannerTitle')}</h3>
          <p className="text-indigo-700 text-sm mt-1">{t('websitePanel.bannerDescription')}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{t('websitePanel.sectionTitle')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {WEBSITE_TEMPLATES.map((cat) => (
            <div key={cat.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${cat.color}`}>{cat.icon}</div>
                <h4 className="font-bold text-gray-800 text-sm">{t(`websitePanel.categories.${cat.id}.title` as any)}</h4>
              </div>
              <div className="space-y-1">
                {cat.items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      onPromptSelect(
                        t('websitePanel.promptTemplate', {
                          template: t(`websitePanel.categories.${cat.id}.items.${item}` as any),
                        }),
                      )
                    }
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 hover:text-indigo-600 flex items-center justify-between group cursor-pointer"
                  >
                    <span>{t(`websitePanel.categories.${cat.id}.items.${item}` as any)}</span>
                    <ArrowUp size={12} className="opacity-0 group-hover:opacity-100 -rotate-45 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

