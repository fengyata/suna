 'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
 import { useQueryClient } from '@tanstack/react-query';
 import { useTranslations } from 'next-intl';
 import { Button } from '@/components/ui/button';
 import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
 import { backendApi } from '@/lib/api-client';
 import { toast } from '@/lib/toast';
 import { agentKeys } from '@/hooks/agents/keys';
 import { useAgentVersionData } from '@/hooks/agents/use-agent-version-data';
 import { cn } from '@/lib/utils';

const MEETING_MCP_URL = process.env.NEXT_PUBLIC_MEETING_MCP_URL;
const MEETING_MCP_TYPE = process.env.NEXT_PUBLIC_MEETING_MCP_TYPE || 'http';
const MEETING_MCP_NAME =
  process.env.NEXT_PUBLIC_MEETING_MCP_NAME || 'FlashRev Meeting Agent';
const MEETING_TOOL_NAME =
  process.env.NEXT_PUBLIC_MEETING_TOOL_NAME || 'search_meeting';

 interface MeetingAgentToggleProps {
   agentId?: string;
   isLoggedIn?: boolean;
   disabled?: boolean;
   isAgentRunning?: boolean;
 }

 export const MeetingAgentToggle: React.FC<MeetingAgentToggleProps> = ({
   agentId,
   isLoggedIn = true,
   disabled = false,
   isAgentRunning = false,
 }) => {
   const t = useTranslations('meetingAgent');
   const queryClient = useQueryClient();
   const { versionData } = useAgentVersionData({ agentId: agentId || '' });
   const [isConnecting, setIsConnecting] = useState(false);
   const [isVerifying, setIsVerifying] = useState(false);
  const [localConnected, setLocalConnected] = useState<boolean | null>(null);
  const actionInFlightRef = useRef(false);
  const isConfigured = !!MEETING_MCP_URL;

   const meetingMcpConfig = useMemo(() => {
     if (!MEETING_MCP_URL) return null;
     if (!versionData?.custom_mcps?.length) return null;
     return versionData.custom_mcps.find((mcp) => {
       const configUrl = mcp?.config?.url;
       const type = mcp?.customType || mcp?.type;
       return configUrl === MEETING_MCP_URL && type === MEETING_MCP_TYPE;
     }) || null;
   }, [versionData?.custom_mcps]);

  const isConnected = !!meetingMcpConfig;
  const effectiveConnected = localConnected ?? isConnected;
   const isDisabled =
     !isLoggedIn ||
     !agentId ||
     !isConfigured ||
     isConnecting ||
     (disabled && !isAgentRunning);

   const invalidateAgent = useCallback(() => {
     if (!agentId) return;
     queryClient.invalidateQueries({ queryKey: agentKeys.detail(agentId) });
     queryClient.invalidateQueries({ queryKey: ['agent-tools', agentId] });
   }, [agentId, queryClient]);

   const discoverMeetingTools = useCallback(async () => {
     if (!MEETING_MCP_URL) {
       return { success: false, tools: [], message: t('missingConfig') };
     }
     const response = await backendApi.post('/mcp/discover-custom-tools', {
       type: MEETING_MCP_TYPE,
       config: { url: MEETING_MCP_URL },
     }, { showErrors: false });

     if (!response.success || !response.data) {
       return { success: false, tools: [], message: t('connectFailed') };
     }

     const result = response.data as any;
     if (!result.success) {
       return { success: false, tools: [], message: result.message || t('connectFailed') };
     }

     return { success: true, tools: result.tools || [], message: result.message };
   }, [t]);

   const connectMeetingAgent = useCallback(async () => {
    if (!agentId || isConnecting || actionInFlightRef.current) return;
    actionInFlightRef.current = true;
     setIsConnecting(true);

     try {
      if (!MEETING_MCP_URL) {
        toast.warning(t('missingConfig'));
        return;
      }
       const discovery = await discoverMeetingTools();
       if (!discovery.success) {
         toast.warning(discovery.message || t('connectFailed'));
         return;
       }

       const tools = discovery.tools || [];
       const hasMeetingTool = tools.some((tool: any) => tool.name === MEETING_TOOL_NAME);
       if (!hasMeetingTool) {
         toast.warning(t('missingTool'));
         return;
       }

       const response = await backendApi.post(`/agents/${agentId}/custom-mcp-tools`, {
         url: MEETING_MCP_URL,
         type: MEETING_MCP_TYPE,
         enabled_tools: [MEETING_TOOL_NAME],
         name: MEETING_MCP_NAME,
       }, { showErrors: false });

       if (!response.success) {
         toast.warning(t('connectFailed'));
         return;
       }

      setLocalConnected(true);
      invalidateAgent();
     } finally {
       setIsConnecting(false);
      actionInFlightRef.current = false;
     }
   }, [agentId, discoverMeetingTools, invalidateAgent, isConnecting, t]);

   const disconnectMeetingAgent = useCallback(async () => {
    if (!agentId || isConnecting || actionInFlightRef.current) return;
    actionInFlightRef.current = true;
     setIsConnecting(true);

     try {
       if (!MEETING_MCP_URL) {
         toast.warning(t('missingConfig'));
         return;
       }
       const endpoint = `/agents/${agentId}/custom-mcp?url=${encodeURIComponent(MEETING_MCP_URL)}&type=${MEETING_MCP_TYPE}`;
       const response = await backendApi.delete(endpoint, { showErrors: false });
       if (!response.success) {
         toast.warning(t('disconnectFailed'));
         return;
       }
      setLocalConnected(false);
      invalidateAgent();
     } finally {
       setIsConnecting(false);
      actionInFlightRef.current = false;
     }
   }, [agentId, invalidateAgent, isConnecting, t]);

  useEffect(() => {
    if (!agentId || !isConnected || isVerifying || isConnecting) return;
     let isCancelled = false;

     const verifyConnection = async () => {
       setIsVerifying(true);
       try {
         const discovery = await discoverMeetingTools();
         if (!discovery.success && !isCancelled) {
           const endpoint = `/agents/${agentId}/custom-mcp?url=${encodeURIComponent(MEETING_MCP_URL)}&type=${MEETING_MCP_TYPE}`;
           await backendApi.delete(endpoint, { showErrors: false });
           invalidateAgent();
         }
       } finally {
         if (!isCancelled) {
           setIsVerifying(false);
         }
       }
     };

     verifyConnection();
     return () => {
       isCancelled = true;
     };
   }, [agentId, discoverMeetingTools, invalidateAgent, isConnected, isConnecting, isVerifying]);

  useEffect(() => {
    if (localConnected === null) return;
    if (localConnected === isConnected) {
      setLocalConnected(null);
    }
  }, [isConnected, localConnected]);

  useEffect(() => {
    setLocalConnected(null);
    actionInFlightRef.current = false;
  }, [agentId]);

   const handleClick = useCallback(() => {
     if (isDisabled) return;
    if (effectiveConnected) {
       disconnectMeetingAgent();
     } else {
       connectMeetingAgent();
     }
  }, [connectMeetingAgent, disconnectMeetingAgent, effectiveConnected, isDisabled]);

   const tooltipText = useMemo(() => {
     if (!isLoggedIn) return t('loginRequired');
     if (!isConfigured) return t('missingConfig');
     return t('tooltip');
   }, [isConfigured, isLoggedIn, t]);

   return (
     <Tooltip>
       <TooltipTrigger asChild>
         <span className="relative inline-block">
          <Button
             type="button"
             variant="outline"
             size="sm"
             onClick={handleClick}
             disabled={isDisabled}
            className="h-[42px] w-[42px] p-0 bg-transparent border border-border rounded-[16.8px] text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center justify-center cursor-pointer"
           >
            <svg
              viewBox="0 0 20 20"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="5"
                width="9"
                height="10"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M13 7.5 17 6v8l-4-1.5"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon
                points="7.6,8.2 7.6,11.8 10.4,10"
                fill="currentColor"
              />
            </svg>
           </Button>
          {isConnecting && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border border-border flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="h-[14px] w-[14px] text-black animate-spin"
                aria-hidden="true"
              >
                <g fill="currentColor">
                  <rect x="11" y="1" width="2" height="4" opacity="0.9" />
                  <rect x="11" y="19" width="2" height="4" opacity="0.2" />
                  <rect x="1" y="11" width="4" height="2" opacity="0.2" />
                  <rect x="19" y="11" width="4" height="2" opacity="0.5" />
                  <rect x="4.3" y="4.3" width="2" height="4" transform="rotate(-45 5.3 6.3)" opacity="0.7" />
                  <rect x="17.7" y="4.3" width="2" height="4" transform="rotate(45 18.7 6.3)" opacity="0.6" />
                  <rect x="17.7" y="15.7" width="2" height="4" transform="rotate(135 18.7 17.7)" opacity="0.3" />
                  <rect x="4.3" y="15.7" width="2" height="4" transform="rotate(-135 5.3 17.7)" opacity="0.4" />
                </g>
              </svg>
            </span>
          )}
          {!isConnecting && effectiveConnected && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 flex items-center justify-center">
              <svg viewBox="0 0 16 16" className="h-[10px] w-[10px]" aria-hidden="true">
                <path
                  d="M2.5 8.2 5.8 11.3 13.5 3.8"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </span>
          )}
         </span>
       </TooltipTrigger>
       <TooltipContent side="top">
         <p className={cn('text-xs')}>{tooltipText}</p>
       </TooltipContent>
     </Tooltip>
   );
 };
