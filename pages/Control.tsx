import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import ROSLIB from 'roslib';
import { useNavigate } from 'react-router-dom';

interface Ros extends EventTarget {
  on(event: string, callback: (...args: any[]) => void): void;
  close(): void;
}

interface Topic {
  unsubscribe(): void;
  subscribe(callback: (msg: any) => void): void;
}

interface SubscriptionControl {
  id: number;
  selectedTopic: string;
  subscribed: boolean;
  latestMsg: any;
  subscriberObj: Topic | null;
  isImage?: boolean;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  viewerRef?: React.RefObject<HTMLDivElement | null>; // NEW: 3D viewer ref
}

export default function Control() {
  const navigate = useNavigate();
  const [ros, setRos] = useState<Ros | null>(null);
  const [status, setStatus] = useState('Connecting to ROS 2...');
  const [topics, setTopics] = useState<string[]>([]);
  const [topicTypes, setTopicTypes] = useState<{ [topic: string]: string }>({});
  const [fixedFrame, setFixedFrame] = useState('map');
  const [subscriptionControls, setSubscriptionControls] = useState<SubscriptionControl[]>([
    { id: 1, selectedTopic: '', subscribed: false, latestMsg: null, subscriberObj: null },
  ]);

  // Map of scene info per subscription
  const scenesRef = useRef<{ [id: number]: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; controls: OrbitControls; points?: THREE.Points } }>({});

  // ROS connection
  useEffect(() => {
    const rosInstance = new ROSLIB.Ros({ url: 'ws://localhost:9090' }) as unknown as Ros;
    rosInstance.on('connection', () => {
      setStatus('✅ Connected to ROS 2!');
      setRos(rosInstance);
      console.log('Connected to ROS Bridge');
    });
    rosInstance.on('error', (err) => {
      setStatus('❌ Error connecting to ROS: ' + err);
      setRos(null);
    });
    rosInstance.on('close', () => {
      setStatus('🔌 Connection closed');
      setRos(null);
    });
    return () => rosInstance.close();
  }, []);

  // Fetch topics
  useEffect(() => {
    if (!ros) return;
    const service = new ROSLIB.Service({ ros: ros as any, name: '/rosapi/topics', serviceType: 'rosapi/Topics' });
    service.callService(new ROSLIB.ServiceRequest({}), (result: { topics: string[]; types: string[] }) => {
      setTopics(result.topics);
      const map: { [topic: string]: string } = {};
      result.topics.forEach((t, i) => (map[t] = result.types[i]));
      setTopicTypes(map);
    }, (err: any) => console.error('Failed to get topics:', err));
  }, [ros]);

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

    const points: { x: number; y: number; z: number }[] = [];
    const readFloatLE = (arr: Uint8Array, offset: number) => new DataView(arr.buffer).getFloat32(offset, true);

    for (let row = 0; row < height; row += step) {
      for (let col = 0; col < width; col += step) {
        const ptStart = row * row_step + col * point_step;
        const x = readFloatLE(buffer, ptStart + xField.offset);
        const y = readFloatLE(buffer, ptStart + yField.offset);
        const z = readFloatLE(buffer, ptStart + zField.offset);
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) && (x !== 0 || y !== 0 || z !== 0)) points.push({ x, y, z });
      }
    }
    return points;
  };

  const onMessage = (id: number, msg: any) => {
    setSubscriptionControls(prev => prev.map(sub => {
      if (sub.id !== id) return sub;
      const newSub = { ...sub, latestMsg: msg };
      if (sub.isImage && sub.canvasRef?.current) {
        const ctx = sub.canvasRef.current.getContext('2d');
        if (!ctx) return newSub;
        const { width, height, data } = msg;
        if (!data) return newSub;
        const binaryStr = atob(data);
        const bytes = new Uint8ClampedArray(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        const imageData = ctx.createImageData(width, height);
        for (let i = 0, j = 0; i < bytes.length; i += 3, j += 4) {
          imageData.data[j] = bytes[i];
          imageData.data[j + 1] = bytes[i + 1];
          imageData.data[j + 2] = bytes[i + 2];
          imageData.data[j + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);
        return newSub;
      }

      if (!sub.viewerRef?.current) return newSub;
      let { scene, camera, renderer, controls, points } = scenesRef.current[id] || {};

      if (!scene) {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111);
        camera = new THREE.PerspectiveCamera(75, 600 / 400, 0.1, 1000);
        camera.position.set(0, 0, 5);
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(600, 400);
        sub.viewerRef.current.appendChild(renderer.domElement);
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        const light = new THREE.PointLight(0xffffff, 1);
        light.position.set(10, 10, 10);
        scene.add(light);
        scenesRef.current[id] = { scene, camera, renderer, controls };
        const animate = () => {
          requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();
      }

      // Remove previous points
      if (points) {
        scene.remove(points);
        points.geometry.dispose();
        if (Array.isArray(points.material)) points.material.forEach(m => m.dispose());
        else points.material.dispose();
      }

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
      scenesRef.current[id].points = points;

      return newSub;
    }));
  };

  const toggleSubscribe = (id: number) => {
    if (!ros) return;
    setSubscriptionControls(prev => prev.map(sub => {
      if (sub.id !== id) return sub;
      if (sub.subscribed && sub.subscriberObj) {
        sub.subscriberObj.unsubscribe();
        return { ...sub, subscribed: false, subscriberObj: null, latestMsg: null };
      }
      if (!sub.selectedTopic) { alert('Select a topic first'); return sub; }
      const isImage = topicTypes[sub.selectedTopic] === 'sensor_msgs/msg/Image';
      const subObj = new ROSLIB.Topic({ ros: ros as any, name: sub.selectedTopic, messageType: topicTypes[sub.selectedTopic] }) as unknown as Topic;
      subObj.subscribe(msg => onMessage(id, msg));
      if (isImage && !sub.canvasRef) sub.canvasRef = React.createRef<HTMLCanvasElement>();
      if (!sub.viewerRef) sub.viewerRef = React.createRef<HTMLDivElement>();
      return { ...sub, subscribed: true, subscriberObj: subObj, isImage, canvasRef: sub.canvasRef, viewerRef: sub.viewerRef };
    }));
  };

  const onTopicChange = (id: number, topic: string) => {
    setSubscriptionControls(prev => prev.map(sub => {
      if (sub.id !== id) return sub;
      if (sub.subscribed && sub.subscriberObj) sub.subscriberObj.unsubscribe();
      return { ...sub, selectedTopic: topic, subscribed: false, subscriberObj: null, latestMsg: null };
    }));
  };

  const addSubscriptionControl = () => {
    setSubscriptionControls(prev => [...prev, { id: prev.length + 1, selectedTopic: '', subscribed: false, latestMsg: null, subscriberObj: null }]);
  };

  return (
    <div style={{ padding: '1rem', backgroundColor: '#121212', color: '#eee', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <button onClick={() => navigate('/')} style={{ position: 'fixed', top: '1rem', left: '1rem', backgroundColor: '#333', color: '#eee', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', zIndex: 10 }}>← Back to Welcome</button>
      <h1 style={{ textAlign: 'center' }}>ROS 2 Control Panel</h1>
      <p>Status: {status}</p>
      <label>Fixed Frame: <select value={fixedFrame} onChange={e => setFixedFrame(e.target.value)} style={{ backgroundColor: '#222', color: '#eee', border: '1px solid #444', padding: '0.3rem', borderRadius: '4px', marginRight: '1rem' }}>
        <option value="map">map</option>
        <option value="odom">odom</option>
        <option value="base_link">base_link</option>
      </select></label>

      {subscriptionControls.map(sub => (
        <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem', backgroundColor: '#222', padding: '0.5rem', borderRadius: '6px', maxWidth: '520px' }}>
          <label style={{ flexGrow: 1, minWidth: '250px' }}>Select Topic: 
            <select value={sub.selectedTopic} onChange={e => onTopicChange(sub.id, e.target.value)} style={{ backgroundColor: '#222', color: '#eee', border: '1px solid #444', padding: '0.3rem', borderRadius: '4px', minWidth: '250px', verticalAlign: 'middle' }}>
              <option value="">-- Select a topic --</option>
              {topics.map(t => <option key={t} value={t}>{t} ({topicTypes[t]})</option>)}
            </select>
          </label>
          <button onClick={() => toggleSubscribe(sub.id)} disabled={!sub.selectedTopic} style={{ backgroundColor: sub.subscribed ? '#4caf50' : '#333', color: '#eee', border: 'none', padding: '0.4rem 1rem', borderRadius: '6px', cursor: sub.selectedTopic ? 'pointer' : 'not-allowed', fontSize: '1rem', marginLeft: '0.25rem', verticalAlign: 'middle' }}>{sub.subscribed ? 'Unsubscribe' : 'Subscribe'}</button>
        </div>
      ))}

      <button onClick={addSubscriptionControl} style={{ marginTop: '1rem', backgroundColor: '#0080ff', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '1.2rem', display: 'block', maxWidth: '520px' }}>+ Add Subscription</button>

      {/* Display messages */}
      {subscriptionControls.map(sub => (
        <div key={`msg-${sub.id}`} style={{ marginTop: '0.75rem', backgroundColor: '#222', padding: '0.5rem', borderRadius: '6px', maxWidth: '650px', color: '#ccc', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          <strong>Subscription {sub.id}:</strong>{' '}
          {sub.subscribed ? (
            sub.isImage ? (
              sub.canvasRef ? <canvas ref={sub.canvasRef} width={320} height={240} style={{ display: 'block', border: '1px solid #555', marginTop: '0.25rem' }} /> : <p>No canvas yet</p>
            ) : topicTypes[sub.selectedTopic] === 'sensor_msgs/msg/PointCloud2' ? (
              sub.viewerRef ? <div ref={sub.viewerRef} style={{ marginTop: '0.5rem', border: '1px solid #444', borderRadius: '6px', width: '600px', height: '400px' }} /> : <p>Initializing viewer...</p>
            ) : (
              <pre>{JSON.stringify(sub.latestMsg, null, 2)}</pre>
            )
          ) : (<em>Not subscribed</em>)}
        </div>
      ))}
    </div>
  );
}

