'use client';

import React from 'react';
import { UserCheck, Search, CheckSquare, Megaphone } from 'lucide-react';
import type { ModePanelProps } from './mode-panel-props';

export function AEModePanel({ onPromptSelect }: ModePanelProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 animate-fade-in mt-6">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 flex items-start gap-4">
        <div className="p-3 bg-blue-100 rounded-lg text-blue-700">
          <UserCheck size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-blue-900">Account Executive Agent</h3>
          <p className="text-blue-700 text-sm mt-1">Your full-cycle sales assistant for discovery, demos, and handoffs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect('Prepare discovery questions for a VP of Sales at a Fintech...')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <Search size={20} />
            </div>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">Sales</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">Discovery Prep</h4>
          <p className="text-xs text-gray-500">Generate targeted questions and research.</p>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect('Create a handoff document for the CSM team...')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
              <CheckSquare size={20} />
            </div>
            <span className="text-[10px] font-bold bg-orange-50 text-orange-600 px-2 py-1 rounded">CX</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">Sales → CS Handoff</h4>
          <p className="text-xs text-gray-500">Structure deal notes for seamless onboarding.</p>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect('Draft feedback on lead quality for Marketing...')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <Megaphone size={20} />
            </div>
            <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded">MKTG</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">Lead Feedback Loop</h4>
          <p className="text-xs text-gray-500">Share insights on lead quality with marketing.</p>
        </button>
      </div>
    </div>
  );
}

