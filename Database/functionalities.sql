-- 1.Standings Insert Trigger

DELIMITER //
CREATE TRIGGER update_standings_after_insert
AFTER INSERT ON matches
FOR EACH ROW
BEGIN
    DECLARE v_season_id INT DEFAULT NEW.season_id;
    
    IF NEW.status = 'Completed' THEN
        -- Ensure standings records exist
        INSERT IGNORE INTO standings (team_id, season_id, position, matches_played, wins, loses, draws, goals_for, goals_against, points)
        VALUES 
            (NEW.home_team_id, v_season_id, 0, 0, 0, 0, 0, 0, 0, 0),
            (NEW.away_team_id, v_season_id, 0, 0, 0, 0, 0, 0, 0, 0);
        
        -- Update matches played
        UPDATE standings 
        SET matches_played = matches_played + 1 
        WHERE team_id IN (NEW.home_team_id, NEW.away_team_id) 
        AND season_id = v_season_id;
        
        -- Update based on result
        IF NEW.h_goals > NEW.a_goals THEN
            -- Home win
            UPDATE standings 
            SET wins = wins + 1, 
                points = points + 3,
                goals_for = goals_for + NEW.h_goals,
                goals_against = goals_against + NEW.a_goals
            WHERE team_id = NEW.home_team_id AND season_id = v_season_id;
            
            UPDATE standings 
            SET loses = loses + 1,
                goals_for = goals_for + NEW.a_goals,
                goals_against = goals_against + NEW.h_goals
            WHERE team_id = NEW.away_team_id AND season_id = v_season_id;
            
        ELSEIF NEW.h_goals < NEW.a_goals THEN
            -- Away win
            UPDATE standings 
            SET wins = wins + 1, 
                points = points + 3,
                goals_for = goals_for + NEW.a_goals,
                goals_against = goals_against + NEW.h_goals
            WHERE team_id = NEW.away_team_id AND season_id = v_season_id;
            
            UPDATE standings 
            SET loses = loses + 1,
                goals_for = goals_for + NEW.h_goals,
                goals_against = goals_against + NEW.a_goals
            WHERE team_id = NEW.home_team_id AND season_id = v_season_id;
            
        ELSE
            -- Draw
            UPDATE standings 
            SET draws = draws + 1,
                points = points + 1,
                goals_for = goals_for + NEW.h_goals,
                goals_against = goals_against + NEW.a_goals
            WHERE team_id = NEW.home_team_id AND season_id = v_season_id;
            
            UPDATE standings 
            SET draws = draws + 1,
                points = points + 1,
                goals_for = goals_for + NEW.a_goals,
                goals_against = goals_against + NEW.h_goals
            WHERE team_id = NEW.away_team_id AND season_id = v_season_id;
        END IF;
        
        -- Update positions
        SET @current_rank := 0;
        UPDATE standings 
        SET position = (@current_rank := @current_rank + 1)
        WHERE season_id = v_season_id
        ORDER BY points DESC, (goals_for - goals_against) DESC, goals_for DESC;
    END IF;
END//
DELIMITER ;



--2. Standings Update Trigger

DELIMITER //

CREATE TRIGGER update_standings_after_match
AFTER UPDATE ON matches
FOR EACH ROW
BEGIN
    DECLARE v_season_id INT DEFAULT NEW.season_id;
    
    IF NEW.status = 'Completed' AND (OLD.status != 'Completed' OR OLD.status IS NULL) THEN
        -- Ensure standings records exist
        INSERT IGNORE INTO standings (team_id, season_id, position, matches_played, wins, loses, draws, goals_for, goals_against, points)
        VALUES 
            (NEW.home_team_id, v_season_id, 0, 0, 0, 0, 0, 0, 0, 0),
            (NEW.away_team_id, v_season_id, 0, 0, 0, 0, 0, 0, 0, 0);
        
        -- Update matches played
        UPDATE standings 
        SET matches_played = matches_played + 1 
        WHERE team_id IN (NEW.home_team_id, NEW.away_team_id) 
        AND season_id = v_season_id;
        
        -- Update based on result
        IF NEW.h_goals > NEW.a_goals THEN
            -- Home win
            UPDATE standings 
            SET wins = wins + 1, 
                points = points + 3,
                goals_for = goals_for + NEW.h_goals,
                goals_against = goals_against + NEW.a_goals
            WHERE team_id = NEW.home_team_id AND season_id = v_season_id;
            
            UPDATE standings 
            SET loses = loses + 1,
                goals_for = goals_for + NEW.a_goals,
                goals_against = goals_against + NEW.h_goals
            WHERE team_id = NEW.away_team_id AND season_id = v_season_id;
            
        ELSEIF NEW.h_goals < NEW.a_goals THEN
            -- Away win
            UPDATE standings 
            SET wins = wins + 1, 
                points = points + 3,
                goals_for = goals_for + NEW.a_goals,
                goals_against = goals_against + NEW.h_goals
            WHERE team_id = NEW.away_team_id AND season_id = v_season_id;
            
            UPDATE standings 
            SET loses = loses + 1,
                goals_for = goals_for + NEW.h_goals,
                goals_against = goals_against + NEW.a_goals
            WHERE team_id = NEW.home_team_id AND season_id = v_season_id;
            
        ELSE
            -- Draw
            UPDATE standings 
            SET draws = draws + 1,
                points = points + 1,
                goals_for = goals_for + NEW.h_goals,
                goals_against = goals_against + NEW.a_goals
            WHERE team_id = NEW.home_team_id AND season_id = v_season_id;
            
            UPDATE standings 
            SET draws = draws + 1,
                points = points + 1,
                goals_for = goals_for + NEW.a_goals,
                goals_against = goals_against + NEW.h_goals
            WHERE team_id = NEW.away_team_id AND season_id = v_season_id;
        END IF;
        
        -- Update positions
        SET @current_rank := 0;
        UPDATE standings 
        SET position = (@current_rank := @current_rank + 1)
        WHERE season_id = v_season_id
        ORDER BY points DESC, (goals_for - goals_against) DESC, goals_for DESC;
    END IF;
