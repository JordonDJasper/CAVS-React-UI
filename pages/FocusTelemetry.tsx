import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ROSLIB from 'roslib';

// ROS topics and message types
const TOPICS = [
  { name: 'Camera', rosTopic: '/mavs/camera', messageType: 'sensor_msgs/Image' },
  { name: 'Lidar', rosTopic: '/mavs/lidar', messageType: 'sensor_msgs/PointCloud2' },
  { name: 'GPS', rosTopic: '/mavs/gps_fix', messageType: 'sensor_msgs/NavSatFix' },
  { name: 'Radar', rosTopic: '/mavs/radar', messageType: 'radar_msgs/RadarScan' },
  { name: 'Imu', rosTopic: '/mavs/imu', messageType: 'sensor_msgs/Imu' },
];

export default function FocusCamera() {
  const [time, setTime] = useState<string>(new Date().toLocaleTimeString());
  const [date, setDate] = useState<string>(new Date().toLocaleDateString());
  const [battery] = useState<number>(67);

  const [topicStatus, setTopicStatus] = useState<Record<string, boolean>>(
    TOPICS.reduce((acc, t) => ({ ...acc, [t.name]: false }), {})
  );

  const lastMessageTime = React.useRef<Record<string, number>>(
    TOPICS.reduce((acc, t) => ({ ...acc, [t.name]: 0 }), {})
  );

  const lastMessageData = React.useRef<Record<string, any>>(
    TOPICS.reduce((acc, t) => ({ ...acc, [t.name]: {} }), {})
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
      console.log('Connected to ROSBridge');

      TOPICS.forEach(({ name, rosTopic, messageType }) => {
        const topic: any = new ROSLIB.Topic({ ros, name: rosTopic, messageType });

        topic.subscribe((msg: any) => {
          lastMessageTime.current[name] = Date.now();
          lastMessageData.current[name] = msg;
          setTopicStatus((prev) => ({ ...prev, [name]: true }));
        });
      });
    });

    ros.on('error', (err: any) => console.error('ROSBridge error:', err));
    ros.on('close', () => console.log('ROSBridge connection closed'));

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 10000; // 10 seconds
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '25%', alignItems: 'center' }}>
          
          {/* System Status */}
          <div style={{ ...styles.systemStatusBox, height: '40vh' }}>
            <div style={styles.systemStatusTitle}>System Status</div>
            {TOPICS.map(({ name }) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start', 
                  width: '90%',
                  marginBottom: '1rem',
                  gap: '0.7rem',
                }}
              >
                <span
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: topicStatus[name] ? '#0f0' : '#f00',
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: '2.4rem', color: '#fff' }}>{name}</span>
              </div>
            ))}
          </div>

          {/* System Detail */}
          <div style={{ 
            ...styles.systemStatusBox, 
            height: '44vh', 
            backgroundColor: '#000', 
            justifyContent: 'flex-start', 
            paddingTop: '1rem',
            overflowY: 'auto',
          }}>
            <div style={styles.systemStatusTitle}>System Detail</div>
            {TOPICS.filter(t => t.name !== 'Camera').map(({ name }) => {
              const msg = lastMessageData.current[name];
              const lastUpdate = lastMessageTime.current[name];
              const timeAgo = lastUpdate ? ((Date.now() - lastUpdate)/1000).toFixed(1) + 's ago' : 'N/A';

              return (
                <div key={name} style={{ marginBottom: '1rem', width: '90%' }}>
                  <div style={{ fontWeight: 'bold', color: '#0af', fontSize: '1rem' }}>{name}</div>
                  <div style={{ fontSize: '0.5rem', color: '#fff' }}>Last Update: {timeAgo}</div>
                  <div style={{ fontSize: '0.65rem', color: '#fff', whiteSpace: 'pre-wrap' }}>
                    {msg ? (
                      name === 'GPS' ? (
                        <>
                          <div>Latitude: {msg.latitude}</div>
                          <div>Longitude: {msg.longitude}</div>
                          <div>Altitude: {msg.altitude}</div>
                        </>
                      ) : name === 'Lidar' ? (
                        <>
                          <div>Total Points: {msg.width * msg.height}</div>
                          <div>Point Step: {msg.point_step} bytes</div>
                          <div>Row Step: {msg.row_step} bytes</div>
                        </>
                      ) : name === 'Radar' ? (
                        msg.returns && msg.returns.length > 0 ? (
                          <>
                            <div>Range: {msg.returns[0].range.toFixed(2)}</div>
                            <div>Azimuth: {msg.returns[0].azimuth.toFixed(2)}</div>
                            <div>Elevation: {msg.returns[0].elevation.toFixed(2)}</div>
                            <div>Doppler Velocity: {msg.returns[0].doppler_velocity.toFixed(2)}</div>
                            <div>Amplitude: {msg.returns[0].amplitude.toFixed(2)}</div>
                          </>
                        ) : (
                          <div>No Returns</div>
                        )
                      ) : name === 'Imu' ? (
                        <>
                          <div>Orientation X: {msg.orientation?.x.toFixed(2)}</div>
                          <div>Orientation Y: {msg.orientation?.y.toFixed(2)}</div>
                          <div>Orientation Z: {msg.orientation?.z.toFixed(2)}</div>
                          <div>Orientation W: {msg.orientation?.w.toFixed(2)}</div>
                        </>
                      ) : (
                        JSON.stringify(msg, null, 2)
                      )
                    ) : (
                      'No Data'
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hotbar */}
        <div style={styles.hotbar}>
          <div style={styles.hotbarCenter}>
            <span style={styles.date}>{date}</span>
            <span style={styles.time}>{time}</span>
          </div>
          <div style={styles.battery}>
            <div style={styles.batteryIcon}>
              <div
                style={{
                  ...styles.batteryLevel,
                  width: `${battery}%`,
                  backgroundColor: battery > 20 ? '#0f0' : '#f00',
                }}
              />
            </div>
            <span style={styles.batteryText}>{battery}%</span>
          </div>
        </div>
      </div>

      {/* Bottom 4 Rectangles with Text */}
      <div style={styles.bottomRectangles}>
        <Link to="/" style={{ textDecoration: 'none', width: '26.25%' }}>
          <div style={{ ...styles.bottomRectangle, background: 'linear-gradient(to bottom, #A22D44 0%, #000000 100%)', color: '#FFFFFF', fontWeight: 'bold' }}>
            Level - Pilot
          </div>
        </Link>
        <Link to="/focus-camera" style={{ textDecoration: 'none', width: '26.25%' }}>          
          <div style={{ ...styles.bottomRectangle, backgroundColor: '#EBEBEB', color: '#000000' }}>            
            Focus 1: Camera          
          </div>        
        </Link>        
        <Link to="/focus-map-data" style={{ textDecoration: 'none', width: '26.25%' }}>          
          <div style={{ ...styles.bottomRectangle, backgroundColor: '#EBEBEB', color: '#000000' }}>           
            Focus 2: Map Data         
          </div>        
        </Link>       
        <Link to="/focus-telemetry" style={{ textDecoration: 'none', width: '26.25%' }}>
          <div style={{ ...styles.bottomRectangle, backgroundColor: '#3D3D3D', color: '#FFFFFF' }}>
            Focus 3: Telemetry
          </div>
        </Link>
      </div>
    </div>
  );
}

const styles: { [k: string]: React.CSSProperties } = {
  container: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#000',
    color: '#fff',
    overflow: 'hidden',
    padding: '1rem',
    boxSizing: 'border-box',
    justifyContent: 'space-between',
  },
  mainContent: {
    display: 'flex',
    width: '100%',
    gap: '1rem',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  systemStatusBox: {
    width: '100%',
    backgroundColor: '#000',
    border: '1px solid #fff',
    borderRadius: '8px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
    padding: '0.5rem',
  },
  systemStatusTitle: {
    color: '#fff',
    fontWeight: 500,
    fontSize: '2rem',
    marginBottom: '0.5rem',
    alignSelf: 'center',
  },
  hotbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EBEBEB',
    width: '75%',
    height: '50px',
    borderBottom: '1px solid #222',
    borderRadius: '20px',
    padding: '0 1rem',
    boxSizing: 'border-box',
  },
  hotbarCenter: {
    flexGrow: 1,
    textAlign: 'center',
    fontSize: '1.1rem',
    color: '#000',
  },
  date: { marginRight: '1rem', color: '#000' },
  time: { fontWeight: 500, color: '#000' },
  battery: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  batteryIcon: { width: '40px', height: '18px', border: '2px solid #888', borderRadius: '3px', position: 'relative', boxSizing: 'border-box' },
  batteryLevel: { height: '100%', borderRadius: '1px' },
  batteryText: { fontSize: '0.9rem', color: '#000', fontWeight: 500, WebkitTextStroke: '1px #000' },
  bottomRectangles: { display: 'flex', justifyContent: 'space-between', width: '100%', gap: '0.5%', marginTop: '1rem' },
  bottomRectangle: { width: '100%', height: '10vh', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '1.5rem' },
};

