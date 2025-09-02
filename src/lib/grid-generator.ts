// --- PRNG (seedable) ---
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randInt(rng: () => number, max: number) { return (rng() * max) | 0; }

// --- Helpers ---
type Grid = Uint8Array; // length n*n
const W = 0, B = 1;

const idx = (n: number, r: number, c: number) => r*n + c;
const mate = (n: number, r: number, c: number) => ({ r: n-1-r, c: n-1-c });

function toStrings(n: number, g: Grid): string[] {
  const out = new Array<string>(n);
  for (let r=0;r<n;r++) {
    let s = "";
    for (let c=0;c<n;c++) s += g[idx(n,r,c)] ? "#" : ".";
    out[r] = s;
  }
  return out;
}

function countBlack(g: Grid): number {
  let b = 0; for (let i=0;i<g.length;i++) b += g[i]; return b;
}

// Check runs >=3 for *affected* row/col only (fast local check)
function rowHasBadRuns(n:number, g:Grid, r:number): boolean {
  let run=0;
  for (let c=0;c<n;c++){
    if (g[idx(n,r,c)]===W) run++;
    else { if (run>0 && run<3) return true; run=0; }
  }
  return (run>0 && run<3);
}
function colHasBadRuns(n:number, g:Grid, c:number): boolean {
  let run=0;
  for (let r=0;r<n;r++){
    if (g[idx(n,r,c)]===W) run++;
    else { if (run>0 && run<3) return true; run=0; }
  }
  return (run>0 && run<3);
}

// Full check: all across/down white runs >=3
function minLenOK(n:number, g:Grid): boolean {
  for (let r=0;r<n;r++) if (rowHasBadRuns(n,g,r)) return false;
  for (let c=0;c<n;c++) if (colHasBadRuns(n,g,c)) return false;
  return true;
}

// BFS connectivity over whites
function whitesConnected(n:number, g:Grid): boolean {
  const N = n*n;
  let start=-1;
  for (let i=0;i<N;i++) if (g[i]===W) { start=i; break; }
  if (start<0) return true; // all black (won't happen in practice)
  const q = [start]; const seen = new Uint8Array(N); seen[start]=1;
  while (q.length){
    const cur = q.pop()!;
    const r = (cur / n) | 0, c = cur % n;
    const neigh = [
      (r>0)     ? idx(n,r-1,c) : -1,
      (r<n-1)   ? idx(n,r+1,c) : -1,
      (c>0)     ? idx(n,r,c-1) : -1,
      (c<n-1)   ? idx(n,r,c+1) : -1
    ];
    for (const ni of neigh) if (ni>=0 && g[ni]===W && !seen[ni]) { seen[ni]=1; q.push(ni); }
  }
  let whiteTotal=0, whiteSeen=0;
  for (let i=0;i<N;i++) if (g[i]===W) { whiteTotal++; if (seen[i]) whiteSeen++; }
  return whiteTotal === whiteSeen;
}

export type Pattern = { grid: string[], blackPct: number };

export function generatePattern(n: 15|17|19|21, seed?: number): Pattern {
  const rng = seed!==undefined ? mulberry32(seed>>>0) : mulberry32((Math.random()*1e9)|0);
  let g: Grid = new Uint8Array(n*n); // start all white
  const total = n*n;
  const window = { lo: Math.round(total*0.14), hi: Math.round(total*0.18) };
  let target = Math.round(total*0.16);
  if (target % 2) target += 1;

  // candidate positions (unique half, to respect symmetry)
  const picks: Array<[number,number]> = [];
  for (let r=0;r<n;r++) for (let c=0;c<n;c++) {
    const m = mate(n,r,c); // only keep one of each pair
    if (r < m.r || (r===m.r && c <= m.c)) picks.push([r,c]);
  }

  let bCount = 0;
  let restarts = 0;
  
  while (restarts < 5) {
    g = new Uint8Array(n*n); // clear grid
    // --- Flip phase ---
    let attempts = 0, maxAttempts = n*n*50;
    while (countBlack(g) < target && attempts++ < maxAttempts) {
        const [r,c] = picks[randInt(rng, picks.length)];
        const m = mate(n,r,c);
        const i1 = idx(n,r,c), i2 = idx(n,m.r,m.c);
        if (g[i1]===B || g[i2]===B) continue; // already black

        // Tentatively set to black
        g[i1]=B; g[i2]=B;
        // Local guards: keep min-length viability in the two rows & cols
        if (rowHasBadRuns(n,g,r) || rowHasBadRuns(n,g,m.r) ||
            colHasBadRuns(n,g,c) || colHasBadRuns(n,g,m.c)) {
            g[i1]=W; g[i2]=W; continue;
        }
    }
    bCount = countBlack(g);
    
    // Full validation
    if (minLenOK(n,g) && whitesConnected(n,g) && bCount>=window.lo && bCount<=window.hi) {
        break; // Found a valid grid
    }
    
    restarts++;
  }


  // If after restarts we still don't have a valid grid, we might have to just return the last attempt
  // or a blank grid, but the loop should ideally find one.
  bCount = countBlack(g);

  return { grid: toStrings(n,g), blackPct: bCount/total };
}
