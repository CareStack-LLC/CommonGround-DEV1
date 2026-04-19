/**
 * ComparisonTable
 *
 * "vs-competitor" feature matrix. Each row takes a `feature` label,
 * plus `ours` and `theirs` cells that can be:
 *   - `true`  → green check icon
 *   - `false` → gray minus icon
 *   - string  → rendered literally (e.g. "$9/mo", "Limited")
 *
 * Mobile: renders as a vertical stacked list to avoid horizontal
 * scroll. Desktop: proper table with highlighted "ours" column.
 */

import { Check, Minus } from 'lucide-react';

type Cell = boolean | string;

export interface ComparisonTableRow {
  feature: string;
  ours: Cell;
  theirs: Cell;
  note?: string;
}

export interface ComparisonTableProps {
  ourProduct: string;
  competitor: string;
  rows: ComparisonTableRow[];
  highlightColor?: string;
  className?: string;
}

function CellContent({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <Check
        className="mx-auto h-5 w-5 text-[#3DAA8A]"
        aria-label="Included"
      />
    );
  }
  if (value === false) {
    return (
      <Minus
        className="mx-auto h-5 w-5 text-gray-300"
        aria-label="Not included"
      />
    );
  }
  return (
    <span className="text-sm text-gray-700">{value}</span>
  );
}

export function ComparisonTable({
  ourProduct,
  competitor,
  rows,
  highlightColor = '#3DAA8A',
  className = '',
}: ComparisonTableProps) {
  return (
    <div className={`w-full ${className}`.trim()}>
      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                Feature
              </th>
              <th
                className="px-6 py-4 text-center text-sm font-semibold text-white"
                style={{ backgroundColor: highlightColor }}
              >
                {ourProduct}
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600 bg-gray-50">
                {competitor}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.feature}
                className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
              >
                <td className="px-6 py-4 text-sm text-[#1E3A4A]">
                  <div className="font-medium">{row.feature}</div>
                  {row.note && (
                    <div className="mt-0.5 text-xs text-gray-500">
                      {row.note}
                    </div>
                  )}
                </td>
                <td
                  className="px-6 py-4 text-center"
                  style={{ backgroundColor: `${highlightColor}0D` }}
                >
                  <CellContent value={row.ours} />
                </td>
                <td className="px-6 py-4 text-center">
                  <CellContent value={row.theirs} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked list */}
      <div className="md:hidden space-y-4">
        {rows.map((row) => (
          <div
            key={row.feature}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="mb-3">
              <div className="text-sm font-semibold text-[#1E3A4A]">
                {row.feature}
              </div>
              {row.note && (
                <div className="mt-0.5 text-xs text-gray-500">
                  {row.note}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-lg p-3 text-center"
                style={{ backgroundColor: `${highlightColor}0D` }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{ color: highlightColor }}
                >
                  {ourProduct}
                </div>
                <CellContent value={row.ours} />
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  {competitor}
                </div>
                <CellContent value={row.theirs} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
