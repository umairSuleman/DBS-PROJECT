const express = require('express');
const router = express.Router();
const db = require('../db');

// Get team form (last 5 results)
router.get('/:teamId/form', async (req, res) => {
  const { teamId } = req.params;
  try {
    const [results] = await db.query(
      'CALL GetTeamForm(?)', 
      [teamId]
    );
    res.json(results[0][0]); // Return first result from procedure
  } catch (err) {
    console.error('Team form error:', err);
    res.status(500).json({ 
      error: 'Failed to get team form',
      details: err.message
    });
  }
});

// Get all matches
router.get('/', async (req, res) => {
  try {
    const [matches] = await db.execute(`
      SELECT m.*, ht.name as home_team_name, at.name as away_team_name 
      FROM matches m
      JOIN team ht ON m.home_team_id = ht.team_id
      JOIN team at ON m.away_team_id = at.team_id
      ORDER BY match_date DESC
    `);
    res.status(200).json(matches);
  } catch (err) {
    console.error('Error fetching matches:', err);
    res.status(500).json({ message: 'Error fetching matches', error: err.message });
  }
});

//Scheduled Matches
router.get('/scheduled', async (req, res) => {
  try {
    console.log("Fetching scheduled matches..."); // Debug log
    const [matches] = await db.execute(`
      SELECT 
        m.match_id,
        m.match_date,
        m.status,
        m.venue,
        ht.name as home_team_name,
        at.name as away_team_name
      FROM matches m
      JOIN team ht ON m.home_team_id = ht.team_id
      JOIN team at ON m.away_team_id = at.team_id
      WHERE m.status IN ('Scheduled', 'Ongoing')
      ORDER BY m.match_date ASC
    `);
    
    console.log(`Found ${matches.length} matches`); // Debug log
    
    // Always return 200 with empty array if no matches
    res.status(200).json(matches || []); 
    
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ 
      error: 'Database query failed',
      details: err.message 
    });
  }
});

// Get match by ID
router.get('/:matchId', async (req, res) => {
  const { matchId } = req.params;
  try {
    const [match] = await db.execute(`
      SELECT m.*, ht.name as home_team_name, at.name as away_team_name 
      FROM matches m
      JOIN team ht ON m.home_team_id = ht.team_id
      JOIN team at ON m.away_team_id = at.team_id
      WHERE match_id = ?
    `, [matchId]);
    
    if (match.length > 0) {
      res.status(200).json(match[0]);
    } else {
      res.status(404).json({ message: 'Match not found' });
    }
  } catch (err) {
    console.error('Error fetching match:', err);
    res.status(500).json({ message: 'Error fetching match', error: err.message });
  }
});



// Add a new match
router.post('/', async (req, res) => {
  const { 
    season_id, 
    home_team_id, 
    away_team_id, 
    match_date, 
    status = 'Completed',  // Default status from frontend is lowercase, schema uses capitalized
    home_goals, // Frontend sends home_goals
    away_goals, // Frontend sends away_goals
    referee = null,  // Optional in the frontend
    venue = null     // Optional in the frontend
  } = req.body;
  
  // Format status to match the ENUM values in the database
  const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 1. Get the next match_id (since it's not AUTO_INCREMENT)
    const [maxIdResult] = await connection.execute('SELECT MAX(match_id) as max_id FROM matches');
    const nextMatchId = (maxIdResult[0].max_id || 0) + 1;
    
    // 2. Insert the match - the trigger will handle updating standings
    await connection.execute(
      'INSERT INTO matches (match_id, season_id, home_team_id, away_team_id, match_date, status, h_goals, a_goals, referee, venue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nextMatchId, season_id, home_team_id, away_team_id, match_date, formattedStatus, home_goals, away_goals, referee, venue]
    );
    
    // 3. Explicitly update positions for all teams in this season to ensure standings are correct
    if (formattedStatus === 'Completed') {
      await updateStandingsPositions(connection, season_id);
    }
    
    await connection.commit();
    res.status(201).json({ message: 'Match created successfully', matchId: nextMatchId });
    
  } catch (err) {
    await connection.rollback();
    console.error('Error creating match:', err);
    res.status(500).json({ message: 'Error creating match', error: err.message });
  } finally {
    connection.release();
  }
});

