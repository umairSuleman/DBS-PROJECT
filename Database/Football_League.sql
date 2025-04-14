-- COACH Table
CREATE TABLE coach (
    coach_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    tactical_style VARCHAR(100),
    total_wins INT DEFAULT 0,
    championships INT DEFAULT 0
);

-- TEAM Table
CREATE TABLE team (
    team_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    coach_id INT UNIQUE,
    stadium VARCHAR(100),
    founding_year INT,
    FOREIGN KEY(coach_id) REFERENCES coach(coach_id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
);

-- PLAYER Table
CREATE TABLE player (
    player_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    date_of_birth DATE,
    position VARCHAR(50),
    team_id INT,
    nationality VARCHAR(50),
    FOREIGN KEY (team_id) REFERENCES team(team_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- SEASON Table
CREATE TABLE season (
    season_id INT PRIMARY KEY,
    season_year YEAR NOT NULL,
    start_date DATE,
    end_date DATE,
    champion_team_id INT,
    FOREIGN KEY (champion_team_id) REFERENCES team(team_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- MATCHES Table
CREATE TABLE matches (
    match_id INT PRIMARY KEY,
    season_id INT,
    home_team_id INT,
    away_team_id INT,
    match_date DATETIME,
    status ENUM('Scheduled', 'Ongoing', 'Completed') DEFAULT 'Scheduled',
    h_goals INT DEFAULT NULL,
    a_goals INT DEFAULT NULL,
    referee VARCHAR(100),
    venue VARCHAR(100),
    FOREIGN KEY (season_id) REFERENCES season(season_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (home_team_id) REFERENCES team(team_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (away_team_id) REFERENCES team(team_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    -- Removed the CHECK constraint
);

-- STANDINGS Table
CREATE TABLE standings (
    team_id INT,
    season_id INT,
    position INT,
    matches_played INT DEFAULT 0,
    wins INT DEFAULT 0,
    loses INT DEFAULT 0,
    draws INT DEFAULT 0,
    goals_for INT DEFAULT 0,
    goals_against INT DEFAULT 0,
    points INT DEFAULT 0,
    PRIMARY KEY (team_id, season_id),
    FOREIGN KEY (team_id) REFERENCES team(team_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (season_id) REFERENCES season(season_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- STATS Table
CREATE TABLE stats (
    player_id INT,
    match_id INT,
    goals INT DEFAULT 0,
    assists INT DEFAULT 0,
    shots INT DEFAULT 0,
    shots_on_target INT DEFAULT 0,
    tackles INT DEFAULT 0,
    interceptions INT DEFAULT 0,
    yellow_cards INT DEFAULT 0,
    red_cards INT DEFAULT 0,
    fouls_committed INT DEFAULT 0,
    pass_accuracy DECIMAL(5,2) DEFAULT 0.0,
    minutes_played INT DEFAULT 0,
    PRIMARY KEY (player_id, match_id),
    FOREIGN KEY (player_id) REFERENCES player(player_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (match_id) REFERENCES matches(match_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
