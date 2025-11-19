import React, { useState, useRef, useCallback } from 'react';
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
  const [downloadStatus, setDownloadStatus] = useState('');
  const [showMultiDownloadInstruction, setShowMultiDownloadInstruction] = useState(false);
  const [showColdStartMessage, setShowColdStartMessage] = useState(false);
  const coldStartTimerRef = useRef(null);

  // Add useEffect to handle code from URL
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setInputCode(code);
      downloadWithCode(code);
    }
  }, []);

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
    
    setShowMultiDownloadInstruction(selectedFiles.length > 1);

    const total = selectedFiles.reduce((acc, file) => acc + file.size, 0);
    setTotalSize(total);
  };

  const startStatusUpdates = () => {
    const statuses = ['Initializing...', 'Uploading...', 'Processing...', 'Finalizing...', 'Almost done...'];
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
    if (coldStartTimerRef.current) {
        clearTimeout(coldStartTimerRef.current);
        coldStartTimerRef.current = null;
    }
    setShowColdStartMessage(false);
  };

  const handleUploadFiles = useCallback(async () => {
    if (files.length === 0) {
      setError('Please select files first');
      return;
    }

    setUploading(true);
    setUploadedFilesInfo([]);
    startStatusUpdates();
    setError('');
    setUploadProgress(0);
    setUploadSpeed(0);
    setUploadedSize(0);
    lastLoadedRef.current = 0;
    lastTimeRef.current = Date.now();
    setShowColdStartMessage(true); // Show message at the start of upload

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
      
      console.log('Full upload response:', res);
      console.log('Upload response data:', res.data);
      const uploadedFiles = res.data.files;
      stopStatusUpdates();

      if (uploadedFiles && uploadedFiles.length > 0) {
        const batchInfo = uploadedFiles[0];
        console.log('Setting batch file info:', batchInfo);
        console.log('Batch info details:', JSON.stringify(batchInfo, null, 2));
        setUploadedFilesInfo([batchInfo]);
      }

      setTimeout(() => {
        setUploading(false);
        setUploadButtonText('Upload');
        setUploadProgress(0);
        setUploadSpeed(0);
        setUploadedSize(0);
        setShowColdStartMessage(false); // Hide message when upload is complete
      }, 2500);

    } catch (err) {
      console.error('Upload error:', err);
      stopStatusUpdates();
      setError(err.response?.data?.error || 'Server down!!');
      setUploading(false);
      setUploadButtonText('Upload');
      setUploadProgress(0);
      setUploadSpeed(0);
      setUploadedSize(0);
    }
  }, [files]);

  React.useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && files.length > 0 && !uploading) {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.type === 'text' || activeElement.type === 'file')) {
          if (activeElement.type === 'file') {
            e.preventDefault();
            e.stopPropagation();
          }
          return;
        }
        e.preventDefault();
        handleUploadFiles();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [files, uploading, handleUploadFiles]);

  const downloadWithCode = async (code) => {
    if (code) {
      try {
        setDownloadStatus('Fetching files...');
        console.log('Requesting download for code:', code);
        const response = await axios.get(`${API_URL}/download/${code}`);
        console.log('Download response:', response.data);
        
        if (response.data.success) {
          const fileGroup = response.data;
          console.log('File group:', fileGroup);
          if (fileGroup.files && fileGroup.files.length > 0) {
            setDownloadStatus(`Opening ${fileGroup.files.length} file(s)...`);
            
            fileGroup.files.forEach(file => {
              console.log('Creating download link for file:', file);
              const downloadUrl = `${API_URL}/download/${code}?file=${file.filename}`;
              const link = document.createElement('a');
              link.href = downloadUrl;
              link.target = '_blank';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            });
            
            setDownloadStatus('Downloads initiated. Check your browser tabs/downloads.');
            setTimeout(() => setDownloadStatus(''), 5000);
          } else {
            console.log('No files found in response');
            setError('No files found for this code');
            setDownloadStatus('');
          }
        } else {
          console.log('Response not successful:', response.data);
          setError('No files found for this code');
          setDownloadStatus('');
        }
      } catch (error) {
        console.error('Download error:', error);
        if (error.response && error.response.status === 404) {
          setError('Invalid code or files not found');
        } else {
          setError('Error downloading file. Please try again.');
        }
        setDownloadStatus('');
      }
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
                <input 
                  className="fileinput" 
                  type="file" 
                  multiple 
                  onChange={handleFileChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && files.length > 0 && !uploading) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUploadFiles();
                    }
                  }}
                />
              </div>
              <button className="btn" onClick={handleUploadFiles} disabled={uploading || files.length === 0}>
                {uploadButtonText}
              </button>
              {error && <p style={{ color: 'red' }}>{error}</p>}

              {uploading && (
                <div className="progress-container" title="If the progress is stuck at 0%, it may be because Render's free plan puts the server to sleep after 15 minutes of inactivity. Just wait a few seconds..">
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

              {/* Cold Start Message */}
              {showColdStartMessage && (
                <p style={{ color: 'yellow', marginTop: '10px', fontSize: '14px', textAlign: 'center' }}>
                  {/* If the progress is stuck at 0%, it may be because Render's free plan puts the server to sleep after 15 minutes of inactivity. Just wait a few seconds.. */}
                </p>
              )}

              {uploadedFilesInfo.length > 0 && uploadedFilesInfo[0] && uploadedFilesInfo[0].files && (
                <div className="uploaded-files-section">
                  <h3 style={{marginBottom:10}}>Uploaded Files:</h3>
                  
                  {showMultiDownloadInstruction && (
                    <p style={{ color: 'orange', marginTop: '10px', marginBottom: '10px', fontSize: '14px' }}>
                      You have uploaded multiple files. When you use the download code/link, your browser may block multiple downloads as pop-ups. Please allow pop-ups for this site if prompted.
                    </p>
                  )}
                  <div style={{ marginBottom: 20, border: '1px solid #ccc', padding: 10 }}>
                    <div style={{ marginBottom: '15px' }}>
                      {uploadedFilesInfo[0].files.map((fileName, index) => (
                        <p key={index}><strong>File {index + 1}:</strong> {fileName}</p>
                      ))}
                    </div>
                    <p><strong>Code:</strong> {uploadedFilesInfo[0].code} 
                      <span className="info-icon" title={`Go to ${CLIENT_URL} and enter this code`} onClick={() => copyToClipboard(uploadedFilesInfo[0].code)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                      </span>
                      {copySuccess === 'Copied!' && <span className="copy-success">Copied!</span>}
                    </p>
                    <p><strong>Link:</strong> <button 
                      onClick={() => {
                        downloadWithCode(uploadedFilesInfo[0].code);
                      }} 
                      style={{ color: 'inherit', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
                    >
                      {`${API_URL}/download/${uploadedFilesInfo[0].code}`}
                    </button>
                      <span className="info-icon" title="Click to download the file" onClick={() => copyToClipboard(`${API_URL}/download/${uploadedFilesInfo[0].code}`)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                      </span>
                    </p>
                    <div className="qr-container">
                      <img className="scan" src={scanme} alt="Scan me" />
                      <div className="qr-code" style={{ 
                        backgroundColor: 'white', 
                        padding: '10px',
                        borderRadius: '8px',
                        boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)'
                      }}>
                        <QRCode value={`${API_URL}/download/${uploadedFilesInfo[0].code}`} size={100} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="section download-section">
              <h2 className="section-title">Download Files</h2>
              <div className="fileinput-container">
                <input 
                  className="fileinput" 
                  type="text" 
                  placeholder="Enter file code" 
                  value={inputCode} 
                  onChange={e => setInputCode(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && inputCode.trim() !== '') {
                      e.preventDefault();
                      downloadWithCode(inputCode);
                    }
                  }}
                />
              </div>
              <button className="btn" onClick={() => downloadWithCode(inputCode)} disabled={!inputCode}>Download</button>
              {downloadStatus && <p style={{ color: 'blue', marginTop: '10px', fontSize: '14px' }}>{downloadStatus}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;