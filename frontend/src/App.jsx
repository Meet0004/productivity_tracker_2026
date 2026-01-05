import React, { useState, useEffect } from 'react';

// 🎯 EASY CONFIGURATION - Just add your activities here!
const ACTIVITY_CONFIG = {
  bath: { label: 'Bath', type: 'boolean', color: '#60a5fa', icon: '🛁' },
  problems: { label: 'Problems Solved', type: 'number', color: '#f59e0b', icon: '💻' },
  workout: { label: 'Workout', type: 'boolean', color: '#ef4444', icon: '💪' },
  walk: { label: 'Walk (KM)', type: 'number', color: '#10b981', icon: '🚶' },
  water: { label: 'Water', type: 'number', color: '#06b6d4', icon: '💧' },
  meditation: { label: 'Meditation/Yoga', type: 'boolean', color: '#8b5cf6', icon: '🧘' },
  jobsApplied: { label: 'Jobs Applied', type: 'number', color: '#3b82f6', icon: '💼' },
  jobOffers: { label: 'Job Offers', type: 'number', color: '#f97316', icon: '🏆' },
  skillWork: { label: 'Skill Upgrade Work', type: 'boolean', color: '#ec4899', icon: '📚' },
  startupWork: { label: 'Startup Work', type: 'boolean', color: '#6366f1', icon: '🚀' },
  // ✅ ADD YOUR NEW ACTIVITIES HERE - That's it!
  junkFood: { label: 'Junk Food Count', type: 'number', color: '#dc2626', icon: '🍔' },
};

const API_URL = 'http://localhost:5000/api';

