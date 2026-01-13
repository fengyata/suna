'use client';

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, Lock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModelSelection } from '@/hooks/agents';
import { usePricingModalStore } from '@/stores/pricing-modal-store';

/**
 * ModeIndicator 模型规则（硬约束）：\n
 * - 只允许 2 个模型：kortix/basic 与 kortix/power\n
 * - 两个模型都使用同一张图片：/kortix-symbol.svg\n
 * - 不允许从 accountState/models 或任何配置动态扩展模型列表\n
 */
const FIXED_MODELS = [
  {
    id: 'kortix/basic',
    label: 'Basic',
    description: 'Fast and efficient for quick tasks',
    iconSrc: '/kortix-symbol.svg',
  },
  {
    id: 'kortix/power',
    label: 'Advanced',
    description: 'Fast and efficient for quick tasks',
    iconSrc: '/kortix-symbol.svg',
  },
] as const;

type FixedModelId = (typeof FIXED_MODELS)[number]['id'];

const ModeLogo = memo(function ModeLogo({
  height = 14,
}: {
  height?: number;
}) {
  return (
    <span className="flex-shrink-0 relative" style={{ height: `${height}px`, width: `${height}px` }}>
      <img
        src="/kortix-symbol.svg"
        alt="Model"
        style={{ height: `${height}px`, width: `${height}px` }}
        suppressHydrationWarning
      />
    </span>
  );
});

export const ModeIndicator = memo(function ModeIndicator() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    selectedModel,
    canAccessModel,
    handleModelChange,
  } = useModelSelection();

  // Normalize selection to one of the two allowed models.
  const normalizedSelectedModel = useMemo<FixedModelId>(() => {
    return (selectedModel === 'kortix/power' ? 'kortix/power' : 'kortix/basic') as FixedModelId;
  }, [selectedModel]);

  // If some other model got selected elsewhere, force it back to basic.
  useEffect(() => {
    if (selectedModel && selectedModel !== 'kortix/basic' && selectedModel !== 'kortix/power') {
      handleModelChange('kortix/basic');
    }
  }, [selectedModel, handleModelChange]);

  const canAccessPower = canAccessModel('kortix/power');
  const isPowerSelected = normalizedSelectedModel === 'kortix/power';
  const isBasicSelected = normalizedSelectedModel === 'kortix/basic';

  const handleBasicClick = useCallback(() => {
    handleModelChange('kortix/basic');
    setIsOpen(false);
  }, [handleModelChange]);

  const handleAdvancedClick = useCallback(() => {
    if (canAccessPower) {
      handleModelChange('kortix/power');
      setIsOpen(false);
      return;
    }

    setIsOpen(false);
    usePricingModalStore.getState().openPricingModal({
      isAlert: true,
      alertTitle: 'Upgrade to access Advanced mode',
    });
  }, [canAccessPower, handleModelChange]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer',
            'hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          <ModeLogo height={14} />
          <span className="text-sm font-medium text-foreground">
            {isPowerSelected ? 'Advanced' : 'Basic'}
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="start" 
        className="w-[320px] p-2 rounded-xl border border-border/50 shadow-lg"
        sideOffset={8}
      >
        {/* Basic Mode */}
        <div
          className={cn(
            'flex items-start gap-3 px-3 py-3 cursor-pointer rounded-lg transition-all duration-150 mb-1.5',
            isBasicSelected 
              ? 'bg-accent' 
              : 'hover:bg-accent/50 active:bg-accent/70'
          )}
          onClick={handleBasicClick}
        >
          <div className="flex-1 min-w-0">
            <div className="mb-1">
              <div className="flex items-center gap-2">
                <ModeLogo height={14} />
                <div className="text-sm font-medium">Basic</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">Fast and efficient for quick tasks</div>
          </div>
          {isBasicSelected && (
            <Check className="h-4 w-4 text-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
          )}
        </div>

        {/* Advanced Mode */}
        <div
          className={cn(
            'flex items-start gap-3 px-3 py-3 cursor-pointer rounded-lg transition-all duration-150',
            isPowerSelected 
              ? 'bg-accent' 
              : 'hover:bg-accent/50 active:bg-accent/70'
          )}
          onClick={handleAdvancedClick}
        >
          <div className="flex-1 min-w-0">
            <div className="mb-1">
              <div className="flex items-center gap-2">
                <ModeLogo height={14} />
                <div className="text-sm font-medium">Advanced</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">Fast and efficient for quick tasks</div>
          </div>
          {isPowerSelected ? (
            <Check className="h-4 w-4 text-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
          ) : !canAccessPower ? (
            <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default ModeIndicator;

