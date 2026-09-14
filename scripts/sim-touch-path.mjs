// 시뮬레이터 손가락형 스와이프 좌표 생성기 — 시트 제스처(S2) 검증에 쓴다. 출력은 JSON points.
const [x, y0, y1, steps = 8, dt = 16] = process.argv.slice(2).map(Number)
const pts = []
for (let i = 0; i <= steps; i += 1) pts.push({ x, y: Math.round(y0 + ((y1 - y0) * i) / steps), dt_ms: i === 0 ? 0 : dt })
console.log(JSON.stringify(pts))
