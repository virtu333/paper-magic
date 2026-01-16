import * as Dialog from '@radix-ui/react-dialog';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-dark border border-gray-700 rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto z-50">
          <Dialog.Title className="text-xl font-bold text-gray-100 mb-4">
            How to Play Paper Magic
          </Dialog.Title>

          <div className="space-y-6 text-sm text-gray-300">
            {/* Basic Controls */}
            <section>
              <h3 className="text-lg font-semibold text-accent mb-2">Basic Controls</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Left-click + drag</strong> - Drag cards between zones</li>
                <li><strong>Double-click</strong> - Tap/untap cards on battlefield</li>
                <li><strong>Right-click</strong> - Open context menu with actions</li>
              </ul>
            </section>

            {/* Context Menu Actions */}
            <section>
              <h3 className="text-lg font-semibold text-accent mb-2">Card Actions (Right-Click)</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><strong>Tap/Untap</strong> - Toggle tapped state</div>
                <div><strong>Flip</strong> - Turn face down/up</div>
                <div><strong>Transform</strong> - Flip DFC cards</div>
                <div><strong>Move to...</strong> - Send to another zone</div>
                <div><strong>Add counter</strong> - Add +1/+1, -1/-1, etc.</div>
                <div><strong>Remove counter</strong> - Remove counters</div>
              </div>
            </section>

            {/* Library Actions */}
            <section>
              <h3 className="text-lg font-semibold text-accent mb-2">Library Actions (Right-Click Deck)</h3>
              <ul className="space-y-1 list-disc list-inside text-xs">
                <li><strong>Scry X</strong> - Look at top X cards, put any on bottom</li>
                <li><strong>Look at top X</strong> - View top cards and rearrange</li>
                <li><strong>Draw</strong> - Draw a card to hand</li>
                <li><strong>Search</strong> - Search library for a card</li>
                <li><strong>Shuffle</strong> - Randomize library order</li>
              </ul>
            </section>

            {/* Game Controls */}
            <section>
              <h3 className="text-lg font-semibold text-accent mb-2">Game Controls</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><strong>Untap All</strong> - Untap all your permanents</div>
                <div><strong>Create Token</strong> - Make a new token creature</div>
                <div><strong>Undo/Redo</strong> - Revert or redo actions</div>
                <div><strong>Save/Load</strong> - Save or load game state</div>
                <div><strong>Life Counter</strong> - Click +/- to adjust life</div>
                <div><strong>Concede</strong> - Give up current game</div>
              </div>
            </section>

            {/* Tips */}
            <section>
              <h3 className="text-lg font-semibold text-accent mb-2">Tips</h3>
              <ul className="space-y-1 list-disc list-inside text-xs">
                <li>This is a <em>paper Magic</em> simulator - rules are not enforced</li>
                <li>Communicate with your opponent about game state</li>
                <li>Use counters to track +1/+1, -1/-1, or custom effects</li>
                <li>Position cards freely on battlefield to organize board state</li>
                <li>Double-click cards to quickly tap/untap</li>
              </ul>
            </section>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-accent hover:bg-accent/80 rounded font-medium"
            >
              Got it!
            </button>
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
