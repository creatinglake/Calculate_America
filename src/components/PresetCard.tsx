/** "What is this preset?" card (plan section 5). */
import type { PresetCard as Card } from '../model/scenarios';

export function PresetCard({ card }: { card: Card }) {
  return (
    <aside className="card" aria-labelledby="preset-card-h">
      <p className="eyebrow">About this comparison</p>
      <h2 id="preset-card-h" className="card-title">{card.title}</h2>
      {card.body.map((t) => <p key={t} className="sub">{t}</p>)}
      <p className="fine">Source: {card.source}</p>
    </aside>
  );
}
