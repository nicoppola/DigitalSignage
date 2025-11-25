import React, { useState, useEffect } from "react";
import "./ImageUploader.css";

const ImageUploader = ({
  folderName = "default-folder",
  onUploadComplete = {},
}) => {
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [fileStatus, setFileStatus] = useState([]); // pending | uploading | done
  const [isUploading, setIsUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const handleFiles = (selectedFiles) => {
    const imageFiles = selectedFiles.filter((file) =>
      file.type.startsWith("image/")
    );

    // Remove duplicates
    const newFiles = imageFiles.filter(
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
    setFileStatus((prev) => [...prev, ...newFiles.map(() => "pending")]);

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const handleRemove = (index) => {
    URL.revokeObjectURL(previewUrls[index]);

    setFiles(files.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
    setFileStatus(fileStatus.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
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
      onUploadComplete();
    } catch (err) {
      console.error(err);
      setIsUploading(false);
      alert("Upload failed.");
    }
  };

  const uploadSingleFile = (file, folderName) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      // MUST MATCH: upload.array("images")
      formData.append("images", file);

      xhr.open("POST", `/api/upload?folder=${encodeURIComponent(folderName)}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) resolve();
        else reject(new Error(xhr.responseText));
      };

      xhr.onerror = reject;

      xhr.send(formData);
    });
  };

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  return (
    <div className="upload-container">
      <div
        className="drop-zone"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => e.preventDefault()}
        onDragLeave={(e) => e.preventDefault()}
      >
        <p>Drag & Drop images here, or click to select files</p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="file-input"
        />
      </div>

      {previewUrls.length > 0 && (
        <div className="preview-section">
          <h3>Preview</h3>

          <div className="previews">
            {previewUrls.map((url, i) => (
              <div key={i} className="preview-wrapper">
                <img src={url} alt={`preview ${i}`} />

                <div className="file-info">
                  <span className="file-name">{files[i]?.name}</span>

                  {/* STATUS ICONS */}
                  {fileStatus[i] === "pending" && (
                    <button
                      className="remove-btn"
                      onClick={() => handleRemove(i)}
                    >
                      ❌
                    </button>
                  )}

                  {fileStatus[i] === "uploading" && (
                    <div className="small-spinner"></div>
                  )}

                  {fileStatus[i] === "done" && (
                    <span className="checkmark">✔</span>
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

          <button className="upload-btn" onClick={handleUpload} disabled={isUploading}>
            Upload
          </button>

          {isUploading && (
            <div className="upload-status">
              <div className="spinner"></div>
              <p>
                Uploading {currentIndex + 1} / {files.length}
              </p>
              <p>{files[currentIndex]?.name}</p>
              <p>{progress}%</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
