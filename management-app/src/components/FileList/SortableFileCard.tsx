import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MouseEvent } from 'react';

interface SortableFileCardProps {
  id: string;
  file: string;
  folderName: string;
  isSelected: boolean;
  isReorderMode: boolean;
  onToggleSelect: (file: string) => void;
}

function SortableFileCard({
  id,
  file,
  folderName,
  isSelected,
  isReorderMode,
  onToggleSelect,
}: SortableFileCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isReorderMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isVideo = file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mov');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`file-card${isSelected ? ' selected' : ''}${isDragging ? ' dragging' : ''}${isReorderMode ? ' reorder-mode' : ''}`}
      role="listitem"
      {...(isReorderMode ? { ...attributes, ...listeners } : {})}
    >
      {!isReorderMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(file)}
          className="file-checkbox"
          onClick={(e: MouseEvent<HTMLInputElement>) => e.stopPropagation()}
          aria-label={`Select ${file}`}
        />
      )}
      {isReorderMode && (
        <span className="drag-handle" aria-hidden="true">⋮⋮</span>
      )}
      {isVideo ? (
        <div className="file-thumbnail video-thumbnail">
          <span className="play-icon">▶</span>
        </div>
      ) : (
        <img
          src={`/uploads/${folderName}/${file}`}
          alt={`Thumbnail of ${file}`}
          className="file-thumbnail"
        />
      )}
      <span className="file-name">{file}</span>
    </div>
  );
}

export default SortableFileCard;
