import { useState, useEffect, useRef, DragEvent, ChangeEvent } from "react";
import { fileAPI } from "../../services/api";
import { logger } from "../../utils/logger.ts";
import { DEFAULTS } from "../../constants.ts";
import "../../shared.css";
import "./ImageUploader.css";

interface ImageUploaderProps {
  folderName?: string;
  onUploadComplete?: () => void;
}

type FileStatus = 'pending' | 'uploading' | 'done';

const ImageUploader = ({
  folderName = DEFAULTS.FOLDER_NAME,
  onUploadComplete = () => {},
}: ImageUploaderProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fileStatus, setFileStatus] = useState<FileStatus[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const previewUrlsRef = useRef<string[]>([]);

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFiles(selectedFiles);
  };

  const handleFiles = (selectedFiles: File[]): void => {
    const mediaFiles = selectedFiles.filter((file) =>
      file.type.startsWith("image/") || file.type.startsWith("video/")
    );

    // Remove duplicates
    const newFiles = mediaFiles.filter(
      (newFile) =>
        !files.some(
          (existingFile) =>
            existingFile.name === newFile.name &&
            existingFile.size === newFile.size
        )
    );

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);

    // Status for new files = pending
    setFileStatus((prev) => [...prev, ...newFiles.map(() => "pending" as FileStatus)]);

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    const updatedPreviews = [...previewUrls, ...newPreviews];
    setPreviewUrls(updatedPreviews);
    previewUrlsRef.current = updatedPreviews;
  };

  const handleRemove = (index: number): void => {
    const urlToRevoke = previewUrls[index];
    if (urlToRevoke) {
      URL.revokeObjectURL(urlToRevoke);
    }

    const updatedPreviews = previewUrls.filter((_, i) => i !== index);
    setFiles(files.filter((_, i) => i !== index));
    setPreviewUrls(updatedPreviews);
    setFileStatus(fileStatus.filter((_, i) => i !== index));
    previewUrlsRef.current = updatedPreviews;
  };

  const handleUpload = async (): Promise<void> => {
    if (files.length === 0) {
      alert("No files to upload!");
      return;
    }

    setIsUploading(true);
    setCurrentIndex(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        setCurrentIndex(i);
        setFileStatus((prev) => {
          const copy = [...prev];
          copy[i] = "uploading";
          return copy;
        });

        await uploadSingleFile(file, folderName);

        setFileStatus((prev) => {
          const copy = [...prev];
          copy[i] = "done";
          return copy;
        });
      }

      // Cleanup after full completion
      setIsUploading(false);
      setCurrentIndex(null);
      setProgress(0);

      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setFiles([]);
      setPreviewUrls([]);
      setFileStatus([]);
      previewUrlsRef.current = [];
      onUploadComplete();
    } catch (err) {
      logger.error('Upload failed', err);
      setIsUploading(false);
      alert("Upload failed.");
    }
  };

  const uploadSingleFile = async (file: File, folderName: string): Promise<void> => {
    return fileAPI.uploadFiles(folderName, [file], (percent) => {
      setProgress(percent);
    });
  };

  useEffect(() => {
    return () => {
      // Cleanup all preview URLs when component unmounts
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []); // Empty dependency array - only runs on mount/unmount

  return (
    <div className="upload-container">
      <div
        className="drop-zone"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => e.preventDefault()}
        onDragLeave={(e) => e.preventDefault()}
        role="button"
        tabIndex={0}
        aria-label="Upload files by dragging and dropping or clicking to select"
      >
        <p>Drag & Drop images or videos here, or click to select files</p>
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileChange}
          className="file-input"
          id="file-upload-input"
          aria-label="Choose image or video files to upload"
        />
      </div>

      {previewUrls.length > 0 && (
        <div className="preview-section">
          <h3>Preview</h3>

          <div className="previews" role="list" aria-label="Selected files for upload">
            {previewUrls.map((url, i) => (
              <div key={i} className="preview-wrapper" role="listitem">
                <img
                  src={url}
                  alt={`Preview of ${files[i]?.name || `image ${i + 1}`}`}
                />

                <div className="file-info">
                  <span className="file-name">{files[i]?.name}</span>

                  {/* STATUS ICONS */}
                  {fileStatus[i] === "pending" && (
                    <button
                      className="remove-btn"
                      onClick={() => handleRemove(i)}
                      aria-label={`Remove ${files[i]?.name}`}
                    >
                      ❌
                    </button>
                  )}

                  {fileStatus[i] === "uploading" && (
                    <div
                      className="small-spinner"
                      role="status"
                      aria-label="Uploading file"
                    ></div>
                  )}

                  {fileStatus[i] === "done" && (
                    <span className="checkmark" role="status" aria-label="Upload complete">✔</span>
                  )}
                </div>

                {/* STATUS TEXT */}
                {fileStatus[i] === "uploading" && (
                  <p className="uploading-text">Uploading…</p>
                )}
                {fileStatus[i] === "done" && (
                  <p className="done-text">Uploaded</p>
                )}
              </div>
            ))}
          </div>

          <button
            className="upload-btn"
            onClick={handleUpload}
            disabled={isUploading}
            aria-label={`Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
          >
            Upload
          </button>

          {isUploading && currentIndex !== null && (
            <div className="upload-status" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true"></div>
              <p>
                {progress === 100 ? 'Processing' : 'Uploading'} {currentIndex + 1} / {files.length}
              </p>
              <p>{files[currentIndex]?.name}</p>
              <p aria-label={progress === 100 ? 'Processing file' : `Upload progress: ${progress} percent`}>
                {progress === 100 ? 'Processing...' : `${progress}%`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
