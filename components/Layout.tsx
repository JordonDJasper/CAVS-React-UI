import React from 'react';
import { Outlet } from 'react-router-dom';
import StatusSidebar from './StatusSidebar';
import TopBar from './TopBar';
import FocusBar from './FocusBar';

export default function Layout() {
  return (
    <div style={styles.container}>
      <StatusSidebar />
      <div style={styles.mainArea}>
        <TopBar />
        <div style={styles.content}>
          <Outlet /> {/* active Focus page */}
        </div>
        <FocusBar />
      </div>
    </div>
  );
}

const styles: { [k: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#111',
    color: '#eee',
    fontFamily: 'Arial, sans-serif',
  },
  mainArea: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    flexGrow: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    padding: '0.5rem',
  },
};
