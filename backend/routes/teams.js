const express = require('express');
const router = express.Router();
const db = require('../db'); // Assuming you have your db connection in db.js

// Get all teams
router.get('/', async (req, res) => {
  try {
    const [teams] = await db.execute('SELECT * FROM team');
    res.status(200).json(teams);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching teams', error: err });
  }
});

// Get a single team by ID
router.get('/:teamId', async (req, res) => {
  const { teamId } = req.params;
  try {
    const [team] = await db.execute('SELECT * FROM team WHERE team_id = ?', [teamId]);
    if (team.length > 0) {
      res.status(200).json(team[0]);
    } else {
      res.status(404).json({ message: 'Team not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error fetching team', error: err });
  }
});

router.get('/:teamId/form', async (req, res) => {
  const { teamId } = req.params;
  try {
    const [results] = await db.query('CALL GetTeamForm(?)', [teamId]);
    res.json(results[0][0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new team
router.post('/', async (req, res) => {
  const { name, coach_id, stadium, founding_year } = req.body;
  try {
    const result = await db.execute(
      'INSERT INTO team (name, coach_id, stadium, founding_year) VALUES (?, ?, ?, ?)',
      [name, coach_id, stadium, founding_year]
    );
    res.status(201).json({ message: 'Team created', teamId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Error creating team', error: err });
  }
});

module.exports = router;

