import React, { useState, useEffect } from 'react';
import { ShowerHead, Dumbbell, Footprints, Droplets, Brain, Briefcase, Trophy, BookOpen, Rocket, Pizza, Laptop, RefreshCw, LayoutDashboard, Menu, X } from 'lucide-react'

// 🎯 EASY CONFIGURATION - Just add your activities here!
const ACTIVITY_CONFIG = {
  bath:        { label: 'Bath',               type: 'boolean', color: '#60a5fa', icon: <ShowerHead size={20} color='#60a5fa' /> },
  problems:    { label: 'Problems Solved',    type: 'number',  color: '#f59e0b', icon: <Laptop     size={20} color='#f59e0b'/> },
  workout:     { label: 'Workout',            type: 'boolean', color: '#ef4444', icon: <Dumbbell   size={20} color='#ef4444'/> },
  walk:        { label: 'Walk (KM)',          type: 'number',  color: '#10b981', icon: <Footprints size={20} color='#10b981'/> },
  water:       { label: 'Water',              type: 'number',  color: '#06b6d4', icon: <Droplets   size={20} color='#06b6d4'/> },
  meditation:  { label: 'Meditation/Yoga',    type: 'boolean', color: '#8b5cf6', icon: <Brain      size={20} color='#8b5cf6'/> },
  jobsApplied: { label: 'Jobs Applied',       type: 'number',  color: '#3b82f6', icon: <Briefcase  size={20} color='#3b82f6'/> },
  jobOffers:   { label: 'Job Offers',         type: 'number',  color: '#f97316', icon: <Trophy     size={20} color='#f97316'/> },
  skillWork:   { label: 'Skill Upgrade Work', type: 'boolean', color: '#ec4899', icon: <BookOpen   size={20} color='#ec4899'/> },
  startupWork: { label: 'Startup Work',       type: 'boolean', color: '#6366f1', icon: <Rocket     size={20} color='#6366f1'/> },
  junkFood:    { label: 'Junk Food Count',    type: 'number',  color: '#dc2626', icon: <Pizza      size={20} color='#dc2626'/> },
}

const API_URL = process.env.REACT_APP_API_URL;

