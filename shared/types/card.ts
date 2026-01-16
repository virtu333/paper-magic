export type CounterType = 'plusOne' | 'minusOne' | 'loyalty' | 'custom';

export interface Counter {
  type: CounterType;
  value: number;
  label?: string; // For custom counters (e.g., "charge", "fade", "time")
}

export interface CardPosition {
  x: number;
  y: number;
}

export interface Card {
  instanceId: string;           // Unique per card instance in game (UUID)
  scryfallId: string;           // For image/data lookup
  name: string;
  imageUri: string;
  backImageUri?: string;        // For DFCs or face-down state

  // Card state
  isTapped: boolean;
  isFaceDown: boolean;
  isTransformed: boolean;       // DFC showing back face

  // Counters and attachments
  counters: Counter[];
  attachedTo?: string;          // instanceId of card this is attached to
  attachedToOwner?: 0 | 1;      // Which player owns the card this is attached to (for cross-player attachments)
  attachments: string[];        // instanceIds of cards attached to this

  // Position on battlefield (only used when in battlefield zone)
  position?: CardPosition;

  // Layer ordering for stacked cards on battlefield
  zIndex?: number;
}

export interface Token extends Card {
  isToken: true;
  power?: number;
  toughness?: number;
  types: string;                // e.g., "Creature — Zombie"
  abilities?: string;           // Oracle text for the token
}

// Type guard for tokens
export function isToken(card: Card): card is Token {
  return 'isToken' in card && (card as Token).isToken === true;
}

// Factory function for creating a new card instance
export function createCard(
  scryfallId: string,
  name: string,
  imageUri: string,
  backImageUri?: string
): Omit<Card, 'instanceId'> {
  return {
    scryfallId,
    name,
    imageUri,
    backImageUri,
    isTapped: false,
    isFaceDown: false,
    isTransformed: false,
    counters: [],
    attachments: [],
  };
}
