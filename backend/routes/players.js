const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all players with team information
router.get('/', async (req, res) => {
  try {
    const [players] = await db.execute(`
      SELECT 
        p.player_id,
        p.name,
        p.date_of_birth,
        p.position,
        p.nationality,
        p.active,
        t.team_id,
        t.name as team_name
      FROM player p
      LEFT JOIN team t ON p.team_id = t.team_id
      ORDER BY p.name
    `);
    res.status(200).json(players);
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(500).json({ 
      error: 'Failed to fetch players',
      details: err.message
    });
  }
});

module.exports = router;
