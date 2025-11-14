import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import ROSLIB from 'roslib';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ROS topics (Lidar now points to downsampled topic)
const TOPICS = [
  { name: 'Camera', rosTopic: '/mavs/camera', messageType: 'sensor_msgs/msg/Image' },
  { name: 'Lidar', rosTopic: '/mavs/lidar_downsampled', messageType: 'sensor_msgs/msg/PointCloud2' },
  { name: 'GPS', rosTopic: '/mavs/gps_fix', messageType: 'sensor_msgs/msg/NavSatFix' },
  { name: 'Radar', rosTopic: '/mavs/radar', messageType: 'radar_msgs/msg/RadarScan' },
  { name: 'Imu', rosTopic: '/mavs/imu', messageType: 'sensor_msgs/msg/Imu' },
];

export default function FocusCamera() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [battery] = useState(67);

  const lidarContainerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<{ scene?: THREE.Scene; camera?: THREE.PerspectiveCamera; renderer?: THREE.WebGLRenderer; controls?: OrbitControls; points?: THREE.Points }>({});

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

          // --- Lidar display ---
          if (name === 'Lidar' && msg && lidarContainerRef.current) {
            let { scene, camera, renderer, controls, points } = sceneRef.current;

            if (!scene) {
              scene = new THREE.Scene();
              scene.background = new THREE.Color(0x111111);

              const width = lidarContainerRef.current.clientWidth;
              const height = lidarContainerRef.current.clientHeight;
              camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
              camera.position.set(0, 0, 75);

              renderer = new THREE.WebGLRenderer({ antialias: true });
              renderer.setSize(width, height);
              lidarContainerRef.current.appendChild(renderer.domElement);

              controls = new OrbitControls(camera, renderer.domElement);
              controls.enableDamping = true;
              controls.dampingFactor = 0.1;

              const light = new THREE.PointLight(0xffffff, 1);
              light.position.set(10, 10, 10);
              scene.add(light);

              sceneRef.current = { scene, camera, renderer, controls };
              const animate = () => {
                requestAnimationFrame(animate);
                controls!.update();
                renderer!.render(scene!, camera!);
              };
              animate();
            }

            // Remove old points
            if (points) {
              scene.remove(points);
              points.geometry.dispose();
              if (Array.isArray(points.material)) points.material.forEach((m) => m.dispose());
              else points.material.dispose();
            }

            // Decode PointCloud2
            const decodePointCloud2 = (msg: any, step = 2) => {
              const { width, height, fields, point_step, row_step, data } = msg;
              if (!data) return [];
              const binaryStr = atob(data);
              const buffer = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) buffer[i] = binaryStr.charCodeAt(i);

              const xField = fields.find((f: any) => f.name === 'x');
              const yField = fields.find((f: any) => f.name === 'y');
              const zField = fields.find((f: any) => f.name === 'z');
              if (!xField || !yField || !zField) return [];

              const pts: { x: number; y: number; z: number }[] = [];
              const readFloatLE = (arr: Uint8Array, offset: number) => new DataView(arr.buffer).getFloat32(offset, true);

              for (let row = 0; row < height; row += step) {
                for (let col = 0; col < width; col += step) {
                  const ptStart = row * row_step + col * point_step;
                  const x = readFloatLE(buffer, ptStart + xField.offset);
                  const y = readFloatLE(buffer, ptStart + yField.offset);
                  const z = readFloatLE(buffer, ptStart + zField.offset);
                  if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) pts.push({ x, y, z });
                }
              }
              return pts;
            };

            const pts = decodePointCloud2(msg);
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(pts.length * 3);
            for (let i = 0; i < pts.length; i++) {
              positions[3 * i] = pts[i].x;
              positions[3 * i + 1] = pts[i].y;
              positions[3 * i + 2] = pts[i].z;
            }
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            points = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.05, color: 0x00ff00 }));
            scene.add(points);
            sceneRef.current.points = points;
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
          <div style={{ ...styles.systemStatusBox, height: '44vh', overflowY: 'auto' }}>
            <div style={styles.systemStatusTitle}>System Detail</div>
            {TOPICS.filter((t) => t.name !== 'Camera').map(({ name }) => {
              const msg = lastMessageData.current[name];
              const lastUpdate = lastMessageTime.current[name];
              const timeAgo = lastUpdate ? ((Date.now() - lastUpdate) / 1000).toFixed(1) + 's ago' : 'N/A';

              return (
                <div key={name} style={{ marginBottom: '1rem', width: '90%' }}>
                  <div style={{ fontWeight: 'bold', color: '#0af', fontSize: '1.0rem' }}>
                    {name === 'Lidar' ? 'Lidar (Downsampled)' : name}
                  </div>
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

          {/* Lidar Viewer */}
          <div ref={lidarContainerRef} style={styles.cameraContainer} />
        </div>
      </div>

      {/* Bottom Rectangles */}
      <div style={styles.bottomRectangles}>
        <Link to="/" style={{ textDecoration: 'none', width: '26.25%' }}>
          <div style={{ ...styles.bottomRectangle, background: 'linear-gradient(to bottom, #A22D44 0%, #000 100%)', color: '#fff' }}>Level - Pilot</div>
        </Link>
        <Link to="/focus-camera" style={{ textDecoration: 'none', width: '26.25%' }}>
          <div style={{ ...styles.bottomRectangle, backgroundColor: '#EBEBEB', color: '#000' }}>Focus 1: Camera</div>
        </Link>
        <Link to="/focus-map-data" style={{ textDecoration: 'none', width: '26.25%' }}>
          <div style={{ ...styles.bottomRectangle, backgroundColor: '#3D3D3D', color: '#fff' }}>Focus 2: Map Data</div>
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

