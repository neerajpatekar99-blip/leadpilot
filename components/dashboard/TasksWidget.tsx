"use client";

import React from 'react';
import useSWR from 'swr';
import { ActionItem } from '@/lib/types';
import { DocumentCheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(data => data.data);

export function TasksWidget() {
  const { data: tasksRaw, error, mutate } = useSWR<ActionItem[]>('/api/tasks', fetcher, { fallbackData: [], refreshInterval: 5000 });
  const tasks = tasksRaw || [];
  const loading = !tasksRaw && !error;

  const handleComplete = async (id: string) => {
    try {
      // Optimistic update
      mutate(tasks.map(t => t.id === id ? { ...t, status: 'Completed' } : t), false);
      
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Completed' })
      });
      mutate();
    } catch (err) {
      console.error(err);
      mutate(); // Revert on error
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-sm text-claude-muted">Loading tasks...</div>;
  }

  const pendingTasks = tasks.filter(t => t.status === 'Pending');

  return (
    <div className="bg-claude-card border border-claude-border rounded-xl shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-claude-border flex justify-between items-center">
        <h3 className="font-semibold text-claude-text flex items-center gap-2">
          <DocumentCheckIcon className="w-5 h-5 text-orange-500" /> 
          AI Action Items
        </h3>
        <span className="text-xs font-medium bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full">
          {pendingTasks.length} pending
        </span>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto max-h-[300px]">
        {pendingTasks.length === 0 ? (
          <p className="text-sm text-claude-muted text-center py-6">All caught up! No pending tasks.</p>
        ) : (
          <div className="space-y-3">
            {pendingTasks.map(task => (
              <div key={task.id} className="flex gap-3 group">
                <button 
                  onClick={() => handleComplete(task.id)}
                  className="mt-0.5 text-claude-muted hover:text-green-500 transition-colors flex-shrink-0"
                >
                  <div className="w-4 h-4 rounded-full border border-current group-hover:hidden" />
                  <CheckCircleIcon className="w-4 h-4 hidden group-hover:block" />
                </button>
                <div>
                  <p className="text-sm text-claude-text">{task.task}</p>
                  <p className="text-xs text-claude-muted mt-0.5">Lead: {task.leadName}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
