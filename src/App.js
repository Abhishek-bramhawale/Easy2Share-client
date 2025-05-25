import logo from './newogo2.png';
// import './App.css';

function App() {
  return (
    <div>
      <nav className="nav">
        <img src={logo} className="App-logo" alt="logo" />
        <h1>Easy2share</h1>
      </nav>
      <div>
        <div className="gradient-background">
          <div className="gradient-sphere sphere-1"></div>
          <div className="gradient-sphere sphere-2"></div>
          <div className="gradient-sphere sphere-3"></div>
          <div className="grid-overlay"></div>
          <div className="noise-overlay"></div>
        </div>

        <div className="content-container">
          <p className="tagline">Instant share. Anytime, anywhere</p>
          <h2 className="tagline">Upload Files</h2>
          <div className="fileinput-container">
            <input className="fileinput" type="file" />
            
          </div>
        </div>
        <button  className="btn" >Upload</button>
      </div>
    </div>
  );
}

export default App;
