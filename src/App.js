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
  const [downloadStatus, setDownloadStatus] = useState('');
  const [showMultiDownloadInstruction, setShowMultiDownloadInstruction] = useState(false);
  const [showColdStartMessage, setShowColdStartMessage] = useState(false);
  const coldStartTimerRef = useRef(null);

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
    
    // Show instruction if multiple files are selected
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
    // Clear cold start timer and hide message when upload stops
    if (coldStartTimerRef.current) {
        clearTimeout(coldStartTimerRef.current);
        coldStartTimerRef.current = null;
    }
    setShowColdStartMessage(false);
  };

  const handleUploadFiles = async () => {
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
    setShowColdStartMessage(false); // Hide message at the start of upload

    // Set a timer to show cold start message if progress is stuck at 0
    coldStartTimerRef.current = setTimeout(() => {
        if (uploadProgress === 0 && uploading) { // Check against the state value at the time the timer fires
            setShowColdStartMessage(true);
        }
    }, 3000); // 3 seconds delay

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await axios.post(`${API_URL}/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          // Clear cold start timer if progress starts
          if (progressEvent.loaded > 0 && coldStartTimerRef.current) {
              clearTimeout(coldStartTimerRef.current);
              coldStartTimerRef.current = null;
              setShowColdStartMessage(false); // Hide message once progress is made
          }

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
      }, 2500);

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

  const downloadWithCode = async () => {
    if (inputCode) {
      try {
        setDownloadStatus('Fetching files...');
        console.log('Fetching files for code:', inputCode);
        const response = await axios.get(`${API_URL}/download/${inputCode}`);
        console.log('Full download response:', response);
        console.log('Download response data:', response.data);
        
        if (response.data.success) {
          const files = response.data.files;
          console.log('Files array from response:', files);
          console.log('Number of files to download:', files.length);
          setDownloadStatus(`Initiating ${files.length} downloads...`);
          
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log(`Opening download URL for file ${i + 1}:`, file.name, file.url);
            
            
            const link = document.createElement('a');
            link.href = file.url;
            link.download = file.name; // Suggests a filename for download
            link.target = '_blank'; 
            
            // Append the link to the body temporarily and then open it
            document.body.appendChild(link);
            window.open(link.href, '_blank');
            document.body.removeChild(link);
            
            
            if (i < files.length - 1) {
               console.log('Adding delay before opening next download...');
              await new Promise(resolve => setTimeout(resolve, 500)); 
            }
          }
          
          setDownloadStatus('Download initiated for all files. Check your browser tabs/downloads.');
          console.log('All download windows/tabs initiated.');
          setTimeout(() => setDownloadStatus(''), 5000); 
        } else {
          console.error('Download failed - response success is false:', response.data);
          setError(response.data.error || 'Failed to fetch file information for download. Please try again.');
          setDownloadStatus('');
        }
      } catch (error) {
        console.error('Download error in catch block:', error);
        setError('Error initiating download process. Please try again.');
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
                <input className="fileinput" type="file" multiple onChange={handleFileChange} />
              </div>
              <button className="btn" onClick={handleUploadFiles} disabled={uploading || files.length === 0}>
                {uploadButtonText}
              </button>
              {error && <p style={{ color: 'red' }}>{error}</p>}

              {/* Cold Start Message */}
              {showColdStartMessage && (
                <p style={{ color: 'yellow', marginTop: '10px', fontSize: '14px', textAlign: 'center' }}>
                  Render's free plan causes cold starts after inactivity — please wait just 5 seconds..
                </p>
              )}

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
                    <p><strong>Link:</strong> <a href={uploadedFilesInfo[0].fileDownloadUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{uploadedFilesInfo[0].fileDownloadUrl}</a>
                      <span className="info-icon" title="Go to any browser and enter this URL" onClick={() => copyToClipboard(uploadedFilesInfo[0].fileDownloadUrl)}>
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
                        <QRCode value={uploadedFilesInfo[0].fileDownloadUrl} size={100} />
                      </div>
                    </div>
                  </div>
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