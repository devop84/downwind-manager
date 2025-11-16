import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './components/Login';
import Signup from './components/Signup';
import Clients from './components/Clients';
import Hotels from './components/Hotels';
import Trips from './components/Trips';
import Users from './components/Users';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [showSignup, setShowSignup] = useState(false);
  const [activeTab, setActiveTab] = useState('clients');
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/status`);
      
      if (response.data.authenticated) {
        setIsAuthenticated(true);
        setUsername(response.data.username);
        setUserRole(response.data.role || 'user');
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (loggedInUsername, role) => {
    setIsAuthenticated(true);
    setUsername(loggedInUsername);
    setUserRole(role || 'user');
    setShowSignup(false);
  };

  const handleSignup = (loggedInUsername, role) => {
    setIsAuthenticated(true);
    setUsername(loggedInUsername);
    setUserRole(role || 'user');
    setShowSignup(false);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/logout`, {});
      setIsAuthenticated(false);
      setUsername('');
      setUserRole('user');
    } catch (error) {
      console.error('Error logging out:', error);
      // Still logout locally even if request fails
      setIsAuthenticated(false);
      setUsername('');
      setUserRole('user');
    }
  };

  const canModify = userRole === 'admin' || userRole === 'manager';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-600">
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showSignup) {
      return <Signup onSignup={handleSignup} onBackToLogin={() => setShowSignup(false)} />;
    }
    return <Login onLogin={handleLogin} onShowSignup={() => setShowSignup(true)} />;
  }

  const menuItems = [
    { id: 'clients', label: 'Clients', icon: 'people' },
    { id: 'hotels', label: 'Hotels', icon: 'hotel' },
    { id: 'trips', label: 'Downwinds', icon: 'waves' },
    ...(userRole === 'admin' ? [{ id: 'settings', label: 'Settings', icon: 'settings' }] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-icons text-blue-700">home</span>
            <h1 className="text-lg font-semibold text-gray-800">Downwind Manager</h1>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-gray-500 hover:text-gray-700"
            aria-label="Close menu"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-700">{username}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false); // Close menu on mobile when item is clicked
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="material-icons text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto w-full md:w-auto">
        {/* Mobile Header with Burger Menu */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="text-gray-700 hover:text-gray-900"
            aria-label="Open menu"
          >
            <span className="material-icons text-2xl">menu</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Downwind Manager</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        <div className="p-4 md:p-6">
          {activeTab === 'clients' && <Clients userRole={userRole} />}
          {activeTab === 'hotels' && <Hotels userRole={userRole} />}
          {activeTab === 'trips' && <Trips userRole={userRole} />}
          {activeTab === 'settings' && <Users userRole={userRole} />}
        </div>
      </main>
    </div>
  );
}

export default App;

