import React from 'react'
import FileList from './FileList';
import { useState } from 'react'
import ImageUploader from './ImageUploader'
import './TwoSidesUploader.css'

const TwoSidesUploader = () => {

  const [leftRefresh, setLeftRefresh] = useState(0);
  const [rightRefresh, setRightRefresh] = useState(0);

  return (
    <div className="container">
      {/* Left Column */}
      <div>
        <div className="side">
          <h2>Left Side Upload</h2>
          <ImageUploader 
            folderName="left-side"
            onUploadComplete={() => setLeftRefresh(prev => prev + 1)}
          />
        </div>

        <div className="side">
          <h2>Left Side Files</h2>
          <FileList folderName="left-side" refreshTrigger={leftRefresh}/>
        </div>
      </div>

      {/* Right Column */}
      <div>
        <div className="side">
          <h2>Right Side Upload</h2>
          <ImageUploader 
            folderName="right-side"
            onUploadComplete={() => setRightRefresh(prev => prev + 1)}
          />
        </div>

        <div className="side">
          <h2>Right Side Files</h2>
          <FileList folderName="right-side" refreshTrigger={rightRefresh}/>
        </div>
      </div>
    </div>
  )
}

export default TwoSidesUploader
