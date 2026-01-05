// server.js - DYNAMIC VERSION
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 🎯 ACTIVITY CONFIGURATION - Add new activities here!
const ACTIVITY_FIELDS = {
  bath: { type: 'boolean', default: false },
  problems: { type: 'number', default: 0 },
  workout: { type: 'boolean', default: false },
  walk: { type: 'number', default: 0 },
  water: { type: 'number', default: 0 },
  meditation: { type: 'boolean', default: false },
  jobsApplied: { type: 'number', default: 0 },
  jobOffers: { type: 'number', default: 0 },
  skillWork: { type: 'boolean', default: false },
  startupWork: { type: 'boolean', default: false },
  // ✅ ADD YOUR NEW FIELDS HERE!
  junkFood: { type: 'number', default: 0 }
};

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://productivity-tracker-2026.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

console.log('Starting dynamic server...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);

// MongoDB Connection
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

connectDB();

// 🚀 DYNAMIC SCHEMA GENERATION
const generateActivitySchema = () => {
  const schemaDefinition = {
    date: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    }
  };

  // Automatically add all fields from ACTIVITY_FIELDS
  Object.entries(ACTIVITY_FIELDS).forEach(([fieldName, config]) => {
    if (config.type === 'boolean') {
      schemaDefinition[fieldName] = { type: Boolean, default: config.default };
    } else if (config.type === 'number') {
      schemaDefinition[fieldName] = { type: Number, default: config.default, min: 0 };
    }
  });

  schemaDefinition.totalActivityCount = { type: Number, default: 0 };

  return new mongoose.Schema(schemaDefinition, { timestamps: true });
};

const activitySchema = generateActivitySchema();

// 🚀 DYNAMIC ACTIVITY COUNT CALCULATION
const calculateActivityCount = (activityDoc) => {
  let count = 0;
  
  Object.entries(ACTIVITY_FIELDS).forEach(([fieldName, config]) => {
    const value = activityDoc[fieldName];
    
    if (config.type === 'boolean' && value) {
      count += 1;
    } else if (config.type === 'number' && value > 0) {
      // Cap numeric activities at 2 for heatmap calculation
      count += Math.min(value, 2);
    }
  });
  
  return count;
};

activitySchema.pre('save', function(next) {
  this.totalActivityCount = calculateActivityCount(this);
  next();
});

const Activity = mongoose.model('Activity', activitySchema);

// Routes

app.get("/", (req, res) => {
  res.json({ 
    message: "Dynamic Productivity Tracker API",
    status: "ok",
    version: "2.0.0 (Dynamic)",
    trackedActivities: Object.keys(ACTIVITY_FIELDS),
    endpoints: {
      health: "/api/health",
      activities: "/api/activities/:date",
      yearActivities: "/api/activities/year/:year",
      statistics: "/api/statistics/:startDate/:endDate"
    }
  });
});

app.get('/api/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const statusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  
  res.json({ 
    status: 'ok', 
    message: 'Dynamic server is running',
    mongoStatus: statusMap[mongoStatus] || 'unknown',
    trackedActivities: Object.keys(ACTIVITY_FIELDS).length,
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
    let activity = await Activity.findOne({ date });
    
    if (!activity) {
      // Create default activity object dynamically
      const defaultActivity = { date, totalActivityCount: 0 };
      Object.entries(ACTIVITY_FIELDS).forEach(([fieldName, config]) => {
        defaultActivity[fieldName] = config.default;
      });
      return res.json(defaultActivity);
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

// 🚀 DYNAMIC UPDATE - Works with ANY field automatically!
app.patch('/api/activities/:date/:field', async (req, res) => {
  try {
    const { date, field } = req.params;
    const { value } = req.body;

    // Check if field is valid
    if (!(field in ACTIVITY_FIELDS)) {
      return res.status(400).json({ 
        error: `Invalid field: ${field}`, 
        validFields: Object.keys(ACTIVITY_FIELDS) 
      });
    }

    let activity = await Activity.findOne({ date });

    if (!activity) {
      // Create new activity with defaults
      const defaultActivity = { date };
      Object.entries(ACTIVITY_FIELDS).forEach(([fieldName, config]) => {
        defaultActivity[fieldName] = config.default;
      });
      activity = new Activity(defaultActivity);
    }

    // Update the field
    activity[field] = value;

    // Recalculate total activity count dynamically
    activity.totalActivityCount = calculateActivityCount(activity);

    await activity.save();

    console.log(`✅ Updated ${field} for ${date}:`, value);
    console.log(`📊 Total activity count:`, activity.totalActivityCount);

    res.json(activity);
  } catch (error) {
    console.error('Error in PATCH /api/activities/:date/:field:', error);
    res.status(400).json({ error: error.message });
  }
});

// 🚀 DYNAMIC STATISTICS
app.get('/api/statistics/:startDate/:endDate', async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    
    const activities = await Activity.find({
      date: { $gte: startDate, $lte: endDate }
    });
    
    const stats = { totalDays: activities.length };
    
    // Dynamically calculate stats for all fields
    Object.entries(ACTIVITY_FIELDS).forEach(([fieldName, config]) => {
      if (config.type === 'boolean') {
        stats[`${fieldName}Days`] = activities.filter(a => a[fieldName]).length;
      } else if (config.type === 'number') {
        stats[`total${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`] = 
          activities.reduce((sum, a) => sum + (a[fieldName] || 0), 0);
      }
    });
    
    stats.averageActivityCount = activities.length > 0 
      ? activities.reduce((sum, a) => sum + a.totalActivityCount, 0) / activities.length 
      : 0;
    
    res.json(stats);
  } catch (error) {
    console.error('Error in /api/statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Dynamic server running on port ${PORT}`);
  console.log(`🎯 Tracking ${Object.keys(ACTIVITY_FIELDS).length} activities`);
  console.log(`📋 Activities: ${Object.keys(ACTIVITY_FIELDS).join(', ')}`);
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

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});