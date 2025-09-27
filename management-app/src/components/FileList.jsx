import React, { useEffect, useState } from 'react';

function FileList({ folderName, refreshTrigger }) {
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    fetch(`/api/files?folder=${folderName}`)
      .then(res => res.json())
      .then(data => {
        if (data.files) setFiles(data.files);
        setSelectedFiles([]); // clear selection on refresh
      })
      .catch(console.error);
  }, [folderName, refreshTrigger]);

  const toggleSelectFile = (file) => {
    setSelectedFiles(prev => {
      if (prev.includes(file)) {
        return prev.filter(f => f !== file);
      } else {
        return [...prev, file];
      }
    });
  };

  const handleDeleteSelected = () => {
    if (selectedFiles.length === 0) {
      alert('No files selected');
      return;
    }

    if (!window.confirm(`Delete ${selectedFiles.length} selected file(s)?`)) return;

    Promise.all(selectedFiles.map(filename =>
      fetch(`/api/files?folder=${folderName}&filename=${filename}`, {
        method: 'DELETE',
      })
    ))
      .then(() => {
        setFiles(files.filter(f => !selectedFiles.includes(f)));
        setSelectedFiles([]);
      })
      .catch(err => {
        console.error(err);
        alert('Error deleting files');
      });
  };

  return (
    <div className="preview-section">
      {files.length === 0 && <p>No files uploaded yet.</p>}

      {files.length > 0 && (
        <>
          <button
            className="upload-btn"
            onClick={handleDeleteSelected}
            style={{ 
                marginLeft: 'auto',
                marginRight: 'auto',
                width: '75%', 
                marginBottom: '15px', 
                backgroundColor: '#D32F2F' }}
          >
            Delete Selected
          </button>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
            {files.map((file) => {
              const isSelected = selectedFiles.includes(file);

              return (
                <label
                  key={file}
                  className="preview-wrapper"
                  style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '80px',
                    border: isSelected ? '2px solid #D32F2F' : '2px solid transparent',
                    borderRadius: '8px',
                    padding: '5px 5px 5px 24px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    position: 'relative',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectFile(file)}
                    style={{
                      position: 'absolute',
                      top: 6,
                      left: 5,
                      zIndex: 10,
                      width: 18,
                      height: 18,
                      cursor: 'pointer',
                    }}
                    onClick={(e) => e.stopPropagation()} // prevent label click toggling twice
                  />
                  <img
                    src={`http://localhost:4000/uploads/${folderName}/${file}`}
                    alt={file}
                    style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, marginBottom: 6 }}
                  />
                  <span
                    className="file-name"
                    style={{ fontSize: 12, textAlign: 'center', wordBreak: 'break-word' }}
                  >
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
