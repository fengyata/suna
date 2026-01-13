'use client';

import React from 'react';
import { LineChart, BarChart, Megaphone, PieChart } from 'lucide-react';
import type { ModePanelProps } from './mode-panel-props';

export function PipelineModePanel({ onPromptSelect }: ModePanelProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 animate-fade-in mt-6">
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 mb-8 flex items-start gap-4">
        <div className="p-3 bg-emerald-100 rounded-lg text-emerald-700">
          <LineChart size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-emerald-900">Pipeline Manager</h3>
          <p className="text-emerald-700 text-sm mt-1">Forecasting, deal QA, and risk detection.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect('Forecast my Q4 revenue and identify slippage risks...')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <BarChart size={20} />
            </div>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">Sales</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">Q4 Forecast</h4>
          <p className="text-xs text-gray-500">Predict revenue and spot deal slippage.</p>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect('Analyze campaign attribution for closed-won deals...')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <Megaphone size={20} />
            </div>
            <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded">MKTG</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">Campaign ROI</h4>
          <p className="text-xs text-gray-500">Attribution analysis for recent wins.</p>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect('Forecast churn risk for the upcoming renewal cohort...')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
              <PieChart size={20} />
            </div>
            <span className="text-[10px] font-bold bg-orange-50 text-orange-600 px-2 py-1 rounded">CX</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">Churn Forecast</h4>
          <p className="text-xs text-gray-500">Predict renewals and at-risk accounts.</p>
        </button>
      </div>
    </div>
  );
}

