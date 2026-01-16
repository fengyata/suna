'use client';

import React from 'react';
import {
  Download,
  Layers,
  Monitor,
  MoreHorizontal,
  Search,
  Smile,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SharePromptBackgroundProps = {
  className?: string;
};

/**
 * Share page static background (ported from apps/superagent).
 * Note: purely presentational; no data dependency.
 */
export function SharePromptBackground({ className }: SharePromptBackgroundProps) {
  return (
    <div className={cn('h-screen w-screen bg-[#fafbfc]', className)} data-name="SharePromptBackground">
      <div className="flex h-full w-full">
        {/* Left rail */}
        <aside className="flex h-full w-[56px] flex-col items-center justify-center border-r border-[#edeff4] bg-white">
          <div className="flex flex-col gap-[8px] p-[8px]">
            <div className="flex h-[40px] items-center">
              <div className="flex size-[32px] items-center justify-center rounded-[12px] bg-white">
                <Layers className="size-[16px] text-[#222]" />
              </div>
            </div>
            <div className="flex flex-col gap-[4px]">
              <div className="flex size-[32px] items-center justify-center rounded-[8px]">
                <Search className="size-[16px] text-[#222]" />
              </div>
              <div className="flex size-[32px] items-center justify-center rounded-[8px]">
                <MoreHorizontal className="size-[16px] text-[#222]" />
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col px-[16px] pb-[16px]">
          {/* Header row */}
          <div className="flex h-[56px] w-full items-center gap-[10px] rounded-tl-[16px] rounded-tr-[16px]">
            <div className="flex min-w-0 flex-1 flex-col justify-center rounded-[28px]">
              <div className="truncate text-[14px] font-bold leading-[1.5] text-[#222]">
                Contact info for 10 US pharma sales managers.
              </div>
              <div className="mt-[2px] flex items-center gap-[8px]">
                <div className="flex items-center gap-[4px]">
                  <div className="size-[6px] rounded-full bg-[#00c951]" />
                  <div className="text-[12px] leading-[1.5] text-[#94a3b8]">
                    Online
                  </div>
                </div>
                <div className="flex items-center gap-[4px]">
                  <div className="flex size-[14px] items-center justify-center text-[#525a67]/50">
                    <MoreHorizontal className="size-[14px]" />
                  </div>
                  <div className="text-[12px] leading-[1.5] text-[rgba(82,90,103,0.5)]">
                    Hubspot Connected
                  </div>
                </div>
              </div>
            </div>

            <div className="flex size-[32px] items-center justify-center rounded-[10px]">
              <Download className="size-[16px] text-[#222]" />
            </div>
            <div className="flex h-[32px] items-center justify-center rounded-[10px] px-[8px]">
              <Monitor className="size-[16px] text-[#222]" />
            </div>
            <div className="flex size-[32px] items-center justify-center rounded-[10px]">
              <MoreHorizontal className="size-[16px] text-[#222]" />
            </div>
          </div>

          {/* Content column */}
          <div className="flex min-w-0 flex-1 justify-center">
            <div className="w-full max-w-[840px]">
              <div className="mt-[16px] flex flex-col items-end gap-[16px]">
                {/* User bubble */}
                <div className="rounded-bl-[16px] rounded-br-[6px] rounded-tl-[16px] rounded-tr-[16px] border border-[#edeff4] bg-white px-[16px] py-[12px]">
                  <div className="text-[14px] leading-[1.5] text-[#525a67]">
                    Help me find contact information for 10 pharmaceutical sales managers in the United States.
                  </div>
                </div>

                {/* Assistant header */}
                <div className="flex w-full items-center gap-[10px]">
                  <div className="flex size-[24px] items-center justify-center">
                    <Smile className="size-[20px] text-[#222]" />
                  </div>
                  <div className="min-w-0 flex-1 text-[14px] font-bold leading-[1.5] text-[#222]">
                    SuperAgent
                  </div>
                  <div className="text-[14px] leading-[1.5] text-[rgba(82,90,103,0.5)]">
                    00:30
                  </div>
                </div>

                {/* Assistant title */}
                <div className="w-full text-[18px] font-bold leading-[1.5] text-[#222]">
                  CSM Team Handoff Document
                </div>

                {/* Assistant body (simplified static) */}
                <div className="w-full space-y-[8px] text-[14px] leading-[1.5] text-[#222]">
                  <p>
                    <span className="font-bold">Document Title:</span>{' '}
                    Project Handoff from [Your Team/Department] to Customer Success Management (CSM) Team
                  </p>
                  <p>
                    <span className="font-bold">Date:</span> December 23, 2025
                  </p>
                  <p>
                    <span className="font-bold">Prepared By:</span> [Your Name/SuperAgent AI]
                  </p>
                </div>

                {/* User bubble 2 */}
                <div className="rounded-bl-[16px] rounded-br-[6px] rounded-tl-[16px] rounded-tr-[16px] border border-[#edeff4] bg-white px-[16px] py-[12px]">
                  <div className="text-[14px] leading-[1.5] text-[#525a67]">
                    What is this handoff for? (e.g., project transition, client onboarding, team handover?)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


