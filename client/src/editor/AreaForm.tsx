import type { Area, Monster } from '../types';
import { AutoText, AutoTextArea } from './fields';
import { MonsterForm } from './MonsterForm';

export function AreaForm({
  area,
  monsters,
  onPatch,
  onDelete,
  onAddMonster,
  onPatchMonster,
  onDeleteMonster,
}: {
  area: Area;
  monsters: Monster[];
  onPatch: (patch: Partial<Area>) => void;
  onDelete: () => void;
  onAddMonster: () => void;
  onPatchMonster: (id: number, patch: Partial<Monster>) => void;
  onDeleteMonster: (id: number) => void;
}) {
  // key={area.id} on the wrapper resets the autosaving fields when the
  // selected area changes.
  return (
    <div className="area-form" key={area.id}>
      <div className="area-head">
        <h2><span className="slug">{area.id}</span> Area</h2>
        <button className="ghost danger" onClick={onDelete}>Delete area</button>
      </div>

      <AutoText label="Name" value={area.name} onSave={(v) => onPatch({ name: v })} />
      <AutoTextArea label="Description (read-aloud)" value={area.description} onSave={(v) => onPatch({ description: v })} />
      <AutoTextArea label="Features" value={area.features} onSave={(v) => onPatch({ features: v })} />
      <AutoTextArea label="Treasure" value={area.treasure} onSave={(v) => onPatch({ treasure: v })} />
      <AutoTextArea label="GM notes (secret)" value={area.gm_notes} onSave={(v) => onPatch({ gm_notes: v })} />

      <div className="monsters">
        <div className="section-head">
          <h3>Monsters</h3>
          <button className="ghost" onClick={onAddMonster}>+ Add monster</button>
        </div>
        {monsters.length === 0 ? (
          <p className="muted tiny">No monsters in this area.</p>
        ) : (
          monsters.map((m) => (
            <MonsterForm
              key={m.id}
              monster={m}
              onPatch={(patch) => onPatchMonster(m.id, patch)}
              onDelete={() => onDeleteMonster(m.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
