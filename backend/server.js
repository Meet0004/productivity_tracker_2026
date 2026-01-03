// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

console.log('Starting server...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
console.log('Port:', process.env.PORT || 5000);

// MongoDB Connection with better error handling
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    const mongoURI = process.env.MONGODB_URI;
    console.log('Attempting to connect to MongoDB...');
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Full error:', error);
    // In production, we should exit if DB connection fails
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

connectDB();

const db = mongoose.connection;
db.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});
db.once('open', () => {
  console.log('✅ MongoDB connection opened');
});

// Activity Schema
const activitySchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  bath: { type: Boolean, default: false },
  problems: { type: Number, default: 0, min: 0 },
  workout: { type: Boolean, default: false },
  walk: { type: Number, default: 0, min: 0 },
  water: { type: Number, default: 0, min: 0 },
  meditation: { type: Boolean, default: false },
  jobsApplied: { type: Number, default: 0, min: 0 },
  jobOffers: { type: Number, default: 0, min: 0 },
  skillWork: { type: Boolean, default: false },
  startupWork: { type: Boolean, default: false },
  totalActivityCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Calculate total activity count before saving
activitySchema.pre('save', function(next) {
  let count = 0;
  
  // Boolean activities count as 1 each
  if (this.bath) count += 1;
  if (this.workout) count += 1;
  if (this.meditation) count += 1;
  if (this.skillWork) count += 1;
  if (this.startupWork) count += 1;
  
  // Numeric activities - cap each at 2 for heatmap calculation
  count += Math.min(this.problems, 2);
  count += Math.min(this.walk, 2);
  count += Math.min(this.water, 2);
  count += Math.min(this.jobsApplied, 2);
  count += Math.min(this.jobOffers, 2);
  
  this.totalActivityCount = count;
  next();
});

const Activity = mongoose.model('Activity', activitySchema);

// Routes

// Root route - return JSON for API
app.get("/", (req, res) => {
  res.json({ 
    message: "Productivity Tracker API is running",
    status: "ok",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      activities: "/api/activities/:date",
      yearActivities: "/api/activities/year/:year",
      monthActivities: "/api/activities/month/:year/:month",
      statistics: "/api/statistics/:startDate/:endDate"
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    mongoStatus: statusMap[mongoStatus] || 'unknown',
    mongoReadyState: mongoStatus,
    timestamp: new Date().toISOString()
  });
});

// Get all activities for a year
app.get('/api/activities/year/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    const activities = await Activity.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    res.json(activities);
  } catch (error) {
    console.error('Error in /api/activities/year:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get activity for specific date
app.get('/api/activities/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const activity = await Activity.findOne({ date });
    
    if (!activity) {
      return res.json({
        date,
        bath: false,
        problems: 0,
        workout: false,
        walk: 0,
        water: 0,
        meditation: false,
        jobsApplied: 0,
        jobOffers: 0,
        skillWork: false,
        startupWork: false,
        totalActivityCount: 0
      });
    }
    
    res.json(activity);
  } catch (error) {
    console.error('Error in /api/activities/:date:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create or update activity for a date
app.post('/api/activities/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const activityData = req.body;
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    const activity = await Activity.findOneAndUpdate(
      { date },
      { ...activityData, date },
      { new: true, upsert: true, runValidators: true }
    );
    
    res.json(activity);
  } catch (error) {
    console.error('Error in POST /api/activities/:date:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update specific field for a date
app.patch('/api/activities/:date/:field', async (req, res) => {
  try {
    const { date, field } = req.params;
    const { value } = req.body;

    let activity = await Activity.findOne({ date });

    if (!activity) {
      activity = new Activity({ date });
    }

    activity[field] = value;

    // Recalculate
    let count = 0;
    if (activity.bath) count++;
    if (activity.workout) count++;
    if (activity.meditation) count++;
    if (activity.skillWork) count++;
    if (activity.startupWork) count++;

    count += Math.min(activity.problems || 0, 2);
    count += Math.min(activity.walk || 0, 2);
    count += Math.min(activity.water || 0, 2);
    count += Math.min(activity.jobsApplied || 0, 2);
    count += Math.min(activity.jobOffers || 0, 2);

    activity.totalActivityCount = count;

    await activity.save();

    res.json(activity);
  } catch (error) {
    console.error('Error in PATCH /api/activities/:date/:field:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get statistics for a date range
app.get('/api/statistics/:startDate/:endDate', async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    
    const activities = await Activity.find({
      date: { $gte: startDate, $lte: endDate }
    });
    
    const stats = {
      totalDays: activities.length,
      bathDays: activities.filter(a => a.bath).length,
      totalProblems: activities.reduce((sum, a) => sum + a.problems, 0),
      workoutDays: activities.filter(a => a.workout).length,
      totalWalkKm: activities.reduce((sum, a) => sum + (a.walk || 0), 0),
      meditationDays: activities.filter(a => a.meditation).length,
      totalJobsApplied: activities.reduce((sum, a) => sum + a.jobsApplied, 0),
      totalJobOffers: activities.reduce((sum, a) => sum + a.jobOffers, 0),
      skillWorkDays: activities.filter(a => a.skillWork).length,
      startupWorkDays: activities.filter(a => a.startupWork).length,
      averageActivityCount: activities.length > 0 
        ? activities.reduce((sum, a) => sum + a.totalActivityCount, 0) / activities.length 
        : 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error in /api/statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete activity for a date
app.delete('/api/activities/:date', async (req, res) => {
  try {
    const { date } = req.params;
    await Activity.findOneAndDelete({ date });
    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/activities/:date:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get monthly summary
app.get('/api/activities/month/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const paddedMonth = month.padStart(2, '0');
    const startDate = `${year}-${paddedMonth}-01`;
    const endDate = `${year}-${paddedMonth}-31`;
    
    const activities = await Activity.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    res.json(activities);
  } catch (error) {
    console.error('Error in /api/activities/month:', error);
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found', 
    path: req.path,
    method: req.method 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Listening on http://0.0.0.0:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});