'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/utils';
import { cn } from '@/lib/utils';
import { DynamicGreeting } from '@/components/ui/dynamic-greeting';
import { AgentStartInput } from '@/components/shared/agent-start-input';
import { ModeCards } from '@/components/dashboard/new-dashboard/mode-cards';
import { ModeContent } from '@/components/dashboard/new-dashboard/mode-content';
import type { DashboardModeAction } from '@/components/dashboard/new-dashboard/types';
import { useSunaModePersistence } from '@/stores/suna-modes-store';

export function DashboardContentNew() {
  const router = useRouter();
  const isMobile = useIsMobile();

  const {
    selectedMode,
    setSelectedMode,
  } = useSunaModePersistence();

  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configAgentId, setConfigAgentId] = useState<string | null>(null);

  const handleConfigureAgent = useCallback((agentId: string) => {
    setConfigAgentId(agentId);
    setShowConfigDialog(true);
  }, []);

  const handleAction = useCallback((action: DashboardModeAction) => {
    if (action.type === 'select_mode') {
      setSelectedMode(action.mode);
      // keep URL stable
      return;
    }

    if (action.type === 'external') {
      const url = action.url;
      if (!url || url === '#') return;

      window.open(url, action.target || '_blank');
      return;
    }
  }, [setSelectedMode]);

  const showCards = selectedMode === null;

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 flex flex-col relative min-w-0 bg-white">
            <div className={cn('flex-1 overflow-y-auto scroll-smooth custom-scrollbar p-4 md:p-0')}>
              <div className="max-w-4xl mx-auto w-full">
                {showCards && (
                  <div className="max-w-7xl mx-auto px-4 md:px-6 animate-fade-in pb-20 mt-6 bg-white">
                    <div className="text-center mb-10 mt-8">
                      <DynamicGreeting className="text-2xl font-semibold text-gray-900 mb-2" />
                      <p className="text-gray-500 text-sm">选择一个能力方向，或者直接在下方输入你的需求。</p>
                    </div>

                    <div className="hidden md:block w-full">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 ml-1">
                        Explore agentic AI capabilities
                      </h3>
                      <ModeCards onAction={handleAction} />
                    </div>
                  </div>
                )}

                {!showCards && (
                  <div className="px-4 md:px-6 py-6">
                    <ModeContent
                      selectedMode={selectedMode}
                      onBack={() => setSelectedMode(null)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom input area (uses AgentStartInput, not reference ChatInput logic) */}
            <div className={cn('w-full bg-white border-gray-100 p-4 z-20', isMobile ? '' : 'border-t')}>
              <div className="max-w-4xl mx-auto relative">
                <AgentStartInput
                  variant="dashboard"
                  requireAuth={true}
                  redirectOnError="/dashboard"
                  showGreeting={false}
                  enableAdvancedConfig={false}
                  onConfigureAgent={handleConfigureAgent}
                  animatePlaceholder={true}
                  hideAttachments={false}
                  showAlertBanners={true}
                  showModesPanel={true}
                  isMobile={isMobile}
                  inputWrapperClassName="w-full flex flex-col items-center"
                  modesPanelWrapperClassName="pt-3 max-w-4xl mx-auto"
                />

                <div className="text-center mt-2 text-xs text-gray-400">
                  SuperAgent 可能会出错，请核对关键信息。
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

