import type { ReactNode } from "react";
import { EmptyState, Panel } from "./primitives";

export function SimpleTable({
  title,
  headers,
  rows,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  headers: string[];
  rows: ReactNode[][];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <Panel title={title} bodyClassName="p-0">
      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left">
                {headers.map((header) => (
                  <th key={header} className="eyebrow px-5 py-3 !text-[10px]">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b last:border-0 hover:bg-muted/30">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-5 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
