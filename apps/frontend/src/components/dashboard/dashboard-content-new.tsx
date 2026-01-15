'use client';

import React, { useCallback, useState } from 'react';
import { useIsMobile } from '@/hooks/utils';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { AgentStartInput } from '@/components/shared/agent-start-input';
import { ModeCards } from '@/components/dashboard/new-dashboard/mode-cards';
import { ModeContent } from '@/components/dashboard/new-dashboard/mode-content';
import { SuperModesPanel } from '@/components/dashboard/new-dashboard/super-modes-panel';
import type { DashboardModeAction } from '@/components/dashboard/new-dashboard/types';
import { useSunaModePersistence } from '@/stores/suna-modes-store';
import { GlobalUserInfo } from '@/components/AuthProvider';

function postSelectedModeToParent(mode: string | null) {
  if (typeof window === 'undefined') return;

  try {
    // only notify outer container when embedded in iframe
    if (window.self === window.top) return;
  } catch {
    // Cross-origin iframe access may throw; assume embedded
  }

  window.parent.postMessage(
    {
      type: 'superagent_selected_mode',
      data: { mode },
    },
    '*',
  );
}

export function DashboardContentNew() {
  const isMobile = useIsMobile();
  const t = useTranslations('dashboard');

  const {
    selectedMode,
    setSelectedMode,
  } = useSunaModePersistence();

  const [externalPrompt, setExternalPrompt] = useState<{ text: string; nonce: number } | null>(null);
  const [externalPromptNonce, setExternalPromptNonce] = useState(0);

  const handleModeSelect = useCallback(
    (mode: string | null) => {
      setSelectedMode(mode);
      setExternalPrompt(null);
      setExternalPromptNonce(0);
      postSelectedModeToParent(mode);
    },
    [setSelectedMode],
  );

  const handleConfigureAgent = useCallback((_agentId: string) => {
    // 当前新面板不展示配置弹窗，先保持回调占位，避免 AgentStartInput 行为改变
  }, []);

  const handleAction = useCallback((action: DashboardModeAction) => {
    if (action.type === 'select_mode') {
      handleModeSelect(action.mode);
      // keep URL stable
      return;
    }

    if (action.type === 'external') {
      const url = action.url;
      if (!url || url === '#') return;

      window.open(url, action.target || '_blank');
      return;
    }
  }, [handleModeSelect]);

  const getTimeOfDay = () => {
    const hours = new Date().getHours();
    // 早上: 5:00 - 12:00
    if (hours >= 5 && hours < 12) {
      return t('good_morning');
    }
    // 下午: 12:00 - 18:00
    if (hours >= 12 && hours < 18) {
      return t('good_afternoon');
    }
    // 晚上: 18:00 - 5:00 (包括深夜)
    return t('good_evening');
  };

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
                      {/* <DynamicGreeting className="text-2xl font-semibold text-gray-900 mb-2" />
                      <p className="text-gray-500 text-sm">选择一个能力方向，或者直接在下方输入你的需求。</p> */}
                      <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                          {getTimeOfDay()}{GlobalUserInfo.userInfo?.firstName && <>, <span className="text-blue-600">{GlobalUserInfo.userInfo?.firstName}</span></>}
                        </h1>
                        <p className="text-gray-500 text-sm">
                          {t('ready_to_accelerate_your_pipeline')}
                        </p>
                    </div>

                    <div className="hidden md:block w-full">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 ml-1">
                        {t('explore_agentic_ai_capabilities')}
                      </h3>
                      <ModeCards onAction={handleAction} />
                    </div>
                  </div>
                )}

                {!showCards && (
                  <div className="py-6 pb-8">
                    <ModeContent
                      selectedMode={selectedMode}
                      onBack={() => handleModeSelect(null)}
                      onPromptSelect={(prompt) => {
                        setExternalPromptNonce((n) => {
                          const next = n + 1;
                          setExternalPrompt({ text: prompt, nonce: next });
                          return next;
                        });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom input area (uses AgentStartInput, not reference ChatInput logic) */}
            <div className={cn('w-full bg-white border-gray-100 p-3 z-20', isMobile ? '' : 'border-t')}>
              <div className="max-w-4xl mx-auto relative">
                <div className="hidden md:block">
                  <SuperModesPanel
                    selectedMode={selectedMode}
                    onModeSelect={handleModeSelect}
                    className="pb-1"
                  />
                </div>
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
                  showModesPanel={false}
                  isMobile={isMobile}
                  externalPrompt={externalPrompt?.text ?? null}
                  externalPromptNonce={externalPrompt?.nonce ?? externalPromptNonce}
                  inputWrapperClassName="w-full flex flex-col items-center"
                  modesPanelWrapperClassName="pt-3 max-w-4xl mx-auto"
                />

                <div className="text-center mt-3 text-xs text-gray-400">
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

