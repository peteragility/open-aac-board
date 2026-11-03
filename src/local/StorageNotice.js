import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { createWorkspaceBackup } from './aac/model';
import { requestTakeOver } from './persistGuard';
import { getStorageStatus, subscribeStorageStatus } from './storageStatus';
import './local.css';

export function StorageNotice({ workspace }) {
  const [status, setStatus] = useState(getStorageStatus);
  useEffect(() => {
    setStatus(getStorageStatus());
    return subscribeStorageStatus(setStatus);
  }, []);
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
  const reload = () => window.location.reload();
  // A board that could not be read is never saved over, so reloading is safe.
  if (status.unreadable)
    return (
      <div className="local-storage-error" role="alert">
        <span lang="zh-HK">未能開啟已儲存嘅溝通板，資料冇被覆蓋。</span>{' '}
        <span lang="en">
          Your saved board could not be opened. Nothing was overwritten.
        </span>{' '}
        <button onClick={reload}>
          <span lang="zh-HK">重新載入</span> · <span lang="en">Reload</span>
        </button>
      </div>
    );
  if (status.otherTab === 'open')
    return (
      <div className="local-storage-error" role="alert">
        <span lang="zh-HK">
          呢個溝通板已喺另一個分頁開啟，呢度嘅改動唔會儲存。
        </span>{' '}
        <span lang="en">
          This board is open in another tab. Changes here are not saved.
        </span>{' '}
        <button onClick={() => requestTakeOver()}>
          <span lang="zh-HK">改用呢個分頁</span> ·{' '}
          <span lang="en">Use this tab</span>
        </button>
      </div>
    );
  if (status.otherTab === 'closed')
    return (
      <div className="local-storage-error" role="alert">
        <span lang="zh-HK">另一個分頁已關閉。重新載入就可以喺呢度儲存。</span>{' '}
        <span lang="en">
          The other tab was closed. Reload to save changes here.
        </span>{' '}
        <button onClick={() => requestTakeOver()}>
          <span lang="zh-HK">重新載入</span> · <span lang="en">Reload</span>
        </button>
      </div>
    );
  if (!status.writeFailed) return null;
  return (
    <div className="local-storage-error" role="alert">
      <span lang="zh-HK">未能儲存變更。請保留此頁並匯出備份。</span>{' '}
      <span lang="en">
        This browser could not save changes. Keep this tab open.
      </span>{' '}
      <button onClick={recover}>
        <span lang="zh-HK">匯出工作區</span> ·{' '}
        <span lang="en">Export workspace</span>
      </button>{' '}
      ·{' '}
      <Link to="/settings/export" lang="en">
        Advanced board backup
      </Link>
    </div>
  );
}

export default connect((state) => ({ workspace: state.workspace }))(
  StorageNotice
);