const DynamicTracker = () => {
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activities, setActivities] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileTooltip, setMobileTooltip] = useState(null);

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
    if (activityType === 'junkFood') {
      if (count === 0) return '#1f2937';
      if (count === 1) return '#7f1d1d';
      if (count <= 3) return '#991b1b';
      if (count <= 6) return '#dc2626';
      return '#ef4444';
    }

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
    const isMobile = window.innerWidth < 768;

    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', 
        gap: '20px', 
        padding: '20px',
        position: 'relative'
      }}>
        {/* Mobile Tooltip Display */}
        {isMobile && mobileTooltip && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#1f2937',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '20px',
            zIndex: 10000,
            maxWidth: '90%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.2s ease-in'
          }}>
            <div style={{ 
              color: '#fff', 
              fontSize: '16px', 
              fontWeight: '600',
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              {mobileTooltip.date}
            </div>
            <div style={{ 
              color: '#9ca3af', 
              fontSize: '14px',
              whiteSpace: 'pre-line',
              textAlign: 'center'
            }}>
              {mobileTooltip.details}
            </div>
          </div>
        )}
        
        {/* Overlay for mobile tooltip */}
        {isMobile && mobileTooltip && (
          <div
            onClick={() => setMobileTooltip(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 9999
            }}
          />
        )}
        
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
        `}</style>

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
                      count = ACTIVITY_CONFIG[filterActivity].type === 'boolean'
                        ? (value ? 1 : 0)
                        : Math.min((value || 0), 2);
                    }
                    tooltipText = `${date}: ${dayData?.[filterActivity] || 0} ${ACTIVITY_CONFIG[filterActivity].label}`;
                  } else {
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
                      title={!isMobile ? tooltipText : ''}
                      onClick={() => {
                        if (isMobile && currentRoute === 'dashboard') {
                          // Mobile: Show tooltip for 3 seconds
                          const details = [];
                          const dayData = activities[date];
                          
                          if (dayData) {
                            Object.entries(ACTIVITY_CONFIG).forEach(([key, config]) => {
                              const value = dayData[key];
                              if (config.type === 'boolean' && value) {
                                details.push(`✓ ${config.label}`);
                              } else if (config.type === 'number' && value > 0) {
                                details.push(`${config.label}: ${value}`);
                              }
                            });
                          }
                          
                          setMobileTooltip({
                            date: date,
                            details: details.length > 0 ? details.join('\n') : 'No activities logged'
                          });
                          
                          // Auto-hide after 3 seconds
                          setTimeout(() => {
                            setMobileTooltip(null);
                          }, 3000);
                        } else {
                          // Desktop or activity page: Navigate normally
                          setSelectedDate(date);
                          if (currentRoute === 'dashboard') {
                            setCurrentRoute(Object.keys(ACTIVITY_CONFIG)[0]);
                          }
                          setMenuOpen(false);
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (!isMobile) {
                          e.currentTarget.style.transform = 'scale(1.1)';
                          e.currentTarget.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isMobile) {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }
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
        <div style={{ 
          display: 'flex', 
          flexDirection: window.innerWidth < 640 ? 'column' : 'row',
          gap: '16px',
          justifyContent: 'space-between', 
          alignItems: window.innerWidth < 640 ? 'flex-start' : 'center',
          marginBottom: '30px' 
        }}>
          <h2 style={{ 
            color: '#fff', 
            fontSize: window.innerWidth < 640 ? '20px' : '24px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {config.icon} {config.label}
          </h2>
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
              fontSize: '14px',
              width: window.innerWidth < 640 ? '200px' : 'auto'
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
                  width: window.innerWidth < 640 ? '100px' : '200px'
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', color: '#fff', padding: '20px' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #374151', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '16px', textAlign: 'center' }}>Loading your 2026 productivity data...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh', 
      background: '#0f172a', 
      color: '#fff', 
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          display: window.innerWidth < 768 ? 'flex' : 'none',
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 1000,
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '10px',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {menuOpen ? <X size={24} color="#fff" /> : <Menu size={24} color="#fff" />}
      </button>

      {/* Sidebar/Nav */}
      <nav style={{ 
        width: window.innerWidth < 768 ? '100%' : '250px',
        maxWidth: window.innerWidth < 768 ? '280px' : '250px',
        background: '#1e293b', 
        padding: '20px', 
        borderRight: '1px solid #334155',
        overflowY: 'auto',
        position: window.innerWidth < 768 ? 'fixed' : 'static',
        height: window.innerWidth < 768 ? '100vh' : 'auto',
        zIndex: 999,
        left: window.innerWidth < 768 ? (menuOpen ? '0' : '-100%') : 'auto',
        top: 0,
        transition: 'left 0.3s ease-in-out'
      }}>
        <h1 style={{
          fontSize: '20px',
          fontWeight: '700',
          marginBottom: '30px',
          marginTop: window.innerWidth < 768 ? '50px' : '0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          Dashboard · 2026 Tracker
        </h1>
        
        <button
          onClick={() => {
            setCurrentRoute('dashboard');
            setMenuOpen(false);
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
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
          <LayoutDashboard size={20} color="#f89c23ff" />
          <span>Dashboard</span>
        </button>

        <div style={{ marginBottom: '12px', color: '#9ca3af', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Activities
        </div>
        
        {Object.entries(ACTIVITY_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => {
              setCurrentRoute(key);
              setMenuOpen(false);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
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
            {config.icon}
            <span>{config.label}</span>
          </button>
        ))}
      </nav>

      {/* Overlay for mobile */}
      {menuOpen && window.innerWidth < 768 && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998
          }}
        />
      )}

      {/* Main Content */}
      <main style={{ 
        flex: 1, 
        overflowY: 'auto',
        overflowX: 'hidden',
        marginLeft: window.innerWidth < 768 ? '0' : '0',
        height: '100vh'
      }}>
        {currentRoute === 'dashboard' ? (
          <div>
            <div style={{ 
              padding: window.innerWidth < 640 ? '60px 20px 20px' : '20px 30px',
              borderBottom: '1px solid #334155', 
              display: 'flex', 
              flexDirection: window.innerWidth < 640 ? 'column' : 'row',
              gap: window.innerWidth < 640 ? '16px' : '0',
              justifyContent: 'space-between', 
              alignItems: window.innerWidth < 640 ? 'flex-start' : 'center'
            }}>
              <div>
                <h1 style={{ 
                  fontSize: window.innerWidth < 640 ? '22px' : '28px',
                  fontWeight: '700', 
                  marginBottom: '6px' 
                }}>
                  2026 Productivity Dashboard
                </h1>
                <p style={{ color: '#9ca3af', fontSize: window.innerWidth < 640 ? '14px' : '16px' }}>
                  Track your entire year with visual heatmaps
                </p>
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
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: window.innerWidth < 640 ? '100%' : 'auto',
                  justifyContent: 'center'
                }}
              >
                <RefreshCw size={20} /> Refresh
              </button>
            </div>

            <div style={{ 
              padding: '20px', 
              display: 'flex', 
              flexWrap: 'wrap',
              alignItems: 'center', 
              gap: '12px', 
              borderBottom: '1px solid #334155',
              justifyContent: 'center'
            }}>
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
          <div style={{ paddingTop: window.innerWidth < 768 ? '60px' : '0' }}>
            {renderActivityPage(currentRoute)}
          </div>
        )}
      </main>
    </div>
  );
};

export default DynamicTracker;