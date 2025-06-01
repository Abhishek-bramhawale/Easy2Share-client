import React, { useState, useRef } from 'react';
import axios from 'axios';
import QRCode from 'react-qr-code';
import logo from './newogo2.png';
import scanme from './scanme.png';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const CLIENT_URL = 'https://easy2-share-client.vercel.app/';

function App() {
  const [files, setFiles] = useState([]);
  const [uploadedFilesInfo, setUploadedFilesInfo] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [uploadButtonText, setUploadButtonText] = useState('Upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [uploadedSize, setUploadedSize] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const lastLoadedRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const statusTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const [copySuccess, setCopySuccess] = useState('');

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond) => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setError('');
    setUploadProgress(0);
    setUploadSpeed(0);
    setUploadedSize(0);
    
    const total = selectedFiles.reduce((acc, file) => acc + file.size, 0);
    setTotalSize(total);
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
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
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
    setUploadProgress(0);
    setUploadSpeed(0);
    setUploadedSize(0);
    lastLoadedRef.current = 0;
    lastTimeRef.current = Date.now();

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await axios.post(`${API_URL}/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          const currentTime = Date.now();
          const timeDiff = (currentTime - lastTimeRef.current) / 1000; // Convert to seconds
          const loadedDiff = progressEvent.loaded - lastLoadedRef.current;
          
          const speed = timeDiff > 0 ? loadedDiff / timeDiff : 0;
          
          setUploadSpeed(speed);
          setUploadedSize(progressEvent.loaded);
          setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          
          lastLoadedRef.current = progressEvent.loaded;
          lastTimeRef.current = currentTime;
        }
      });
      
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
        setUploadProgress(0);
        setUploadSpeed(0);
        setUploadedSize(0);
      }, fileInfoDisplayDelay + 500);

    } catch (err) {
      console.error('Upload error:', err);
      stopStatusUpdates();
      setError(err.response?.data?.error || 'Error uploading files');
      setUploading(false);
      setUploadButtonText('Upload');
      setUploadProgress(0);
      setUploadSpeed(0);
      setUploadedSize(0);
    }
  };

  const downloadWithCode = () => {
    if (inputCode) {
      window.location.href = `${API_URL}/download/${inputCode}`;
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="app-container">
      <nav className="nav">
        <img src={logo} className="App-logo" alt="logo" />
        <h2>Easy2share</h2>
      </nav>

    

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

              {uploading && (
                <div className="progress-container">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                  <div className="progress-info">
                    <span className="progress-text">{uploadProgress}%</span>
                    <span className="progress-speed">{formatSpeed(uploadSpeed)}</span>
                    <span className="progress-size">
                      {formatBytes(uploadedSize)} / {formatBytes(totalSize)}
                    </span>
                  </div>
                </div>
              )}

              {uploadedFilesInfo.length > 0 && (
                <div className="uploaded-files-section">
                  <h3 style={{marginBottom:10}}>Uploaded Files:</h3>
                  {uploadedFilesInfo.map((fileInfo, index) => (
                    <div key={index} style={{ marginBottom: 20, border: '1px solid #ccc', padding: 10 }}>
                      <p><strong>File:</strong> {fileInfo.originalName}</p>
                      <p><strong>Code:</strong> {fileInfo.code} 
                        <span className="info-icon" title={`Go to ${CLIENT_URL} and enter this code`} onClick={() => copyToClipboard(fileInfo.code)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                          </svg>
                        </span>
                        {copySuccess === 'Copied!' && <span className="copy-success">Copied!</span>}
                      </p>
                      <p><strong>Link:</strong> <a href={fileInfo.fileDownloadUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{fileInfo.fileDownloadUrl}</a>
                        <span className="info-icon" title="Go to any browser and enter this URL" onClick={() => copyToClipboard(fileInfo.fileDownloadUrl)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                          </svg>
                        </span>
                      </p>
                      <div className="qr-container">
                        <img className="scan" src={scanme} alt="Scan me" />
                        <div className="qr-code">
                          <QRCode value={fileInfo.fileDownloadUrl} size={100} />
                        </div>
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
