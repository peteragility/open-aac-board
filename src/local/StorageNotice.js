import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './local.css';

export default function StorageNotice() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const onFailure = () => setFailed(true);
    window.addEventListener('aac-storage-error', onFailure);
    return () => window.removeEventListener('aac-storage-error', onFailure);
  }, []);
  if (!failed) return null;
  return <div className="local-storage-error" role="alert">This browser could not save your latest changes. Keep this tab open and <Link to="/settings/export">export your boards now</Link>.</div>;
}
