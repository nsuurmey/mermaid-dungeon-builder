import { CLASS_TIERS, type ClassTier, type Monster } from '../types';
import { AutoText, AutoTextArea, AutoNumber, AutoSelect } from './fields';

const COURAGE_HELP: Record<ClassTier, string> = {
  Goon: 'Goon = Level',
  Bruiser: 'Bruiser = Level d6',
  Champion: 'Champion = Level d12',
};

export function MonsterForm({
  monster,
  onPatch,
  onDelete,
}: {
  monster: Monster;
  onPatch: (patch: Partial<Monster>) => void;
  onDelete: () => void;
}) {
  const courageHint = monster.class_tier ? COURAGE_HELP[monster.class_tier] : '';
  return (
    <div className="monster" key={monster.id}>
      <div className="monster-head">
        <AutoText label="Name" value={monster.name} onSave={(v) => onPatch({ name: v })} />
        <button className="ghost danger" onClick={onDelete}>Remove</button>
      </div>

      <div className="stat-grid">
        <AutoNumber label="Level" value={monster.level} onSave={(v) => onPatch({ level: v })} />
        <AutoSelect
          label="Class"
          value={monster.class_tier ?? ''}
          options={CLASS_TIERS}
          allowEmpty
          onSave={(v) => onPatch({ class_tier: v })}
        />
        <AutoText
          label="Courage"
          value={monster.courage}
          placeholder={courageHint}
          onSave={(v) => onPatch({ courage: v })}
        />
        <AutoText label="Dread" value={monster.dread} placeholder="e.g. 1d6" onSave={(v) => onPatch({ dread: v })} />
        <AutoNumber label="Atk" value={monster.attack} onSave={(v) => onPatch({ attack: v })} />
        <AutoNumber label="Def" value={monster.defense} onSave={(v) => onPatch({ defense: v })} />
        <AutoNumber label="Block" value={monster.block} onSave={(v) => onPatch({ block: v })} />
        <AutoNumber label="Actions" value={monster.actions} onSave={(v) => onPatch({ actions: v })} />
      </div>
      {courageHint && <p className="muted tiny">Courage helper: {courageHint}</p>}

      <AutoTextArea label="Abilities" value={monster.abilities} rows={2} onSave={(v) => onPatch({ abilities: v })} />
      <AutoTextArea label="Vulnerabilities" value={monster.vulnerabilities} rows={2} onSave={(v) => onPatch({ vulnerabilities: v })} />
      <div className="two-col">
        <AutoTextArea label="Social" value={monster.social} rows={2} onSave={(v) => onPatch({ social: v })} />
        <AutoTextArea label="Combat tactics" value={monster.combat_tactics} rows={2} onSave={(v) => onPatch({ combat_tactics: v })} />
        <AutoTextArea label="Defeat" value={monster.defeat} rows={2} onSave={(v) => onPatch({ defeat: v })} />
        <AutoTextArea label="Victory" value={monster.victory} rows={2} onSave={(v) => onPatch({ victory: v })} />
      </div>
      <AutoText label="Bestiary ref" value={monster.bestiary_ref} onSave={(v) => onPatch({ bestiary_ref: v })} />
    </div>
  );
}
