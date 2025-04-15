const express = require('express');
const router = express.Router();
const db = require('../db');

// Get complete standings with team details
router.get('/:seasonId', async (req, res) => {
  const { seasonId } = req.params;
  try {
    const [standings] = await db.execute(`
      SELECT 
        s.position,
        s.matches_played as played,
        s.wins as won,
        s.draws as drawn,
        s.loses as lost,
        s.goals_for,
        s.goals_against,
        (s.goals_for - s.goals_against) as goal_difference,
        s.points,
        t.team_id,
        t.name as team_name,
        t.stadium,
        c.name as coach_name
      FROM standings s
      JOIN team t ON s.team_id = t.team_id
      LEFT JOIN coach c ON t.coach_id = c.coach_id
      WHERE s.season_id = ?
      ORDER BY s.position ASC, s.points DESC, (s.goals_for - s.goals_against) DESC, s.goals_for DESC
    `, [seasonId]);

    res.status(200).json(standings);
  } catch (err) {
    console.error('Standings query error:', err);
    res.status(500).json({ 
      error: 'Database error',
      details: err.message
    });
  }
});

// Get the list of all seasons with standings (moved from seasons API)
router.get('/seasons/list', async (req, res) => {
  try {
    const [seasons] = await db.execute(`
      SELECT DISTINCT s.season_id, se.season_year, COUNT(DISTINCT s.team_id) as team_count
      FROM standings s
      LEFT JOIN season se ON s.season_id = se.season_id
      GROUP BY s.season_id, se.season_year
      ORDER BY se.season_year DESC
    `);
    
    res.status(200).json(seasons);
  } catch (err) {
    console.error('Seasons query error:', err);
    res.status(500).json({
      error: 'Database error',
      details: err.message
    });
  }
});

// Force recalculation of standings (useful if trigger fails or for data fixing)
router.post('/recalculate/:seasonId', async (req, res) => {
  const { seasonId } = req.params;
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 1. First ensure all teams that played matches are in the standings table
    await connection.execute(`
      INSERT IGNORE INTO standings (team_id, season_id, position, matches_played, wins, loses, draws, goals_for, goals_against, points)
      SELECT 
        team_id, 
        ? as season_id, 
        0 as position, 
        0 as matches_played, 
        0 as wins, 
        0 as loses, 
        0 as draws, 
        0 as goals_for, 
        0 as goals_against, 
        0 as points
      FROM (
        SELECT home_team_id as team_id FROM matches WHERE season_id = ?
        UNION
        SELECT away_team_id as team_id FROM matches WHERE season_id = ?
      ) as teams
    `, [seasonId, seasonId, seasonId]);
    
    // 2. Recalculate all standings for the season
    await connection.execute(`
      UPDATE standings s
      JOIN (
        SELECT 
          team_id,
          COUNT(*) as matches_played,
          SUM(CASE 
            WHEN (team_id = home_team_id AND h_goals > a_goals) OR 
                 (team_id = away_team_id AND a_goals > h_goals) THEN 1 
            ELSE 0 
          END) as wins,
          SUM(CASE 
            WHEN (team_id = home_team_id AND h_goals < a_goals) OR 
                 (team_id = away_team_id AND a_goals < h_goals) THEN 1 
            ELSE 0 
          END) as loses,
          SUM(CASE WHEN h_goals = a_goals THEN 1 ELSE 0 END) as draws,
          SUM(CASE 
            WHEN team_id = home_team_id THEN h_goals 
            WHEN team_id = away_team_id THEN a_goals
            ELSE 0
          END) as goals_for,
          SUM(CASE 
            WHEN team_id = home_team_id THEN a_goals 
            WHEN team_id = away_team_id THEN h_goals
            ELSE 0
          END) as goals_against,
          SUM(
            CASE 
              WHEN (team_id = home_team_id AND h_goals > a_goals) OR 
                   (team_id = away_team_id AND a_goals > h_goals) THEN 3 
              WHEN h_goals = a_goals THEN 1 
              ELSE 0 
            END
          ) as points
        FROM (
          SELECT home_team_id as team_id, home_team_id, away_team_id, h_goals, a_goals FROM matches 
          WHERE season_id = ? AND status = 'Completed'
          UNION ALL
          SELECT away_team_id as team_id, home_team_id, away_team_id, h_goals, a_goals FROM matches 
          WHERE season_id = ? AND status = 'Completed'
        ) as team_matches
        GROUP BY team_id
      ) m ON s.team_id = m.team_id
      SET 
        s.matches_played = m.matches_played,
        s.wins = m.wins,
        s.loses = m.loses,
        s.draws = m.draws,
        s.goals_for = m.goals_for,
        s.goals_against = m.goals_against,
        s.points = m.points
      WHERE s.season_id = ?
    `, [seasonId, seasonId, seasonId]);

    // 3. Update positions based on new points
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

    await connection.commit();
    res.status(200).json({ message: 'Standings recalculated successfully' });
  } catch (err) {
    await connection.rollback();
    console.error('Recalculate standings error:', err);
    res.status(500).json({ 
      error: 'Failed to recalculate standings',
      details: err.message
    });
  } finally {
    connection.release();
  }
});

