'use client';

import React from 'react';
import { Table, FileSpreadsheet, Target, LifeBuoy } from 'lucide-react';
import type { ModePanelProps } from './mode-panel-props';

export function DataModePanel({ onPromptSelect }: ModePanelProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 animate-fade-in">
      <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-6 mb-8 flex items-start gap-4">
        <div className="p-3 bg-cyan-100 rounded-lg text-cyan-700">
          <Table size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-cyan-900">Data Analyst Agent</h3>
          <p className="text-cyan-700 text-sm mt-1">Clean lists, enrich contacts, and analyze CSVs for GTM insights.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect('Clean this lead list and standardize job titles...')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <FileSpreadsheet size={20} />
            </div>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">Sales</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">Lead list cleaner</h4>
          <p className="text-xs text-gray-500">Fix formatting, remove dupes, and standardize fields for CRM import.</p>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect('Find companies similar to my top 10 customers...')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <Target size={20} />
            </div>
            <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded">MKTG</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">Lookalike audiences</h4>
          <p className="text-xs text-gray-500">Discover new prospects based on your best customers.</p>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect('Analyze these support tickets for sentiment and recurring issues...')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
              <LifeBuoy size={20} />
            </div>
            <span className="text-[10px] font-bold bg-orange-50 text-orange-600 px-2 py-1 rounded">CX</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">Ticket analysis</h4>
          <p className="text-xs text-gray-500">Identify recurring issues and sentiment from support exports.</p>
        </button>
      </div>
    </div>
  );
}

