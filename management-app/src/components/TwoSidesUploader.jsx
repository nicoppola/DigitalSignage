import React from 'react'
import FileList from './FileList';
import { useState } from 'react'
import ImageUploader from './ImageUploader'
import './TwoSidesUploader.css'
import ConfigPanel from './ConfigPanel';

const TwoSidesUploader = () => {

  const [leftRefresh, setLeftRefresh] = useState(0);
  const [rightRefresh, setRightRefresh] = useState(0);

  return (
    <div className="container side-container">
      {/* Left Column */}
      <div>
          <h2>Left Side</h2>
        <div className="side">
          <ConfigPanel side="left"/>
        </div>

        <div className="side">
          <h2>Upload</h2>
          <ImageUploader 
            folderName="left"
            onUploadComplete={() => setLeftRefresh(prev => prev + 1)}
          />
        </div>

        <div className="side">
          <h2>Left Side Files</h2>
          <FileList folderName="left" refreshTrigger={leftRefresh}/>
        </div>
      </div>

      {/* Right Column */}
      <div>
          <h2>Right Side</h2>
        <div className="side">
          <ConfigPanel side="right"/>
        </div>

        <div className="side">
          <h2>Upload</h2>
          <ImageUploader 
            folderName="right"
            onUploadComplete={() => setRightRefresh(prev => prev + 1)}
          />
        </div>

        <div className="side">
          <h2>Right Side Files</h2>
          <FileList folderName="right" refreshTrigger={rightRefresh}/>
        </div>
      </div>
    </div>
  )
}

export default TwoSidesUploader
