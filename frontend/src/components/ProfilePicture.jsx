import React, { useRef, useState } from 'react';
import { Camera, Upload, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './ProfilePicture.css';

export function ProfileAvatar({ className = 'user-avatar', fallback }) {
  const { user, profilePictureUrl } = useAuth();
  const initials = fallback || (user?.employee?.full_name || user?.fullName || user?.username || 'U').split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();
  return <div className={`${className} profile-photo-avatar`}>{profilePictureUrl ? <img src={profilePictureUrl} alt="Your profile" /> : initials}</div>;
}

export default function ProfilePicture() {
  const { api, profilePictureUrl, refreshProfilePicture } = useAuth();
  const fileInput = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save(file) {
    setError(''); setMessage('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Choose a JPG, PNG, or WebP image.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Choose an image smaller than 2 MB.'); return; }
    setBusy(true);
    try {
      const data = new FormData(); data.append('picture', file);
      const result = await api.put('/auth/profile-picture', data);
      refreshProfilePicture(); setMessage(result.data.message);
    } catch (failure) { setError(failure.response?.data?.message || 'Unable to save picture. Please try again.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api.delete('/auth/profile-picture');
      refreshProfilePicture(); setMessage(result.data.message);
    } catch (failure) { setError(failure.response?.data?.message || 'Unable to remove picture. Please try again.'); }
    finally { setBusy(false); }
  }
  return <section className="profile-picture-editor" aria-label="Profile picture" aria-busy={busy}>
    <div className="profile-picture-preview"><ProfileAvatar className="profile-picture-large" /><span className="profile-camera-badge"><Camera size={16} /></span></div>
    <div className="profile-picture-copy"><h2>Profile picture</h2><p>Add a personal touch to your workspace.</p>
      <div className="profile-picture-actions">
        <button type="button" className="btn-primary" disabled={busy} onClick={() => fileInput.current?.click()}><Upload size={15} />{busy ? 'Saving...' : profilePictureUrl ? 'Change picture' : 'Upload picture'}</button>
        {profilePictureUrl && <button type="button" className="btn-secondary" disabled={busy} onClick={remove}><Trash2 size={15} />Remove</button>}
      </div>
      <small>JPG, PNG or WebP. Maximum 2 MB.</small>
      {message && <p className="profile-picture-success" role="status">{message}</p>}
      {error && <p className="profile-picture-error" role="alert">{error}</p>}
    </div>
    <input ref={fileInput} className="profile-picture-file" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile picture" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; save(file); }} />
  </section>;
}