const DynamicTracker = () => {
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activities, setActivities] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentActivity, setCurrentActivity] = useState(null);

  useEffect(() => {
    loadYearData();
  }, []);

  useEffect(() => {
    if (currentRoute !== 'dashboard' && currentRoute in ACTIVITY_CONFIG) {
      loadCurrentActivity();
    }
  }, [selectedDate, currentRoute]);

  const loadYearData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/activities/year/2026`);
      const data = await response.json();
      const activitiesMap = {};
      data.forEach(activity => {
        activitiesMap[activity.date] = activity;
      });
      setActivities(activitiesMap);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const loadCurrentActivity = async () => {
    try {
      const response = await fetch(`${API_URL}/activities/${selectedDate}`);
      const data = await response.json();
      setCurrentActivity(data);
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  };

  const updateActivity = async (field, value) => {
    try {
      const response = await fetch(`${API_URL}/activities/${selectedDate}/${field}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      const data = await response.json();
      
      const updatedActivities = { ...activities };
      updatedActivities[selectedDate] = data;
      setActivities(updatedActivities);
      setCurrentActivity(data);
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const getActivityCount = (date) => {
    const dayData = activities[date];
    if (!dayData) return 0;
    return dayData.totalActivityCount || 0;
  };

  const getHeatmapColor = (count, activityType = null) => {
    // Special RED color scheme for junkFood (warning colors)
    if (activityType === 'junkFood') {
      if (count === 0) return '#1f2937';      // Dark gray (no junk food - good!)
      if (count === 1) return '#7f1d1d';      // Dark red
      if (count <= 3) return '#991b1b';       // Medium-dark red
      if (count <= 6) return '#dc2626';       // Bright red
      return '#ef4444';                        // Brightest red (too much!)
    }
    
    // Default GREEN color scheme for all other activities
    if (count === 0) return '#1f2937';
    if (count === 1) return '#047857';
    if (count <= 3) return '#059669';
    if (count <= 6) return '#10b981';
    return '#34d399';
  };

  const generateYear2026 = () => {
    const months = [];
    for (let month = 0; month < 12; month++) {
      const firstDay = new Date(Date.UTC(2026, month, 1));
      const lastDay = new Date(Date.UTC(2026, month + 1, 0));
      const days = [];
      
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const year = 2026;
        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${monthStr}-${dayStr}`;
        days.push({ date: dateStr, day });
      }
      
      months.push({
        name: firstDay.toLocaleString('default', { month: 'long' }),
        days,
        startDay: firstDay.getUTCDay()
      });
    }
    return months;
  };

  const renderHeatmap = (filterActivity = null) => {
    const months = generateYear2026();
    
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', padding: '20px' }}>
        {months.map((month, idx) => (
          <div key={idx} style={{ background: '#111827', borderRadius: '8px', padding: '16px' }}>
            <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '12px', fontWeight: '600' }}>{month.name}</h3>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} style={{ color: '#6b7280', fontSize: '10px', textAlign: 'center', fontWeight: '500' }}>{day}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {Array(month.startDay).fill(null).map((_, i) => (
                  <div key={`empty-${i}`} style={{ aspectRatio: '1' }}></div>
                ))}
                {month.days.map(({ date, day }) => {
                  let count = 0;
                  let tooltipText = '';
                  
                  if (filterActivity) {
                    const dayData = activities[date];
                    if (dayData && dayData[filterActivity] !== undefined) {
                      const value = dayData[filterActivity];
                      // For individual activity heatmaps, show actual value (capped at 2 for numeric)
                      count = ACTIVITY_CONFIG[filterActivity].type === 'boolean' 
                        ? (value ? 1 : 0)
                        : Math.min((value || 0), 2);
                    }
                    tooltipText = `${date}: ${dayData?.[filterActivity] || 0} ${ACTIVITY_CONFIG[filterActivity].label}`;
                  } else {
                    // Dashboard view - use totalActivityCount from backend
                    count = getActivityCount(date);
                    const dayData = activities[date];
                    
                    if (dayData) {
                      const details = [];
                      Object.entries(ACTIVITY_CONFIG).forEach(([key, config]) => {
                        const value = dayData[key];
                        if (config.type === 'boolean' && value) {
                          details.push(`${config.label}`);
                        } else if (config.type === 'number' && value > 0) {
                          details.push(`${config.label}: ${value}`);
                        }
                      });
                      tooltipText = details.length > 0 ? `${date}\n${details.join('\n')}` : `${date}: No activities`;
                    } else {
                      tooltipText = `${date}: No activities`;
                    }
                  }
                  
                  const color = getHeatmapColor(count, filterActivity);
                  
                  return (
                    <div
                      key={date}
                      style={{
                        backgroundColor: color,
                        aspectRatio: '1',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        color: count > 0 ? '#fff' : '#4b5563',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      title={tooltipText}
                      onClick={() => {
                        setSelectedDate(date);
                        if (currentRoute === 'dashboard') {
                          setCurrentRoute(Object.keys(ACTIVITY_CONFIG)[0]);
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderActivityPage = (activityKey) => {
    const config = ACTIVITY_CONFIG[activityKey];
    const currentValue = currentActivity ? currentActivity[activityKey] : (config.type === 'boolean' ? false : 0);

    return (
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '600' }}>{config.icon} {config.label}</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max="2026-12-31"
            min="2026-01-01"
            style={{
              background: '#1f2937',
              color: '#fff',
              border: '1px solid #374151',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ background: '#1f2937', borderRadius: '8px', padding: '24px', marginBottom: '30px' }}>
          {config.type === 'boolean' ? (
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '12px' }}>
              <input
                type="checkbox"
                checked={currentValue}
                onChange={(e) => updateActivity(activityKey, e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <span style={{ color: '#fff', fontSize: '16px' }}>{currentValue ? 'Completed ✓' : 'Not Completed'}</span>
            </label>
          ) : (
            <div>
              <label style={{ color: '#9ca3af', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                {activityKey === 'walk' ? 'Kilometers:' : 'Count:'}
              </label>
              <input
                type="number"
                min="0"
                step={activityKey === 'walk' ? '0.5' : '1'}
                value={currentValue}
                onChange={(e) => updateActivity(activityKey, parseFloat(e.target.value) || 0)}
                style={{
                  background: '#111827',
                  color: '#fff',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '16px',
                  width: '200px'
                }}
              />
            </div>
          )}
        </div>

        <div>
          <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '20px', fontWeight: '600' }}>Activity History</h3>
          {renderHeatmap(activityKey)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', color: '#fff' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #374151', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '16px' }}>Loading your 2026 productivity data...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', color: '#fff' }}>
      <nav style={{ width: '250px', background: '#1e293b', padding: '20px', borderRight: '1px solid #334155', overflowY: 'auto' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '30px' }}>📊 2026 Tracker</h1>
        
        <button
          onClick={() => setCurrentRoute('dashboard')}
          style={{
            width: '100%',
            background: currentRoute === 'dashboard' ? '#3b82f6' : 'transparent',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '12px 16px',
            fontSize: '14px',
            cursor: 'pointer',
            textAlign: 'left',
            marginBottom: '20px'
          }}
        >
          🏠 Dashboard
        </button>

        <div style={{ marginBottom: '12px', color: '#9ca3af', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Activities
        </div>
        {Object.entries(ACTIVITY_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setCurrentRoute(key)}
            style={{
              width: '100%',
              background: currentRoute === key ? '#3b82f6' : 'transparent',
              color: '#fff',
              border: 'none',
              borderLeft: `3px solid ${config.color}`,
              borderRadius: '6px',
              padding: '12px 16px',
              fontSize: '14px',
              cursor: 'pointer',
              textAlign: 'left',
              marginBottom: '6px'
            }}
          >
            {config.icon} {config.label}
          </button>
        ))}
      </nav>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {currentRoute === 'dashboard' ? (
          <div>
            <div style={{ padding: '20px 30px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '6px' }}>2026 Productivity Dashboard</h1>
                <p style={{ color: '#9ca3af' }}>Track your entire year with visual heatmaps</p>
              </div>
              <button 
                onClick={loadYearData}
                style={{
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                🔄 Refresh Data
              </button>
            </div>

            <div style={{ padding: '20px 30px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #334155' }}>
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>Less</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#1f2937', borderRadius: '3px' }} title="0 activities"></div>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#047857', borderRadius: '3px' }} title="1 activity"></div>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#059669', borderRadius: '3px' }} title="2-3 activities"></div>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#10b981', borderRadius: '3px' }} title="4-6 activities"></div>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#34d399', borderRadius: '3px' }} title="7+ activities"></div>
              </div>
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>More</span>
            </div>

            {renderHeatmap()}
          </div>
        ) : (
          renderActivityPage(currentRoute)
        )}
      </main>
    </div>
  );
};

export default DynamicTracker;