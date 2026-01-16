/* eslint-disable react/no-unescaped-entities */
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, Copy, Globe, Link2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useThreadQuery, useUpdateThreadMutation } from "@/hooks/threads/use-threads"
import { cn } from "@/lib/utils"
import { useTranslations } from 'next-intl';

interface SharePopoverProps {
  threadId?: string
  projectId?: string
  children?: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

async function writeToClipboard(text: string) {
  if (!text) return

  // Modern API
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  // Fallback
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '-9999px'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!ok) throw new Error('copy_failed')
}

/**
 * SharePopover - Updated to fix bottom padding and match share-model-new.tsx exactly.
 */
export function SharePopover({ 
  threadId, 
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: SharePopoverProps) {
  const t = useTranslations("share")
  const [internalOpen, setInternalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const setOpen = (open: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(open)
    } else {
      setInternalOpen(open)
    }
  }

  const updateThreadMutation = useUpdateThreadMutation()
  const { data: threadData, isLoading, refetch } = useThreadQuery(threadId || "", { enabled: isOpen })

  const isPublic = Boolean(threadData?.is_public)
  const isEnablingShare = updateThreadMutation.isPending

  useEffect(() => {
    if (!isOpen) return
    document.body.style.pointerEvents = 'auto'
  }, [isOpen])

  // Automatic share enablement
  useEffect(() => {
    if (!isOpen || !threadId || isPublic || isEnablingShare) return

    const enableShare = async () => {
      try {
        await updateThreadMutation.mutateAsync({
          threadId,
          data: { is_public: true },
        })
        await refetch()
      } catch (error) {
        console.error("Error enabling share:", error)
        setOpen(false)
      }
    }

    enableShare()
  }, [isOpen, threadId, isPublic, isEnablingShare])

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  const shareLink = useMemo(() => {
    const baseUrl = process.env.NEXT_PUBLIC_SHARE_URL || 
                   process.env.NEXT_PUBLIC_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : '')
    return `${baseUrl}/share/${threadId}`
  }, [threadId])

  const onCopy = async () => {
    if (!shareLink || copied) return
    try {
      await writeToClipboard(shareLink)
      setCopied(true)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy link:', e)
      toast.error('Failed to copy link')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent
        className={cn(
          'border-0 p-0 overflow-hidden bg-white rounded-3xl shadow-2xl',
          'sm:max-w-[500px]',
          'sm:h-[230px]',
          '[&>button]:top-5 [&>button]:right-5 sm:[&>button]:top-6 sm:[&>button]:right-6 [&>button]:opacity-100',
          '[&>button_svg]:size-6 [&>button]:text-slate-500 [&>button:hover]:text-slate-700',
        )}
      >
        <div className="h-full p-5 flex flex-col">
          <DialogHeader className="space-y-0 shrink-0">
            <DialogTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <span>{t("share")}</span>
              {!isPublic && isEnablingShare ? (
                <Loader2 className="h-4 w-4 text-slate-500 animate-spin" />
              ) : null}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-3 flex-1 flex flex-col justify-between">
            {/* Info card */}
            <div className="rounded-2xl p-4 flex items-start gap-3 shrink-0">
              <Globe className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
              <p className="text-sm leading-5 text-slate-600 line-clamp-2">
                {t("this_chat_is_publicly_accessible")}
              </p>
            </div>

            {/* Link + action */}
            <div className="relative rounded-2xl bg-[#EDEFF4] py-3 px-4 flex items-center justify-between gap-3 shrink-0">
              {!isPublic && isEnablingShare ? (
                <div className="absolute inset-0 rounded-2xl bg-white/85 backdrop-blur-sm flex items-center justify-center z-10">
                  <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-900 line-clamp-1 cursor-default font-[600] break-all" title={shareLink}>
                  {shareLink}
                </p>
              </div>

              {/* Frame 1312319981 */}
              <Button
                type="button"
                onClick={onCopy}
                disabled={copied}
                className={cn(
                  'shrink-0 rounded-full h-9 px-4 gap-2 text-sm font-medium',
                  'bg-slate-900 text-white hover:bg-slate-800',
                  'disabled:opacity-100 disabled:pointer-events-none',
                  copied && 'bg-slate-200 text-slate-500 hover:bg-slate-200',
                  'cursor-pointer'
                )}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                <span>{copied ? t("copied") : t("copy_link")}</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
