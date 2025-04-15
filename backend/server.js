const express = require('express');
const cors = require('cors');
const app = express();
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const teamsRoutes = require('./routes/teams');
const matchesRoutes = require('./routes/matches');
const standingsRoutes = require('./routes/standings');
const playersRoutes = require('./routes/players');

//step 4
const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnv = requiredEnv.filter(env => !process.env[env]);
if (missingEnv.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

//middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(express.json());

// Add Step 6 root route HERE (before other routes)
app.get('/', (req, res) => {
  res.json({ 
    status: 'Server is running',
    availableEndpoints: [
      '/api/teams',
      '/api/matches',
      '/api/standings',
      '/api/players'
    ]
  });
});

// Routes
app.use('/api/players', playersRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/standings', standingsRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
