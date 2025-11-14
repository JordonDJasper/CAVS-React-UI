import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import ROSLIB from 'roslib';

// ROS topics
const TOPICS = [
  { name: 'Camera', rosTopic: '/mavs/camera', messageType: 'sensor_msgs/msg/Image' },
  { name: 'Lidar', rosTopic: '/mavs/lidar', messageType: 'sensor_msgs/msg/PointCloud2' },
  { name: 'GPS', rosTopic: '/mavs/gps_fix', messageType: 'sensor_msgs/msg/NavSatFix' },
  { name: 'Radar', rosTopic: '/mavs/radar', messageType: 'radar_msgs/msg/RadarScan' },
  { name: 'Imu', rosTopic: '/mavs/imu', messageType: 'sensor_msgs/msg/Imu' },
];

export default function FocusCamera() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [battery] = useState(67);

  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraContainerRef = useRef<HTMLDivElement | null>(null);

  const [topicStatus, setTopicStatus] = useState<Record<string, boolean>>(
    TOPICS.reduce((acc, t) => ({ ...acc, [t.name]: false }), {} as Record<string, boolean>)
  );

  const lastMessageTime = useRef<Record<string, number>>(
    TOPICS.reduce((acc, t) => ({ ...acc, [t.name]: 0 }), {} as Record<string, number>)
  );
  const lastMessageData = useRef<Record<string, any>>(
    TOPICS.reduce((acc, t) => ({ ...acc, [t.name]: {} }), {} as Record<string, any>)
  );

  // Clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString());
      setDate(now.toLocaleDateString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ROS connection
  useEffect(() => {
    const ros: any = new ROSLIB.Ros({ url: 'ws://localhost:9090' });

    ros.on('connection', () => {
      console.log('✅ Connected to ROSBridge');

      TOPICS.forEach(({ name, rosTopic, messageType }) => {
        const topic = new ROSLIB.Topic({ ros, name: rosTopic, messageType });

        topic.subscribe((msg: any) => {
          lastMessageTime.current[name] = Date.now();
          lastMessageData.current[name] = msg;
          setTopicStatus((prev) => ({ ...prev, [name]: true }));

          // Camera display (base64 decoding)
          if (name === 'Camera' && msg.data && cameraCanvasRef.current && cameraContainerRef.current) {
            const canvas = cameraCanvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Resize canvas to container
            const container = cameraContainerRef.current;
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;

            const { width, height, data } = msg;
            const binaryStr = atob(data); // decode base64 to binary
            const bytes = new Uint8ClampedArray(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

            const imageData = ctx.createImageData(width, height);
            for (let i = 0, j = 0; i < bytes.length; i += 3, j += 4) {
              imageData.data[j] = bytes[i];       // R
              imageData.data[j + 1] = bytes[i + 1]; // G
              imageData.data[j + 2] = bytes[i + 2]; // B
              imageData.data[j + 3] = 255;          // Alpha
            }

            // Draw the image scaled to container
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            tempCanvas.getContext('2d')?.putImageData(imageData, 0, 0);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
          }
        });
      });
    });

    ros.on('error', (err: any) => console.error('❌ ROSBridge error:', err));
    ros.on('close', () => console.log('⚠️ ROSBridge connection closed'));

    // Topic timeout check
    const checkInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 10000;
      const updatedStatus: Record<string, boolean> = {};
      TOPICS.forEach(({ name }) => {
        updatedStatus[name] = now - lastMessageTime.current[name] <= timeout;
      });
      setTopicStatus(updatedStatus);
    }, 1000);

    return () => {
      ros.close();
      clearInterval(checkInterval);
    };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.mainContent}>
        {/* Left Panel */}
        <div style={styles.leftPanel}>
          {/* System Status */}
          <div style={{ ...styles.systemStatusBox, height: '40vh' }}>
            <div style={styles.systemStatusTitle}>System Status</div>
            {TOPICS.map(({ name }) => (
              <div key={name} style={styles.statusRow}>
                <span style={{ ...styles.statusDot, backgroundColor: topicStatus[name] ? '#0f0' : '#f00' }} />
                <span style={styles.statusLabel}>{name}</span>
              </div>
            ))}
          </div>

          {/* System Detail */}
          <div style={{ ...styles.systemStatusBox, height: '44vh', overflowY: 'hidden' }}>
            <div style={styles.systemStatusTitle}>System Detail</div>
            {TOPICS.filter((t) => t.name !== 'Camera').map(({ name }) => {
              const msg = lastMessageData.current[name];
              const lastUpdate = lastMessageTime.current[name];
              const timeAgo = lastUpdate ? ((Date.now() - lastUpdate) / 1000).toFixed(1) + 's ago' : 'N/A';

              return (
                <div key={name} style={{ marginBottom: '1rem', width: '90%' }}>
                  <div style={{ fontWeight: 'bold', color: '#0af', fontSize: '1.0rem' }}>{name}</div>
                  <div style={{ fontSize: '0.5rem', color: '#fff' }}>Last Update: {timeAgo}</div>
                  <div style={{ fontSize: '0.65rem', color: '#fff', whiteSpace: 'pre-wrap' }}>
                    {msg
                      ? name === 'GPS'
                        ? <>
                            <div>Latitude: {msg.latitude}</div>
                            <div>Longitude: {msg.longitude}</div>
                            <div>Altitude: {msg.altitude}</div>
                          </>
                        : name === 'Lidar'
                        ? <>
                            <div>Total Points: {msg.width * msg.height}</div>
                            <div>Point Step: {msg.point_step} bytes</div>
                            <div>Row Step: {msg.row_step} bytes</div>
                          </>
                        : name === 'Radar'
                        ? msg.returns && msg.returns.length > 0
                          ? <>
                              <div>Range: {msg.returns[0].range}</div>
                              <div>Azimuth: {msg.returns[0].azimuth}</div>
                              <div>Elevation: {msg.returns[0].elevation}</div>
                              <div>Doppler Velocity: {msg.returns[0].doppler_velocity}</div>
                              <div>Amplitude: {msg.returns[0].amplitude}</div>
                            </>
                          : <div>No Returns</div>
                        : name === 'Imu'
                        ? <>
                            <div>Orientation X: {msg.orientation?.x}</div>
                            <div>Orientation Y: {msg.orientation?.y}</div>
                            <div>Orientation Z: {msg.orientation?.z}</div>
                            <div>Orientation W: {msg.orientation?.w}</div>
                          </>
                        : 'No Data'
                      : 'No Data'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div style={styles.rightPanel}>
          {/* Hotbar */}
          <div style={styles.hotbar}>
            <div style={styles.hotbarCenter}>
              <span style={styles.date}>{date}</span>
              <span style={styles.time}>{time}</span>
            </div>
            <div style={styles.battery}>
              <div style={styles.batteryIcon}>
                <div style={{ ...styles.batteryLevel, width: `${battery}%`, backgroundColor: battery > 20 ? '#0f0' : '#f00' }} />
              </div>
              <span style={styles.batteryText}>{battery}%</span>
            </div>
          </div>

          {/* Camera Viewer */}
          <div ref={cameraContainerRef} style={styles.cameraContainer}>
            <canvas ref={cameraCanvasRef} style={{ width: '100%', height: '100%', borderRadius: '12px' }} />
          </div>
        </div>
      </div>

      {/* Bottom Rectangles */}
      <div style={styles.bottomRectangles}>
        <Link to="/" style={{ textDecoration: 'none', width: '26.25%' }}>
          <div style={{ ...styles.bottomRectangle, background: 'linear-gradient(to bottom, #A22D44 0%, #000 100%)', color: '#fff' }}>Level - Pilot</div>
        </Link>
        <Link to="/focus-camera" style={{ textDecoration: 'none', width: '26.25%' }}>
          <div style={{ ...styles.bottomRectangle, backgroundColor: '#3D3D3D', color: '#fff' }}>Focus 1: Camera</div>
        </Link>
        <Link to="/focus-map-data" style={{ textDecoration: 'none', width: '26.25%' }}>
          <div style={{ ...styles.bottomRectangle, backgroundColor: '#EBEBEB', color: '#000' }}>Focus 2: Map Data</div>
        </Link>
        <Link to="/focus-telemetry" style={{ textDecoration: 'none', width: '26.25%' }}>
          <div style={{ ...styles.bottomRectangle, backgroundColor: '#EBEBEB', color: '#000' }}>Focus 3: Telemetry</div>
        </Link>
      </div>
    </div>
  );
}

// --- Styles ---
const styles: { [k: string]: React.CSSProperties } = {
  container: { flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100vh', backgroundColor: '#000', color: '#fff', overflow: 'hidden', padding: '1rem', boxSizing: 'border-box', justifyContent: 'space-between' },
  mainContent: { display: 'flex', width: '100%', gap: '1rem', alignItems: 'flex-start', justifyContent: 'center' },
  leftPanel: { display: 'flex', flexDirection: 'column', width: '25%', alignItems: 'center', gap: '0.5rem' },
  rightPanel: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1, gap: '0.5rem' },
  systemStatusBox: { width: '100%', backgroundColor: '#000', border: '1px solid #fff', borderRadius: '8px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem', boxSizing: 'border-box' },
  systemStatusTitle: { color: '#fff', fontWeight: 500, fontSize: '2rem', marginBottom: '0.5rem' },
  statusRow: { display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1rem', width: '90%' },
  statusDot: { width: '30px', height: '30px', borderRadius: '50%' },
  statusLabel: { fontSize: '2.4rem', color: '#fff' },
  hotbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#EBEBEB', width: '95%', height: '50px', borderRadius: '20px', padding: '0 1rem' },
  hotbarCenter: { flexGrow: 1, textAlign: 'center', fontSize: '1.1rem', color: '#000' },
  date: { marginRight: '1rem', color: '#000' },
  time: { fontWeight: 500, color: '#000' },
  battery: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  batteryIcon: { width: '40px', height: '18px', border: '2px solid #888', borderRadius: '3px' },
  batteryLevel: { height: '100%', borderRadius: '1px' },
  batteryText: { fontSize: '0.9rem', color: '#000', fontWeight: 500 },
  cameraContainer: { width: '95%', height: '77vh', border: '2px solid #888', borderRadius: '12px', marginTop: '0.5rem', marginBottom: '0.5rem', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(255,255,255,0.05)' },
  bottomRectangles: { display: 'flex', justifyContent: 'space-between', width: '100%', gap: '0.5%', marginTop: '0.5rem' },
  bottomRectangle: { width: '100%', height: '10vh', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' },
};

