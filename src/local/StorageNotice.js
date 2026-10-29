import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { createWorkspaceBackup } from './aac/model';
import './local.css';

export function StorageNotice({ workspace }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const onFailure = () => setFailed(true);
    window.addEventListener('aac-storage-error', onFailure);
    return () => window.removeEventListener('aac-storage-error', onFailure);
  }, []);
  if (!failed) return null;
  function recover() {
    const url = URL.createObjectURL(
      new Blob([createWorkspaceBackup(workspace)], { type: 'application/json' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'open-aac-workspace-recovery.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  return (
    <div className="local-storage-error" role="alert">
      未能儲存變更。請保留此頁並匯出備份。 This browser could not save changes.
      Keep this tab open.{' '}
      <button onClick={recover}>匯出工作區 · Export workspace</button> ·{' '}
      <Link to="/settings/export">Advanced board backup</Link>
    </div>
  );
}

export default connect((state) => ({ workspace: state.workspace }))(
  StorageNotice
);
