Jordon
jordonlol
Do Not Disturb

Jordon — 11/11/25, 4:29 PM
Then we would have triple P
Huston Rogers

 — 11/11/25, 4:30 PM
Pick the point of view, passenger, patron, or pilot. Ppppppppp
Leo — 11/11/25, 4:31 PM
Partner?
Huston Rogers

 — 11/11/25, 4:31 PM
Close but not quite
Jordon — 11/13/25, 9:35 AM
@Huston Rogers is your trip this week or next?
Huston Rogers

 — 11/13/25, 9:43 AM
Leave on saturday
Will Garrison — 11/13/25, 9:43 AM
When do you get back?
Huston Rogers

 — 11/13/25, 9:47 AM
Friday the 21 LATE
Jordon — 11/13/25, 9:50 AM
Do you want the Pi now or do you want it after your trip?
Huston Rogers

 — 11/13/25, 9:51 AM
After
If I can clone something and run on my laptop that'd be fine. But I got a different assignment to work on next week first
Will Garrison — 11/13/25, 9:51 AM
Alright. Christian and I can go next then
Jordon — 11/13/25, 12:01 PM
@Leo @Christian Johnson we are meeting for class
Leo — 11/13/25, 12:04 PM
Is that a statement or a question
Jordon — 11/13/25, 12:04 PM
Statement
Leo — 11/13/25, 12:04 PM
Ok
Jordon — 11/13/25, 12:04 PM
Briefly
Christian Johnson — 11/13/25, 12:29 PM
I’ll be there
Image
Leo — 11/13/25, 12:40 PM
Will Garrison — 11/13/25, 2:04 PM
Yo @Christian Johnson where you at
Christian Johnson — 11/13/25, 2:04 PM
On the way
Jordon — 11/13/25, 2:04 PM
She giving out 1k dollars again bro
We about to miss it again
I need this bread
Huston Rogers

 — 11/13/25, 2:15 PM
damn
rip me i guess
Christian Johnson — 11/13/25, 2:47 PM
Hey @Huston Rogers This is Jordon. We won't have the MTX ready for demo day. However, we will have the Thor with the Lidar and Camera, and have a bag file that should have all of the sensors (IMU, GPS, Radar) working. Because of this concern, we agreed to have only two focuses per view (because telemetry as a focus kind of universally becomes useless without real vehicle data and the ros bags aren't sufficient enough to view that). I have finished my Pilot views. Tomorrow, Will and I are going to update the github so you're able to work on your views remotely. We will pull your changes once you've completed your part. I've given everyone a rough start with the FocusTelemetry.tsx file that should provide the baseline of the views (similarly to what we have on Figma). Will and Christian are going to take turns with the physical Pi over the next week and have the sponsor view finished locally by Nov 24th. I think it's best to start whenever you get a chance after we update the github. Once you finish your view, push those files to the github. We will pull them down locally, and on Nov 25th we want to meet in person to finalize everything before we go to Thanksgiving. That gives us a 1 week period to resolve any issues that come up between now and then.
Huston Rogers

 — 11/13/25, 2:51 PM
wait ,would the bag file contain the IMU data? that's the telemetry isn't it?
Jordon — 11/13/25, 3:32 PM
That's some data, but I wouldn't say its enough to make an entire slide for.
The passengers arent going to care for several numbers accumulating upward in value. That's about it. There's no actual visualization to go with the IMU data
Jordon — 11/14/25, 3:01 PM
@Huston Rogers Updated the Github repository. If you go to focuses and FocusTelemetry, that is the baseline you can start with.
Will Garrison — 11/14/25, 8:27 PM
Chat did someone ever submit these?
Image
Jordon — 11/14/25, 8:27 PM
Yes
Will Garrison — Yesterday at 11:07 AM
@Christian Johnson Will you be in Butler from 12-12:30?
Leo — Yesterday at 11:09 AM
Do we meet td? Schedule says “tbd”
Will Garrison — Yesterday at 11:14 AM
I don't think so... I was hoping to just pass off the pi to Christian in Butler while I was already there
Christian Johnson — Yesterday at 11:15 AM
Yup, either in 102 or upstairs in the HI-5 lab
Will Garrison — Yesterday at 11:16 AM
I'll meet you there and give you the pi
I'll also text you the terminal commands to run the thing
Christian Johnson — Yesterday at 11:54 AM
Okay!
Huston Rogers

 — Yesterday at 2:43 PM
For reference of how busy I have been at SC.

Im eating lunch now. I was scheduled to go to lunch at noon.

If I have anything coded before next week it will be VIBES based
Christian Johnson — 11:13 AM
Here are the Sponsor Page files for the github @Jordon
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import ROSLIB from 'roslib';
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

export default function SponsorFocusCamera() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [battery] = useState(67);

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
      console.log('✅ Connected to ROSBridge (Sponsor Focus 1)');

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
... (401 lines left)
Collapse
SponsorFocusCamera.tsx
17 KB
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import ROSLIB from 'roslib';
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

