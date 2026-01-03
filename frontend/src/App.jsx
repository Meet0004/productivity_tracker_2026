import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const App = () => {
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activities, setActivities] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentActivity, setCurrentActivity] = useState(null);

  const activityConfig = {
    bath: { label: 'Bath', type: 'boolean', color: '#60a5fa', icon: '🛁' },
    problems: { label: 'Problems Solved', type: 'number', color: '#f59e0b', icon: '💻' },
    workout: { label: 'Workout', type: 'boolean', color: '#ef4444', icon: '💪' },
    walk: { label: 'Walk (KM)', type: 'number', color: '#10b981', icon: '🚶' },
    water: { label: 'Water', type: 'number', color: '#06b6d4', icon: '💧' },
    meditation: { label: 'Meditation/Yoga', type: 'boolean', color: '#8b5cf6', icon: '🧘' },
    jobsApplied: { label: 'Jobs Applied', type: 'number', color: '#3b82f6', icon: '💼' },
    jobOffers: { label: 'Job Offers', type: 'number', color: '#f97316', icon: '🏆' },
    skillWork: { label: 'Skill Upgrade Work', type: 'boolean', color: '#ec4899', icon: '📚' },
    startupWork: { label: 'Startup Work', type: 'boolean', color: '#6366f1', icon: '🚀' }
  };

  useEffect(() => {
    loadYearData();
  }, []);

  useEffect(() => {
    if (currentRoute !== 'dashboard' && currentRoute in activityConfig) {
      loadCurrentActivity();
    }
  }, [selectedDate, currentRoute]);

  const loadYearData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/activities/year/2026`);
      const activitiesMap = {};
      response.data.forEach(activity => {
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
      const response = await axios.get(`${API_URL}/activities/${selectedDate}`);
      setCurrentActivity(response.data);
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  };

  const updateActivity = async (field, value) => {
    try {
      const response = await axios.patch(`${API_URL}/activities/${selectedDate}/${field}`, { value });
      
      console.log('Updated activity:', response.data);
      console.log('Total activity count:', response.data.totalActivityCount);
      
      // Update local state immediately
      const updatedActivities = { ...activities };
      updatedActivities[selectedDate] = response.data;
      setActivities(updatedActivities);
      
      // Update current activity view
      setCurrentActivity(response.data);
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const getActivityCount = (date) => {
    const dayData = activities[date];
    if (!dayData) return 0;
    
    const count = dayData.totalActivityCount || 0;
    
    // Debug logging
    if (count > 0) {
      console.log(`Date ${date}: totalActivityCount = ${count}`, dayData);
    }
    
    return count;
  };

  const getHeatmapColor = (count) => {
    if (count === 0) return '#1f2937';      // Dark gray (no activity)
    if (count === 1) return '#047857';      // Dark green
    if (count <= 3) return '#059669';       // Medium green
    if (count <= 6) return '#10b981';       // Light green
    return '#34d399';                        // Brightest green (7+ activities)
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
      <div className="heatmap-container">
        {months.map((month, idx) => (
          <div key={idx} className="month-container">
            <h3 className="month-title">{month.name}</h3>
            <div className="calendar-grid">
              <div className="weekday-labels">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="weekday-label">{day}</div>
                ))}
              </div>
              <div className="days-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {Array(month.startDay).fill(null).map((_, i) => (
                  <div key={`empty-${i}`} className="day-cell empty"></div>
                ))}
                {month.days.map(({ date, day }) => {
                  let count = 0;
                  let tooltipText = '';
                  
                  if (filterActivity) {
                    const dayData = activities[date];
                    if (dayData && dayData[filterActivity] !== undefined) {
                      const value = dayData[filterActivity];
                      count = activityConfig[filterActivity].type === 'boolean' 
                        ? (value ? 1 : 0)
                        : (value || 0);
                    }
                    tooltipText = `${date}: ${count} ${activityConfig[filterActivity].label}`;
                  } else {
                    // Dashboard view - show all activities
                    count = getActivityCount(date);
                    const dayData = activities[date];
                    
                    if (dayData) {
                      const details = [];
                      Object.entries(activityConfig).forEach(([key, config]) => {
                        const value = dayData[key];
                        if (config.type === 'boolean' && value) {
                          details.push(`${config.label}`);
                        } else if (config.type === 'number' && value > 0) {
                          details.push(`${config.label}: ${value}`);
                        }
                      });
                      
                      if (details.length > 0) {
                        tooltipText = `${date}\n${details.join('\n')}`;
                      } else {
                        tooltipText = `${date}: No activities`;
                      }
                    } else {
                      tooltipText = `${date}: No activities`;
                    }
                  }
                  
                  const color = getHeatmapColor(count);
                  
                  return (
                    <div
                      key={date}
                      className="day-cell"
                      style={{ backgroundColor: color }}
                      title={tooltipText}
                      onClick={() => {
                        setSelectedDate(date);
                        if (currentRoute === 'dashboard') {
                          setCurrentRoute(Object.keys(activityConfig)[0]);
                        }
                      }}
                    >
                      <span className="day-number">{day}</span>
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
    const config = activityConfig[activityKey];
    const currentValue = currentActivity ? currentActivity[activityKey] : (config.type === 'boolean' ? false : 0);

    return (
      <div className="activity-page">
        <div className="activity-header">
          <h2>{config.icon} {config.label}</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max="2026-12-31"
            min="2026-01-01"
            className="date-input"
          />
        </div>

        <div className="activity-input-section">
          {config.type === 'boolean' ? (
            <div className="toggle-container">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={currentValue}
                  onChange={(e) => updateActivity(activityKey, e.target.checked)}
                  className="toggle-input"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">{currentValue ? 'Completed' : 'Not Completed'}</span>
              </label>
            </div>
          ) : (
            <div className="number-container">
              <label className="number-label">
                {activityKey === 'walk' ? 'Kilometers:' : 'Count:'}
              </label>
              <input
                type="number"
                min="0"
                step={activityKey === 'walk' ? '0.5' : '1'}
                value={currentValue}
                onChange={(e) => updateActivity(activityKey, parseFloat(e.target.value) || 0)}
                className="number-input"
              />
            </div>
          )}
        </div>

        <div className="individual-heatmap">
          <h3>Activity History</h3>
          {renderHeatmap(activityKey)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your 2026 productivity data...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="sidebar">
        <h1 className="app-title">📊 2026 Tracker</h1>
        
        <button
          className={`nav-item ${currentRoute === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentRoute('dashboard')}
        >
          🏠 Dashboard
        </button>

        <div className="nav-section">
          <div className="nav-section-title">Activities</div>
          {Object.entries(activityConfig).map(([key, config]) => (
            <button
              key={key}
              className={`nav-item ${currentRoute === key ? 'active' : ''}`}
              onClick={() => setCurrentRoute(key)}
              style={{ borderLeft: `3px solid ${config.color}` }}
            >
              {config.icon} {config.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="main-content">
        {currentRoute === 'dashboard' ? (
          <div className="dashboard">
            <div className="dashboard-header">
              <div>
                <h1>2026 Productivity Dashboard</h1>
                <p>Track your entire year with visual heatmaps</p>
              </div>
              <button 
                className="refresh-button"
                onClick={loadYearData}
              >
                🔄 Refresh Data
              </button>
            </div>

            <div className="legend">
              <span>Less</span>
              <div className="legend-colors">
                <div className="legend-box" style={{ backgroundColor: '#1f2937' }} title="0 activities"></div>
                <div className="legend-box" style={{ backgroundColor: '#047857' }} title="1 activity"></div>
                <div className="legend-box" style={{ backgroundColor: '#059669' }} title="2-3 activities"></div>
                <div className="legend-box" style={{ backgroundColor: '#10b981' }} title="4-6 activities"></div>
                <div className="legend-box" style={{ backgroundColor: '#34d399' }} title="7+ activities"></div>
              </div>
              <span>More</span>
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

export default App;