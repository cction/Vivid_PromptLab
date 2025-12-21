import React, { useState } from 'react';
import api, { setAuthToken } from '../lib/api';
import { cn } from '../lib/utils';

export function AdminLogin({ isOpen = true, onClose, onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/login', { username, password });
      const { token } = res.data || {};
      if (token) {
        setAuthToken(token);
        if (onSuccess) onSuccess();
      } else {
        setError('登录失败');
      }
    } catch (err) {
      setError('账号或密码错误');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="max-w-md w-full bg-neutral-900/90 border border-white/10 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
      <h2 className="text-xl font-bold mb-4">管理员登录</h2>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="pod-input w-full"
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="pod-input w-full"
        />
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <div className="flex items-center gap-2 mt-2">
          <button
            type="submit"
            disabled={loading}
            className={cn("px-4 py-2 rounded-xl text-sm font-medium bg-white text-black", loading && "opacity-60")}
          >
            {loading ? '登录中…' : '登录'}
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

