import { useSearchParams } from 'react-router-dom';
// src/features/team/EmployeeList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Eye, Edit2, Trash2, AlertTriangle, X,
  User, Mail, Phone, MapPin, Calendar, Briefcase, 
  DollarSign, UserCheck, CreditCard, Clock, Info,
  Home, Users, FileText, Settings, Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Alert, Spinner } from 'react-bootstrap';
import './EmployeeList.css';
import ProfilePictureViewer from '../../components/ProfilePictureViewer';

const EmployeeList = ({ onAddClick, onEditClick, refreshKey }) => {
  const { api, user } = useAuth();
  const isAdmin=user?.role==='ADMIN';
  const [searchParams]=useSearchParams();
  useEffect(()=>{setSearchTerm(searchParams.get('search')||'');},[searchParams]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('personal');
  const [employeePicture, setEmployeePicture] = useState(null);
  const [showPictureViewer, setShowPictureViewer] = useState(false);
  const closePictureViewer = useCallback(() => setShowPictureViewer(false), []);

  useEffect(() => { setShowPictureViewer(false); }, [showViewModal, viewingEmployee?.id]);

  useEffect(() => {
    let cancelled = false;
    let url = '';
    setEmployeePicture(null);
    if (showViewModal && viewingEmployee?.id) {
      const employeeId = viewingEmployee.id;
      api.get(`/employees/${encodeURIComponent(employeeId)}/profile-picture`, { responseType: 'blob' }).then(response => {
        if (cancelled) return;
        url = URL.createObjectURL(response.data);
        setEmployeePicture({ employeeId, url });
      }).catch(error => {
        if (error.response?.status !== 404) console.error('Unable to load employee picture');
      });
    }
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [api, showViewModal, viewingEmployee?.id]);

  // Fetch employees from database
  const fetchEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/employees');
      const sortedEmployees = response.data.sort((a, b) => {
        const idA = a.employee_id || a.id || '';
        const idB = b.employee_id || b.id || '';
        return idA.localeCompare(idB);
      });
      setEmployees(sortedEmployees);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees. Please try again.');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [refreshKey]);

  // Filter employees based on search
  const filteredEmployees = employees.filter(emp => {
    const name = emp.full_name || '';
    const id = emp.employee_id || '';
    const email = emp.email || '';
    const dept = emp.department || '';
    const searchLower = searchTerm.toLowerCase();
    
    return name.toLowerCase().includes(searchLower) ||
      id.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower) ||
      dept.toLowerCase().includes(searchLower);
  });

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get avatar color class
  const getAvatarColor = (name) => {
    const colors = ['bg-blue', 'bg-purple', 'bg-pink', 'bg-green', 'bg-orange', 'bg-teal'];
    const index = name ? name.length % colors.length : 0;
    return colors[index];
  };

  // Format salary
  const formatSalary = (salary) => {
    if (!salary && salary !== 0) return 'Rs. 0';
    return `Rs. ${Number(salary).toLocaleString()}`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // Handle delete
  const handleDeleteClick = (employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    
    setDeleting(true);
    try {
      await api.delete(`/employees/${employeeToDelete.id}`);
      setSuccessMessage('Employee deleted successfully!');
      await fetchEmployees();
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete employee');
    } finally {
      setDeleting(false);
    }
  };

  // Handle view
  const handleViewClick = (employee) => {
    setViewingEmployee(employee);
    setActiveTab('personal');
    setShowViewModal(true);
  };

  // Handle edit
  const handleEditClick = (employee) => {
    if (onEditClick) {
      onEditClick(employee);
    }
  };

  // Get status badge class
  const getStatusClass = (status) => {
    return status === 'Active' ? 'status-active' : 'status-inactive';
  };

  // Get account status
  const getAccountStatus = (employee) => {
    if (employee.is_active === undefined || employee.is_active === null) {
      return 'N/A';
    }
    return employee.is_active ? 'Active' : 'Inactive';
  };

  // Render tab content
  const renderTabContent = () => {
    if (!viewingEmployee) return null;

    switch(activeTab) {
      case 'personal':
        return (
          <div className="view-tab-content">
            <div className="view-details-grid">
              <div className="view-item">
                <label><User size={14} /> Full Name</label>
                <p>{viewingEmployee.full_name || 'N/A'}</p>
              </div>
              <div className="view-item">
                <label><Calendar size={14} /> Date of Birth</label>
                <p>{formatDate(viewingEmployee.dob)}</p>
              </div>
              <div className="view-item">
                <label><CreditCard size={14} /> NIC Number</label>
                <p>{viewingEmployee.nic || 'N/A'}</p>
              </div>
              <div className="view-item">
                <label><User size={14} /> Gender</label>
                <p>{viewingEmployee.gender || 'N/A'}</p>
              </div>
              <div className="view-item">
                <label><UserCheck size={14} /> Marital Status</label>
                <p>{viewingEmployee.marital_status || 'N/A'}</p>
              </div>
              <div className="view-item">
                <label><Clock size={14} /> Created At</label>
                <p>{formatDate(viewingEmployee.created_at)}</p>
              </div>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="view-tab-content">
            <div className="view-details-grid">
              <div className="view-item">
                <label><Mail size={14} /> Email</label>
                <p>{viewingEmployee.email || 'N/A'}</p>
              </div>
              <div className="view-item">
                <label><Phone size={14} /> Phone</label>
                <p>{viewingEmployee.phone || 'N/A'}</p>
              </div>
              <div className="view-item" style={{ gridColumn: '1 / -1' }}>
                <label><MapPin size={14} /> Address</label>
                <p>{viewingEmployee.address || 'N/A'}</p>
              </div>
              <div className="view-item" style={{ gridColumn: '1 / -1' }}>
                <label><Phone size={14} /> Emergency Contact</label>
                <p>{viewingEmployee.emergency_contact || 'N/A'}</p>
              </div>
            </div>
          </div>
        );

      case 'job':
        return (
          <div className="view-tab-content">
            <div className="view-details-grid">
              <div className="view-item">
                <label><Briefcase size={14} /> Employee ID</label>
                <p>{viewingEmployee.employee_id || 'N/A'}</p>
              </div>
              <div className="view-item">
                <label><Users size={14} /> Department</label>
                <p>{viewingEmployee.department || 'N/A'}</p>
              </div>
              <div className="view-item">
                <label><FileText size={14} /> Designation</label>
                <p>{viewingEmployee.designation || 'N/A'}</p>
              </div>
              <div className="view-item">
                <label><Calendar size={14} /> Date of Joining</label>
                <p>{formatDate(viewingEmployee.join_date)}</p>
              </div>
              {isAdmin && (<div className="view-item">
                <label><DollarSign size={14} /> Basic Salary</label>
                <p className="salary-amount">{formatSalary(viewingEmployee.designation_basic_salary)}</p>
              </div>)}
              {/* ✅ Status moved to Account tab - removed from here */}
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="view-tab-content">
            <div className="view-details-grid">
              <div className="view-item">
                <label><Shield size={14} /> User Role</label>
                <p>{viewingEmployee.user_role || 'EMPLOYEE'}</p>
              </div>
              <div className="view-item">
                <label><UserCheck size={14} /> Status</label>
                <p>
                  <span className={`status-badge ${getStatusClass(viewingEmployee.status)}`}>
                    {viewingEmployee.status || 'Active'}
                  </span>
                </p>
              </div>
              <div className="view-item" style={{ gridColumn: '1 / -1' }}>
                <label><Clock size={14} /> Last Updated</label>
                <p>{formatDate(viewingEmployee.updated_at)}</p>
              </div>
              <div className="view-item" style={{ gridColumn: '1 / -1' }}>
                <label><Info size={14} /> Notes</label>
                <p>{viewingEmployee.notes || 'No notes available'}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Main Container */}
      <div className="employees-list-container">
        {/* Success Message */}
        {successMessage && (
          <Alert variant="success" className="mb-3" onClose={() => setSuccessMessage('')} dismissible>
            {successMessage}
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="danger" className="mb-3" onClose={() => setError('')} dismissible>
            {error}
          </Alert>
        )}

        {/* Header */}
        <div className="employees-header">
          <div className="employees-title">
            <h1>Employees</h1>
            <p>{employees.length} people across the organization</p>
          </div>
          <button className="add-employee-btn" onClick={onAddClick}>
            <Plus size={16} /> Add Employee
          </button>
        </div>

        {/* Table Container */}
        <div className="table-container">
          <div className="table-controls">
            <div className="local-search">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search by name, ID, department..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="table-info">
              <span className="text-muted">
                Showing {filteredEmployees.length} of {employees.length} employees
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Loading employees...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Designation</th>
                    {isAdmin && <th>Basic Salary</th>}
                    <th>Phone</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id}>
                        <td className="fw-medium">{emp.employee_id || `EMP-${String(emp.id).padStart(4, '0')}`}</td>
                        <td>
                          <div className="employee-name-cell">
                            <span className={`emp-avatar ${getAvatarColor(emp.full_name)}`}>
                              {getInitials(emp.full_name)}
                            </span>
                            <div>
                              <div className="fw-medium">{emp.full_name}</div>
                              <div className="text-muted small">{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{emp.department || 'N/A'}</td>
                        <td>{emp.designation || 'N/A'}</td>
                        {isAdmin && <td className="fw-medium">{formatSalary(emp.designation_basic_salary)}</td>}
                        <td>{emp.phone || 'N/A'}</td>
                        <td>
                          <span className={`status-badge ${getStatusClass(emp.status)}`}>
                            {emp.status || 'Active'}
                          </span>
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button 
                              className="action-btn" 
                              onClick={() => handleViewClick(emp)}
                              title="View"
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              className="action-btn" 
                              disabled={!isAdmin && emp.user_role==='ADMIN'}
                              onClick={() => handleEditClick(emp)}
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            {isAdmin && (<button 
                              className="action-btn delete" 
                              onClick={() => handleDeleteClick(emp)}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>)}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isAdmin?8:7} className="text-center py-5">
                        <p className="text-muted">No employees found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="custom-modal-overlay" 
          onClick={() => {
            setShowDeleteModal(false);
            setEmployeeToDelete(null);
          }}
        >
          <div className="custom-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="custom-modal-content delete-modal">
              <div className="custom-modal-header delete-modal-header">
                <div className="custom-modal-title">
                  <AlertTriangle size={20} className="text-danger me-2" /> 
                  Confirm Delete
                </div>
                <button 
                  className="custom-modal-close"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEmployeeToDelete(null);
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="custom-modal-body delete-modal-body">
                <div className="delete-content">
                  <AlertTriangle size={48} className="delete-icon" />
                  <p className="delete-question">
                    Are you sure you want to delete
                  </p>
                  <p className="employee-name">
                    {employeeToDelete?.full_name}?
                  </p>
                  <p className="warning-text">
                    ⚠️ This action cannot be undone!
                  </p>
                </div>
              </div>
              <div className="custom-modal-footer delete-modal-footer">
                <button 
                  className="btn-delete"
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button 
                  className="btn-cancel"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEmployeeToDelete(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabbed View Employee Modal */}
      {showViewModal && viewingEmployee && (
        <div 
          className="custom-modal-overlay" 
          onClick={() => setShowViewModal(false)}
        >
          <div className="custom-modal-container view-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="custom-modal-content view-modal">
              <div className="custom-modal-header view-modal-header">
                <div className="custom-modal-title">
                  <span className="view-title-icon">👤</span> Employee Details
                </div>
                <button 
                  className="custom-modal-close"
                  onClick={() => setShowViewModal(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Employee Header with Avatar */}
              <div className="view-modal-profile-header">
                <div className="view-avatar-lg employee-detail-avatar">
                  {employeePicture?.employeeId === viewingEmployee.id
                    ? <button type="button" className="employee-detail-photo-trigger" aria-label={`Enlarge ${viewingEmployee.full_name}'s profile picture`} onClick={() => setShowPictureViewer(true)}><img src={employeePicture.url} alt={`${viewingEmployee.full_name}'s profile`} onError={() => setEmployeePicture(null)} /></button>
                    : getInitials(viewingEmployee.full_name)}
                </div>
                <div className="view-profile-info">
                  <h3>{viewingEmployee.full_name}</h3>
                  <p>{viewingEmployee.designation || 'N/A'} • {viewingEmployee.department || 'N/A'}</p>
                  <span className={`status-badge ${getStatusClass(viewingEmployee.status)}`}>
                    {viewingEmployee.status || 'Active'}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="view-tabs-container">
                <button 
                  className={`view-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
                  onClick={() => setActiveTab('personal')}
                >
                  <User size={15} /> Personal
                </button>
                <button 
                  className={`view-tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
                  onClick={() => setActiveTab('contact')}
                >
                  <Phone size={15} /> Contact
                </button>
                <button 
                  className={`view-tab-btn ${activeTab === 'job' ? 'active' : ''}`}
                  onClick={() => setActiveTab('job')}
                >
                  <Briefcase size={15} /> Job
                </button>
                <button 
                  className={`view-tab-btn ${activeTab === 'account' ? 'active' : ''}`}
                  onClick={() => setActiveTab('account')}
                >
                  <Settings size={15} /> Account
                </button>
              </div>

              {/* Tab Content */}
              <div className="view-modal-body">
                {renderTabContent()}
              </div>

              {/* Footer */}
              <div className="custom-modal-footer view-modal-footer">
                <button 
                  className="btn-edit"
                  onClick={() => {
                    handleEditClick(viewingEmployee);
                    setShowViewModal(false);
                  }}
                >
                  <Edit2 size={14} className="me-1" /> Edit Employee
                </button>
                <button 
                  className="btn-cancel"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showPictureViewer && showViewModal && viewingEmployee && employeePicture?.employeeId === viewingEmployee.id && (
        <ProfilePictureViewer src={employeePicture.url} name={viewingEmployee.full_name} onClose={closePictureViewer} />
      )}
    </>
  );
};

export default EmployeeList;
