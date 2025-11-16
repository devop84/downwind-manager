import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SearchInput } from './common/SearchInput';
import { Modal } from './common/Modal';
import { Pagination, PaginationControls } from './common/Pagination';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function Users({ userRole = 'user' }) {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [sortColumn, setSortColumn] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [formData, setFormData] = useState({
    username: '',
    role: 'user'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Error loading users');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`${API_URL}/users/${editingUser.id}`, formData);
      }
      fetchUsers();
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      alert(error.response?.data?.error || 'Error saving user');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      role: user.role || 'user'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`${API_URL}/users/${id}`);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert(error.response?.data?.error || 'Error deleting user');
      }
    }
  };

  const resetForm = () => {
    setFormData({ username: '', role: 'user' });
    setEditingUser(null);
    setShowForm(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'id') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (sortColumn === 'created_at') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (aVal === '' || aVal === null) aVal = '';
      if (bVal === '' || bVal === null) bVal = '';

      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getSortIcon = (column) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
  };

  const sortedUsers = getSortedUsers();
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">User Management</h1>
      </div>

      <SearchInput
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search users..."
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        startIndex={startIndex}
        endIndex={endIndex}
        total={sortedUsers.length}
        itemsPerPage={itemsPerPage}
        itemName="users"
      />

      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title="Edit User"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Username *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                className="input-base"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
                disabled={editingUser && editingUser.username === 'admin'}
                className="input-base disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
              </select>
              {editingUser && editingUser.username === 'admin' && (
                <p className="text-sm text-gray-600 mt-1.5">
                  The default admin user's role cannot be changed.
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </Modal>

      <div className="table-container -mx-4 md:mx-0">
        <table className="w-full min-w-[700px]">
          <thead className="table-header">
            <tr>
              <th className="table-header-cell" onClick={() => handleSort('id')}>
                <div className="flex items-center gap-1">
                  ID
                  {getSortIcon('id') && <span className="material-icons text-sm">{getSortIcon('id')}</span>}
                </div>
              </th>
              <th className="table-header-cell" onClick={() => handleSort('username')}>
                <div className="flex items-center gap-1">
                  Username
                  {getSortIcon('username') && <span className="material-icons text-sm">{getSortIcon('username')}</span>}
                </div>
              </th>
              <th className="table-header-cell" onClick={() => handleSort('role')}>
                <div className="flex items-center gap-1">
                  Role
                  {getSortIcon('role') && <span className="material-icons text-sm">{getSortIcon('role')}</span>}
                </div>
              </th>
              <th className="table-header-cell" onClick={() => handleSort('created_at')}>
                <div className="flex items-center gap-1">
                  Created At
                  {getSortIcon('created_at') && <span className="material-icons text-sm">{getSortIcon('created_at')}</span>}
                </div>
              </th>
              <th className="table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan="5" className="table-cell text-center py-10 text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              paginatedUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="table-cell-secondary">{user.id}</td>
                  <td className="table-cell-primary">{user.username}</td>
                  <td className="table-cell">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white ${
                        user.role === 'admin' ? 'bg-red-600' :
                        user.role === 'manager' ? 'bg-cyan-600' : 'bg-gray-600'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="table-cell-secondary">{formatDate(user.created_at)}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button
                        className="btn-icon"
                        onClick={() => handleEdit(user)}
                        title="Edit"
                      >
                        <span className="material-icons text-lg">edit</span>
                      </button>
                      <button
                        className="btn-icon-danger"
                        onClick={() => handleDelete(user.id)}
                        title="Delete"
                      >
                        <span className="material-icons text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}

export default Users;
