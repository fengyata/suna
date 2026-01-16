/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import type { Project } from '@/lib/api/threads';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/utils/use-media-query';
import { useTranslations } from 'next-intl';


function SendDefaultArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      preserveAspectRatio="none"
      viewBox="0 0 15.75 15.75"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M14.0177 6.565L8.38345 0.930798C8.31902 0.866366 8.24027 0.809093 8.1472 0.773298C7.97538 0.701707 7.77493 0.701707 7.60312 0.773298C7.51721 0.809093 7.43846 0.859207 7.36686 0.930798L1.73266 6.565C1.45345 6.84421 1.45345 7.29523 1.73266 7.57443C2.01186 7.85364 2.46289 7.85364 2.74209 7.57443L7.15925 3.15727V14.3183C7.15925 14.712 7.48141 15.0342 7.87516 15.0342C8.26891 15.0342 8.59107 14.712 8.59107 14.3183V3.15727L13.0082 7.57443C13.1514 7.71762 13.3304 7.78205 13.5165 7.78205C13.7027 7.78205 13.8816 7.71046 14.0248 7.57443C14.304 7.29523 14.304 6.84421 14.0248 6.565H14.0177Z"
        fill="white"
      />
    </svg>
  );
}

type PlaybackCoverPageProps = {
  className?: string;
  /** 展示用名称；不传则按 Figma 文案展示 "SuperAgent" */
  projectName?: string;
  /** 兼容现有调用方：当前仅做 UI，不使用该字段 */
  project?: Project | null;
  /**
   * 兼容旧调用方：已废弃。
   * 按 PRD：倒计时固定 5 秒，且必须等第一个字符出现才启动。
   */
  initialCountdown?: number;
  /** 仅保留调用入口：点击 Play 时触发 */
  onPlayClick?: () => void;
  /**
   * 兼容现有调用方：当前 Prompt 区域按 PRD 不可交互，因此不会触发该回调。
   * （share 页仍可能传入，用于后续接回交互）
   */
  onSendClick?: (text: string) => void;
  defaultPromptText?: string;
};

