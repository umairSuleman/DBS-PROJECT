import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Form, Button, Card, Spinner, Alert, ListGroup, Badge } from 'react-bootstrap';

const TeamForm = () => {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamData, setTeamData] = useState(null);
  const [recentForm, setRecentForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all teams on component mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await axios.get('/api/teams');
        setTeams(response.data);
      } catch (err) {
        console.error("Error fetching teams:", err);
      }
    };
    fetchTeams();
  }, []);

  // Fetch team form when team is selected
  useEffect(() => {
    if (!selectedTeamId) return;
    
    const fetchTeamForm = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch team basic info
        const teamResponse = await axios.get(`/api/teams/${selectedTeamId}`);
        setTeamData(teamResponse.data);
        
        // Fetch recent form (last 5 matches)
        setLoadingForm(true);
        const formResponse = await axios.get(`/api/teams/${selectedTeamId}/form`);
        setRecentForm(formResponse.data.last_5_results || '');
        
      } catch (err) {
        console.error("Error fetching team form:", err);
        setError('Failed to load team data');
        setTeamData(null);
        setRecentForm(null);
      } finally {
        setLoading(false);
        setLoadingForm(false);
      }
    };

    fetchTeamForm();
  }, [selectedTeamId]);

  const renderFormBadges = (formString) => {
    if (!formString) return <span className="text-muted">No recent matches</span>;
    
    return formString.split('').map((result, i) => (
      <Badge 
        key={i}
        bg={
          result === 'W' ? 'success' :
          result === 'D' ? 'warning' :
          'danger'
        }
        className="me-1"
      >
        {result}
      </Badge>
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    // Data is already being fetched in useEffect when team is selected
  };

  return (
    <Card className="p-4 my-4">
      <h3>Team Form</h3>
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Select Team</Form.Label>
          <Form.Select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            required
          >
            <option value="">Choose a team</option>
            {teams.map(team => (
              <option key={team.team_id} value={team.team_id}>
                {team.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </Form>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {(loading || loadingForm) && (
        <div className="text-center my-3">
          <Spinner animation="border" />
        </div>
      )}

      {teamData && (
        <Card className="mt-3">
          <Card.Header>
            <h4>{teamData.name}</h4>
            <div className="d-flex align-items-center mt-2">
              <span className="me-2">Recent Form:</span>
              {loadingForm ? (
                <Spinner size="sm" />
              ) : (
                renderFormBadges(recentForm)
              )}
            </div>
          </Card.Header>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <strong>Stadium:</strong> {teamData.stadium || 'N/A'}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Founded:</strong> {teamData.founding_year || 'N/A'}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Last 5 Results:</strong>
              <div className="mt-2">
                {loadingForm ? (
                  <Spinner size="sm" />
                ) : recentForm ? (
                  renderFormBadges(recentForm)
                ) : (
                  'No recent matches available'
                )}
              </div>
            </ListGroup.Item>
          </ListGroup>
        </Card>
      )}
    </Card>
  );
};

export default TeamForm;
