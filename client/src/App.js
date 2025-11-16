import React, { useState } from 'react';
import './App.css';
import Clients from './components/Clients';
import Hotels from './components/Hotels';
import Trips from './components/Trips';
import Bookings from './components/Bookings';

function App() {
  const [activeTab, setActiveTab] = useState('clients');

  const tabs = [
    { id: 'clients', label: 'Clients' },
    { id: 'hotels', label: 'Hotels' },
    { id: 'trips', label: 'Trips' },
    { id: 'bookings', label: 'Bookings' }
  ];

  return (
    <div className="App">
      <header className="App-header">
        <h1>🏄 Kitesurfing Tour Operator</h1>
        <p>Manage your clients, hotels, trips, and bookings</p>
      </header>
      
      <nav className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === 'clients' && <Clients />}
        {activeTab === 'hotels' && <Hotels />}
        {activeTab === 'trips' && <Trips />}
        {activeTab === 'bookings' && <Bookings />}
      </main>
    </div>
  );
}

export default App;

