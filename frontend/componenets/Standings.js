import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Spinner, Alert, Container, Row, Col, Form, Card } from 'react-bootstrap';

function Standings() {
  const [standings, setStandings] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch available seasons when component mounts
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        // Using standings endpoint to get seasons list
        const response = await axios.get('/api/standings/seasons/list');
        setSeasons(response.data);
        
        if (response.data.length > 0) {
          // Automatically select the most recent season
          setSelectedSeason(response.data[0].season_id);
        }
      } catch (err) {
        console.error('Failed to fetch seasons:', err);
        setError('Failed to load seasons data');
      }
    };

    fetchSeasons();
  }, []);

  // Fetch standings data when selected season changes
  useEffect(() => {
    const fetchStandings = async () => {
      if (!selectedSeason) return;
      
      try {
        setLoading(true);
        const response = await axios.get(`/api/standings/${selectedSeason}`);
        
        // No need for manual transformation, use the API structure directly
        setStandings(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch standings:', err);
        setError('Failed to load standings data');
        setStandings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, [selectedSeason]);

  // Handle season change
  const handleSeasonChange = (e) => {
    setSelectedSeason(e.target.value);
  };

  // Format team position with visual indicators for promotion/relegation zones
  const formatPosition = (position) => {
    if (position <= 4) {
      // Champions League spots (usually top 4)
      return <span className="text-success fw-bold">{position}</span>;
    } else if (position >= 18 && standings.length >= 20) {
      // Relegation zone (bottom 3 in a 20-team league)
      return <span className="text-danger fw-bold">{position}</span>;
    }
    return position;
  };

  const handleTeamClick = (teamId) => {
    // You can implement custom behavior here - for now just log the team ID
    console.log(`Team clicked: ${teamId}`);
    // This could be expanded to show a modal with team details, etc.
  };

  if (loading && !standings.length) return (
    <div className="text-center my-5">
      <Spinner animation="border" />
      <p className="mt-2">Loading standings data...</p>
    </div>
  );

  return (
    <Container className="my-4">
      <Card>
        <Card.Header>
          <Row className="align-items-center">
            <Col>
              <h3 className="mb-0">League Standings</h3>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Select 
                  value={selectedSeason || ''}
                  onChange={handleSeasonChange}
                  disabled={seasons.length === 0}
                >
                  {seasons.length === 0 && <option>No seasons available</option>}
                  {seasons.map(season => (
                    <option key={season.season_id} value={season.season_id}>
                      {season.season_year} ({season.team_count} teams)
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body>
          {error ? (
            <Alert variant="danger">{error}</Alert>
          ) : (
            <Table striped bordered hover responsive className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="text-center" style={{ width: '60px' }}>Pos</th>
                  <th>Team</th>
                  <th className="text-center">P</th>
                  <th className="text-center">W</th>
                  <th className="text-center">D</th>
                  <th className="text-center">L</th>
                  <th className="text-center">GF</th>
                  <th className="text-center">GA</th>
                  <th className="text-center">GD</th>
                  <th className="text-center">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team) => (
                  <tr key={team.team_id}>
                    <td className="text-center">{formatPosition(team.position)}</td>
                    <td>
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          handleTeamClick(team.team_id);
                        }}
                        className="text-decoration-none"
                      >
                        <strong>{team.team_name}</strong>
                      </a>
                      {team.coach_name && <div className="small text-muted">Coach: {team.coach_name}</div>}
                      {team.stadium && <div className="small text-muted">Stadium: {team.stadium}</div>}
                    </td>
                    <td className="text-center">{team.played}</td>
                    <td className="text-center">{team.won}</td>
                    <td className="text-center">{team.drawn}</td>
                    <td className="text-center">{team.lost}</td>
                    <td className="text-center">{team.goals_for}</td>
                    <td className="text-center">{team.goals_against}</td>
                    <td className="text-center">
                      {team.goal_difference > 0 && '+'}
                      {team.goal_difference}
                    </td>
                    <td className="text-center fw-bold">{team.points}</td>
                  </tr>
                ))}
                {standings.length === 0 && !loading && (
                  <tr>
                    <td colSpan="10" className="text-center py-4">
                      No standings data available for this season
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
        <Card.Footer className="small text-muted">
          <Row>
            <Col>
              <span className="text-success fw-bold">■</span> Champions League qualification
              {standings.length >= 20 && (
                <>
                  {' | '}
                  <span className="text-danger fw-bold">■</span> Relegation zone
                </>
              )}
            </Col>
            <Col className="text-end">
              Last updated: {new Date().toLocaleDateString()}
            </Col>
          </Row>
        </Card.Footer>
      </Card>
    </Container>
  );
}

export default Standings;
