require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const patientRoutes = require('./routes/patientRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const vaccineMasterRoutes = require('./routes/vaccineMasterRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/vaccines', vaccineMasterRoutes);
app.use('/webhook', webhookRoutes);

// Simple healthcheck
app.get('/', (req, res) => {
  res.json({ message: 'KIDDOSCARE API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

const { startScheduler } = require('./services/whatsappScheduler');

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startScheduler();
});
