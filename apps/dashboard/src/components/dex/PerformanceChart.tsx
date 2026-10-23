import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MetricPoint } from "@/api/types";
import { Panel, SegmentedControl } from "./primitives";

const METRICS = ["CPU", "RAM", "Network", "Temperature"] as const;
const RANGES = ["1H", "6H", "24H", "7D"] as const;
const rangeMs = { "1H": 3600e3, "6H": 6 * 3600e3, "24H": 24 * 3600e3, "7D": 7 * 24 * 3600e3 };
const field = { CPU: "cpu", RAM: "ram", Network: "net", Temperature: "temp" } as const;
const unit = { CPU: "%", RAM: "%", Network: " Mbps", Temperature: "°C" };

export function PerformanceChart({ history }: { history: MetricPoint[] }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]>("CPU");
  const [range, setRange] = useState<(typeof RANGES)[number]>("24H");
  const data = useMemo(() => {
    const end = history.at(-1)?.t ?? 0;
    const pts = history.filter((p) => p.t >= end - rangeMs[range]);
    // secondary line: RAM alongside CPU, CPU otherwise
    return pts.map((p) => ({ t: p.t, a: +p[field[metric]].toFixed(1), b: +(metric === "CPU" ? p.ram : p.cpu).toFixed(1) }));
  }, [history, metric, range]);
  const secondary = metric === "CPU" ? "RAM" : "CPU";
  const fmt = (t: number) => new Date(t).toLocaleString([], range === "7D" ? { weekday: "short" } : { hour: "2-digit", minute: "2-digit" });

  return (
    <Panel
      title={<span className="flex items-center gap-4">System performance
        <span className="hidden items-center gap-3 text-xs font-normal text-muted-foreground sm:flex">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-gold" />{metric}</span>
          {metric !== "Network" && metric !== "Temperature" && <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-primary-accent" />{secondary}</span>}
        </span></span>}
      action={<div className="flex flex-wrap gap-2"><SegmentedControl value={metric} options={METRICS} onChange={setMetric} /><SegmentedControl value={range} options={RANGES} onChange={setRange} /></div>}
    >
      <div className="h-64">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="t" tickFormatter={fmt} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} minTickGap={40} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }}
              labelFormatter={(t) => new Date(t as number).toLocaleString()}
              formatter={(v: number, n) => [`${v}${n === "a" ? unit[metric] : "%"}`, n === "a" ? metric : secondary]}
            />
            <Line dataKey="a" stroke="var(--color-gold)" strokeWidth={2} dot={false} isAnimationActive={false} />
            {(metric === "CPU" || metric === "RAM") && <Line dataKey="b" stroke="var(--color-primary-accent)" strokeWidth={1.4} strokeOpacity={0.7} dot={false} isAnimationActive={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
