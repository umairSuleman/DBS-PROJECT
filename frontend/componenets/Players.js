import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Spinner, Alert, Button, Form, Badge } from 'react-bootstrap';

const Players = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterTeam, setFilterTeam] = useState('');
  const [teams, setTeams] = useState([]);

  // Fetch players and teams data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch teams first
        const teamsResponse = await axios.get('/api/teams');
        setTeams(teamsResponse.data);
        
        // Then fetch players
        const playersResponse = await axios.get('/api/players');
        setPlayers(playersResponse.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load players data');
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter players by team
  const filteredPlayers = filterTeam 
    ? players.filter(player => player.team_id == filterTeam)
    : players;

  // Calculate age from date of birth
  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const diff = Date.now() - birthDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="players-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Players</h2>
        <div className="d-flex align-items-center">
          <Form.Select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            style={{ width: '200px' }}
          >
            <option value="">All Teams</option>
            {teams.map(team => (
              <option key={team.team_id} value={team.team_id}>
                {team.name}
              </option>
            ))}
          </Form.Select>
          <Button variant="primary" className="ms-2" onClick={() => setFilterTeam('')}>
            Clear Filter
          </Button>
        </div>
      </div>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Age</th>
            <th>Position</th>
            <th>Team</th>
            <th>Nationality</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredPlayers.map((player, index) => {
            const team = teams.find(t => t.team_id === player.team_id);
            return (
              <tr key={player.player_id}>
                <td>{index + 1}</td>
                <td>{player.name}</td>
                <td>{calculateAge(player.date_of_birth)}</td>
                <td>{player.position || 'N/A'}</td>
                <td>{team?.name || 'Free Agent'}</td>
                <td>{player.nationality || 'N/A'}</td>
                <td>
                  <Badge bg={player.active ? 'success' : 'secondary'}>
                    {player.active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default Players;
