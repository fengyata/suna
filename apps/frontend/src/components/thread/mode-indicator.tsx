'use client';

import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Check, Lock, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModelSelection } from '@/hooks/agents';
import { usePricingModalStore } from '@/stores/pricing-modal-store';

// Logo component for mode display with theme support
const ModeLogo = memo(function ModeLogo({ 
  mode, 
  height = 12
}: { 
  mode: 'basic' | 'advanced'; 
  height?: number;
}) {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine if dark mode
  const isDark = mounted && (
    theme === 'dark' || (theme === 'system' && systemTheme === 'dark')
  );

  // Use light variant on dark mode, dark variant on light mode
  const src = mode === 'advanced' 
    ? (isDark ? '/Advanced-Light.svg' : '/Advanced-Dark.svg')
    : (isDark ? '/Basic-Light.svg' : '/Basic-Dark.svg');

  return (
    <img
      src={src}
      alt={mode === 'advanced' ? 'SuperAgent Advanced' : 'SuperAgent Basic'}
      className="flex-shrink-0"
      style={{ height: `${height}px`, width: 'auto' }}
    />
  );
});

export const ModeIndicator = memo(function ModeIndicator() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    selectedModel,
    allModels: modelOptions,
    canAccessModel,
    handleModelChange,
  } = useModelSelection();

  const basicModel = useMemo(
    () => modelOptions.find((m) => m.id === 'kortix/basic' || m.label === 'SuperAgent Basic'),
    [modelOptions]
  );
  
  const powerModel = useMemo(
    () => modelOptions.find((m) => m.id === 'kortix/power' || m.label === 'SuperAgent Advanced Mode'),
    [modelOptions]
  );

  // Gemini models
  const geminiFlash = useMemo(
    () => modelOptions.find((m) => m.id === 'google/gemini-flash'),
    [modelOptions]
  );
  
  const geminiPro = useMemo(
    () => modelOptions.find((m) => m.id === 'google/gemini-pro'),
    [modelOptions]
  );

  const canAccessPower = powerModel ? canAccessModel(powerModel.id) : false;
  const canAccessGeminiFlash = geminiFlash ? canAccessModel(geminiFlash.id) : false;
  const canAccessGeminiPro = geminiPro ? canAccessModel(geminiPro.id) : false;

  const isPowerSelected = powerModel && selectedModel === powerModel.id;
  const isBasicSelected = basicModel && selectedModel === basicModel.id;
  const isGeminiFlashSelected = geminiFlash && selectedModel === geminiFlash.id;
  const isGeminiProSelected = geminiPro && selectedModel === geminiPro.id;

  // Determine current display mode
  const getCurrentDisplayMode = () => {
    if (isPowerSelected) return 'advanced';
    if (isGeminiFlashSelected) return 'gemini-flash';
    if (isGeminiProSelected) return 'gemini-pro';
    return 'basic';
  };
  const currentMode = getCurrentDisplayMode();

  const handleBasicClick = useCallback(() => {
    if (basicModel) {
      handleModelChange(basicModel.id);
      setIsOpen(false);
    }
  }, [basicModel, handleModelChange]);

  const handleAdvancedClick = useCallback(() => {
    if (powerModel) {
      if (canAccessPower) {
        handleModelChange(powerModel.id);
        setIsOpen(false);
      } else {
        setIsOpen(false);
        usePricingModalStore.getState().openPricingModal({
          isAlert: true,
          alertTitle: 'Upgrade to access SuperAgent Advanced mode',
        });
      }
    }
  }, [powerModel, canAccessPower, handleModelChange]);

  const handleGeminiClick = useCallback((model: typeof geminiFlash, canAccess: boolean) => {
    if (model) {
      if (canAccess) {
        handleModelChange(model.id);
        setIsOpen(false);
      } else {
        setIsOpen(false);
        usePricingModalStore.getState().openPricingModal({
          isAlert: true,
          alertTitle: 'Upgrade to access this model',
        });
      }
    }
  }, [handleModelChange]);

  // Render the trigger content based on current selection
  const renderTriggerContent = () => {
    if (currentMode === 'gemini-flash') {
      return (
        <>
          <Sparkles className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">Gemini Flash</span>
        </>
      );
    }
    if (currentMode === 'gemini-pro') {
      return (
        <>
          <Sparkles className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">Gemini 3 Pro</span>
        </>
      );
    }
    return <ModeLogo mode={currentMode === 'advanced' ? 'advanced' : 'basic'} height={14} />;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer',
            'hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          {renderTriggerContent()}
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
              <ModeLogo mode="basic" height={14} />
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
              <ModeLogo mode="advanced" height={14} />
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">Maximum intelligence for complex work</div>
          </div>
          {isPowerSelected ? (
            <Check className="h-4 w-4 text-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
          ) : !canAccessPower ? (
            <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
          ) : null}
        </div>

        {/* Gemini Models Separator */}
        {(geminiFlash || geminiPro) && (
          <DropdownMenuSeparator className="my-2" />
        )}

        {/* Gemini Flash */}
        {geminiFlash && (
          <div
            className={cn(
              'flex items-start gap-3 px-3 py-3 cursor-pointer rounded-lg transition-all duration-150 mb-1.5',
              isGeminiFlashSelected 
                ? 'bg-accent' 
                : 'hover:bg-accent/50 active:bg-accent/70'
            )}
            onClick={() => handleGeminiClick(geminiFlash, canAccessGeminiFlash)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold">Gemini Flash</span>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">Google's fast multimodal model with thinking</div>
            </div>
            {isGeminiFlashSelected ? (
              <Check className="h-4 w-4 text-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
            ) : !canAccessGeminiFlash ? (
              <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
            ) : null}
          </div>
        )}

        {/* Gemini 3 Pro Preview */}
        {geminiPro && (
          <div
            className={cn(
              'flex items-start gap-3 px-3 py-3 cursor-pointer rounded-lg transition-all duration-150',
              isGeminiProSelected 
                ? 'bg-accent' 
                : 'hover:bg-accent/50 active:bg-accent/70'
            )}
            onClick={() => handleGeminiClick(geminiPro, canAccessGeminiPro)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold">Gemini 3 Pro Preview</span>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">Advanced reasoning with extended thinking</div>
            </div>
            {isGeminiProSelected ? (
              <Check className="h-4 w-4 text-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
            ) : !canAccessGeminiPro ? (
              <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
            ) : null}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default ModeIndicator;

