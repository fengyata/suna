'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, Lock, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModelSelection } from '@/hooks/agents';
import { usePricingModalStore } from '@/stores/pricing-modal-store';

export const GeminiSelector = memo(function GeminiSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    selectedModel,
    allModels: modelOptions,
    canAccessModel,
    handleModelChange,
  } = useModelSelection();

  // Gemini models
  const geminiModels = useMemo(
    () => modelOptions.filter((m) => m.id.startsWith('google/')),
    [modelOptions]
  );

  const isGeminiSelected = selectedModel?.startsWith('google/');

  const selectedGeminiModel = useMemo(
    () => geminiModels.find((m) => m.id === selectedModel),
    [geminiModels, selectedModel]
  );

  const handleGeminiClick = useCallback((modelId: string) => {
    const hasAccess = canAccessModel(modelId);
    if (hasAccess) {
      handleModelChange(modelId);
      setIsOpen(false);
    } else {
      setIsOpen(false);
      usePricingModalStore.getState().openPricingModal({
        isAlert: true,
        alertTitle: 'Upgrade to access this model',
      });
    }
  }, [canAccessModel, handleModelChange]);

  // Don't render if no Gemini models available
  if (geminiModels.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer text-sm',
            'hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isGeminiSelected ? 'bg-accent/30' : ''
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          <span className="font-medium">
            {isGeminiSelected && selectedGeminiModel ? selectedGeminiModel.label : 'Gemini'}
          </span>
          <ChevronDown className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="start" 
        className="w-[200px] p-2 rounded-xl border border-border/50 shadow-lg"
        sideOffset={8}
      >
        {geminiModels.map((model) => {
          const isSelected = selectedModel === model.id;
          const hasAccess = canAccessModel(model.id);
          
          return (
            <div
              key={model.id}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 cursor-pointer rounded-lg transition-all duration-150 mb-1',
                isSelected 
                  ? 'bg-accent' 
                  : 'hover:bg-accent/50 active:bg-accent/70'
              )}
              onClick={() => handleGeminiClick(model.id)}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-sm font-medium">{model.label}</span>
              </div>
              {isSelected ? (
                <Check className="h-4 w-4 text-foreground flex-shrink-0" strokeWidth={2} />
              ) : !hasAccess ? (
                <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" strokeWidth={2} />
              ) : null}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default GeminiSelector;

