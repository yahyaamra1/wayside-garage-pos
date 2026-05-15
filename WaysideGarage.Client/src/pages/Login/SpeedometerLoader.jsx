import './SpeedometerLoader.css';

const CX = 100;
const CY = 100;
const START_DEG = -135;
const END_DEG   =  135;
const TOTAL     = END_DEG - START_DEG; // 270°

function polarToXY(angleDeg, r) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: CX + r * Math.cos(rad),
    y: CY + r * Math.sin(rad),
  };
}

function describeArc(r, startDeg, endDeg) {
  const s = polarToXY(startDeg, r);
  const e = polarToXY(endDeg, r);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

const TICKS = Array.from({ length: 21 }, (_, i) => {
  const deg = START_DEG + (i / 20) * TOTAL;
  const major = i % 5 === 0;
  const outer = 78;
  const inner = major ? 65 : 71;
  const a = polarToXY(deg, outer);
  const b = polarToXY(deg, inner);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, major, deg };
});

export default function SpeedometerLoader() {
  return (
    <div className="speedo-overlay">
      <svg className="speedo-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        {/* Outer rings */}
        <circle cx={CX} cy={CY} r="90" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
        <circle cx={CX} cy={CY} r="84" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />

        {/* Track arc */}
        <path
          d={describeArc(78, START_DEG, END_DEG)}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Red zone arc (last 20%) */}
        <path
          d={describeArc(78, END_DEG - TOTAL * 0.2, END_DEG)}
          fill="none"
          stroke="rgba(220,40,40,0.35)"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Tick marks */}
        {TICKS.map((t, i) => (
          <line
            key={i}
            x1={t.x1} y1={t.y1}
            x2={t.x2} y2={t.y2}
            stroke={t.deg >= END_DEG - TOTAL * 0.2 ? 'rgba(220,80,80,0.8)' : 'rgba(255,255,255,0.55)'}
            strokeWidth={t.major ? 1.8 : 1}
            strokeLinecap="round"
          />
        ))}

        {/* Animated needle */}
        <g className="speedo-needle-group">
          {/* Needle glow */}
          <line
            x1={CX} y1={CY}
            x2={CX} y2={CY - 58}
            stroke="rgba(220,40,40,0.3)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Needle */}
          <line
            x1={CX} y1={CY + 10}
            x2={CX} y2={CY - 60}
            stroke="#e53e3e"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* Center cap */}
        <circle cx={CX} cy={CY} r="6" fill="#1a1a2e" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
        <circle cx={CX} cy={CY} r="2.5" fill="rgba(255,255,255,0.8)" />

        {/* LOADING text */}
        <text
          x={CX} y={CY + 28}
          textAnchor="middle"
          fill="rgba(255,255,255,0.9)"
          fontSize="9"
          fontFamily="Inter, sans-serif"
          fontWeight="700"
          letterSpacing="2.5"
        >
          LOADING
        </text>
      </svg>
    </div>
  );
}
