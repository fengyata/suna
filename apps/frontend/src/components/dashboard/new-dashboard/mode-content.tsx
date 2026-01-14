'use client';

import React, { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DashboardModeId } from './types';
import { useSunaModePersistence } from '@/stores/suna-modes-store';
import { ImageModePanel } from './image';
import { VideoModePanel } from './video';
import { ResearchModePanel } from './research';
import { AdsModePanel } from './ads';
import { AICallModePanel } from './aicall';
import { SocialSellingModePanel } from './social-selling';
import { PipelineModePanel } from './pipeline';
import { AEModePanel } from './ae';
import { ICPModePanel } from './icp';
import { StrategistModePanel } from './strategist';
import { DataModePanel } from './data';
import { WebsiteModePanel } from './website';

function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-gray-900">{children}</h2>;
}

function Desc({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-500 mt-1">{children}</p>;
}

export function ModeContent(props: {
  selectedMode: string | null;
  onBack: () => void;
  onPromptSelect: (prompt: string, subType?: string | null) => void;
  className?: string;
}) {
  const { subType, setSubType, setInitialParameters } = useSunaModePersistence();
  const mode = props.selectedMode as DashboardModeId | null;

  const handlePromptSelect = useCallback(
    (prompt: string, nextSubType?: string | null) => {
      if (typeof nextSubType !== 'undefined') {
        setSubType(nextSubType);
      }
      props.onPromptSelect(prompt, nextSubType);
    },
    [props, setSubType],
  );

  if (!mode) return null;

  return (
    <div className={cn('w-full', props.className)}>
      <div>
        {mode === 'image' && (
          <ImageModePanel
            mode={mode}
            subType={subType}
            setSubType={setSubType}
            setInitialParameters={setInitialParameters}
            onPromptSelect={handlePromptSelect}
          />
        )}
        {mode === 'video' && (
          <VideoModePanel
            mode={mode}
            subType={subType}
            setSubType={setSubType}
            setInitialParameters={setInitialParameters}
            onPromptSelect={handlePromptSelect}
          />
        )}
        {mode === 'research' && (
          <ResearchModePanel
            mode={mode}
            subType={subType}
            setSubType={setSubType}
            setInitialParameters={setInitialParameters}
            onPromptSelect={handlePromptSelect}
          />
        )}
        {mode === 'ads' && (
          <AdsModePanel
            mode={mode}
            subType={subType}
            setSubType={setSubType}
            setInitialParameters={setInitialParameters}
            onPromptSelect={handlePromptSelect}
          />
        )}
        {mode === 'aicall' && (
          <AICallModePanel
            mode={mode}
            subType={subType}
            setSubType={setSubType}
            setInitialParameters={setInitialParameters}
            onPromptSelect={handlePromptSelect}
          />
        )}
        {mode === 'socialselling' && (
          <SocialSellingModePanel
            mode={mode}
            subType={subType}
            setSubType={setSubType}
            setInitialParameters={setInitialParameters}
            onPromptSelect={handlePromptSelect}
          />
        )}
        {mode === 'pipeline' && (
          <PipelineModePanel
            mode={mode}
            subType={subType}
            setSubType={setSubType}
            setInitialParameters={setInitialParameters}
            onPromptSelect={handlePromptSelect}
          />
        )}
        {mode === 'ae' && (
          <AEModePanel
            mode={mode}
            subType={subType}
            setSubType={setSubType}
            setInitialParameters={setInitialParameters}
            onPromptSelect={handlePromptSelect}
          />
        )}
        {mode === 'icp' && (
          <ICPModePanel
            mode={mode}
            subType={subType}
            setSubType={setSubType}
            setInitialParameters={setInitialParameters}
            onPromptSelect={handlePromptSelect}
          />
        )}
        {mode === 'strategist' && (
          <StrategistModePanel
            mode={mode}
            subType={subType}
            setSubType={setSubType}
            setInitialParameters={setInitialParameters}
            onPromptSelect={handlePromptSelect}
          />
        )}
        {(mode === 'people' || mode === 'data') && (
          <DataModePanel
            mode={mode}
            subType={subType}
            setSubType={setSubType}
            setInitialParameters={setInitialParameters}
            onPromptSelect={handlePromptSelect}
          />
        )}
        {mode === 'website' && (
          <WebsiteModePanel
            mode={mode}
            subType={subType}
            setSubType={setSubType}
            setInitialParameters={setInitialParameters}
            onPromptSelect={handlePromptSelect}
          />
        )}

        {(mode === 'slides' || mode === 'meeting_agent' || mode === 'gtm_decks') && (
          <div className="mt-4 text-sm text-gray-600">
            当前项目中该模式不提供独立面板；你仍可在下方直接输入需求。
          </div>
        )}
      </div>
    </div>
  );
}

