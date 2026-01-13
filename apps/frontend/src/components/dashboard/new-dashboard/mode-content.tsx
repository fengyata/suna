'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DashboardModeId } from './types';

function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-gray-900">{children}</h2>;
}

function Desc({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-500 mt-1">{children}</p>;
}

export function ModeContent(props: {
  selectedMode: string | null;
  onBack: () => void;
  className?: string;
}) {
  const mode = props.selectedMode as DashboardModeId | null;
  if (!mode) return null;

  const titleMap: Record<string, string> = {
    image: 'Visuals',
    video: 'Video Studio',
    research: 'Deep Research',
    ads: 'Ad Studio',
    website: 'Web App',
    pipeline: 'Pipeline Manager',
    ae: 'Account Executive',
    strategist: 'Deal Strategist',
    people: 'Data Analyst',
    icp: 'Territory & Persona',
    socialselling: 'Social Selling',
  };

  const title = titleMap[mode] || 'Mode';

  return (
    <div className={cn('w-full', props.className)}>
      <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Title>{title}</Title>
            <Desc>在下方输入框描述你的目标，我会按当前模式优先理解与执行。</Desc>
          </div>
          <Button variant="outline" onClick={props.onBack}>
            返回
          </Button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          {mode === 'pipeline' || mode === 'ae' || mode === 'strategist' || mode === 'people' || mode === 'icp' || mode === 'socialselling' || mode === 'website' ? (
            <p>
              该模式的专用面板还在接入中；当前你仍可直接输入需求，系统会通过 Agent 执行并生成结果。
            </p>
          ) : (
            <p>你也可以从下方的模式面板选择提示词，快速开始。</p>
          )}
        </div>
      </div>
    </div>
  );
}

