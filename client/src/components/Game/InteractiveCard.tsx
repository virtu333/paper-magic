import type { Card as CardType, Zone } from '@paper-magic/shared';
import { Card } from './Card';
import { DraggableCard } from './DraggableCard';
import { CardContextMenu } from './CardContextMenu';

interface InteractiveCardProps {
  card: CardType;
  zone: Zone;
  size?: 'sm' | 'md' | 'lg';
  showBack?: boolean;
  selected?: boolean;
  enableDrag?: boolean;
  enableContextMenu?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onTap?: () => void;
  onUntap?: () => void;
  onFlip?: () => void;
  onTransform?: () => void;
  onMoveTo?: (zone: Zone) => void;
  onPutOnTop?: () => void;
  onPutOnBottom?: () => void;
  onAddCounter?: (type: string) => void;
  onRemoveCounter?: (index: number) => void;
  onDestroyToken?: () => void;
  onAttachTo?: (targetId: string) => void;
  onDetach?: () => void;
  otherBattlefieldCards?: CardType[];
}

export function InteractiveCard({
  card,
  zone,
  size = 'md',
  showBack = false,
  selected = false,
  enableDrag = true,
  enableContextMenu = true,
  onClick,
  onDoubleClick,
  onTap,
  onUntap,
  onFlip,
  onTransform,
  onMoveTo,
  onPutOnTop,
  onPutOnBottom,
  onAddCounter,
  onRemoveCounter,
  onDestroyToken,
  onAttachTo,
  onDetach,
  otherBattlefieldCards,
}: InteractiveCardProps) {
  // Base card rendering
  const renderCard = () => {
    if (enableDrag) {
      return (
        <DraggableCard
          card={card}
          sourceZone={zone}
          size={size}
          showBack={showBack}
          selected={selected}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
        />
      );
    }

    return (
      <Card
        card={card}
        size={size}
        showBack={showBack}
        selected={selected}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      />
    );
  };

  // Wrap with context menu if enabled
  if (enableContextMenu) {
    return (
      <CardContextMenu
        card={card}
        currentZone={zone}
        onTap={onTap}
        onUntap={onUntap}
        onFlip={onFlip}
        onTransform={onTransform}
        onMoveTo={onMoveTo}
        onPutOnTop={onPutOnTop}
        onPutOnBottom={onPutOnBottom}
        onAddCounter={onAddCounter}
        onRemoveCounter={onRemoveCounter}
        onDestroyToken={onDestroyToken}
        onAttachTo={onAttachTo}
        onDetach={onDetach}
        otherBattlefieldCards={otherBattlefieldCards}
      >
        <div>{renderCard()}</div>
      </CardContextMenu>
    );
  }

  return renderCard();
}
