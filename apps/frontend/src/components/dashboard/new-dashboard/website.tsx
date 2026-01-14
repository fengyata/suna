'use client';

import React from 'react';
import { Layout, Megaphone, Building, Globe, ArrowUp, FileCodeIcon } from 'lucide-react';
import type { ModePanelProps } from './mode-panel-props';

const WEBSITE_TEMPLATES: Array<{
  category: string;
  icon: React.ReactNode;
  color: string;
  items: string[];
}> = [
  {
    category: 'Marketing & Campaigns',
    icon: <Megaphone size={18} />,
    color: 'bg-pink-50 text-pink-600',
    items: [
      'High-Conversion Landing Page',
      'Webinar Registration Site',
      'Product Launch Countdown',
      'Event Microsite',
      'Newsletter Signup Page',
    ],
  },
  {
    category: 'Corporate & Brand',
    icon: <Building size={18} />,
    color: 'bg-blue-50 text-blue-600',
    items: ['Modern Corporate Homepage', 'About Us & Leadership', 'Careers & Culture Hub', 'Press & Media Kit'],
  },
  {
    category: 'SaaS & Product',
    icon: <Layout size={18} />,
    color: 'bg-indigo-50 text-indigo-600',
    items: ['SaaS Product Homepage', 'Pricing & Plans Comparison', 'Feature Deep Dive Page', 'Documentation / Help Center'],
  },
  {
    category: 'Content & Portfolio',
    icon: <Globe size={18} />,
    color: 'bg-emerald-50 text-emerald-600',
    items: ['Personal Brand Portfolio', 'Creative Agency Showcase', 'Consultant Booking Page', 'Resource Library / Blog'],
  },
];

export function WebsiteModePanel({ onPromptSelect }: ModePanelProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 animate-fade-in">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8 flex items-start gap-4">
        <div className="p-3 bg-indigo-100 rounded-lg text-indigo-700">
          <FileCodeIcon size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-indigo-900">Website</h3>
          <p className="text-indigo-700 text-sm mt-1">Generate high-converting landing pages and functional web apps with AI.</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Template library</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {WEBSITE_TEMPLATES.map((cat) => (
            <div key={cat.category} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${cat.color}`}>{cat.icon}</div>
                <h4 className="font-bold text-gray-800 text-sm">{cat.category}</h4>
              </div>
              <div className="space-y-1">
                {cat.items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onPromptSelect(`Create a ${item} for...`)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 hover:text-indigo-600 flex items-center justify-between group"
                  >
                    <span>{item}</span>
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

