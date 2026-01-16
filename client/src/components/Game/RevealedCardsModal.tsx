import * as Dialog from '@radix-ui/react-dialog';
import type { CardsRevealedPayload } from '@paper-magic/shared';

interface RevealedCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CardsRevealedPayload | null;
}

export function RevealedCardsModal({
  isOpen,
  onClose,
  data,
}: RevealedCardsModalProps) {
  if (!data) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-dark border border-yellow-600 rounded-lg p-6 max-w-[700px] max-h-[80vh] overflow-y-auto z-50 animate-in fade-in zoom-in-95">
          <Dialog.Title className="text-xl font-bold text-yellow-400 mb-2">
            Cards Revealed!
          </Dialog.Title>

          <Dialog.Description className="text-sm text-gray-400 mb-4">
            <span className="font-medium text-gray-200">{data.revealerName}</span> revealed their <span className="font-medium text-gray-200">{data.source}</span>:
          </Dialog.Description>

          {/* Revealed cards grid */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {data.cards.map((card) => (
              <div key={card.instanceId} className="flex flex-col items-center">
                <div className="relative w-[100px] h-[140px] rounded-lg overflow-hidden border-2 border-yellow-600/50 shadow-lg">
                  {card.imageUri ? (
                    <img
                      src={card.imageUri}
                      alt={card.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-light flex items-center justify-center text-xs text-gray-400 p-2 text-center">
                      {card.name}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-300 mt-1 text-center max-w-[100px] truncate" title={card.name}>
                  {card.name}
                </span>
              </div>
            ))}
          </div>

          {/* Card count */}
          <div className="text-sm text-gray-500 mb-4">
            {data.cards.length} card{data.cards.length !== 1 ? 's' : ''} revealed
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm bg-yellow-600 hover:bg-yellow-500 rounded font-medium"
            >
              Got it
            </button>
          </div>

          {/* Close button */}
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
