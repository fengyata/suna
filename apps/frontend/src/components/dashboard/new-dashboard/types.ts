import type { LucideIcon } from 'lucide-react';

export type DashboardModeId =
  | 'image'
  | 'video'
  | 'research'
  | 'ads'
  | 'aicall'
  | 'slides'
  | 'data'
  | 'website'
  | 'pipeline'
  | 'ae'
  | 'strategist'
  | 'people'
  | 'icp'
  | 'socialselling'
  | 'meeting_agent'
  | 'slides';

export type DashboardModeAction =
  | { type: 'select_mode'; mode: DashboardModeId }
  | { type: 'external'; url: string; target?: '_blank' | '_parent' | '_self' };

export type DashboardModeCard = {
  id: DashboardModeId;
  title: string;
  description: string;
  icon: LucideIcon;
  accentClassName: string;
  action: DashboardModeAction;
  external?: boolean;
};

