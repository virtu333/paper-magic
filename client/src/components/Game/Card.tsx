import { useState } from 'react';
import type { Card as CardType, Counter, Token } from '@paper-magic/shared';
import { isToken } from '@paper-magic/shared';

// Card back image - local SVG for reliability
const CARD_BACK_URL = '/card-back.svg';

interface CardProps {
  card: CardType;
  size?: 'sm' | 'md' | 'md-responsive' | 'lg' | 'xl';
  showBack?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onRightClick?: (e: React.MouseEvent) => void;
  selected?: boolean;
  draggable?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-14',   // ~56px (was w-12, 20% larger)
  md: 'w-24',   // ~96px (was w-20, 20% larger)
  'md-responsive': 'w-[var(--card-width-md)]',  // responsive: 80px on small screens, 96px on tall screens
  lg: 'w-36',   // ~144px (was w-32, ~12% larger)
  xl: 'w-64',   // 256px (unchanged, for hover preview)
};

export function Card({
  card,
  size = 'md',
  showBack = false,
  onClick,
  onDoubleClick,
  onRightClick,
  selected = false,
  draggable = false,
  className = '',
}: CardProps) {
  const [imageError, setImageError] = useState(false);

  const imageUrl = showBack || card.isFaceDown
    ? CARD_BACK_URL
    : card.isTransformed && card.backImageUri
    ? card.backImageUri
    : card.imageUri;

  // Only handle context menu if onRightClick is provided
  // Otherwise let Radix ContextMenu handle it
  const handleContextMenu = onRightClick
    ? (e: React.MouseEvent) => {
        e.preventDefault();
        onRightClick(e);
      }
    : undefined;

  return (
    <div
      className={`
        relative aspect-[5/7] ${sizeClasses[size]}
        rounded-lg overflow-hidden cursor-pointer
        transition-all duration-150
        ${card.isTapped ? 'rotate-90' : ''}
        ${selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}
        ${draggable ? 'hover:scale-105' : ''}
        ${className}
      `}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={handleContextMenu}
      draggable={draggable}
    >
      {/* Card Image */}
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={card.name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
          draggable={false}
        />
      ) : isToken(card) ? (
        <TokenDisplay token={card} size={size} showBack={showBack} />
      ) : showBack || card.isFaceDown ? (
        // Fallback card back design
        <CardBackFallback />
      ) : (
        <div className="w-full h-full bg-surface-lighter flex items-center justify-center p-1">
          <span className="text-xs text-gray-500 text-center break-words">
            {card.name}
          </span>
        </div>
      )}

      {/* Counters */}
      {card.counters.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 flex flex-wrap gap-0.5 p-0.5 bg-black/60">
          {card.counters.map((counter, i) => (
            <CounterBadge key={i} counter={counter} />
          ))}
        </div>
      )}

      {/* Tap indicator */}
      {card.isTapped && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-black">
          T
        </div>
      )}

      {/* Transform indicator for DFCs */}
      {card.backImageUri && !showBack && !card.isFaceDown && (
        <div className="absolute top-1 left-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      )}
    </div>
  );
}

// Counter badge component
function CounterBadge({ counter }: { counter: Counter }) {
  const bgColor = {
    plusOne: 'bg-green-500',
    minusOne: 'bg-red-500',
    loyalty: 'bg-blue-500',
    custom: 'bg-purple-500',
  }[counter.type];

  const label = {
    plusOne: `+${counter.value}/+${counter.value}`,
    minusOne: `${counter.value}/${counter.value}`,
    loyalty: counter.value.toString(),
    custom: counter.label ? `${counter.value} ${counter.label}` : counter.value.toString(),
  }[counter.type];

  return (
    <span className={`px-1 text-xs font-bold text-white rounded ${bgColor}`}>
      {label}
    </span>
  );
}

// Fallback card back when image fails to load
function CardBackFallback() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 rounded-lg flex items-center justify-center">
      <div className="w-3/4 h-3/4 border-2 border-amber-600 rounded-lg flex items-center justify-center">
        <div className="w-1/2 h-1/2 bg-amber-700 rounded-full border-2 border-amber-500 flex items-center justify-center">
          <div className="w-1/2 h-1/2 bg-amber-600 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Token display component
function TokenDisplay({
  token,
  size,
  showBack,
}: {
  token: Token;
  size: 'sm' | 'md' | 'md-responsive' | 'lg' | 'xl';
  showBack?: boolean;
}) {
  if (showBack || token.isFaceDown) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg" />
    );
  }

  const isCreature = token.types.toLowerCase().includes('creature');
  const textSize = size === 'sm' ? 'text-[8px]' : (size === 'md' || size === 'md-responsive') ? 'text-[10px]' : size === 'lg' ? 'text-xs' : 'text-sm';
  const nameSize = size === 'sm' ? 'text-[9px]' : (size === 'md' || size === 'md-responsive') ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-base';

  return (
    <div className="w-full h-full bg-gradient-to-br from-amber-200 to-amber-100 rounded-lg border border-amber-400 flex flex-col p-1 overflow-hidden">
      {/* Name */}
      <div className={`font-bold text-amber-900 ${nameSize} truncate`}>
        {token.name}
      </div>

      {/* Type line */}
      <div className={`${textSize} text-amber-800 truncate opacity-80`}>
        {token.types}
      </div>

      {/* Abilities */}
      {token.abilities && (
        <div className={`flex-1 ${textSize} text-amber-900 mt-0.5 overflow-hidden leading-tight`}>
          {token.abilities}
        </div>
      )}

      {/* P/T box for creatures */}
      {isCreature && token.power !== undefined && token.toughness !== undefined && (
        <div className="self-end mt-auto">
          <div className={`bg-amber-900 text-amber-100 ${nameSize} font-bold px-1 rounded`}>
            {token.power}/{token.toughness}
          </div>
        </div>
      )}
    </div>
  );
}

// Card placeholder for empty slots
export function CardPlaceholder({
  size = 'md',
  label,
  onClick,
  className = '',
}: {
  size?: 'sm' | 'md' | 'md-responsive' | 'lg' | 'xl';
  label?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`
        aspect-[5/7] ${sizeClasses[size]}
        rounded-lg border-2 border-dashed border-gray-700
        flex items-center justify-center
        text-gray-600 text-xs text-center
        ${onClick ? 'cursor-pointer hover:border-gray-500' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {label}
    </div>
  );
}

// Card stack display (for graveyard/exile preview)
export function CardStack({
  cards,
  size = 'md',
  maxShow = 3,
  onClick,
}: {
  cards: CardType[];
  size?: 'sm' | 'md' | 'md-responsive' | 'lg' | 'xl';
  maxShow?: number;
  onClick?: () => void;
}) {
  const displayCards = cards.slice(-maxShow);

  return (
    <div
      className={`relative ${sizeClasses[size]} aspect-[5/7] cursor-pointer`}
      onClick={onClick}
    >
      {displayCards.map((card, i) => (
        <div
          key={card.instanceId}
          className="absolute inset-0"
          style={{
            transform: `translateY(${i * -4}px)`,
            zIndex: i,
          }}
        >
          <Card card={card} size={size} />
        </div>
      ))}
      {cards.length > maxShow && (
        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-accent text-surface text-xs font-bold rounded-full flex items-center justify-center z-10">
          +{cards.length - maxShow}
        </div>
      )}
      {cards.length === 0 && (
        <CardPlaceholder size={size} />
      )}
    </div>
  );
}
