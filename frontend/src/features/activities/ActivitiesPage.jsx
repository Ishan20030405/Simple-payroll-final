import React, { useEffect, useState } from 'react';
import { Activity, Clock, Search, RefreshCw, UserRound } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './ActivitiesPage.css';

const ActivitiesPage = () => {
  const { api } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true); setError('');
        const response = await api.get('/activities?limit=100');
        setActivities(response.data || []);
      } catch (error) {
        console.error('Failed to load activities:', error);
        setError('Could not load activity logs. Please refresh to try again.');
      } finally {
        setLoading(false);
      }
    };
    loadActivities();
  }, [api, revision]);

  const readableAction = activity => {
    const titles = { 'Login 2FA': 'Signed in with email verification', Logout: 'Signed out', 'Password Changed': 'Changed password', UPDATE_TAX_SETTINGS: 'Updated tax brackets', CALCULATE_APIT_TAX: 'Calculated payroll tax' };
    if (titles[activity.action]) return titles[activity.action];
    if (/^HR (POST|PUT|PATCH|DELETE)$/.test(activity.action)) {
      const resource = activity.details?.match(/\/api\/([^/\s?]+)/)?.[1];
      const names = { employees: 'employee record', attendance: 'attendance record', auth: 'account settings' };
      const verb = activity.action === 'HR POST' ? 'Added' : activity.action === 'HR DELETE' ? 'Deleted' : 'Updated';
      return `${verb} ${names[resource] || 'record'}`;
    }
    return activity.action.replace(/^HR /, '').replace(/_/g, ' ');
  };
  const readableDetails = activity => {
    if (/^(POST|PUT|PATCH|DELETE) \/api\//.test(activity.details || '')) {
      const id = activity.details.match(/\/(\d+)(?:\s|$)/)?.[1];
      return id ? `Record #${id}. This older entry did not record which fields changed.` : 'This older entry did not record further details.';
    }
    return activity.details;
  };
  const filtered = activities.filter(activity => [activity.full_name, activity.username, activity.user_role, readableAction(activity), readableDetails(activity)].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="activities-page fade-in">
      <div className="activities-header">
        <div>
          <h1 className="disp">Activity Log</h1>
          <p>See who performed each action, what it affected, and when it happened.</p>
        </div>
        <button type="button" className="btn-secondary activity-refresh" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw size={15} />Refresh</button>
      </div>
      <div className="activity-search"><Search size={17} /><input aria-label="Search activity logs" placeholder="Search by person, action, or record..." value={search} onChange={event => setSearch(event.target.value)} /><span>{filtered.length} entries</span></div>
      {error && <p role="alert" className="activity-load-error">{error}</p>}
      <section className="activities-list">
        {loading ? <div className="activities-empty">Loading activities...</div> : filtered.length ? filtered.map(activity => (
          <article className="activity-row" key={activity.id}>
            <div className="activity-icon"><UserRound size={17} /></div>
            <div className="activity-content">
              <div className="activity-actor"><strong>{activity.full_name || activity.username || (activity.user_id ? `Former account #${activity.user_id}` : 'System')}</strong>{activity.user_role && <span className="activity-role">{activity.user_role === 'ADMIN' ? 'Admin' : activity.user_role === 'HR' ? 'HR' : 'Employee'}</span>}</div>
              <div className="activity-action-text">{readableAction(activity)}</div>
              {readableDetails(activity) && <p className="activity-detail-text">{readableDetails(activity)}</p>}
              <small><Clock size={13} /> {new Date(activity.created_at).toLocaleString()}{activity.full_name && activity.username ? ` · Username: ${activity.username}` : ''}</small>
            </div>
            <span className={`activity-outcome ${activity.details?.startsWith('Not completed') ? 'failed' : ''}`}>{activity.details?.startsWith('Not completed') ? 'Not completed' : activity.details?.startsWith('Completed.') ? 'Completed' : 'Recorded'}</span>
          </article>
        )) : <div className="activities-empty"><Activity size={28} /><span>{error ? 'Activity logs unavailable.' : search ? 'No matching activities.' : 'No activities recorded yet.'}</span></div>}
      </section>
    </div>
  );
};

export default ActivitiesPage;
