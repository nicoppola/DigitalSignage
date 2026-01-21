import { useEffect, useState, MouseEvent } from 'react';
import { fileAPI } from '../../services/api';
import { logger } from '../../utils/logger.ts';
import { validateFileListResponse } from '../../utils/validators.ts';
import './FileList.css';

interface FileListProps {
  folderName: string;
  refreshTrigger: number;
}

function FileList({ folderName, refreshTrigger }: FileListProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFiles = async (): Promise<void> => {
      setError(null);
      try {
        const data = await fileAPI.getFiles(folderName);

        // Validate response structure
        const validated = validateFileListResponse(data);
        setFiles(validated.files);
        setSelectedFiles([]); // clear selection on refresh
      } catch (err) {
        logger.error('Failed to load files', err);
        setError('Failed to load files. Please try again.');
      }
    };

    loadFiles();
  }, [folderName, refreshTrigger]);

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
      // Use Promise.allSettled to handle partial failures
      const results = await Promise.allSettled(
        selectedFiles.map(filename => fileAPI.deleteFile(folderName, filename))
      );

      // Check which deletions succeeded
      const succeeded = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      // Update file list with successfully deleted files removed
      if (succeeded.length > 0) {
        setFiles(files.filter(f => !selectedFiles.includes(f)));
        setSelectedFiles([]);
      }

      if (failed.length > 0) {
        alert(`Failed to delete ${failed.length} file(s)`);
      }
    } catch (err) {
      logger.error('Error deleting files', err);
      alert('Error deleting files');
    }
  };

  return (
    <div className="preview-section">
      {error && <div className="file-list-error" role="alert">{error}</div>}

      {!error && files.length === 0 && <p>No files uploaded yet.</p>}

      {!error && files.length > 0 && (
        <>
          <button
            className="upload-btn delete-btn"
            onClick={handleDeleteSelected}
            aria-label={`Delete ${selectedFiles.length} selected file${selectedFiles.length !== 1 ? 's' : ''}`}
            disabled={selectedFiles.length === 0}
          >
            Delete Selected
          </button>

          <div className="file-grid" role="list" aria-label={`${files.length} uploaded files`}>
            {files.map((file) => {
              const isSelected = selectedFiles.includes(file);
              const isVideo = file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mov');

              return (
                <label
                  key={file}
                  className={`file-card${isSelected ? ' selected' : ''}`}
                  role="listitem"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectFile(file)}
                    className="file-checkbox"
                    onClick={(e: MouseEvent<HTMLInputElement>) => e.stopPropagation()} // prevent label click toggling twice
                    aria-label={`Select ${file}`}
                  />
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
                  <span className="file-name">
                    {file}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default FileList;
