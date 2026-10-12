// 通用两级桑基/流量图：左侧节点 → 右侧节点（宽度按流量缩放），SVG 手绘、无图表库依赖。
// 移动端置于横向滚动容器中使用。

export type SankeyLink = { from: string; to: string; value: number };

const COL_W = 12;
const GAP = 6;
const MIN_NODE = 9;
const PAD_TOP = 10;
const X_LABEL_L = 212;
const X_NODE_L = X_LABEL_L + 8;
const X_NODE_R = 600;
const X_LABEL_R = X_NODE_R + COL_W + 10;
const SVG_W = 840;

type Node = { name: string; total: number; y: number; h: number; color: string };

function layout(
  nodes: { name: string; total: number; color: string }[],
  scale: number,
  x: number,
): Node[] {
  let y = PAD_TOP;
  return nodes.map((n) => {
    const h = Math.max(MIN_NODE, n.total * scale);
    const node = { ...n, y, h };
    y += h + GAP;
    return node;
  });
}

export function SankeyChart({
  links,
  leftOrder,
  rightOrder,
  colorsOf,
  unit = "岗",
  labelOf,
}: {
  links: SankeyLink[];
  leftOrder?: string[];
  rightOrder?: string[];
  colorsOf: (side: "L" | "R", name: string) => string;
  unit?: string;
  labelOf?: (name: string) => string;
}) {
  const leftTotals = new Map<string, number>();
  const rightTotals = new Map<string, number>();
  for (const l of links) {
    leftTotals.set(l.from, (leftTotals.get(l.from) ?? 0) + l.value);
    rightTotals.set(l.to, (rightTotals.get(l.to) ?? 0) + l.value);
  }
  const rank = (order?: string[], totals?: Map<string, number>) => (name: string) => {
    const i = order ? order.indexOf(name) : -1;
    return i >= 0 ? i : 10_000 - (totals?.get(name) ?? 0);
  };
  const leftRank = rank(leftOrder, leftTotals);
  const rightRank = (name: string) => {
    // 右侧按「首个上游节点的次序 → 自身流量」排列，减少交叉
    const firstFrom = links.find((l) => l.to === name)?.from ?? "";
    return [leftRank(firstFrom), -(rightTotals.get(name) ?? 0)] as const;
  };

  const leftNames = [...leftTotals.keys()].sort((a, b) => leftRank(a) - leftRank(b) || -(leftTotals.get(a) ?? 0) + (leftTotals.get(b) ?? 0));
  const rightNames = [...rightTotals.keys()].sort((a, b) => {
    const [fa, va] = rightRank(a);
    const [fb, vb] = rightRank(b);
    return fa - fb || va - vb;
  });

  const total = [...leftTotals.values()].reduce((a, b) => a + b, 0) || 1;
  const scale = (Math.max(leftNames.length, rightNames.length) * MIN_NODE) / total;

  const leftNodes = layout(
    leftNames.map((name) => ({ name, total: leftTotals.get(name) ?? 0, color: colorsOf("L", name) })),
    scale,
    X_NODE_L,
  );
  const rightNodes = layout(
    rightNames.map((name) => ({ name, total: rightTotals.get(name) ?? 0, color: colorsOf("R", name) })),
    scale,
    X_NODE_R,
  );
  const bottomL = leftNodes.length ? leftNodes[leftNodes.length - 1]!.y + leftNodes[leftNodes.length - 1]!.h : 0;
  const bottomR = rightNodes.length ? rightNodes[rightNodes.length - 1]!.y + rightNodes[rightNodes.length - 1]!.h : 0;
  const H = Math.max(bottomL, bottomR) + 12;
  const L = new Map(leftNodes.map((n) => [n.name, n]));
  const R = new Map(rightNodes.map((n) => [n.name, n]));

  const lOff = new Map<string, number>();
  const rOff = new Map<string, number>();
  const ribbons = links
    .slice()
    .sort((a, b) => leftRank(a.from) - leftRank(b.from) || rightRank(a.to)[0] - rightRank(b.to)[0])
    .map((l, i) => {
      const ln = L.get(l.from)!;
      const rn = R.get(l.to)!;
      const lo = lOff.get(l.from) ?? 0;
      const ro = rOff.get(l.to) ?? 0;
      lOff.set(l.from, lo + l.value * scale);
      rOff.set(l.to, ro + l.value * scale);
      const y0 = ln.y + lo;
      const y1 = rn.y + ro;
      const h = Math.max(1.2, l.value * scale);
      const x0 = X_NODE_L + COL_W;
      const x1 = X_NODE_R;
      const mx = (x0 + x1) / 2;
      const d = `M ${x0},${y0} C ${mx},${y0} ${mx},${y1} ${x1},${y1} L ${x1},${y1 + h} C ${mx},${y1 + h} ${mx},${y0 + h} ${x0},${y0 + h} Z`;
      return (
        <path key={i} d={d} fill={colorsOf("L", l.from)} opacity={0.22}>
          <title>{`${labelOf ? labelOf(l.from) : l.from} → ${labelOf ? labelOf(l.to) : l.to}：${l.value} ${unit}`}</title>
        </path>
      );
    });

  const fmt = (n: number) => (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1));

  return (
    <div className="overflow-x-auto">
      <svg width={SVG_W} height={H} role="img" className="max-w-none" style={{ minWidth: SVG_W }}>
        {ribbons}
        {leftNodes.map((n) => (
          <g key={n.name}>
            <rect x={X_NODE_L} y={n.y} width={COL_W} height={n.h} rx={3} fill={n.color} opacity={0.9} />
            <text x={X_LABEL_L} y={n.y + n.h / 2 + 4} textAnchor="end" fontSize={12} fill="#26323c">
              {labelOf ? labelOf(n.name) : n.name}
              <tspan fill="#8395a7" fontSize={11}>{" " + fmt(n.total) + unit}</tspan>
            </text>
          </g>
        ))}
        {rightNodes.map((n) => (
          <g key={n.name}>
            <rect x={X_NODE_R} y={n.y} width={COL_W} height={n.h} rx={3} fill={n.color} opacity={0.9} />
            <text x={X_LABEL_R} y={n.y + n.h / 2 + 4} fontSize={12} fill="#26323c">
              {labelOf ? labelOf(n.name) : n.name}
              <tspan fill="#8395a7" fontSize={11}>{" " + fmt(n.total) + unit}</tspan>
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
