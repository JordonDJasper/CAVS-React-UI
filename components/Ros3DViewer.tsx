import React, { useEffect, useRef } from 'react';
import ROSLIB from 'roslib';
import ROS3D from 'ros3d';
import * as THREE from 'three';

interface Ros3DViewerProps {
  ros: any; // ROSLIB.Ros instance
  topicName?: string;
  messageType?: string;
  urdfPath?: string; // URL path to URDF files (optional)
  fixedFrame?: string; // TF fixed frame for URDF, default to 'base_link'
}

export default function Ros3DViewer({
  ros,
  topicName,
  messageType,
  urdfPath,
  fixedFrame = 'base_link',
}: Ros3DViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pointCloudRef = useRef<any>(null);
  const viewerInstance = useRef<any>(null);
  const tfClientRef = useRef<any>(null);
  const urdfClientRef = useRef<any>(null);

  useEffect(() => {
    if (!ros || !viewerRef.current) return;

    // Create the 3D viewer
    viewerInstance.current = new ROS3D.Viewer({
      divID: viewerRef.current,
      width: 600,
      height: 400,
      antialias: true,
      background: '#000000',
    });

    //viewerInstance.current.addObject(new ROS3D.Grid());

    // Setup camera
    viewerInstance.current.camera.position.set(20, 10, 20);
    viewerInstance.current.camera.lookAt(new THREE.Vector3(0, 0, 0));
    viewerInstance.current.camera.near = 0.1;
    viewerInstance.current.camera.far = 1000;
    viewerInstance.current.camera.updateProjectionMatrix();

    // Setup TF client and load URDF if path is provided
    if (urdfPath) {
      tfClientRef.current = new ROSLIB.TFClient({
        ros,
        fixedFrame,
        angularThres: 0.01,
        transThres: 0.01,
        rate: 10.0,
      });

      urdfClientRef.current = new ROS3D.URDFClient({
        ros,
        tfClient: tfClientRef.current,
        path: urdfPath,
        rootObject: viewerInstance.current.scene,
      });
    }

    // Subscribe to point cloud if topic & type are provided and it's PointCloud2
    if (topicName && messageType === 'sensor_msgs/PointCloud2') {
      pointCloudRef.current = new ROS3D.PointCloud2({
        ros,
        topic: topicName,
        rootObject: viewerInstance.current.scene,
        max_points: 100000,
        material: new THREE.PointsMaterial({
          size: 0.05,
          vertexColors: true,
          opacity: 0.9,
          transparent: true,
        }),
      });
    }

    // Cleanup on unmount
    return () => {
      if (pointCloudRef.current) {
        viewerInstance.current.scene.remove(pointCloudRef.current);
        pointCloudRef.current = null;
      }
      if (urdfClientRef.current) {
        urdfClientRef.current.dispose?.();
        urdfClientRef.current = null;
      }
      if (tfClientRef.current) {
        tfClientRef.current.dispose?.();
        tfClientRef.current = null;
      }
      viewerInstance.current.dispose?.();
      viewerInstance.current = null;
    };
  }, [ros, topicName, messageType, urdfPath, fixedFrame]);

  return <div ref={viewerRef} style={{ width: 600, height: 400 }} />;
}
