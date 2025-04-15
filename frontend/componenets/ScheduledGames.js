import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Spinner, Alert, Badge } from 'react-bootstrap';

const ScheduledGames = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchScheduledMatches = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/matches/scheduled`);
        setMatches(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching scheduled matches:', err);
        setError('Failed to load scheduled games');
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchScheduledMatches();
  }, []);

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="scheduled-games">
      <h2 className="mb-4">Upcoming Matches</h2>
      
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Match</th>
            <th>Venue</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {matches.map(match => (
            <tr key={match.match_id}>
              <td>{formatDate(match.match_date)}</td>
              <td>
                <strong>{match.home_team_name}</strong> vs <strong>{match.away_team_name}</strong>
              </td>
              <td>{match.venue || 'TBD'}</td>
              <td>
                <Badge bg={
                  match.status === 'Scheduled' ? 'info' :
                  match.status === 'Ongoing' ? 'warning' :
                  'secondary'
                }>
                  {match.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default ScheduledGames;
