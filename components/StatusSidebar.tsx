import React from 'react';

export default function StatusSidebar() {
  return (
    <div style={styles.sidebar}>
      <div style={styles.section}>
        <h3 style={styles.header}>System Status</h3>
        {['ROS', 'Camera', 'Lidar', 'GPS', 'Telemetry'].map((label, i) => (
          <div key={i} style={styles.statusItem}>
            <span style={styles.greenDot}></span> {label}
          </div>
        ))}
      </div>

      <div style={styles.section}>
        <h3 style={styles.header}>System Detail</h3>
        <pre style={styles.details}>
{`## hz /scan
## hz /odom
## hz /camera/image_raw
## hz /bounding_boxes
## hz /point_cloud
## hz /tf

°C Server CPU Temp
°C Server GPU Temp
%  Battery Level`}
        </pre>
      </div>
    </div>
  );
}

const styles: { [k: string]: React.CSSProperties } = {
  sidebar: {
    width: '220px',
    backgroundColor: '#222',
    padding: '0.8rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    borderRight: '1px solid #333',
  },
  header: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.1rem',
    color: '#fff',
  },
  section: {
    marginBottom: '1rem',
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '0.25rem',
  },
  greenDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: 'limegreen',
    marginRight: '6px',
  },
  details: {
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    color: '#ccc',
  },
};