// Refresh standings without full recalculation
router.post('/refresh/:seasonId', async (req, res) => {
  const { seasonId } = req.params;
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Just refresh the positions based on current points/goal differences
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

    await connection.commit();
    res.status(200).json({ message: 'Standings positions refreshed successfully' });
  } catch (err) {
    await connection.rollback();
    console.error('Refresh standings error:', err);
    res.status(500).json({ 
      error: 'Failed to refresh standings',
      details: err.message
    });
  } finally {
    connection.release();
  }
});

// Get team performance over time (form)
router.get('/team/:teamId/form/:seasonId', async (req, res) => {
  const { teamId, seasonId } = req.params;
  try {
    const [matches] = await db.execute(`
      SELECT 
        match_id,
        match_date,
        home_team_id,
        away_team_id,
        h_goals,
        a_goals,
        (CASE 
          WHEN home_team_id = ? THEN
            CASE 
              WHEN h_goals > a_goals THEN 'W'
              WHEN h_goals < a_goals THEN 'L'
              ELSE 'D'
            END
          ELSE
            CASE 
              WHEN a_goals > h_goals THEN 'W'
              WHEN a_goals < h_goals THEN 'L'
              ELSE 'D'
            END
        END) as result,
        (CASE 
          WHEN home_team_id = ? THEN h_goals
          ELSE a_goals
        END) as goals_scored,
        (CASE 
          WHEN home_team_id = ? THEN a_goals
          ELSE h_goals
        END) as goals_conceded,
        ht.name as home_team_name,
        at.name as away_team_name
      FROM matches m
      JOIN team ht ON m.home_team_id = ht.team_id
      JOIN team at ON m.away_team_id = at.team_id
      WHERE 
        (home_team_id = ? OR away_team_id = ?) AND 
        season_id = ? AND 
        status = 'Completed'
      ORDER BY match_date DESC
      LIMIT 10
    `, [teamId, teamId, teamId, teamId, teamId, seasonId]);
    
    res.status(200).json(matches);
  } catch (err) {
    console.error('Team form query error:', err);
    res.status(500).json({
      error: 'Database error',
      details: err.message
    });
  }
});

// Get head to head stats between two teams
router.get('/headtohead/:team1Id/:team2Id', async (req, res) => {
  const { team1Id, team2Id } = req.params;
  try {
    const [matches] = await db.execute(`
      SELECT 
        m.*,
        ht.name as home_team_name,
        at.name as away_team_name,
        s.season_year
      FROM matches m
      JOIN team ht ON m.home_team_id = ht.team_id
      JOIN team at ON m.away_team_id = at.team_id
      JOIN season s ON m.season_id = s.season_id
      WHERE 
        ((home_team_id = ? AND away_team_id = ?) OR
         (home_team_id = ? AND away_team_id = ?)) AND
        status = 'Completed'
      ORDER BY match_date DESC
    `, [team1Id, team2Id, team2Id, team1Id]);
    
    // Calculate head-to-head stats
    const stats = {
      totalMatches: matches.length,
      team1Wins: 0,
      team2Wins: 0,
      draws: 0,
      team1Goals: 0,
      team2Goals: 0,
      recentMatches: matches.slice(0, 5)
    };
    
    matches.forEach(match => {
      if (match.home_team_id == team1Id) {
        if (match.h_goals > match.a_goals) stats.team1Wins++;
        else if (match.h_goals < match.a_goals) stats.team2Wins++;
        else stats.draws++;
        
        stats.team1Goals += match.h_goals;
        stats.team2Goals += match.a_goals;
      } else {
        if (match.h_goals > match.a_goals) stats.team2Wins++;
        else if (match.h_goals < match.a_goals) stats.team1Wins++;
        else stats.draws++;
        
        stats.team1Goals += match.a_goals;
        stats.team2Goals += match.h_goals;
      }
    });
    
    res.status(200).json(stats);
  } catch (err) {
    console.error('Head to head query error:', err);
    res.status(500).json({
      error: 'Database error',
      details: err.message
    });
  }
});

module.exports = router;
