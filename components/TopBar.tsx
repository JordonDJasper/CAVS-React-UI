import React, { useEffect, useState } from 'react';

export default function TopBar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={styles.bar}>
      <div />
      <div>{time.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      <div style={styles.battery}>47% 🔋</div>
    </div>
  );
}

const styles: { [k: string]: React.CSSProperties } = {
  bar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: '0.3rem 1rem',
    fontSize: '0.9rem',
  },
  battery: {
    color: '#0f0',
  },
};
