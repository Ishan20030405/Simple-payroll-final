// src/features/team/AddEmployeeForm.jsx
import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Alert, Spinner } from 'react-bootstrap';
import './AddEmployeeForm.css';

const AddEmployeeForm = ({ onCancel, onSuccess, editData }) => {
  const { api, user } = useAuth();
  const isAdmin=user?.role==='ADMIN';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [filteredDesignations, setFilteredDesignations] = useState([]);

  // Helper function to format date for input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/departments');
        setDepartments(res.data);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      }
    };
    const fetchDesignations = async () => {
      try {
        const res = await api.get('/designations');
        setDesignations(res.data);
      } catch (err) {
        console.error('Failed to fetch designations:', err);
      }
    };
    fetchDepartments();
    fetchDesignations();
  }, [api]);

  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    joinDate: '',
    address: '',
    status: 'Active',
    dob: '',
    nic: '',
    gender: '',
    maritalStatus: '',
    emergencyContact: '',
    initialPassword: '',
    userRole: 'EMPLOYEE'
  });

  const isEditing = !!editData;

  // ✅ FIXED: Populate form when editData changes
  useEffect(() => {
    if (editData) {
      console.log('📝 Editing employee:', editData);
      
      const formattedDob = formatDateForInput(editData.dob);
      const formattedJoinDate = formatDateForInput(editData.join_date || editData.joinDate);
      
      setFormData({
        employeeId: editData.employee_id || editData.employeeId || '',
        fullName: editData.full_name || editData.fullName || '',
        email: editData.email || '',
        phone: editData.phone || '',
        department: editData.department || '',
        designation: editData.designation || '',
        joinDate: formattedJoinDate,
        address: editData.address || '',
        status: editData.status || 'Active',
        dob: formattedDob,
        nic: editData.nic || '',
        gender: editData.gender || '',
        maritalStatus: editData.marital_status || editData.maritalStatus || '',
        emergencyContact: editData.emergency_contact || editData.emergencyContact || '',
        userRole: editData.user_role || 'EMPLOYEE'
      });
    }
  }, [editData]);

  // ✅ FIXED: Filter designations when department changes, but preserve current designation
  useEffect(() => {
    if (formData.department) {
      // Filter designations for the selected department
      const filtered = designations.filter(
        desig => desig.department === formData.department && desig.status === 'Active'
      );
      setFilteredDesignations(filtered);
      
      // ✅ If editing and the current designation is not in filtered list,
      // add it to the list so it shows up
      if (isEditing && formData.designation) {
        const existsInFiltered = filtered.some(d => d.designation_name === formData.designation);
        const existsInFull = designations.some(d => d.designation_name === formData.designation);
        
        // If designation exists in full list but not in filtered, add it
        if (existsInFull && !existsInFiltered) {
          const currentDesig = designations.find(d => d.designation_name === formData.designation);
          if (currentDesig) {
            setFilteredDesignations(prev => [currentDesig, ...prev]);
          }
        }
      }
    } else {
      // ✅ If no department selected, show all designations (for editing)
      if (isEditing && formData.designation) {
        const currentDesig = designations.find(d => d.designation_name === formData.designation);
        if (currentDesig) {
          setFilteredDesignations([currentDesig]);
        } else {
          setFilteredDesignations([]);
        }
      } else {
        setFilteredDesignations([]);
      }
    }
  }, [formData.department, designations, formData.designation, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'department') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        designation: '' // Reset designation when department changes
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.fullName || !formData.email) {
        setError('Full name and email are required');
        setLoading(false);
        return;
      }

      if (!formData.nic) {
        setError('NIC number is required for user account creation');
        setLoading(false);
        return;
      }

      const employeeData = {
        employeeId: formData.employeeId.trim() || undefined,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone || null,
        department: formData.department || null,
        designation: formData.designation || null,
        joinDate: formData.joinDate || null,
        address: formData.address || null,
        status: formData.status || 'Active',
        dob: formData.dob || null,
        nic: formData.nic.trim(),
        gender: formData.gender || null,
        maritalStatus: formData.maritalStatus || null,
        emergencyContact: formData.emergencyContact || null,
        initialPassword: formData.initialPassword,
        userRole: formData.userRole || 'EMPLOYEE'
      };

      let employeeResponse;
      if (isEditing) {
        employeeResponse = await api.put(`/employees/${editData.id}`, employeeData);
        setSuccess('Employee updated successfully!');
          if (onSuccess) onSuccess();
      } else {
        employeeResponse = await api.post('/employees', employeeData);
        setSuccess('Employee added successfully!');

          if (onSuccess) onSuccess();
      }

    } catch (err) {
      console.error('❌ Save error:', err);
      if (err.response?.status === 409) {
        setError(err.response?.data?.error || 'Duplicate entry. Please check email or Employee ID.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || 'Please check your input.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.error || 'Failed to save employee. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (isEditing && editData) {
      const formattedDob = formatDateForInput(editData.dob);
      const formattedJoinDate = formatDateForInput(editData.join_date || editData.joinDate);
      
      setFormData({
        employeeId: editData.employee_id || editData.employeeId || '',
        fullName: editData.full_name || editData.fullName || '',
        email: editData.email || '',
        phone: editData.phone || '',
        department: editData.department || '',
        designation: editData.designation || '',
        joinDate: formattedJoinDate,
        address: editData.address || '',
        status: editData.status || 'Active',
        dob: formattedDob,
        nic: editData.nic || '',
        gender: editData.gender || '',
        maritalStatus: editData.marital_status || editData.maritalStatus || '',
        emergencyContact: editData.emergency_contact || editData.emergencyContact || '',
        userRole: editData.user_role || 'EMPLOYEE'
      });
    } else {
      setFormData({
        employeeId: '',
        fullName: '',
        email: '',
        phone: '',
        department: '',
        designation: '',
        joinDate: '',
        address: '',
        status: 'Active',
        dob: '',
        nic: '',
        gender: '',
        maritalStatus: '',
        emergencyContact: '',
        userRole: 'EMPLOYEE'
      });
      setFilteredDesignations([]);
    }
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="add-employee-container">
      <div className="add-employee-header">
        <h2>
          {isEditing ? '✏️ Edit Employee' : '➕ Add Employee'}
        </h2>
        <button className="close-btn" onClick={handleCancel} type="button">
          <X size={18} />
        </button>
      </div>

      {error && (
        <Alert variant="danger" className="mb-3" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-3" onClose={() => setSuccess('')} dismissible>
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {!isEditing && <div className="form-group"><label>Initial login password *</label><input type="password" name="initialPassword" value={formData.initialPassword || ''} onChange={handleChange} minLength={8} required autoComplete="new-password" /><small>At least 8 characters. Share it directly with the employee.</small></div>}
          {/* Row 1 - Employee ID & Full Name */}
          <div className="form-group">
            <label>Employee ID </label>
            <input 
              type="text" 
              className="form-control" 
              name="employeeId" readOnly={isEditing}
              placeholder="e.g. EMP-1001 or E001" 
              value={formData.employeeId}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Full Name <span className="text-danger">*</span></label>
            <input 
              type="text" 
              className="form-control" 
              name="fullName"
              placeholder="e.g. Kasun Kalhara Perera" 
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          {/* Row 2 - Email & Phone */}
          <div className="form-group">
            <label>Email <span className="text-danger">*</span></label>
            <input 
              type="email" 
              className="form-control" 
              name="email"
              placeholder="name@company.com" 
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input 
              type="text" 
              className="form-control" 
              name="phone"
              placeholder="+94 77 555 0100" 
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          {/* Row 3 - DOB & NIC */}
          <div className="form-group">
            <label>Date of Birth</label>
            <input 
              type="date" 
              className="form-control" 
              name="dob"
              value={formData.dob}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>NIC Number <span className="text-danger">*</span></label>
            <input 
              type="text" 
              className="form-control" 
              name="nic"
              placeholder="e.g. 900123456V" 
              value={formData.nic}
              onChange={handleChange}
              required
            />
          </div>

          {/* Row 4 - Gender & Department */}
          <div className="form-group">
            <label>Gender</label>
            <select 
              className="form-control" 
              name="gender"
              value={formData.gender}
              onChange={handleChange}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Department <span className="text-danger">*</span></label>
            <select 
              className="form-control" 
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.department_id || dept.id} value={dept.department_id || dept.id}>
                  {dept.department_name || dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ FIXED: Row 5 - Designation (Filtered by Department with current value preserved) */}
          <div className="form-group">
            <label>Designation</label>
            <select 
              className="form-control" 
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              disabled={!formData.department && !isEditing}
            >
              <option value="">
                {!formData.department && !isEditing 
                  ? 'Select Department First' 
                  : filteredDesignations.length === 0 
                    ? 'No designations available' 
                    : 'Select Designation'}
              </option>
              {filteredDesignations.map(desig => (
                <option key={desig.id} value={desig.designation_name}>
                  {desig.designation_name} 
                  {isAdmin && desig.basic_salary ? ` (Rs. ${Number(desig.basic_salary).toLocaleString()})` : ''}
                </option>
              ))}
            </select>
            {formData.department && filteredDesignations.length === 0 && !isEditing && (
              <small style={{ color: 'var(--warning)', fontSize: '12px' }}>
                No designations found for this department.
              </small>
            )}
            {isEditing && formData.designation && (
              <small style={{ color: 'var(--ledger)', fontSize: '12px' }}>
                ✅ Current designation: {formData.designation}
              </small>
            )}
          </div>

          {/* Row 6 - Joining Date & Marital Status */}
          <div className="form-group">
            <label>Joining Date</label>
            <input 
              type="date" 
              className="form-control" 
              name="joinDate"
              value={formData.joinDate}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Marital Status</label>
            <select 
              className="form-control" 
              name="maritalStatus"
              value={formData.maritalStatus}
              onChange={handleChange}
            >
              <option value="">Select Marital Status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
          </div>

          {/* Row 7 - Emergency Contact & Address */}
          <div className="form-group">
            <label>Emergency Contact</label>
            <input 
              type="text" 
              className="form-control" 
              name="emergencyContact"
              placeholder="Emergency contact details" 
              value={formData.emergencyContact}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Address</label>
            <textarea 
              className="form-control" 
              name="address"
              placeholder="Street, city, state" 
              value={formData.address}
              onChange={handleChange}
              rows="2"
            />
          </div>

          {/* Row 8 - User Account Type & Status */}
          <div className="form-group">
            <label>
              <UserPlus size={16} className="me-1" /> User Account Type 
            </label>
            <select 
              className="form-control" 
              name="userRole"
              disabled={!isAdmin}
              value={formData.userRole}
              onChange={handleChange}
              required
            >
              <option value="EMPLOYEE">Employee</option>
              {isAdmin && <option value="ADMIN">Admin</option>}
              {(isAdmin || formData.userRole==='HR') && <option value="HR">HR</option>}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select 
              className="form-control" 
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="me-1" /> {isEditing ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save size={16} className="me-1" /> {isEditing ? 'Update Employee' : 'Save Employee'}
              </>
            )}
          </button>
          {!isEditing && (
            <button type="reset" className="btn-secondary" onClick={handleReset}>
              <RefreshCw size={14} className="me-1" /> Reset
            </button>
          )}
          <button type="button" className="btn-text" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddEmployeeForm;