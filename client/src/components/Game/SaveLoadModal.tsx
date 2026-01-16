import { useState } from 'react';

interface SaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onLoad: (code: string) => void;
  saveCode: string | null;
}

export function SaveLoadModal({
  isOpen,
  onClose,
  onSave,
  onLoad,
  saveCode,
}: SaveLoadModalProps) {
  const [loadCode, setLoadCode] = useState('');
  const [activeTab, setActiveTab] = useState<'save' | 'load'>('save');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (saveCode) {
      await navigator.clipboard.writeText(saveCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLoad = () => {
    if (loadCode.trim()) {
      onLoad(loadCode.trim());
      setLoadCode('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-surface-light rounded-xl p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Save / Load Game</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('save')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'save'
                ? 'bg-accent text-white'
                : 'bg-surface text-gray-400 hover:text-white'
            }`}
          >
            Save Game
          </button>
          <button
            onClick={() => setActiveTab('load')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'load'
                ? 'bg-accent text-white'
                : 'bg-surface text-gray-400 hover:text-white'
            }`}
          >
            Load Game
          </button>
        </div>

        {activeTab === 'save' ? (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Generate a code that captures the current game state. Share this code with your opponent to restore the game later.
            </p>

            {saveCode ? (
              <div className="space-y-3">
                <textarea
                  readOnly
                  value={saveCode}
                  className="w-full h-32 px-3 py-2 bg-surface border border-gray-700 rounded-lg text-gray-300 text-xs font-mono resize-none"
                />
                <button
                  onClick={handleCopy}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
            ) : (
              <button
                onClick={onSave}
                className="w-full px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors"
              >
                Generate Save Code
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Paste a save code to restore a previous game state. Both players must load the same code to synchronize.
            </p>

            <textarea
              value={loadCode}
              onChange={(e) => setLoadCode(e.target.value)}
              placeholder="Paste save code here (starts with PM1_)"
              className="w-full h-32 px-3 py-2 bg-surface border border-gray-700 rounded-lg text-gray-300 text-xs font-mono resize-none focus:outline-none focus:border-accent"
            />

            <button
              onClick={handleLoad}
              disabled={!loadCode.trim()}
              className={`w-full px-4 py-2 rounded-lg transition-colors ${
                loadCode.trim()
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Load Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
