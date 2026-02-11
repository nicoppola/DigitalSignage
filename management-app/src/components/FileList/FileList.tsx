import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { fileAPI, configAPI } from '../../services/api';
import { logger } from '../../utils/logger.ts';
import { validateFileListResponse } from '../../utils/validators.ts';
import SortableFileCard from './SortableFileCard';
import './FileList.css';

interface FileListProps {
  folderName: string;
  refreshTrigger: number;
}

interface SideConfig {
  secondsBetweenImages?: number;
  fileOrder?: string[];
  fullscreenMedia?: string[];
}

// Helper function to apply saved order to disk files
function applyFileOrder(diskFiles: string[], savedOrder?: string[]): string[] {
  if (!savedOrder || savedOrder.length === 0) {
    return diskFiles;
  }

  const diskSet = new Set(diskFiles);
  const orderedFiles: string[] = [];

  // Add files in saved order (if they still exist on disk)
  for (const file of savedOrder) {
    if (diskSet.has(file)) {
      orderedFiles.push(file);
      diskSet.delete(file);
    }
  }

  // Append any new files not in saved order (at the end)
  for (const file of diskFiles) {
    if (diskSet.has(file)) {
      orderedFiles.push(file);
    }
  }

  return orderedFiles;
}

function FileList({ folderName, refreshTrigger }: FileListProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [processingFiles, setProcessingFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
  const [orderChanged, setOrderChanged] = useState<boolean>(false);
  const [originalFiles, setOriginalFiles] = useState<string[]>([]);
  const [fullscreenMedia, setFullscreenVideos] = useState<string[]>([]);

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // Prevent accidental drags
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const loadFiles = async (): Promise<void> => {
      setError(null);
      try {
        // Fetch both files and config in parallel
        const filesData = await fileAPI.getFiles(folderName);
        const configData: SideConfig = await configAPI.getConfig(folderName).catch(() => ({}));

        const validated = validateFileListResponse(filesData);
        const diskFiles = validated.files;

        // Apply saved order if exists
        const orderedFiles = applyFileOrder(diskFiles, configData.fileOrder);
        setFiles(orderedFiles);
        setOriginalFiles(orderedFiles);
        setProcessingFiles(validated.processing);
        setSelectedFiles([]);
        setOrderChanged(false);
        setFullscreenVideos(configData.fullscreenMedia || []);
      } catch (err) {
        logger.error('Failed to load files', err);
        // Show auth error message if session expired
        const errorMessage = err instanceof Error ? err.message : 'Failed to load files. Please try again.';
        setError(errorMessage);
      }
    };

    loadFiles();
  }, [folderName, refreshTrigger]);

  // Poll for processing status when files are being processed
  useEffect(() => {
    if (processingFiles.length === 0) return;

    const pollInterval = setInterval(async () => {
      try {
        const filesData = await fileAPI.getFiles(folderName);
        const validated = validateFileListResponse(filesData);

        // Update processing files
        setProcessingFiles(validated.processing);

        // If processing completed, update the file list
        if (validated.processing.length < processingFiles.length) {
          const configData: SideConfig = await configAPI.getConfig(folderName).catch(() => ({}));
          const orderedFiles = applyFileOrder(validated.files, configData.fileOrder);
          setFiles(orderedFiles);
          setOriginalFiles(orderedFiles);
        }
      } catch (err: unknown) {
        // Show auth errors, silently ignore other polling errors
        if (err && typeof err === 'object' && 'isAuthError' in err) {
          const errorMessage = err instanceof Error ? err.message : 'Session expired. Please refresh the page to log in again.';
          setError(errorMessage);
        } else {
          logger.error('Polling failed', err);
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [folderName, processingFiles.length]);

  const toggleSelectFile = (file: string): void => {
    setSelectedFiles(prev => {
      if (prev.includes(file)) {
        return prev.filter(f => f !== file);
      } else {
        return [...prev, file];
      }
    });
  };

  const handleDeleteSelected = async (): Promise<void> => {
    if (selectedFiles.length === 0) {
      alert('No files selected');
      return;
    }

    if (!window.confirm(`Delete ${selectedFiles.length} selected file(s)?`)) return;

    try {
      const results = await Promise.allSettled(
        selectedFiles.map(filename => fileAPI.deleteFile(folderName, filename))
      );

      const succeeded = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

      if (succeeded.length > 0) {
        setFiles(files.filter(f => !selectedFiles.includes(f)));
        setSelectedFiles([]);
      }

      if (failed.length > 0) {
        // Check if any failure is an auth error
        const authError = failed.find(r => r.reason && r.reason.isAuthError);
        if (authError) {
          alert(authError.reason.message || 'Session expired. Please refresh the page to log in again.');
        } else {
          const firstError = failed[0]?.reason;
          const errorMessage = firstError instanceof Error ? firstError.message : `Failed to delete ${failed.length} file(s)`;
          alert(errorMessage);
        }
      }
    } catch (err) {
      logger.error('Error deleting files', err);
      const errorMessage = err instanceof Error ? err.message : 'Error deleting files';
      alert(errorMessage);
    }
  };

  // Handle drag end - reorder files
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
      setOrderChanged(true);
    }
  }, []);

  // Save the new order to server
  const handleSaveOrder = async (): Promise<void> => {
    setIsSavingOrder(true);
    try {
      // Fetch current config to preserve other settings
      const currentConfig: SideConfig = await configAPI.getConfig(folderName).catch(() => ({}));
      await configAPI.updateConfig(folderName, {
        ...currentConfig,
        fileOrder: files,
      } as SideConfig);
      setOrderChanged(false);
      setOriginalFiles(files);
      setIsReorderMode(false);
    } catch (err) {
      logger.error('Failed to save file order', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save file order';
      alert(errorMessage);
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Toggle reorder mode
  const toggleReorderMode = (): void => {
    if (isReorderMode && orderChanged) {
      if (!window.confirm('Discard changes to file order?')) return;
      // Restore original order
      setFiles(originalFiles);
      setOrderChanged(false);
    }
    setIsReorderMode(!isReorderMode);
    setSelectedFiles([]);
  };

  // Toggle fullscreen flag for a video
  const toggleFullscreen = async (file: string): Promise<void> => {
    const isCurrentlyFullscreen = fullscreenMedia.includes(file);
    const newFullscreenVideos = isCurrentlyFullscreen
      ? fullscreenMedia.filter(f => f !== file)
      : [...fullscreenMedia, file];

    setFullscreenVideos(newFullscreenVideos);

    try {
      const currentConfig: SideConfig = await configAPI.getConfig(folderName).catch(() => ({}));
      await configAPI.updateConfig(folderName, {
        ...currentConfig,
        fullscreenMedia: newFullscreenVideos,
      } as SideConfig);
    } catch (err) {
      logger.error('Failed to save fullscreen setting', err);
      // Revert on error
      setFullscreenVideos(fullscreenMedia);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save fullscreen setting';
      alert(errorMessage);
    }
  };

  return (
    <div className="preview-section">
      {error && <div className="file-list-error" role="alert">{error}</div>}

      {processingFiles.length > 0 && (
        <div className="processing-banner" role="status">
          <span className="processing-spinner"></span>
          Processing {processingFiles.length} file{processingFiles.length !== 1 ? 's' : ''}...
        </div>
      )}

      {!error && files.length === 0 && processingFiles.length === 0 && <p>No files uploaded yet.</p>}

      {!error && files.length > 0 && (
        <>
          <div className="file-list-toolbar">
            <button
              className={`upload-btn reorder-btn${isReorderMode ? ' active' : ''}`}
              onClick={toggleReorderMode}
              aria-pressed={isReorderMode}
              disabled={isSavingOrder}
            >
              {isReorderMode ? 'Exit Reorder' : 'Reorder'}
            </button>

            {isReorderMode && orderChanged && (
              <button
                className="upload-btn save-order-btn"
                onClick={handleSaveOrder}
                disabled={isSavingOrder}
              >
                {isSavingOrder ? 'Saving...' : 'Save Order'}
              </button>
            )}

            {!isReorderMode && (
              <button
                className="upload-btn delete-btn"
                onClick={handleDeleteSelected}
                aria-label={`Delete ${selectedFiles.length} selected file${selectedFiles.length !== 1 ? 's' : ''}`}
                disabled={selectedFiles.length === 0}
              >
                Delete Selected
              </button>
            )}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={files} strategy={rectSortingStrategy}>
              <div
                className={`file-grid${isReorderMode ? ' reorder-mode' : ''}`}
                role="list"
                aria-label={`${files.length} uploaded files`}
              >
                {files.map((file) => (
                  <SortableFileCard
                    key={file}
                    id={file}
                    file={file}
                    folderName={folderName}
                    isSelected={selectedFiles.includes(file)}
                    isReorderMode={isReorderMode}
                    isFullscreen={fullscreenMedia.includes(file)}
                    onToggleSelect={toggleSelectFile}
                    onToggleFullscreen={toggleFullscreen}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
}

export default FileList;
