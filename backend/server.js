// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/productivity_tracker_2026', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));

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
  walk: { type: Number, default: 0, min: 0 }, // Changed from Boolean to Number
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
  count += Math.min(this.walk, 2); // Walk now counts as numeric
  count += Math.min(this.water, 2);
  count += Math.min(this.jobsApplied, 2);
  count += Math.min(this.jobOffers, 2);
  
  this.totalActivityCount = count;
  next();
});

const Activity = mongoose.model('Activity', activitySchema);

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
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
        walk: 0, // Changed from false to 0
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
    count += Math.min(activity.walk || 0, 2); // Walk now numeric
    count += Math.min(activity.water || 0, 2);
    count += Math.min(activity.jobsApplied || 0, 2);
    count += Math.min(activity.jobOffers || 0, 2);

    activity.totalActivityCount = count;

    await activity.save();

    res.json(activity);
  } catch (error) {
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
      totalWalkKm: activities.reduce((sum, a) => sum + (a.walk || 0), 0), // Total kilometers walked
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
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});