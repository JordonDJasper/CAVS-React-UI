import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function FocusBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const focuses = [
    { label: 'Level - Pilot', route: '/pilot/camera' },
    { label: 'Focus 1: Camera', route: '/pilot/camera' },
    { label: 'Focus 2: Map Data', route: '/pilot/map' },
    { label: 'Focus 3: Telemetry', route: '/pilot/telemetry' },
  ];

  return (
    <div style={styles.bar}>
      {focuses.map(f => {
        const active = pathname === f.route;
        return (
          <button
            key={f.label}
            onClick={() => navigate(f.route)}
            style={{
              ...styles.button,
              backgroundColor: active ? '#333' : '#ddd',
              color: active ? '#fff' : '#000',
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

const styles: { [k: string]: React.CSSProperties } = {
  bar: {
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: '#111',
    padding: '0.4rem',
    gap: '0.5rem',
  },
  button: {
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
};
