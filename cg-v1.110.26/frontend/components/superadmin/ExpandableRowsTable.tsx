'use client';

/**
 * Generic expandable-rows table for superadmin list views.
 *
 * Usage:
 *   <ExpandableRowsTable<Lead>
 *     columns={[{key:'email', label:'Email', render:(l)=>l.email}, ...]}
 *     rows={leads}
 *     rowKey={(l)=>l.id}
 *     renderExpanded={(l)=>(<LeadDetailPanel lead={l} />)}
 *   />
 *
 * - Caret column on the far left toggles row expansion.
 * - Single-row-expand by default; pass `allowMultiple` to allow many.
 * - Keyboard: when caret is focused, ArrowRight expands, ArrowLeft collapses,
 *   Enter/Space toggles.
 * - Expanded content renders as a full-colspan row beneath the main row.
 */

import React, { useState, useCallback, type ReactNode, type KeyboardEvent } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

export interface ExpandableColumn<T> {
  key: string;
  label: string;
  className?: string;
  headerClassName?: string;
  render: (row: T) => ReactNode;
  /** If true, this column's cell does NOT trigger row-expand on click. Defaults to false. */
  stopClickPropagation?: boolean;
}

interface Props<T> {
  columns: ExpandableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  renderExpanded: (row: T) => ReactNode;
  emptyMessage?: string;
  allowMultiple?: boolean;
  /** Optional callback when a row expands (for analytics / prefetching). */
  onExpand?: (row: T) => void;
  className?: string;
  /** Number of columns added by the table itself (caret). Used for colSpan. */
}

export function ExpandableRowsTable<T>({
  columns,
  rows,
  rowKey,
  renderExpanded,
  emptyMessage = 'No rows',
  allowMultiple = false,
  onExpand,
  className = '',
}: Props<T>) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = useCallback((row: T) => {
    const key = rowKey(row);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (!allowMultiple) next.clear();
        next.add(key);
        onExpand?.(row);
      }
      return next;
    });
  }, [rowKey, allowMultiple, onExpand]);

  const handleKey = (e: KeyboardEvent<HTMLButtonElement>, row: T) => {
    const key = rowKey(row);
    const isOpen = expanded.has(key);
    if (e.key === 'ArrowRight' && !isOpen) {
      e.preventDefault();
      toggle(row);
    } else if (e.key === 'ArrowLeft' && isOpen) {
      e.preventDefault();
      toggle(row);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(row);
    }
  };

  const colSpanForExpanded = columns.length + 1;

  return (
    <div className={`bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2D6A8F]/20">
              <th className="w-8" />
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left px-4 py-3 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider ${col.headerClassName ?? ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colSpanForExpanded} className="px-4 py-10 text-center text-[#6B8A9A]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const key = rowKey(row);
                const open = expanded.has(key);
                return (
                  <React.Fragment key={key}>
                    <tr
                      className={`transition-colors ${open ? 'bg-[#2D6A8F]/10' : 'hover:bg-[#2D6A8F]/10'}`}
                    >
                      <td className="w-8 px-2 py-3">
                        <button
                          onClick={() => toggle(row)}
                          onKeyDown={(e) => handleKey(e, row)}
                          className="p-1 rounded text-[#8AACBC] hover:text-white hover:bg-[#2D6A8F]/30 transition-colors"
                          title={open ? 'Collapse row' : 'Expand row'}
                          aria-expanded={open}
                        >
                          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 ${col.className ?? ''}`}
                          onClick={(e) => {
                            if (col.stopClickPropagation) return;
                            // clicking anywhere in a non-action cell expands the row
                            e.stopPropagation();
                            toggle(row);
                          }}
                        >
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                    {open && (
                      <tr className="bg-[#0F2533]/40 border-t border-[#2D6A8F]/10">
                        <td colSpan={colSpanForExpanded} className="px-6 py-4">
                          {renderExpanded(row)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

