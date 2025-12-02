import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as ROSLIB from 'roslib';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Same topics as pilot, but Lidar uses the downsampled topic
// so this matches Pilot Focus 2's point cloud.
const TOPICS = [
  { name: 'Camera', rosTopic: '/mavs/camera', messageType: 'sensor_msgs/msg/Image' },
  { name: 'Lidar', rosTopic: '/mavs/lidar_downsampled', messageType: 'sensor_msgs/msg/PointCloud2' },
  { name: 'GPS', rosTopic: '/mavs/gps_fix', messageType: 'sensor_msgs/msg/NavSatFix' },
  { name: 'Radar', rosTopic: '/mavs/radar', messageType: 'radar_msgs/msg/RadarScan' },
  { name: 'Imu', rosTopic: '/mavs/imu', messageType: 'sensor_msgs/msg/Imu' },
];

export default function PatronFocusCamera() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [battery] = useState(100);

  // Right-hand main camera view (same as Pilot Focus 1)
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraContainerRef = useRef<HTMLDivElement | null>(null);

  // Bottom-left Lidar 3D view (using Pilot Focus 2 logic)
  const lidarContainerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    controls?: OrbitControls;
    points?: THREE.Points;
  }>({});

  const [topicStatus, setTopicStatus] = useState<Record<string, boolean>>(
    TOPICS.reduce(
      (acc, t) => ({ ...acc, [t.name]: false }),
      {} as Record<string, boolean>
    )
  );

  const lastMessageTime = useRef<Record<string, number>>(
    TOPICS.reduce(
      (acc, t) => ({ ...acc, [t.name]: 0 }),
      {} as Record<string, number>
    )
  );

  const lastMessageData = useRef<Record<string, any>>(
    TOPICS.reduce(
      (acc, t) => ({ ...acc, [t.name]: {} }),
      {} as Record<string, any>
    )
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

  // ROS connection + Camera (from FocusCamera) + Lidar (from FocusMapData)
  useEffect(() => {
    const ros: any = new ROSLIB.Ros({ url: 'ws://localhost:9090' });

    ros.on('connection', () => {
      console.log('✅ Connected to ROSBridge (Patron Focus 1)');

      TOPICS.forEach(({ name, rosTopic, messageType }) => {
        const topic = new ROSLIB.Topic({ ros, name: rosTopic, messageType });

        topic.subscribe((msg: any) => {
          lastMessageTime.current[name] = Date.now();
          lastMessageData.current[name] = msg;
          setTopicStatus((prev) => ({ ...prev, [name]: true }));

          // --- Camera display (exactly like Pilot FocusCamera.tsx) ---
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
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }

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

          // --- Lidar display (copied from FocusMapData.tsx) ---
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
              controls.dampingFactor = 0.05;
              controls.rotateSpeed = 0.5;
              controls.zoomSpeed = 0.8;

              scene.add(new THREE.AxesHelper(20));

              sceneRef.current = { scene, camera, renderer, controls, points: undefined };

              const animate = () => {
                requestAnimationFrame(animate);
                if (controls && renderer && scene && camera) {
                  controls.update();
                  renderer.render(scene, camera);
                }
              };
              animate();
            }

            // Remove previous cloud
            if (scene && points) {
              scene.remove(points);
              points.geometry.dispose();
              if (Array.isArray(points.material)) {
                points.material.forEach((m) => m.dispose());
              } else {
                points.material.dispose();
              }
            }

            // Decode PointCloud2
            const decodePointCloud2 = (msg: any, step = 2) => {
              const { width, height, fields, point_step, row_step, data } = msg;
              if (!data) return [];
              const binaryStr = atob(data);
              const buffer = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                buffer[i] = binaryStr.charCodeAt(i);
              }

              const xField = fields.find((f: any) => f.name === 'x');
              const yField = fields.find((f: any) => f.name === 'y');
              const zField = fields.find((f: any) => f.name === 'z');
              if (!xField || !yField || !zField) return [];

              const pts: { x: number; y: number; z: number }[] = [];
              const readFloatLE = (arr: Uint8Array, offset: number) =>
                new DataView(arr.buffer).getFloat32(offset, true);

              for (let row = 0; row < height; row += step) {
                for (let col = 0; col < width; col += step) {
                  const ptStart = row * row_step + col * point_step;
                  const x = readFloatLE(buffer, ptStart + xField.offset);
                  const y = readFloatLE(buffer, ptStart + yField.offset);
                  const z = readFloatLE(buffer, ptStart + zField.offset);
                  if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
                    pts.push({ x, y, z });
                  }
                }
              }
              return pts;
            };

            const pts = decodePointCloud2(msg);
            if (scene) {
              const geometry = new THREE.BufferGeometry();
              const positions = new Float32Array(pts.length * 3);
              for (let i = 0; i < pts.length; i++) {
                positions[3 * i] = pts[i].x;
                positions[3 * i + 1] = pts[i].y;
                positions[3 * i + 2] = pts[i].z;
              }
              geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
              const material = new THREE.PointsMaterial({ size: 0.05, color: 0x00ff00 });
              const newPoints = new THREE.Points(geometry, material);
              scene.add(newPoints);
              sceneRef.current.points = newPoints;
            }
          }
        });
      });
    });

    ros.on('error', (err: any) => console.error('❌ ROSBridge error:', err));
    ros.on('close', () => console.log('⚠️ ROSBridge connection closed'));

    // Topic timeout check (same pattern as pilot)
    const checkInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 10000;
      const updatedStatus: Record<string, boolean> = {};
      TOPICS.forEach(({ name }) => {
        updatedStatus[name] = now - lastMessageTime.current[name] <= timeout;
      });
      setTopicStatus(updatedStatus);
    }, 1000);

    const handleResize = () => {
      const { scene, camera, renderer } = sceneRef.current;
      if (!scene || !camera || !renderer || !lidarContainerRef.current) return;
      const width = lidarContainerRef.current.clientWidth;
      const height = lidarContainerRef.current.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      ros.close();
      clearInterval(checkInterval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.mainContent}>
        {/* Left column */}
        <div style={styles.leftPanel}>
          {/* System Status (same as Pilot Focus 1) */}
          <div style={{ ...styles.systemStatusBox, height: '40vh' }}>
            <div style={styles.systemStatusTitle}>System Status</div>
            {TOPICS.map(({ name }) => (
              <div key={name} style={styles.statusRow}>
                <span
                  style={{
                    ...styles.statusDot,
                    backgroundColor: topicStatus[name] ? '#0f0' : '#f00',
                  }}
                />
                <span style={styles.statusLabel}>{name}</span>
              </div>
            ))}
          </div>

          {/* Patron: Lidar mini-view replaces System Detail */}
          <div style={{ ...styles.systemStatusBox, height: '44vh', overflow: 'hidden' }}>
            <div 
               style={styles.systemStatusTitle}>Lidar Point Cloud</div>
            <div ref={lidarContainerRef} style={styles.lidarMiniContainer} />
          </div>
        </div>

        {/* Right column – main camera view (same as Pilot Focus 1) */}
        <div style={styles.rightPanel}>
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

          {/* Camera Viewer */}
          <div ref={cameraContainerRef} style={styles.cameraContainer}>
            <canvas
              ref={cameraCanvasRef}
              style={{ width: '100%', height: '100%', borderRadius: '12px' }}
            />
          </div>
        </div>
      </div>

      {/* Bottom focus bar – Patron Level */}
      <div style={styles.bottomRectangles}>
        <Link to="/" style={{ textDecoration: 'none', width: '33.33%' }}>
          <div
            style={{
              ...styles.bottomRectangle,
              background: 'linear-gradient(to bottom, #A22D44 0%, #000 100%)',
              color: '#fff',
            }}
          >
            Level - Patron
          </div>
        </Link>
        <Link to="/patron-camera" style={{ textDecoration: 'none', width: '33.33%' }}>
          <div
            style={{
              ...styles.bottomRectangle,
              backgroundColor: '#3D3D3D',
              color: '#fff',
            }}
          >
            Focus 1: Camera
          </div>
        </Link>
        {/* Focus 2 - clickable, goes to PatronFocusMapData */}
        <Link to="/patron-mapdata" style={{ textDecoration: 'none', display: 'contents' }}>
          <div style={{ ...styles.bottomRectangle, width: '33.33%', backgroundColor: '#EBEBEB', color: '#000' }}>
            Focus 2: Map Data
          </div>
        </Link>
        {/* Focus 3 – clickable, goes to FocusTelemetry route */}
        {/*<Link
          to="/patron-camera"
          style={{ textDecoration: 'none', width: '26.25%' }}
        >
          <div
            style={{
              ...styles.bottomRectangle,
              backgroundColor: '#EBEBEB',
              color: '#000',
            }}
          >
            Focus 3: Telemetry Data
          </div>
        </Link> */}
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
    padding: '1rem',
    boxSizing: 'border-box',
    justifyContent: 'space-between',
  },
  mainContent: {
    display: 'flex',
    width: '100%',
    height: '82vh',
  },
  leftPanel: {
    width: '26%',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.7rem',
  },
  rightPanel: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
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
    padding: '0.5rem', 
    boxSizing: 'border-box' },
  systemStatusTitle: { 
    color: '#fff', 
    fontWeight: 500, 
    fontSize: '2rem', 
    marginBottom: '0.5rem' },
  statusRow: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.7rem', 
    marginBottom: '1rem', 
    width: '90%' },
  statusDot: { 
    width: '30px', 
    height: '30px', 
    borderRadius: '50%' },
  statusLabel: { 
    fontSize: '2.4rem', 
    color: '#fff' },
  lidarMiniContainer: {
    width: '100%',
    height: '100%',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  hotbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f3f3',
    width: '95%',
    height: '50px',
    borderRadius: '20px',
    padding: '0 1rem',
    marginBottom: '0.5rem',
    color: '#000',
  },
  hotbarCenter: {
    flexGrow: 1,
    textAlign: 'center',
    fontSize: '1.1rem',
  },
  date: {
    marginRight: '1rem',
  },
  time: {
    fontWeight: 500,
  },
  battery: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  batteryIcon: {
    width: '40px',
    height: '18px',
    border: '2px solid #888',
    borderRadius: '3px',
    padding: '1px',
  },
  batteryLevel: {
    height: '100%',
    borderRadius: '1px',
  },
  batteryText: {
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  cameraContainer: {
    width: '95%',
    height: '77vh',
    border: '2px solid #555',
    borderRadius: '16px',
    backgroundColor: '#111',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(255, 255, 255, 0.05)',
  },
  bottomRectangles: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    gap: '0.5%',
    marginTop: '0.5rem',
  },
  bottomRectangle: {
    height: '10vh',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