// Update an existing match
router.put('/:matchId', async (req, res) => {
  const { matchId } = req.params;
  const { 
    season_id, 
    home_team_id, 
    away_team_id, 
    match_date, 
    status, 
    home_goals, // Frontend sends home_goals
    away_goals, // Frontend sends away_goals
    referee, 
    venue 
  } = req.body;
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Format status to match the ENUM values
    const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    
    // 1. Get the old match data for comparison
    const [oldMatchResult] = await connection.execute(
      'SELECT season_id, status FROM matches WHERE match_id = ?',
      [matchId]
    );
    
    const oldMatch = oldMatchResult[0];
    const oldStatus = oldMatch?.status;
    const oldSeasonId = oldMatch?.season_id;
    
    // 2. Update the match
    await connection.execute(
      `UPDATE matches SET 
        season_id = ?, 
        home_team_id = ?, 
        away_team_id = ?, 
        match_date = ?, 
        status = ?, 
        h_goals = ?, 
        a_goals = ?, 
        referee = ?, 
        venue = ? 
      WHERE match_id = ?`,
      [season_id, home_team_id, away_team_id, match_date, formattedStatus, home_goals, away_goals, referee, venue, matchId]
    );
    
    // 3. If status changed to/from "Completed" or season changed, update standings for affected seasons
    if (formattedStatus === 'Completed' || oldStatus === 'Completed' || season_id !== oldSeasonId) {
      // Update standings for the new season
      await updateStandingsPositions(connection, season_id);
      
      // If season changed, also update the old season's standings
      if (oldSeasonId && oldSeasonId !== season_id) {
        await updateStandingsPositions(connection, oldSeasonId);
      }
    }
    
    await connection.commit();
    res.status(200).json({ message: 'Match updated successfully' });
  } catch (err) {
    await connection.rollback();
    console.error('Error updating match:', err);
    res.status(500).json({ message: 'Error updating match', error: err.message });
  } finally {
    connection.release();
  }
});

// Delete a match
router.delete('/:matchId', async (req, res) => {
  const { matchId } = req.params;
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 1. Get the season_id and status before deleting
    const [matchResult] = await connection.execute(
      'SELECT season_id, status FROM matches WHERE match_id = ?',
      [matchId]
    );
    
    if (matchResult.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Match not found' });
    }
    
    const { season_id, status } = matchResult[0];
    
    // 2. Delete the match
    await connection.execute('DELETE FROM matches WHERE match_id = ?', [matchId]);
    
    // 3. If the match was completed, update standings positions
    if (status === 'Completed') {
      await updateStandingsPositions(connection, season_id);
    }
    
    await connection.commit();
    res.status(200).json({ message: 'Match deleted successfully' });
  } catch (err) {
    await connection.rollback();
    console.error('Error deleting match:', err);
    res.status(500).json({ message: 'Error deleting match', error: err.message });
  } finally {
    connection.release();
  }
});

// Helper function to update standings positions
async function updateStandingsPositions(connection, seasonId) {
  // Update positions for all teams in this season
  await connection.execute(`
    SET @rank := 0;
    UPDATE standings s
    JOIN (
      SELECT 
        team_id, 
        (@rank := @rank + 1) as new_position
      FROM standings
      WHERE season_id = ?
      ORDER BY points DESC, (goals_for - goals_against) DESC, goals_for DESC, team_id ASC
    ) r ON s.team_id = r.team_id
    SET s.position = r.new_position
    WHERE s.season_id = ?
  `, [seasonId, seasonId]);
}

module.exports = router;
