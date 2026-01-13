'use client';

import React from 'react';
import { Share2, Zap, RefreshCw, MessageCircle } from 'lucide-react';
import type { ModePanelProps } from './mode-panel-props';

export function SocialSellingModePanel({ onPromptSelect }: ModePanelProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 animate-fade-in mt-6">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8 flex items-start gap-4">
        <div className="p-3 bg-indigo-100 rounded-lg text-indigo-700">
          <Share2 size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-indigo-900">Social Selling Assistant</h3>
          <p className="text-indigo-700 text-sm mt-1">
            Build your personal brand, draft viral hooks, and engage prospects with AI.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          type="button"
          className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-colors cursor-pointer text-left"
          onClick={() => onPromptSelect('Write a contrarian LinkedIn post hook about...')}
        >
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-3">
            <Zap size={20} />
          </div>
          <h4 className="font-bold text-gray-800">Viral hook generator</h4>
          <p className="text-xs text-gray-500 mt-1">Stop the scroll with AI-crafted openers.</p>
        </button>

        <button
          type="button"
          className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-colors cursor-pointer text-left"
          onClick={() => onPromptSelect('Repurpose this blog post into a Twitter thread...')}
        >
          <div className="w-10 h-10 bg-pink-50 text-pink-600 rounded-lg flex items-center justify-center mb-3">
            <RefreshCw size={20} />
          </div>
          <h4 className="font-bold text-gray-800">Content repurposer</h4>
          <p className="text-xs text-gray-500 mt-1">Turn blogs into posts, threads, and carousels.</p>
        </button>

        <button
          type="button"
          className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-colors cursor-pointer text-left"
          onClick={() => onPromptSelect('Write a DM sequence for a cold prospect who viewed my profile...')}
        >
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-3">
            <MessageCircle size={20} />
          </div>
          <h4 className="font-bold text-gray-800">DM sequence writer</h4>
          <p className="text-xs text-gray-500 mt-1">Draft non-salesy outreach messages.</p>
        </button>
      </div>
    </div>
  );
}

