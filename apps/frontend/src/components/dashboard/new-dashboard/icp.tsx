'use client';

import React from 'react';
import { MapPin, UserCheck, BarChart, Briefcase, Users, LifeBuoy } from 'lucide-react';
import type { ModePanelProps } from './mode-panel-props';

export function ICPModePanel({ onPromptSelect }: ModePanelProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 animate-fade-in mt-6">
      <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 mb-8 flex items-start gap-4">
        <div className="p-3 bg-purple-100 rounded-lg text-purple-700">
          <MapPin size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-purple-900">Territory & Persona</h3>
          <p className="text-purple-700 text-sm mt-1">Define ICPs, segment territories, and map buying committees.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect('Suggest rep assignments for the West Coast territory based on past performance...')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <UserCheck size={20} />
            </div>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">Sales</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">Rep assignment</h4>
          <p className="text-xs text-gray-500">Recommend rep coverage based on strengths.</p>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect('Model quota capacity for FY24 given current headcount...')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <BarChart size={20} />
            </div>
            <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded">Ops</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">Quota modeling</h4>
          <p className="text-xs text-gray-500">Optimize targets and analyze capacity gaps.</p>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect('Create a hiring plan based on pipeline velocity and revenue goals...')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
              <Briefcase size={20} />
            </div>
            <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-1 rounded">HR</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">Predictive hiring</h4>
          <p className="text-xs text-gray-500">Staffing forecast based on growth trajectory.</p>
        </button>
      </div>

      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Deep segmentation</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect('Define the psychographic profile for our Enterprise segment...')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
            <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded">MKTG</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">Market segmentation</h4>
          <p className="text-xs text-gray-500">Refine ICPs and buyer personas.</p>
        </button>

        <button
          type="button"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group text-left"
          onClick={() => onPromptSelect('Create a health score profile for our most successful customers...')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
              <LifeBuoy size={20} />
            </div>
            <span className="text-[10px] font-bold bg-orange-50 text-orange-600 px-2 py-1 rounded">CX</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">Customer health profile</h4>
          <p className="text-xs text-gray-500">Identify traits of successful long-term clients.</p>
        </button>
      </div>
    </div>
  );
}

