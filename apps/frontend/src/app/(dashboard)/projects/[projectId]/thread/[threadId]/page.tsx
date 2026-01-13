'use client';

import React, { useEffect } from 'react';
import { ThreadComponent } from '@/components/thread/ThreadComponent';

export default function ThreadPage({
  params,
}: {
  params: Promise<{
    projectId: string;
    threadId: string;
  }>;
}) {
  const unwrappedParams = React.use(params);
  const { projectId, threadId } = unwrappedParams;
  useEffect(() => {
    window.parent.postMessage({
      type: 'superagent_history_select',
      data: {
        threadId
      },
    }, '*');
  },[])

  return <ThreadComponent projectId={projectId} threadId={threadId} />;
}
