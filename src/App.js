import logo from './newogo2.png';

function App() {
  return (
    <div>
      <nav className="nav">
        <img src={logo} className="App-logo" alt="logo" />
        <h1>Easy2share</h1>
      </nav>

        <div className="content-container">
          <p className="tagline">Instant share. Anytime, anywhere</p>
          
          <div className="sections-container">
            <div className="section upload-section">
              <h2 className="section-title">Upload Files</h2>
              <div className="fileinput-container">
                <input className="fileinput" type="file" />
              </div>
              <button className="btn">Upload</button>
            </div>

            <div className="section download-section">
              <h2 className="section-title">Download Files</h2>
              <div className="fileinput-container">
                <input className="fileinput" type="text" placeholder="Enter file code" />
              </div>
              <button className="btn">Download</button>
            </div>
          </div>
        </div>
      </div>
  );
}

export default App;
