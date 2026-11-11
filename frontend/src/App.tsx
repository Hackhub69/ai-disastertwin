import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import MapPage from './pages/Map';
import Incidents from './pages/Incidents';
import Agents from './pages/Agents';
import Simulator from './pages/Simulator';
import Resources from './pages/Resources';
import Alerts from './pages/Alerts';
import Audit from './pages/Audit';
import Settings from './pages/Settings';
import RescueResponse from './pages/RescueResponse';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="map" element={<MapPage />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="rescue" element={<RescueResponse />} />
          <Route path="agents" element={<Agents />} />
          <Route path="simulator" element={<Simulator />} />
          <Route path="resources" element={<Resources />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="audit" element={<Audit />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
