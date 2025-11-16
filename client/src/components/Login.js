import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function Login({ onLogin, onShowSignup }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/login`,
        { username, password }
      );
      
      if (response.data.message === 'Login successful') {
        onLogin(response.data.username, response.data.role);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-5">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 md:p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-2">Downwind Manager</h1>
          <p className="text-gray-600 text-sm">Please login to continue</p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="font-semibold text-gray-700 text-sm">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              placeholder="Enter username"
              className="px-4 py-3 border border-gray-300 rounded-lg text-base transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="font-semibold text-gray-700 text-sm">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
              className="px-4 py-3 border border-gray-300 rounded-lg text-base transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button 
            type="submit" 
            className="mt-2 py-3 bg-blue-600 text-white rounded-lg text-base font-medium cursor-pointer transition-all hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed w-full"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="mt-6 text-center pt-6 border-t border-gray-200">
          <p className="text-sm">
            Don't have an account?{' '}
            <button 
              type="button" 
              onClick={onShowSignup}
              className="bg-none border-none text-blue-600 cursor-pointer underline p-0 text-sm hover:text-blue-700"
            >
              Sign up here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;

