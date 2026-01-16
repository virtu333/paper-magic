import { useState, useCallback } from 'react';
import type { Token } from '@paper-magic/shared';

interface CreateTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (token: Omit<Token, 'instanceId'>) => void;
}

// Common token presets
const TOKEN_PRESETS: Array<{
  name: string;
  power: number;
  toughness: number;
  types: string;
  abilities?: string;
  color: string;
}> = [
  // White tokens
  { name: 'Soldier', power: 1, toughness: 1, types: 'Creature — Soldier', color: 'white' },
  { name: 'Spirit', power: 1, toughness: 1, types: 'Creature — Spirit', abilities: 'Flying', color: 'white' },
  { name: 'Angel', power: 4, toughness: 4, types: 'Creature — Angel', abilities: 'Flying', color: 'white' },
  { name: 'Human', power: 1, toughness: 1, types: 'Creature — Human', color: 'white' },

  // Blue tokens
  { name: 'Bird', power: 1, toughness: 1, types: 'Creature — Bird', abilities: 'Flying', color: 'blue' },
  { name: 'Illusion', power: 2, toughness: 2, types: 'Creature — Illusion', color: 'blue' },

  // Black tokens
  { name: 'Zombie', power: 2, toughness: 2, types: 'Creature — Zombie', color: 'black' },
  { name: 'Vampire', power: 1, toughness: 1, types: 'Creature — Vampire', abilities: 'Lifelink', color: 'black' },
  { name: 'Rat', power: 1, toughness: 1, types: 'Creature — Rat', color: 'black' },

  // Red tokens
  { name: 'Goblin', power: 1, toughness: 1, types: 'Creature — Goblin', color: 'red' },
  { name: 'Dragon', power: 5, toughness: 5, types: 'Creature — Dragon', abilities: 'Flying', color: 'red' },
  { name: 'Elemental', power: 1, toughness: 1, types: 'Creature — Elemental', color: 'red' },

  // Green tokens
  { name: 'Saproling', power: 1, toughness: 1, types: 'Creature — Saproling', color: 'green' },
  { name: 'Beast', power: 3, toughness: 3, types: 'Creature — Beast', color: 'green' },
  { name: 'Wolf', power: 2, toughness: 2, types: 'Creature — Wolf', color: 'green' },
  { name: 'Elf Warrior', power: 1, toughness: 1, types: 'Creature — Elf Warrior', color: 'green' },
  { name: 'Insect', power: 1, toughness: 1, types: 'Creature — Insect', color: 'green' },

  // Colorless/Artifact tokens
  { name: 'Treasure', power: 0, toughness: 0, types: 'Artifact — Treasure', abilities: 'Sacrifice: Add one mana of any color.', color: 'colorless' },
  { name: 'Food', power: 0, toughness: 0, types: 'Artifact — Food', abilities: '{2}, Sacrifice: Gain 3 life.', color: 'colorless' },
  { name: 'Clue', power: 0, toughness: 0, types: 'Artifact — Clue', abilities: '{2}, Sacrifice: Draw a card.', color: 'colorless' },
  { name: 'Thopter', power: 1, toughness: 1, types: 'Artifact Creature — Thopter', abilities: 'Flying', color: 'colorless' },
];

const COLOR_STYLES: Record<string, string> = {
  white: 'bg-amber-100 text-amber-900 border-amber-300',
  blue: 'bg-blue-200 text-blue-900 border-blue-400',
  black: 'bg-gray-700 text-gray-100 border-gray-500',
  red: 'bg-red-200 text-red-900 border-red-400',
  green: 'bg-green-200 text-green-900 border-green-400',
  colorless: 'bg-gray-300 text-gray-800 border-gray-400',
};

