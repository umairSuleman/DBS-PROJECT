// src/components/MainLayout.js
import React, { useState } from 'react';
import { Tab, Tabs, Container } from 'react-bootstrap';
//import MatchEntry from './MatchEntry';
import TeamForm from './TeamForm';
import Standings from './Standings';
import Players from './Players';
import ScheduledGames from './ScheduledGames';

const MainLayout = () => {
  const [key, setKey] = useState('matchEntry');

  return (
    <Container className="mt-5 retro-theme">
      <h1 className="text-center mb-4">⚽ Retro Football Manager</h1>
      <Tabs activeKey={key} onSelect={(k) => setKey(k)} className="mb-3" justify>
        <Tab eventKey="scheduled" title="Scheduled Games">
          <ScheduledGames />
        </Tab>
        <Tab eventKey="standings" title="Standings">
          <Standings />
        </Tab>
        <Tab eventKey="teamForm" title="Team Form">
          <TeamForm />
        </Tab>
        <Tab eventKey={"players"} title="Players">
          <Players />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default MainLayout;
