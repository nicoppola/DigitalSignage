import { useState, useCallback } from 'react';
import FileList from '../FileList/FileList.tsx';
import ImageUploader from '../ImageUploader/ImageUploader.tsx';
import ConfigPanel from '../ConfigPanel/ConfigPanel.tsx';
import '../../shared.css';
import './TwoSidesUploader.css';

const TwoSidesUploader = () => {
  const [leftRefresh, setLeftRefresh] = useState<number>(0);
  const [rightRefresh, setRightRefresh] = useState<number>(0);

  const handleLeftUploadComplete = useCallback((): void => {
    setLeftRefresh(prev => prev + 1);
  }, []);

  const handleRightUploadComplete = useCallback((): void => {
    setRightRefresh(prev => prev + 1);
  }, []);

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
            onUploadComplete={handleLeftUploadComplete}
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
            onUploadComplete={handleRightUploadComplete}
          />
        </div>

        <div className="side">
          <h2>Right Side Files</h2>
          <FileList folderName="right" refreshTrigger={rightRefresh}/>
        </div>
      </div>
    </div>
  );
};

export default TwoSidesUploader;
