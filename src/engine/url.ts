/**
 * Scenario state <-> URL query string (plan section 4.6, "Shareable").
 *
 * Only the scenario is stored. The user's own income is never put in the
 * URL, so a shared link carries no personal financial information.
 */
import { GROUP_KEYS, type GroupShares } from './groups';
import { MAX_GROWTH_PENALTY } from './counterfactual';

export type Scenario =
  | { kind: 'year'; year: number }
  | { kind: 'preset'; id: string }
  | { kind: 'custom'; groups: GroupShares }
  | { kind: 'blend'; a: string; b: string; t: number }
  | { kind: 'param'; sigma: number; alpha: number };

export interface ViewState {
  scenario: Scenario;
  data: 'psz' | 'as';
  concept: 'pre' | 'post';
  growthPenalty: number;
}

export const DEFAULT_STATE: ViewState = {
  scenario: { kind: 'year', year: 1963 },
  data: 'psz',
  concept: 'pre',
  growthPenalty: 0,
};

const round = (x: number, d: number) => Number(x.toFixed(d));
const ID = /^[a-z0-9-]{1,40}$/i;

export function toQuery(s: ViewState): string {
  const q = new URLSearchParams();
  const sc = s.scenario;
  q.set('s', sc.kind);
  switch (sc.kind) {
    case 'year': q.set('y', String(sc.year)); break;
    case 'preset': q.set('p', sc.id); break;
    case 'custom': q.set('g', GROUP_KEYS.map((k) => round(sc.groups[k] * 100, 4)).join(',')); break;
    case 'blend': q.set('a', sc.a); q.set('b', sc.b); q.set('t', String(round(sc.t, 3))); break;
    case 'param': q.set('sig', String(round(sc.sigma, 3))); q.set('al', String(round(sc.alpha, 3))); break;
  }
  if (s.data !== DEFAULT_STATE.data) q.set('d', s.data);
  if (s.concept !== DEFAULT_STATE.concept) q.set('c', s.concept);
  if (s.growthPenalty) q.set('gp', String(round(s.growthPenalty * 100, 2)));
  return q.toString();
}

function num(q: URLSearchParams, key: string): number | null {
  const v = q.get(key);
  if (v === null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Parse a query string; anything missing or invalid falls back to the default. */
export function fromQuery(search: string): ViewState {
  const q = new URLSearchParams(search);
  const out: ViewState = { ...DEFAULT_STATE };
  const kind = q.get('s');
  if (kind === 'year') {
    const y = num(q, 'y');
    if (y !== null && Number.isInteger(y) && y >= 1900 && y <= 2100) out.scenario = { kind, year: y };
  } else if (kind === 'preset') {
    const id = q.get('p');
    if (id && ID.test(id)) out.scenario = { kind, id };
  } else if (kind === 'custom') {
    const parts = (q.get('g') ?? '').split(',').map(Number);
    if (parts.length === GROUP_KEYS.length && parts.every((v) => Number.isFinite(v) && v >= 0)) {
      const total = parts.reduce((a, b) => a + b, 0);
      if (Math.abs(total - 100) < 0.5) {
        const groups = {} as GroupShares;
        GROUP_KEYS.forEach((k, i) => (groups[k] = parts[i]! / total));
        out.scenario = { kind, groups };
      }
    }
  } else if (kind === 'blend') {
    const a = q.get('a'), b = q.get('b'), t = num(q, 't');
    if (a && b && ID.test(a) && ID.test(b) && t !== null && t >= 0 && t <= 1) out.scenario = { kind, a, b, t };
  } else if (kind === 'param') {
    const sigma = num(q, 'sig'), alpha = num(q, 'al');
    if (sigma !== null && alpha !== null && sigma > 0 && sigma <= 5 && alpha > 1 && alpha <= 10) {
      out.scenario = { kind, sigma, alpha };
    }
  }
  if (q.get('d') === 'as') out.data = 'as';
  if (q.get('c') === 'post') out.concept = 'post';
  const gp = num(q, 'gp');
  if (gp !== null && gp >= 0 && gp <= MAX_GROWTH_PENALTY * 100) out.growthPenalty = gp / 100;
  return out;
}

/** Readable title for sharing, e.g. "If America's income were divided like 1963". */
export function shareTitle(s: ViewState, presetName?: string): string {
  const sc = s.scenario;
  switch (sc.kind) {
    case 'year': return `If America's income were divided like ${sc.year}`;
    case 'preset': return `If America's income were divided like ${presetName ?? sc.id}`;
    case 'custom': return "If America's income were divided your way";
    case 'blend': return "If America's income were divided somewhere in between";
    case 'param': return "If America's income followed a custom curve";
  }
}
