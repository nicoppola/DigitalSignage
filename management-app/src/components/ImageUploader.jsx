import React, { useState, useEffect } from 'react'
import './ImageUploader.css'

const ImageUploader = ({ folderName = 'default-folder', onUploadComplete = {} }) => {
  const [files, setFiles] = useState([])
  const [previewUrls, setPreviewUrls] = useState([])

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    handleFiles(selectedFiles)
  }

  const handleFiles = (selectedFiles) => {
    const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'))

    // Remove duplicates
    const newFiles = imageFiles.filter(newFile =>
      !files.some(existingFile =>
        existingFile.name === newFile.name && existingFile.size === newFile.size
      )
    )

    const updatedFiles = [...files, ...newFiles]
    setFiles(updatedFiles)

    const newPreviews = newFiles.map(file => URL.createObjectURL(file))
    setPreviewUrls(prev => [...prev, ...newPreviews])
  }

  const handleRemove = (index) => {
    URL.revokeObjectURL(previewUrls[index])

    setFiles(files.filter((_, i) => i !== index))
    setPreviewUrls(previewUrls.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('No files to upload!')
      return
    }

    const formData = new FormData()
    files.forEach(file => {
      formData.append('images', file)
    })

    try {
      // Include folderName as a query param in the upload URL
      const res = await fetch(`http://localhost:4000/api/upload?folder=${encodeURIComponent(folderName)}`, {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        alert('Upload successful!')
        previewUrls.forEach(url => URL.revokeObjectURL(url))
        setFiles([])
        setPreviewUrls([])
        onUploadComplete()
      } else {
        alert('Upload failed.')
      }
    } catch (err) {
      console.error(err)
      alert('Error uploading.')
    }
  }

  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

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
                  <button
                    className="remove-btn"
                    onClick={() => handleRemove(i)}
                    aria-label={`Remove ${files[i]?.name}`}
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="upload-btn" onClick={handleUpload}>Upload</button>
        </div>
      )}
    </div>
  )
}

export default ImageUploader
