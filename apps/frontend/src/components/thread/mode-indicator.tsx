'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronDown, Check, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModelSelection } from '@/hooks/agents';
import { KortixLogo } from '@/components/sidebar/kortix-logo';
import { usePricingModalStore } from '@/stores/pricing-modal-store';

export const ModeIndicator = memo(function ModeIndicator() {
  const {
    selectedModel,
    allModels: modelOptions,
    canAccessModel,
    handleModelChange,
  } = useModelSelection();

  const basicModel = useMemo(
    () => modelOptions.find((m) => m.id === 'kortix/basic' || m.label === 'Kortix Basic'),
    [modelOptions]
  );
  
  const powerModel = useMemo(
    () => modelOptions.find((m) => m.id === 'kortix/power' || m.label === 'Kortix Advanced Mode'),
    [modelOptions]
  );

  // Gemini models
  const geminiModels = useMemo(
    () => modelOptions.filter((m) => m.id.startsWith('google/')),
    [modelOptions]
  );

  const canAccessPower = powerModel ? canAccessModel(powerModel.id) : false;
  const isPowerSelected = powerModel && selectedModel === powerModel.id;
  const isBasicSelected = basicModel && selectedModel === basicModel.id;
  const isGeminiSelected = selectedModel?.startsWith('google/');

  const selectedGeminiModel = useMemo(
    () => geminiModels.find((m) => m.id === selectedModel),
    [geminiModels, selectedModel]
  );

  const handleBasicClick = useCallback(() => {
    if (basicModel) {
      handleModelChange(basicModel.id);
    }
  }, [basicModel, handleModelChange]);

  const handleAdvancedClick = useCallback(() => {
    if (powerModel) {
      if (canAccessPower) {
        handleModelChange(powerModel.id);
      } else {
        usePricingModalStore.getState().openPricingModal({
          isAlert: true,
          alertTitle: 'Upgrade to access Kortix Advanced mode',
        });
      }
    }
  }, [powerModel, canAccessPower, handleModelChange]);

  const handleGeminiClick = useCallback((modelId: string) => {
    const hasAccess = canAccessModel(modelId);
    if (hasAccess) {
      handleModelChange(modelId);
    } else {
      usePricingModalStore.getState().openPricingModal({
        isAlert: true,
        alertTitle: 'Upgrade to access this model',
      });
    }
  }, [canAccessModel, handleModelChange]);

  // Determine current mode label
  const currentModeLabel = useMemo(() => {
    if (isPowerSelected) return 'Advanced';
    if (isGeminiSelected && selectedGeminiModel) return selectedGeminiModel.label;
    return 'Basic';
  }, [isPowerSelected, isGeminiSelected, selectedGeminiModel]);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-10 px-3 bg-transparent border-[1.5px] border-border rounded-2xl cursor-pointer gap-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50"
            >
              {isPowerSelected && <KortixLogo size={12} variant="symbol" />}
              {isGeminiSelected && <Sparkles className="h-3.5 w-3.5 text-blue-500" />}
              <span className="text-sm font-medium">{currentModeLabel}</span>
              {!canAccessPower && !isPowerSelected && !isGeminiSelected && (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
              )}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" strokeWidth={2} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Switch model</p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-[220px] p-2">
        {/* Kortix Section */}
        <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Kortix
        </div>
        
        {/* Basic Mode */}
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2 text-sm cursor-pointer rounded-lg transition-colors',
            isBasicSelected ? 'bg-muted' : 'hover:bg-muted/50'
          )}
          onClick={handleBasicClick}
        >
          <span className="font-medium">Basic</span>
          {isBasicSelected && <Check className="h-4 w-4 text-primary" strokeWidth={2} />}
        </div>

        {/* Advanced Mode */}
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2 text-sm cursor-pointer rounded-lg transition-colors',
            isPowerSelected
              ? 'bg-muted'
              : canAccessPower
              ? 'hover:bg-muted/50'
              : 'hover:bg-muted/50 cursor-pointer'
          )}
          onClick={handleAdvancedClick}
        >
          <div className="flex items-center gap-1.5">
            <KortixLogo size={12} variant="symbol" />
            <span
              className={cn(
                'font-medium',
                isPowerSelected ? 'text-primary' : ''
              )}
            >
              Advanced
            </span>
          </div>
          {isPowerSelected && <Check className="h-4 w-4 text-primary" strokeWidth={2} />}
          {!canAccessPower && <Lock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />}
        </div>

        {/* Gemini Models Section */}
        {geminiModels.length > 0 && (
          <>
            <DropdownMenuSeparator className="my-2" />
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Gemini
            </div>
            {geminiModels.map((model) => {
              const isSelected = selectedModel === model.id;
              const hasAccess = canAccessModel(model.id);
              
              return (
                <div
                  key={model.id}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 text-sm cursor-pointer rounded-lg transition-colors',
                    isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                  )}
                  onClick={() => handleGeminiClick(model.id)}
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                    <span className={cn('font-medium', isSelected ? 'text-primary' : '')}>
                      {model.label}
                    </span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary" strokeWidth={2} />}
                  {!hasAccess && <Lock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />}
                </div>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default ModeIndicator;

