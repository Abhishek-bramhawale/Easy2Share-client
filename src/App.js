import React, { useState, useRef } from 'react';
import axios from 'axios';
import QRCode from 'react-qr-code';
import logo from './newogo2.png';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [files, setFiles] = useState([]);
  const [uploadedFilesInfo, setUploadedFilesInfo] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [uploadButtonText, setUploadButtonText] = useState('Upload');
  const statusTimerRef = useRef(null);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setError('');
  };

  const startStatusUpdates = () => {
    const statuses = ['Uploading...', 'Processing...', 'Generating Codes...', 'Almost done...'];
    let statusIndex = 0;

    const updateText = () => {
      setUploadButtonText(statuses[statusIndex % statuses.length]);
      statusIndex++;
    };

    updateText();

    statusTimerRef.current = setInterval(updateText, 2000);
  };

  const stopStatusUpdates = () => {
    if (statusTimerRef.current) {
      clearInterval(statusTimerRef.current);
      statusTimerRef.current = null;
    }
  };

  const handleUploadFiles = async () => {
    if (files.length === 0) {
      setError('Please select files first');
      return;
    }

    setUploading(true);
    startStatusUpdates();
    setError('');
    setUploadedFilesInfo([]);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await axios.post(`${API_URL}/upload`, formData);
      const uploadedFiles = res.data.files;

      stopStatusUpdates();

      let fileInfoDisplayDelay = 500;
      uploadedFiles.forEach((fileInfo, index) => {
        setTimeout(() => {
          setUploadedFilesInfo(prevInfo => [...prevInfo, fileInfo]);
        }, fileInfoDisplayDelay);
        fileInfoDisplayDelay += 2000;
      });

      setTimeout(() => {
         setUploading(false);
         setUploadButtonText('Upload');
      }, fileInfoDisplayDelay + 500);

    } catch (err) {
      console.error('Upload error:', err);
      stopStatusUpdates();
      setError(err.response?.data?.error || 'Error uploading files');
      setUploading(false);
      setUploadButtonText('Upload');
    }
  };

  const downloadWithCode = () => {
    if (inputCode) {
      window.location.href = `${API_URL}/download/${inputCode}`;
    }
  };

  return (
    <div className="app-container">
      <nav className="nav">
        <img src={logo} className="App-logo" alt="logo" />
        <h2>Easy2share</h2>
      </nav>

      <div className="gradient-background">
        <div className="gradient-sphere sphere-1"></div>
        <div className="gradient-sphere sphere-2"></div>
        <div className="gradient-sphere sphere-3"></div>
        <div className="grid-overlay"></div>
        <div className="noise-overlay"></div>
      </div>

      <div className="content-wrapper">
        <div className="content-container">
          <h1 className="tagline">Instant share. Anytime, anywhere</h1>

          <div className="sections-container">
            <div className="section upload-section">
              <h2 className="section-title">Upload Files</h2>
              <div className="fileinput-container">
                <input className="fileinput" type="file" multiple onChange={handleFileChange} />
              </div>
              <button className="btn" onClick={handleUploadFiles} disabled={uploading || files.length === 0}>
                {uploadButtonText}
              </button>
              {error && <p style={{ color: 'red' }}>{error}</p>}

              {uploadedFilesInfo.length > 0 && (
              <div className="uploaded-files-section">
                <h3 style={{marginBottom:10}}>Uploaded Files:</h3>
                {uploadedFilesInfo.map((fileInfo, index) => (
                  <div key={index} style={{ marginBottom: 20, border: '1px solid #ccc', padding: 10 }}>
                    <p><strong>File:</strong> {fileInfo.originalName}</p>
                    <p><strong>Code:</strong> {fileInfo.code}</p>
                    <p><strong>Link:</strong> <a href={fileInfo.fileDownloadUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{fileInfo.fileDownloadUrl}</a></p>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
    <QRCode value={fileInfo.fileDownloadUrl} size={100} />
  </div>

                  </div>
                ))}
              </div>
            )}
            </div>

            <div className="section download-section">
              <h2 className="section-title">Download Files</h2>
              <div className="fileinput-container">
                <input className="fileinput" type="text" placeholder="Enter file code" value={inputCode} onChange={e => setInputCode(e.target.value)} />
              </div>
              <button className="btn" onClick={downloadWithCode} disabled={!inputCode}>Download</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
