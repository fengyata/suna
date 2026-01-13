'use client';

import React from 'react';
import { Briefcase, FileText, PenTool, Mail, TrendingUp, ArrowUp } from 'lucide-react';
import type { ModePanelProps } from './mode-panel-props';

export function StrategistModePanel({ onPromptSelect }: ModePanelProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 animate-fade-in mt-6">
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 mb-8 flex items-start gap-4">
        <div className="p-3 bg-emerald-100 rounded-lg text-emerald-700">
          <Briefcase size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-emerald-900">Deal Strategist</h3>
          <p className="text-emerald-700 text-sm mt-1">
            Accelerate deal cycles with negotiation plays, contract reviews, and pricing strategy.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:border-emerald-300 cursor-pointer transition-all flex flex-col justify-between text-left"
          onClick={() => onPromptSelect('Generate a proposal for [Client] with standard pricing...')}
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center text-blue-600">
                <FileText size={20} />
              </div>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">Sales</span>
            </div>
            <h4 className="font-bold text-gray-800">Smart proposal gen</h4>
            <p className="text-xs text-gray-500 mt-1">Auto draft + pricing fill.</p>
          </div>
          <div className="mt-4 text-xs font-semibold text-emerald-600 flex items-center gap-1">
            Draft now <ArrowUp size={12} className="rotate-45" />
          </div>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:border-emerald-300 cursor-pointer transition-all flex flex-col justify-between text-left"
          onClick={() => onPromptSelect('Analyze this contract and suggest redlines...')}
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="bg-red-50 w-10 h-10 rounded-lg flex items-center justify-center text-red-600">
                <PenTool size={20} />
              </div>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">Legal</span>
            </div>
            <h4 className="font-bold text-gray-800">Redline assistant</h4>
            <p className="text-xs text-gray-500 mt-1">AI contract review and edits.</p>
          </div>
          <div className="mt-4 text-xs font-semibold text-emerald-600 flex items-center gap-1">
            Upload doc <ArrowUp size={12} className="rotate-45" />
          </div>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:border-emerald-300 cursor-pointer transition-all flex flex-col justify-between text-left"
          onClick={() => onPromptSelect('Draft multi-threaded follow-up emails for the VP and Director...')}
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="bg-purple-50 w-10 h-10 rounded-lg flex items-center justify-center text-purple-600">
                <Mail size={20} />
              </div>
              <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded">Sales</span>
            </div>
            <h4 className="font-bold text-gray-800">Multi-thread follow-up</h4>
            <p className="text-xs text-gray-500 mt-1">Personalized stakeholder emails.</p>
          </div>
          <div className="mt-4 text-xs font-semibold text-emerald-600 flex items-center gap-1">
            Create seq <ArrowUp size={12} className="rotate-45" />
          </div>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:border-emerald-300 cursor-pointer transition-all flex flex-col justify-between text-left"
          onClick={() => onPromptSelect('Analyze account usage for expansion signals...')}
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="bg-green-50 w-10 h-10 rounded-lg flex items-center justify-center text-green-600">
                <TrendingUp size={20} />
              </div>
              <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-1 rounded">CX</span>
            </div>
            <h4 className="font-bold text-gray-800">Expansion scout</h4>
            <p className="text-xs text-gray-500 mt-1">Detect upsell signals and score health.</p>
          </div>
          <div className="mt-4 text-xs font-semibold text-emerald-600 flex items-center gap-1">
            Find opportunities <ArrowUp size={12} className="rotate-45" />
          </div>
        </button>
      </div>
    </div>
  );
}