END//

DELIMITER ;


--3.Delete Reversion Trigger

DELIMITER //

CREATE TRIGGER revert_standings_on_delete
AFTER DELETE ON matches
FOR EACH ROW
BEGIN
    DECLARE v_season_id INT DEFAULT OLD.season_id;

    IF OLD.status = 'Completed' THEN
        -- Reverse matches played
        UPDATE standings 
        SET matches_played = matches_played - 1 
        WHERE team_id IN (OLD.home_team_id, OLD.away_team_id) 
        AND season_id = v_season_id;
        
        -- Reverse result
        IF OLD.h_goals > OLD.a_goals THEN
            -- Reverse home win
            UPDATE standings 
            SET wins = wins - 1, 
                points = points - 3,
                goals_for = goals_for - OLD.h_goals,
                goals_against = goals_against - OLD.a_goals
            WHERE team_id = OLD.home_team_id AND season_id = v_season_id;
            
            UPDATE standings 
            SET loses = loses - 1,
                goals_for = goals_for - OLD.a_goals,
                goals_against = goals_against - OLD.h_goals
            WHERE team_id = OLD.away_team_id AND season_id = v_season_id;
            
        ELSEIF OLD.h_goals < OLD.a_goals THEN
            -- Reverse away win
            UPDATE standings 
            SET wins = wins - 1, 
                points = points - 3,
                goals_for = goals_for - OLD.a_goals,
                goals_against = goals_against - OLD.h_goals
            WHERE team_id = OLD.away_team_id AND season_id = v_season_id;
            
            UPDATE standings 
            SET loses = loses - 1,
                goals_for = goals_for - OLD.h_goals,
                goals_against = goals_against - OLD.a_goals
            WHERE team_id = OLD.home_team_id AND season_id = v_season_id;
            
        ELSE
            -- Reverse draw
            UPDATE standings 
            SET draws = draws - 1,
                points = points - 1,
                goals_for = goals_for - OLD.h_goals,
                goals_against = goals_against - OLD.a_goals
            WHERE team_id = OLD.home_team_id AND season_id = v_season_id;
            
            UPDATE standings 
            SET draws = draws - 1,
                points = points - 1,
                goals_for = goals_for - OLD.a_goals,
                goals_against = goals_against - OLD.h_goals
            WHERE team_id = OLD.away_team_id AND season_id = v_season_id;
        END IF;
        
        -- Recalculate positions
        SET @current_rank := 0;
        UPDATE standings 
        SET position = (@current_rank := @current_rank + 1)
        WHERE season_id = v_season_id
        ORDER BY points DESC, (goals_for - goals_against) DESC, goals_for DESC;
    END IF;
END//

DELIMITER ;


--4. Procedure for Last 5

DELIMITER //

CREATE PROCEDURE GetTeamForm(IN p_team_id INT)
BEGIN
    SELECT 
        t.name AS team,
        GROUP_CONCAT(
            result
            ORDER BY match_date DESC 
            SEPARATOR ''
        ) AS last_5_results
    FROM (
        SELECT 
            CASE 
                WHEN (h_goals > a_goals AND home_team_id = p_team_id) OR 
                     (a_goals > h_goals AND away_team_id = p_team_id) THEN 'W'
                WHEN h_goals = a_goals THEN 'D'
                ELSE 'L'
            END AS result,
            match_date
        FROM matches
        WHERE (home_team_id = p_team_id OR away_team_id = p_team_id)
            AND status = 'Completed'
        ORDER BY match_date DESC
        LIMIT 5
    ) AS last_matches
    JOIN team t ON t.team_id = p_team_id
    GROUP BY t.team_id, t.name;
END //

DELIMITER ;