export default function SponsorFocusMapData() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [battery] = useState(67);

  // Camera view (now small view on the left)
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraContainerRef = useRef<HTMLDivElement | null>(null);

  // Lidar 3D view (now large main view on the right)
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

  // ROS connection + Camera + Lidar
  useEffect(() => {
    const ros: any = new ROSLIB.Ros({ url: 'ws://localhost:9090' });

    ros.on('connection', () => {
      console.log('✅ Connected to ROSBridge (Sponsor Focus 2 - Map Data)');

      TOPICS.forEach(({ name, rosTopic, messageType }) => {
        const topic = new ROSLIB.Topic({ ros, name: rosTopic, messageType });

        topic.subscribe((msg: any) => {
          lastMessageTime.current[name] = Date.now();
          lastMessageData.current[name] = msg;
          setTopicStatus((prev) => ({ ...prev, [name]: true }));

          // --- Camera display (mini view on the left) ---
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
... (410 lines left)
Collapse
SponsorFocusMapData.tsx
17 KB
Jordon — 12:21 PM
Thanks guys for doing sponsor page.
Will Garrison — 1:20 PM
Oh @Christian Johnson Christian you need to give the App.tsx 
Paths get specified in there to direct to the pages
Christian Johnson — 1:54 PM
Just this??
import { useState, useEffect } from 'react';
import msuLogo from './msu-logo.png';
import cavsLogo from './HORIZONTAL_PRINT_white.jpg';
import mrzrBgr from './vehicle_sys_mrzr.jpg';
import huskyBgr from './vehicle_sys_husky.jpg'; 
import mtxBgr from './vehicle_sys_mtx-c.jpg';
Expand
App.tsx
6 KB
Will Garrison — 1:55 PM
Yeah that
﻿
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import ROSLIB from 'roslib';
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

export default function SponsorFocusMapData() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [battery] = useState(67);

  // Camera view (now small view on the left)
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraContainerRef = useRef<HTMLDivElement | null>(null);

  // Lidar 3D view (now large main view on the right)
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

  // ROS connection + Camera + Lidar
  useEffect(() => {
    const ros: any = new ROSLIB.Ros({ url: 'ws://localhost:9090' });

    ros.on('connection', () => {
      console.log('✅ Connected to ROSBridge (Sponsor Focus 2 - Map Data)');

      TOPICS.forEach(({ name, rosTopic, messageType }) => {
        const topic = new ROSLIB.Topic({ ros, name: rosTopic, messageType });

        topic.subscribe((msg: any) => {
          lastMessageTime.current[name] = Date.now();
          lastMessageData.current[name] = msg;
          setTopicStatus((prev) => ({ ...prev, [name]: true }));

          // --- Camera display (mini view on the left) ---
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

          // --- Lidar display (large main view on the right) ---
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

          {/* Sponsor: Camera mini-view replaces System Detail */}
          <div style={{ ...styles.systemStatusBox, height: '44vh', overflow: 'hidden' }}>
            <div style={styles.systemStatusTitle}>Camera</div>
            <div ref={cameraContainerRef} style={styles.lidarMiniContainer}>
              <canvas
                ref={cameraCanvasRef}
                style={{ width: '100%', height: '100%', borderRadius: '12px' }}
              />
            </div>
          </div>
        </div>

        {/* Right column – main Lidar view */}
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

          {/* Lidar Viewer (now large main view) */}
          <div ref={lidarContainerRef} style={styles.cameraContainer} />
        </div>
      </div>

      {/* Bottom focus bar – Sponsor Level */}
      <div style={styles.bottomRectangles}>
        <Link to="/" style={{ textDecoration: 'none', width: '26.25%' }}>
          <div
            style={{
              ...styles.bottomRectangle,
              background: 'linear-gradient(to bottom, #A22D44 0%, #000 100%)',
              color: '#fff',
            }}
          >
            Level - Sponsor
          </div>
        </Link>

        {/* Focus 1 – back to SponsorFocusCamera (inactive here) */}
        <Link to="/sponsor-focus-camera" style={{ textDecoration: 'none', width: '26.25%' }}>
          <div
            style={{
              ...styles.bottomRectangle,
              backgroundColor: '#EBEBEB',
              color: '#000',
            }}
          >
            Focus 1: Camera
          </div>
        </Link>

        {/* Focus 2 – ACTIVE (this page) */}
        <Link to="/sponsor-focus-mapdata" style={{ textDecoration: 'none', width: '26.25%' }}>
          <div
            style={{
              ...styles.bottomRectangle,
              backgroundColor: '#3D3D3D',
              color: '#000',
            }}
          >
            Focus 2: Map Data
          </div>
        </Link>

        {/* Focus 3 – goes to Telemetry */}
        <Link
          to="/focus-telemetry"
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
