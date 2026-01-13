'use client';

import React, { useEffect, useState } from 'react';
import { PhoneCall, UploadCloud, BookOpen, Link, Phone, Voicemail, Play } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { ModePanelProps } from './mode-panel-props';

export function AICallModePanel({ mode, setInitialParameters, onPromptSelect }: ModePanelProps) {
  const [scriptPrompt, setScriptPrompt] = useState('');

  useEffect(() => {
    setInitialParameters({
      prompt: scriptPrompt || null,
      source_from: ['user'],
      mode,
    });
  }, [mode, scriptPrompt, setInitialParameters]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 animate-fade-in mt-6">
      <div className="bg-lime-50 border border-lime-100 rounded-xl p-6 mb-8 flex items-start gap-4">
        <div className="p-3 bg-lime-100 rounded-lg text-lime-700">
          <PhoneCall size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-lime-900">AI Call Agent</h3>
          <p className="text-lime-700 text-sm mt-1">
            Automate outbound calling with realistic AI voices. Upload leads, set the script, and launch campaigns.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-lime-100 text-lime-700 rounded-full flex items-center justify-center text-xs">
                1
              </span>
              Audience & Data
            </h3>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-gray-400 hover:border-lime-300 hover:bg-lime-50 transition-colors cursor-pointer group">
              <UploadCloud size={24} className="mb-2 group-hover:text-lime-600" />
              <span className="text-sm font-medium group-hover:text-lime-700">Upload Leads CSV/Excel</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-lime-100 text-lime-700 rounded-full flex items-center justify-center text-xs">
                2
              </span>
              Knowledge Base
            </h3>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-gray-400 hover:border-lime-300 hover:bg-lime-50 transition-colors cursor-pointer text-center">
                <BookOpen size={20} className="mb-1" />
                <span className="text-xs">Upload Policy Docs (PDF)</span>
              </div>
              <div className="flex-1 border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-gray-400 hover:border-lime-300 hover:bg-lime-50 transition-colors cursor-pointer text-center">
                <Link size={20} className="mb-1" />
                <span className="text-xs">Add Website URL</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-lime-100 text-lime-700 rounded-full flex items-center justify-center text-xs">
                3
              </span>
              AI Script & Prompt
            </h3>
            <Textarea
              value={scriptPrompt}
              onChange={(e) => setScriptPrompt(e.target.value)}
              placeholder="System Prompt: You are a helpful assistant for Acme Corp. Your goal is to schedule a demo..."
              className="h-40 resize-none font-mono text-gray-700"
            />
          </div>
        </div>

        <div>
          <div className="bg-slate-900 rounded-xl p-6 text-white shadow-xl sticky top-24">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold flex items-center gap-2">
                <Phone size={18} /> Live Dialer
              </h3>
              <span className="text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                LIVE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-2xl font-bold">0/500</div>
                <div className="text-xs text-gray-400">Calls Made</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-2xl font-bold text-lime-400">0%</div>
                <div className="text-xs text-gray-400">Conversion</div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="text-xs font-bold text-gray-500 uppercase">Recent Activity</div>
              <div className="flex items-center gap-3 p-2 rounded bg-white/5 border border-white/5">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center">
                  <Voicemail size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">+1 (555) 019-2834</div>
                  <div className="text-[10px] text-gray-400">Voicemail Left • 2m ago</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded bg-white/5 border border-white/5">
                <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                  <PhoneCall size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">+1 (555) 888-9999</div>
                  <div className="text-[10px] text-gray-400">Connected (45s) • 5m ago</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onPromptSelect(scriptPrompt || 'Start the calling campaign based on the uploaded list...')}
              className="w-full py-3 bg-lime-500 hover:bg-lime-600 text-slate-900 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Play size={16} fill="currentColor" /> Fill prompt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

