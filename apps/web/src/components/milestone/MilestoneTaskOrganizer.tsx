import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Zap,
  CheckSquare,
  Square,
  Loader2,
  Sparkles,
  Layers,
  FileCheck2,
  ArrowRight
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status?: string;
  estimatedEffortHours?: number;
  acceptanceCriteria?: string[];
  deliverable?: string;
}

interface MilestoneTaskOrganizerProps {
  milestone: {
    id: string;
    title: string;
    status: string;
    progressPercent?: number;
    amountMinor: number;
    currency?: string;
    taskIds?: string[];
  };
  tasks: TaskItem[];
  projectId: string;
  isProjectClosed: boolean;
  isPendingAcceptance: boolean;
  onTasksUpdated: () => Promise<void> | void;
  onQuickSubmitProof?: () => void;
}

export const MilestoneTaskOrganizer: React.FC<MilestoneTaskOrganizerProps> = ({
  milestone,
  tasks,
  projectId,
  isProjectClosed,
  isPendingAcceptance,
  onTasksUpdated,
  onQuickSubmitProof,
}) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState<boolean>(tasks.length <= 6);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'submitted' | 'done'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  const PAGE_SIZE = 8;
  const isPaid = milestone.status === 'PAID';
  const isLocked = isProjectClosed || isPaid || isPendingAcceptance;

  // Task metrics calculation
  const totalTasks = tasks.length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const submittedCount = tasks.filter((t) => t.status === 'submitted').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const todoCount = tasks.filter((t) => !t.status || t.status === 'todo').length;
  const percentComplete = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  // Filter & Search tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const currentStatus = t.status || 'todo';
      const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    });
  }, [tasks, statusFilter, searchQuery]);

  // Paginated slice
  const totalPages = Math.ceil(filteredTasks.length / PAGE_SIZE) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTasks.slice(start, start + PAGE_SIZE);
  }, [filteredTasks, currentPage, PAGE_SIZE]);

  // Batch status update handler
  const handleBatchUpdate = async (newStatus: string, specificTaskIds?: string[]) => {
    if (isLocked) return;
    setIsBatchUpdating(true);
    try {
      const payload: any = {
        status: newStatus,
        milestoneId: milestone.id,
      };
      if (specificTaskIds && specificTaskIds.length > 0) {
        payload.taskIds = specificTaskIds;
      }
      const res = await api.patch(`/projects/${projectId}/tasks-batch`, payload);
      toast.success(
        res.data?.message || `Successfully marked ${res.data?.data?.count || 'all'} tasks as ${newStatus}.`,
        'Tasks Batch Updated'
      );
      setSelectedTaskIds(new Set());
      await onTasksUpdated();
    } catch (err: any) {
      const reason = err.response?.data?.reason || err.response?.data?.message || 'Failed to batch update tasks.';
      toast.error(reason, 'Batch Update Failed');
    } finally {
      setIsBatchUpdating(false);
    }
  };

  // Single task status update
  const handleSingleTaskStatus = async (taskId: string, newStatus: string) => {
    if (isLocked) return;
    try {
      const res = await api.patch(`/projects/${projectId}/tasks/${taskId}`, { status: newStatus });
      toast.success(res.data?.message || `Task ${taskId} updated to ${newStatus}.`, 'Task Updated');
      await onTasksUpdated();
    } catch (err: any) {
      const reason = err.response?.data?.reason || err.response?.data?.message || 'Failed to update task.';
      toast.error(reason, 'Update Failed');
    }
  };

  // Selection toggle
  const toggleSelectTask = (taskId: string) => {
    const next = new Set(selectedTaskIds);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    setSelectedTaskIds(next);
  };

  const selectAllOnCurrentPage = () => {
    const allPageIds = paginatedTasks.map((t) => t.id);
    const allSelected = allPageIds.every((id) => selectedTaskIds.has(id));
    const next = new Set(selectedTaskIds);
    if (allSelected) {
      allPageIds.forEach((id) => next.delete(id));
    } else {
      allPageIds.forEach((id) => next.add(id));
    }
    setSelectedTaskIds(next);
  };

  if (totalTasks === 0) {
    return null;
  }

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden transition-all shadow-md mt-2">
      {/* ============================================================== */}
      {/* 1. COMPACT ORGANIZER HEADER (Always Visible & Summary Badges)   */}
      {/* ============================================================== */}
      <div className="p-3.5 sm:p-4 bg-slate-950/70 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-800/60 text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                Phase Deliverables &amp; Work Tasks
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                {totalTasks} {totalTasks === 1 ? 'Task' : 'Tasks'}
              </span>
              {totalTasks >= 50 && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/70 border border-amber-800/50 text-amber-300 font-semibold">
                  Large Deliverable (100+ Subtasks)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Organized task breakdown synchronized with milestone verification and escrow release.
            </p>
          </div>
        </div>

        {/* Quick Progress Breakdown & Action Pill */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          {/* Status Breakdown Pills */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/50 text-emerald-300">
              {doneCount} Done
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800/50 text-blue-300">
              {inProgressCount} Active
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-slate-300">
              {todoCount} Todo
            </span>
          </div>

          {/* ⚡ High-Efficiency Bulk Action: Quick Submit All Done (1-Click!) */}
          {!isLocked && (
            <button
              onClick={() => handleBatchUpdate('done')}
              disabled={isBatchUpdating || doneCount === totalTasks}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="1-Click: Mark all tasks in this phase as Done (100%)"
            >
              {isBatchUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-300" />}
              <span>Mark All Done</span>
            </button>
          )}

          {/* Quick Submit Proof Button (if provided) */}
          {onQuickSubmitProof && !isPaid && (
            <button
              onClick={onQuickSubmitProof}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold transition border border-indigo-500/50"
              title="Submit verifiable deliverable proof artifact"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-indigo-300" />
              <span>Easy Submit Proof</span>
            </button>
          )}

          {/* Accordion Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
            title={isExpanded ? 'Collapse task details' : 'Expand full task list & search'}
          >
            <span>{isExpanded ? 'Hide Tasks' : `View ${totalTasks} Tasks`}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Progress Bar Strip */}
      <div className="w-full bg-slate-950 h-1.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 h-full transition-all duration-500"
          style={{ width: `${percentComplete}%` }}
        />
      </div>

      {/* ============================================================== */}
      {/* 2. EXPANDED SEARCH, FILTERS, BULK ACTIONS & PAGINATION          */}
      {/* ============================================================== */}
      {isExpanded && (
        <div className="p-4 space-y-4 animate-fade-in bg-slate-900/60">
          {/* Helper Tip Box for 100+ Task Efficiency */}
          {totalTasks >= 20 && (
            <div className="p-3 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-800/40 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="text-slate-300">
                  <strong className="text-white">High-Efficiency Deliverable Mode:</strong> Working with {totalTasks} tasks? Use search to filter specific modules or use the 1-click batch actions below to submit all tasks instantly.
                </span>
              </div>
            </div>
          )}

          {/* Search Bar & Status Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${totalTasks} tasks by title, ID (e.g. TASK-01)...`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 text-xs font-medium">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition text-[11px] font-mono ${
                  statusFilter === 'all'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All ({totalTasks})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('todo');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition text-[11px] font-mono ${
                  statusFilter === 'todo'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Todo ({todoCount})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('in_progress');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition text-[11px] font-mono ${
                  statusFilter === 'in_progress'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Active ({inProgressCount})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('done');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition text-[11px] font-mono ${
                  statusFilter === 'done'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Done ({doneCount})
              </button>
            </div>
          </div>

          {/* Multi-Select Floating Action Strip (When 1 or more tasks checked) */}
          {selectedTaskIds.size > 0 && !isLocked && (
            <div className="p-2.5 bg-gradient-to-r from-indigo-950 to-slate-950 border border-indigo-500/60 rounded-xl flex items-center justify-between gap-3 text-xs shadow-lg animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-indigo-300">
                  {selectedTaskIds.size} task{selectedTaskIds.size !== 1 ? 's' : ''} selected
                </span>
                <span className="text-slate-500">•</span>
                <button
                  onClick={() => setSelectedTaskIds(new Set())}
                  className="text-slate-400 hover:text-white underline text-[11px]"
                >
                  Clear Selection
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium mr-1">Apply to selected:</span>
                <button
                  onClick={() => handleBatchUpdate('done', Array.from(selectedTaskIds))}
                  disabled={isBatchUpdating}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition"
                >
                  Mark Done
                </button>
                <button
                  onClick={() => handleBatchUpdate('in_progress', Array.from(selectedTaskIds))}
                  disabled={isBatchUpdating}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition"
                >
                  Mark In Progress
                </button>
                <button
                  onClick={() => handleBatchUpdate('todo', Array.from(selectedTaskIds))}
                  disabled={isBatchUpdating}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] transition"
                >
                  Mark Todo
                </button>
              </div>
            </div>
          )}

          {/* Select All on Page Checkbox Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/60 pb-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={paginatedTasks.length > 0 && paginatedTasks.every((t) => selectedTaskIds.has(t.id))}
                onChange={selectAllOnCurrentPage}
                disabled={isLocked}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 focus:outline-none cursor-pointer"
              />
              <span className="text-[11px]">Select all on this page ({paginatedTasks.length})</span>
            </label>

            <span className="text-[11px] font-mono text-slate-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredTasks.length)} of {filteredTasks.length} matching tasks
            </span>
          </div>

          {/* ============================================================== */}
          {/* 3. PAGINATED TASK CARDS GRID                                   */}
          {/* ============================================================== */}
          {paginatedTasks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {paginatedTasks.map((t) => {
                const isSelected = selectedTaskIds.has(t.id);
                const currentStatus = t.status || 'todo';
                const isTaskDone = currentStatus === 'done';

                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2 ${
                      isTaskDone
                        ? 'bg-slate-950/80 border-emerald-900/40 hover:border-emerald-700/60'
                        : currentStatus === 'in_progress'
                        ? 'bg-slate-950/80 border-blue-900/40 hover:border-blue-700/60'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    } ${isSelected ? 'ring-1 ring-indigo-500' : ''}`}
                  >
                    {/* Card Top: Checkbox, ID, Effort */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectTask(t.id)}
                          disabled={isLocked}
                          className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-mono text-[10px] text-indigo-400 font-bold">{t.id}</span>
                      </div>

                      {t.estimatedEffortHours && (
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {t.estimatedEffortHours}h
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h5
                      className={`text-xs font-medium leading-snug line-clamp-2 ${
                        isTaskDone ? 'text-slate-300' : 'text-white'
                      }`}
                      title={t.title}
                    >
                      {t.title}
                    </h5>

                    {/* Status Dropdown */}
                    <div className="pt-1 border-t border-slate-900 flex items-center justify-between gap-1.5">
                      <select
                        value={currentStatus}
                        disabled={isLocked}
                        onChange={(e) => handleSingleTaskStatus(t.id, e.target.value)}
                        className={`w-full text-[10px] font-mono font-semibold px-2 py-1 rounded-lg border focus:outline-none transition ${
                          isTaskDone
                            ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                            : currentStatus === 'submitted'
                            ? 'bg-teal-950/80 border-teal-700 text-teal-300'
                            : currentStatus === 'in_progress'
                            ? 'bg-blue-950/80 border-blue-700 text-blue-300'
                            : 'bg-slate-900 border-slate-700 text-slate-300'
                        } ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-slate-500'}`}
                      >
                        <option value="todo">Todo (0%)</option>
                        <option value="in_progress">In Progress (50%)</option>
                        <option value="submitted">Submitted (80%)</option>
                        <option value="done">Done (100%)</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
              No tasks match your current filter or search query.
            </div>
          )}

          {/* ============================================================== */}
          {/* 4. PAGINATION FOOTER CONTROLS                                  */}
          {/* ============================================================== */}
          {totalPages > 1 && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition font-mono text-[11px]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1 font-mono text-slate-400 text-[11px]">
                <span>Page</span>
                <strong className="text-white font-bold">{currentPage}</strong>
                <span>of</span>
                <strong className="text-white font-bold">{totalPages}</strong>
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition font-mono text-[11px]"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