export function CreateTokenModal({
  isOpen,
  onClose,
  onCreate,
}: CreateTokenModalProps) {
  const [mode, setMode] = useState<'presets' | 'custom'>('presets');
  const [customToken, setCustomToken] = useState({
    name: '',
    power: 1,
    toughness: 1,
    types: 'Creature — ',
    abilities: '',
    color: 'colorless',
  });
  const [quantity, setQuantity] = useState(1);

  const handlePresetClick = useCallback((preset: typeof TOKEN_PRESETS[0]) => {
    const token: Omit<Token, 'instanceId'> = {
      isToken: true,
      scryfallId: `token-${preset.name.toLowerCase().replace(/\s/g, '-')}`,
      name: preset.name,
      imageUri: '', // Will be rendered as text
      power: preset.power,
      toughness: preset.toughness,
      types: preset.types,
      abilities: preset.abilities,
      isTapped: false,
      isFaceDown: false,
      isTransformed: false,
      counters: [],
      attachments: [],
    };

    for (let i = 0; i < quantity; i++) {
      onCreate(token);
    }
    onClose();
  }, [quantity, onCreate, onClose]);

  const handleCustomCreate = useCallback(() => {
    if (!customToken.name.trim()) return;

    const token: Omit<Token, 'instanceId'> = {
      isToken: true,
      scryfallId: `token-custom-${Date.now()}`,
      name: customToken.name,
      imageUri: '',
      power: customToken.power,
      toughness: customToken.toughness,
      types: customToken.types,
      abilities: customToken.abilities || undefined,
      isTapped: false,
      isFaceDown: false,
      isTransformed: false,
      counters: [],
      attachments: [],
    };

    for (let i = 0; i < quantity; i++) {
      onCreate(token);
    }
    onClose();
  }, [customToken, quantity, onCreate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-surface-light rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Create Token</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex mb-4">
          <button
            onClick={() => setMode('presets')}
            className={`flex-1 py-2 text-sm font-medium rounded-l-lg transition-colors ${
              mode === 'presets'
                ? 'bg-accent text-surface'
                : 'bg-surface-lighter text-gray-400 hover:text-white'
            }`}
          >
            Presets
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 py-2 text-sm font-medium rounded-r-lg transition-colors ${
              mode === 'custom'
                ? 'bg-accent text-surface'
                : 'bg-surface-lighter text-gray-400 hover:text-white'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Quantity selector */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-400">Quantity:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setQuantity(n)}
                className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                  quantity === n
                    ? 'bg-accent text-surface'
                    : 'bg-surface-lighter text-gray-400 hover:text-white'
                }`}
              >
                {n}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={20}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="w-12 h-8 rounded bg-surface-lighter text-white text-center text-sm ml-2"
            />
          </div>
        </div>

        {mode === 'presets' ? (
          /* Presets grid */
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {TOKEN_PRESETS.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handlePresetClick(preset)}
                  className={`p-2 rounded-lg border text-left transition-all hover:scale-105 ${COLOR_STYLES[preset.color]}`}
                >
                  <div className="font-bold text-sm">{preset.name}</div>
                  <div className="text-xs opacity-75">{preset.types}</div>
                  {preset.types.includes('Creature') && (
                    <div className="text-xs font-bold mt-1">
                      {preset.power}/{preset.toughness}
                    </div>
                  )}
                  {preset.abilities && (
                    <div className="text-xs mt-1 opacity-75 truncate">{preset.abilities}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Custom token form */
          <div className="flex-1 overflow-y-auto space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={customToken.name}
                onChange={(e) => setCustomToken({ ...customToken, name: e.target.value })}
                placeholder="e.g., Zombie"
                className="w-full px-3 py-2 rounded bg-surface-lighter text-white border border-gray-600 focus:border-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Power</label>
                <input
                  type="number"
                  value={customToken.power}
                  onChange={(e) => setCustomToken({ ...customToken, power: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded bg-surface-lighter text-white border border-gray-600 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Toughness</label>
                <input
                  type="number"
                  value={customToken.toughness}
                  onChange={(e) => setCustomToken({ ...customToken, toughness: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded bg-surface-lighter text-white border border-gray-600 focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Type Line</label>
              <input
                type="text"
                value={customToken.types}
                onChange={(e) => setCustomToken({ ...customToken, types: e.target.value })}
                placeholder="e.g., Creature — Zombie"
                className="w-full px-3 py-2 rounded bg-surface-lighter text-white border border-gray-600 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Abilities (optional)</label>
              <textarea
                value={customToken.abilities}
                onChange={(e) => setCustomToken({ ...customToken, abilities: e.target.value })}
                placeholder="e.g., Flying, Haste"
                rows={2}
                className="w-full px-3 py-2 rounded bg-surface-lighter text-white border border-gray-600 focus:border-accent focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={handleCustomCreate}
              disabled={!customToken.name.trim()}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                customToken.name.trim()
                  ? 'bg-accent hover:bg-accent/80 text-surface'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Create {quantity > 1 ? `${quantity} Tokens` : 'Token'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
