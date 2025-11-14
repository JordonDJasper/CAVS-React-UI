import { useState, useEffect } from 'react';
import msuLogo from './msu-logo.png';
import cavsLogo from './HORIZONTAL_PRINT_white.jpg';
import mrzrBgr from './vehicle_sys_mrzr.jpg';
import huskyBgr from './vehicle_sys_husky.jpg'; 
import mtxBgr from './vehicle_sys_mtx-c.jpg';
import wthBgr from './vehicle_sys_warthog.jpg';
import { Routes, Route, useNavigate } from 'react-router-dom';

import Control from './focuses/Control';
import FocusCamera from './focuses/FocusCamera';
import FocusMapData from './focuses/FocusMapData';
import FocusTelemetry from './focuses/FocusTelemetry';

const backgrounds = [mrzrBgr, huskyBgr, mtxBgr, wthBgr];

function Welcome() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [fade, setFade] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % backgrounds.length);
        setNextIndex((prev) => (prev + 1) % backgrounds.length);
        setFade(false);
      }, 2000);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        margin: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        textAlign: "center",
        padding: "20px",
        overflow: "hidden",
      }}
    >
      {/* current background */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: `url(${backgrounds[currentIndex]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 1,
          transition: "opacity 1s ease-in-out",
          zIndex: -2,
        }}
      />

      {/* next background */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: `url(${backgrounds[nextIndex]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: fade ? 1 : 0,
          transition: "opacity 1s ease-in-out",
          zIndex: -1,
        }}
      />

      {/* content */}
      <img
        src={cavsLogo}
        alt="CAVS Logo"
        style={{ width: 800, height: 150, marginBottom: 24 }}
      />
      <div
        style={{
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '16px',
          padding: '20px 40px',
          maxWidth: '800px',
        }}
      >
        <h1 style={{ fontSize: '5rem', fontWeight: '800', margin: '0 auto 20px' }}>
          Welcome to the CAVS Vehicle Dashboard!
        </h1>
        <p style={{ fontSize: '1.5rem', fontWeight: '800', maxWidth: 600, margin: '0 auto 40px', textAlign: 'center' }}>
          Please select a view to navigate to:
        </p>
      </div>

      {/* navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '50px' }}>
        <button
          onClick={() => navigate('/control')}
          style={buttonStyle}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5D1725')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#370e16ff')}
        >
          Base View
        </button>

        <button
          onClick={() => navigate('/focus-camera')}
          style={buttonStyle}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5D1725')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#370e16ff')}
        >
          Pilot View
        </button>

        <button
          onClick={() => navigate('/focus-map-data')}
          style={buttonStyle}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5D1725')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#370e16ff')}
        >
          Sponsor View
        </button>
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '24px 30px',
  fontSize: '1.25rem',
  fontWeight: '600',
  backgroundColor: '#370e16ff',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease',
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/control" element={<Control />} />
      <Route path="/focus-camera" element={<FocusCamera />} />
      <Route path="/focus-map-data" element={<FocusMapData />} />
      <Route path="/focus-telemetry" element={<FocusTelemetry />} />
    </Routes>
  );
}

export default App;
