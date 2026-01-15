"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AgentTriggersConfiguration } from './agent-triggers-configuration';

export function AgentTriggersDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Triggers</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-1">
          <AgentTriggersConfiguration agentId={props.agentId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

