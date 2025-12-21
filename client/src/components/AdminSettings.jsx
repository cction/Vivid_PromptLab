import React, { useState } from 'react';
import api from '../lib/api';

export function AdminSettings({ isOpen = true, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!currentPassword || !newPassword) {
      setError('请输入当前密码和新密码');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/api/admin/password', {
        currentPassword,
        newPassword,
        newUsername: newUsername || undefined
      });
      setMessage(`保存成功，管理员：${res.data.username}`);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onClose) onClose();
    } catch (e2) {
      setError(e2?.response?.data?.error || '保存失败');
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="max-w-xl w-full bg-neutral-900/90 border border-white/10 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-3">管理员设置</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          placeholder="当前密码"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          className="pod-input w-full"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="password"
            placeholder="新的密码"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="pod-input w-full"
          />
          <input
            type="password"
            placeholder="确认新的密码"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="pod-input w-full"
          />
        </div>
        <input
          type="text"
          placeholder="新的用户名（可选）"
          value={newUsername}
          onChange={e => setNewUsername(e.target.value)}
          className="pod-input w-full"
        />
          {error && <div className="text-red-400 text-sm">{error}</div>}
          {message && <div className="text-emerald-400 text-sm">{message}</div>}
          <div className="flex items-center gap-2 mt-2">
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${saving ? 'bg-white/60 text-black' : 'bg-white text-black'} `}
            >
              {saving ? '保存中…' : '保存'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-neutral-800 text-neutral-300"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