export function PlaybackCoverPage({
  className,
  projectName,
  initialCountdown: _initialCountdown,
  onPlayClick,
  onSendClick,
  defaultPromptText = '',
}: PlaybackCoverPageProps) {
  const t = useTranslations("share")
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // PRD: 固定 5s；倒计时必须等“第一个字出现”才启动
  const COUNTDOWN_SECONDS = 5;
  // 4秒内必须全部出完
  const TYPING_DEADLINE_MS = 4000;
  // 参考视频：遮罩出现后先停顿一下再开始打字
  const TYPING_START_DELAY_MS = 450;

  const [typedCount, setTypedCount] = useState(0);
  const [hasFlushed, setHasFlushed] = useState(false);
  const [flushStartCount, setFlushStartCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  const typedCountRef = useRef(0);
  const typingIntervalRef = useRef<number | null>(null);
  const flushTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const countdownStartedRef = useRef(false);
  const typingStartTimeoutRef = useRef<number | null>(null);
  const autoStartedRef = useRef(false);
  const promptScrollElRef = useRef<HTMLDivElement | null>(null);

  const normalizedPromptText = useMemo(() => {
    const raw = defaultPromptText ?? '';
    // Normalize Windows newlines and also support literal "\\n" sequences.
    return raw.replace(/\r\n/g, '\n').replace(/\\n/g, '\n');
  }, [defaultPromptText]);

  const maybeScrollPromptToBottom = () => {
    const el = promptScrollElRef.current;
    if (!el) return;
    const overflowPx = el.scrollHeight - el.clientHeight;
    // Only scroll when there's actually overflow.
    if (overflowPx <= 1) return;
    const atBottom = el.scrollTop >= overflowPx - 2;
    // Only scroll when we are not already at bottom.
    if (atBottom) return;

    // Ensure we snap to bottom even when content changes between frames.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  };

  useEffect(() => {
    typedCountRef.current = typedCount;
  }, [typedCount]);

  const startCountdown = () => {
    if (countdownStartedRef.current) return;
    countdownStartedRef.current = true;
    autoStartedRef.current = false;

    // 立即从 5 跳到 4，建立即时反馈
    setSecondsLeft(COUNTDOWN_SECONDS - 1);

    countdownIntervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            window.clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearTimers = () => {
    if (typingIntervalRef.current) {
      window.clearTimeout(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    if (typingStartTimeoutRef.current) {
      window.clearTimeout(typingStartTimeoutRef.current);
      typingStartTimeoutRef.current = null;
    }
    if (flushTimeoutRef.current) {
      window.clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  // Auto-start playback when countdown finishes (ensures countdown end => hide overlay + start replay).
  useEffect(() => {
    if (!countdownStartedRef.current) return;
    if (secondsLeft !== 0) return;
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    onPlayClick?.();
  }, [secondsLeft, onPlayClick]);

  useEffect(() => {
    // 重置状态（prompt 变化/首次挂载）
    clearTimers();
    countdownStartedRef.current = false;
    setSecondsLeft(COUNTDOWN_SECONDS);
    setTypedCount(0);
    setHasFlushed(false);
    setFlushStartCount(0);

    const prompt = normalizedPromptText ?? '';

    // reduced-motion：直接显示全文，并立刻启动倒计时
    if (prefersReducedMotion) {
      setTypedCount(prompt.length);
      setHasFlushed(true);
      setFlushStartCount(prompt.length);
      startCountdown();
      return () => clearTimers();
    }

    // 无文本时：直接启动倒计时
    if (prompt.length === 0) {
      startCountdown();
      return () => clearTimers();
    }

    // 动态计算打字速度，确保在 DEADLINE 内出完
    const totalTypingTime = TYPING_DEADLINE_MS - 500;
    const dynamicInterval = Math.max(15, Math.min(60, totalTypingTime / prompt.length));

    const step = () => {
      setTypedCount((prev) => {
        const next = Math.min(prev + 1, prompt.length);
        if (prev === 0 && next > 0) {
          // 第一个字出现，立即启动倒计时
          startCountdown();

          // 4 秒准时强制补全剩余文本
          flushTimeoutRef.current = window.setTimeout(() => {
            setHasFlushed(true);
            setFlushStartCount(typedCountRef.current);
            setTypedCount(prompt.length);
          }, TYPING_DEADLINE_MS);
        }

        if (next >= prompt.length) {
          if (typingIntervalRef.current) {
            window.clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
          if (flushTimeoutRef.current) {
            window.clearTimeout(flushTimeoutRef.current);
            flushTimeoutRef.current = null;
          }
        }
        return next;
      });
    };

    // 模拟 Apple 的打字节奏：前几个字稍微慢一点
    typingStartTimeoutRef.current = window.setTimeout(() => {
      let currentTyped = 0;
      const runTyping = () => {
        step();
        currentTyped++;

        // 前 5 个字符速度减半
        const interval = currentTyped < 5 ? dynamicInterval * 2 : dynamicInterval;
        typingIntervalRef.current = window.setTimeout(runTyping, interval) as unknown as number;
      };

      runTyping();
    }, TYPING_START_DELAY_MS);

    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedPromptText, prefersReducedMotion]);

  const displayName = useMemo(() => {
    return projectName?.trim() ? projectName.trim() : 'SuperAgent';
  }, [projectName]);

  const typedText = useMemo(() => {
    const prompt = normalizedPromptText ?? '';
    return prompt.slice(0, typedCount);
  }, [normalizedPromptText, typedCount]);

  const flushedRemainder = useMemo(() => {
    const prompt = normalizedPromptText ?? '';
    if (!hasFlushed) return '';
    return prompt.slice(flushStartCount);
  }, [normalizedPromptText, hasFlushed, flushStartCount]);

  // Keep the prompt scroller pinned to bottom as text grows / flushes.
  useEffect(() => {
    maybeScrollPromptToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typedCount, hasFlushed, flushStartCount, prefersReducedMotion]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[60] flex flex-col items-center justify-center gap-[64px] bg-[rgba(255,255,255,0.6)] backdrop-blur-md',
        className,
      )}
      data-name="遮照层"
    >
      {/* 输入框 */}
      <div
        className="w-full max-w-[900px] overflow-hidden rounded-[24px] shadow-[0px_0px_24px_0px_rgba(0,0,0,0.05)]"
        data-name="输入框"
      >
        <div className="border border-[#edeff4] border-b-0 bg-white px-[20px] pt-[20px]">
          <div
            aria-label="UserInput Prompt (read-only)"
            ref={promptScrollElRef}
            onScroll={() => {
              // Only snap when scrolling is actually possible/needed.
              maybeScrollPromptToBottom();
            }}
            className={cn(
              'sap-prompt-scroll w-full bg-transparent font-semibold leading-[1.5] outline-none',
              'min-h-[81px] max-h-[135px] overflow-y-auto',
              'whitespace-pre-wrap break-words',
              'text-[18px] text-[rgba(82,90,103,0.78)]',
            )}
          >
            {/* 打字开始前保持空白（参考视频），可选显示 placeholder */}
            {typedCount === 0 && !prefersReducedMotion ? (
              <span className="select-none text-[rgba(82,90,103,0.35)]">
                {t('please_describe_your_targeting_audience_or_companies')}
              </span>
            ) : null}

            {/* 逐字区：每个字符出现时“亮一下” */}
            <span aria-hidden="true">
              {typedText.split('').map((ch, idx) => {
                if (ch === '\n') return <br key={idx} />;
                return (
                  <span
                    key={idx}
                    className={prefersReducedMotion ? undefined : 'sap-char'}
                    style={
                      !prefersReducedMotion
                        ? {
                            animationDelay: `${Math.min(idx * 2, 100)}ms`,
                          }
                        : undefined
                    }
                  >
                    {ch === ' ' ? '\u00A0' : ch}
                  </span>
                );
              })}
            </span>

            {/* 4s 强制补全：剩余文本一次性出现，带平滑的淡入效果 */}
            {flushedRemainder ? (
              <span className={prefersReducedMotion ? undefined : 'sap-flush'}>
                {flushedRemainder}
              </span>
            ) : null}

            {/* 光标 */}
            <span
              className={prefersReducedMotion ? 'sap-caret sap-caret-static' : 'sap-caret'}
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="border border-[#edeff4] border-t-0 bg-white px-[20px] pb-[20px]">
          <div className="flex w-full items-center justify-end gap-[16px]">
            <button
              type="button"
              aria-label="Send"
              onClick={onSendClick ? () => onSendClick(normalizedPromptText ?? '') : undefined}
              className={cn(
                'flex size-[40px] items-center justify-center rounded-[12px] bg-[#222]',
                'transition-colors hover:bg-[#111] active:bg-[#000]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20',
                'cursor-pointer',
              )}
              data-name="send- default"
            >
              <SendDefaultArrowIcon className="size-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Playback 提示弹窗 */}
      <div className="flex w-full max-w-[520px] flex-col items-center gap-[24px] rounded-[24px] border border-[#edeff4] bg-white p-[24px]">
        <div className="flex flex-col items-center">
          <p className="text-center text-[16px] font-medium leading-[1.5] text-[#525a67]">
            {t('you_are_about_to_watch_a_replay_of')} {displayName}
          </p>
          <div className="flex items-end justify-center gap-[6px] text-center leading-[1.5]">
            <span className="text-[16px] font-medium text-[#525a67]">
              {t('playback_will_begin_automatically_in')}
            </span>
            <span className="text-[20px] font-bold text-[#222]">
              {Math.max(0, secondsLeft)}
            </span>
            <span className="text-[16px] font-medium text-[#525a67]">
              {t('seconds')}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onPlayClick}
          className={cn(
            'flex h-[40px] items-center justify-center gap-[8px] rounded-[12px] bg-[#222] px-[24px] text-white',
            'transition-colors hover:bg-[#111] active:bg-[#000]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20',
            'cursor-pointer',
          )}
          data-name="play"
        >
          <Play className="size-[18px]" />
          <span className="text-[16px] font-medium leading-[1.5]">{t('play')}</span>
        </button>
      </div>

      <style jsx global>{`
        .sap-prompt-scroll {
          --sap-text: rgba(82, 90, 103, 0.78);
          --sap-text-dim: rgba(82, 90, 103, 0.62);
          --sap-text-peak: rgba(255, 255, 255, 0.95);
        }

        /* 滚动条：淡色、低对比、thin；hover 略增强 */
        .sap-prompt-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(34, 34, 34, 0.18) transparent;
        }
        .sap-prompt-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .sap-prompt-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sap-prompt-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(34, 34, 34, 0.14);
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .sap-prompt-scroll:hover::-webkit-scrollbar-thumb {
          background-color: rgba(34, 34, 34, 0.22);
        }

        /* AHO 文字流体效果：进一步优化清晰度 */
        .sap-char {
          display: inline-block;
          color: var(--sap-text);
          opacity: 0;
          filter: blur(0.5px);
          transform: translateY(4px);
          animation: sapCharFlow 450ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          will-change: opacity, filter, transform;
        }

        @keyframes sapCharFlow {
          0% {
            opacity: 0;
            filter: blur(0.5px);
            transform: translateY(4px);
          }
          25% {
            opacity: 0.5;
            filter: blur(0);
          }
          100% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        /* 4s 补全：同步优化清晰度 */
        .sap-flush {
          display: inline;
          color: var(--sap-text);
          animation: sapFlushIn 400ms ease-out both;
        }
        @keyframes sapFlushIn {
          0% {
            opacity: 0;
            filter: blur(0.8px);
          }
          100% {
            opacity: 1;
            filter: blur(0);
          }
        }

        /* 光标：细竖线，轻微闪烁 */
        .sap-caret {
          display: inline-block;
          width: 1px;
          height: 1.1em;
          margin-left: 2px;
          vertical-align: -0.1em;
          background: rgba(82, 90, 103, 0.55);
          animation: sapCaretPulse 900ms ease-in-out infinite;
        }
        .sap-caret-static {
          animation: none;
          opacity: 0.8;
        }
        @keyframes sapCaretPulse {
          0%,
          45% {
            opacity: 0.15;
          }
          55%,
          100% {
            opacity: 0.85;
          }
        }
      `}</style>
    </div>
  );
}


