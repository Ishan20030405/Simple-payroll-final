import { parseAttendanceCsv } from './parseAttendanceCsv';
import { calculateAttendance } from './attendanceMath';
// src/features/attendance/AttendancePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Plus,
  ChevronDown,
  X,
  Pencil,
  Trash2,
  Save,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './AttendancePage.css';
import { createPortal } from 'react-dom';

// Helper function to check if a date is Sunday without timezone drift
const isSunday = (dateString) => {
    if (!dateString) return false;
    const [year, month, day] = String(dateString).slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return false;
    const date = new Date(year, month - 1, day);
    return date.getDay() === 0; // 0 = Sunday
};

const normalizeDate = (dateValue) => String(dateValue || '').slice(0, 10);

const STATUS_CONFIG = {
  Present: { className: 'status-present', label: 'Present' },
  Late: { className: 'status-late', label: 'Late' },
  Absent: { className: 'status-absent', label: 'Absent' },
  Leave: { className: 'status-leave', label: 'Leave' },
};

const AttendancePage = () => {
  const { api } = useAuth();
  const fileInputRef = useRef(null);
  
  const today = new Date();
  const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [selectedDate, setSelectedDate] = useState(formattedDate);
  const [selectedDept, setSelectedDept] = useState('All Departments');

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [totalEmployees, setTotalEmployees] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [workingHours, setWorkingHours] = useState(8);
  const [checkInTime, setCheckInTime] = useState('09:00');

  // Edit/Delete State
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    check_in: '',
    check_out: '',
    status: 'Present',
    working_hours: 0,
    overtime: 0
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Modal State for Add
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    date: formattedDate,
    check_in: '',
    check_out: '',
    working_hours: 0,
    overtime: '',
    status: 'Present',
    remarks: ''
  });

  const normalizeAttendanceRecord = (record) => {
    const normalized = {
      ...record,
      id: record.id ?? record.attendance_id ?? record.record_id,
      employee_id: record.employee_id ?? record.employeeId ?? record.attendance_employee_id,
      name: record.full_name ?? record.name ?? 'Unknown Employee',
      department: record.department ?? 'Unassigned',
      date: normalizeDate(record.date)
    };

    return normalized;
  };

  const fetchData = React.useCallback(async () => {
    try {
      // Fetch stats
      const statsRes = await api.get('/employees/stats');
      setTotalEmployees(statsRes.data.total ?? statsRes.data.count ?? 0);
      setStatsError(false);

      // Fetch departments
      const deptRes = await api.get('/departments');
      setDepartments(deptRes.data);

      // Fetch employees for modal
      const empRes = await api.get('/employees');
      setEmployees(empRes.data.filter(e => e.status === 'Active'));

      // Fetch payroll settings once
      let settings = null;
      try {
          const settingsRes = await api.get('/payroll-settings/attendance');
          settings = settingsRes.data;
          setWorkingHours(Number(settingsRes.data.working_hours ?? 8));
          setCheckInTime((settingsRes.data.check_in_time || '09:00').slice(0, 5));
      } catch (e) {
          console.warn('Failed to fetch payroll settings', e);
      }
      
      // Fetch attendance for selected date
      const attRes = await api.get(`/attendance?date=${selectedDate}`);
      
      // Process records to calculate Sunday OT properly
      const processedRecords = attRes.data.map((record) => {
        const normalized = normalizeAttendanceRecord(record);

        if (isSunday(normalized.date)) {
          return {
            ...normalized,
            working_hours: 0,
            overtime: Number(normalized.overtime ?? normalized.working_hours ?? 0),
            is_sunday: true,
            sunday_ot_calculated: true
          };
        }
        return {
          ...normalized,
          is_sunday: isSunday(normalized.date),
          sunday_ot_calculated: false
        };
      });
      
      setAttendanceRecords(processedRecords);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setStatsError(true);
    }
  }, [api, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived Stats
  const presentToday = attendanceRecords.filter(r => r.status === 'Present').length;
  const absentToday = attendanceRecords.filter(r => r.status === 'Absent').length;
  const lateArrivals = attendanceRecords.filter(r => r.status === 'Late').length;

  const filteredRecords = attendanceRecords.filter(r =>
    selectedDept === 'All Departments' || r.department === selectedDept
  );

  const attendedEmployeeIds = new Set(
    attendanceRecords
      .filter(record => normalizeDate(record.date) === formData.date)
      .flatMap(record => [record.employee_id, record.attendance_employee_id])
      .filter(Boolean)
      .map(String)
  );
  const availableEmployees = employees.filter(emp =>
    !attendedEmployeeIds.has(String(emp.id)) &&
    !attendedEmployeeIds.has(String(emp.employee_id))
  );

  // Helper to generate initials and color
  const getAvatarProps = (name) => {
    if (!name) return { initials: 'U', avatarColor: '#dbeafe', avatarText: '#2563eb' };
    const parts = name.split(' ');
    const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0];
    return {
      initials: initials.toUpperCase(),
      avatarColor: '#dbeafe',
      avatarText: '#2563eb'
    };
  };

  // ============================================
  // EDIT HANDLERS
  // ============================================
  const handleEditClick = (record) => {
    setEditingId(record.id);
    setEditFormData({
      check_in: record.check_in || '',
      check_out: record.check_out || '',
      status: record.status || 'Present',
      working_hours: isSunday(record.date) ? 0 : (record.working_hours || 0),
      overtime: isSunday(record.date) ? (record.overtime || record.working_hours || 0) : (record.overtime || 0)
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'status' && (value === 'Absent' || value === 'Leave')) {
        updated.check_in = '';
        updated.check_out = '';
        updated.working_hours = 0;
        updated.overtime = 0;
      }
      return updated;
    });
  };

  const handleSaveEdit = async (recordId) => {
    try {
      const currentRecord = attendanceRecords.find((item) => String(item.id ?? item.attendance_id ?? item.record_id) === String(recordId)) || null;
      const recordDate = currentRecord?.date || selectedDate;

      const calculated = calculateHours(editFormData.check_in,editFormData.check_out,recordDate);
      const working_hours = ['Absent','Leave','Holiday'].includes(editFormData.status)?0:calculated.working_hours;
      const overtime = ['Absent','Leave','Holiday'].includes(editFormData.status)?0:calculated.overtime;

      const payload = {
        check_in: editFormData.check_in || null,
        check_out: editFormData.check_out || null,
        status: editFormData.status || 'Present',
        working_hours: working_hours,
        overtime: overtime
      };

      const finalRecordId = currentRecord?.id ?? currentRecord?.attendance_id ?? currentRecord?.record_id ?? recordId;
      const response = await api.put(`/attendance/${finalRecordId}`, payload);
      if (!response || response.status >= 400) {
        throw new Error('Attendance update request did not complete successfully');
      }

      await fetchData();
      setEditingId(null);
      setEditFormData({
        check_in: '',
        check_out: '',
        status: 'Present',
        working_hours: 0,
        overtime: 0
      });
    } catch (err) {
      console.error('Failed to update attendance:', err);
      const status = err.response?.status;
      const message = err.response?.data?.message || err.response?.data?.error || err.message;

      if (status === 401 || status === 403) {
        alert(`Failed to update attendance: ${message}`);
      } else {
        alert(message);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({
      check_in: '',
      check_out: '',
      status: 'Present',
      working_hours: 0,
      overtime: 0
    });
  };

  // ============================================
  // DELETE HANDLERS
  // ============================================
  const handleDeleteClick = (record) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    
    const finalDeleteId = recordToDelete.id ?? recordToDelete.attendance_id ?? recordToDelete.record_id;
    if (!finalDeleteId) {
      alert('This attendance record has no valid ID and cannot be deleted.');
      return;
    }

    setDeleting(true);
    try {
      const response = await api.delete(`/attendance/${finalDeleteId}`);
      if (!response || response.status >= 400) {
        throw new Error('Attendance delete request did not complete successfully');
      }

      await fetchData();
      setShowDeleteModal(false);
      setRecordToDelete(null);
    } catch (err) {
      console.error('Failed to delete attendance:', err);
      const status = err.response?.status;
      const message = err.response?.data?.message || err.response?.data?.error || err.message;

      if (status === 401 || status === 403) {
        alert(`Failed to delete attendance: ${message}`);
      } else {
        alert(message);
      }
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setRecordToDelete(null);
  };

  // ============================================
  // ADD HANDLERS
  // ============================================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      if (name === 'date') {
        updated.employee_id = '';
      }
      
      if (name === 'status' && (value === 'Absent' || value === 'Leave')) {
        updated.check_in = '';
        updated.check_out = '';
        updated.working_hours = 0;
        updated.overtime = 0;
      }
      
      if (name === 'check_in' || name === 'check_out') {
        const calc = calculateHours(
          name === 'check_in' ? value : prev.check_in,
          name === 'check_out' ? value : prev.check_out,
          formData.date || prev.date || selectedDate
        );
        updated.working_hours = calc.working_hours;
        updated.overtime = calc.overtime;
        if (updated.check_in && updated.check_out) {
          updated.status = calc.status;
        }
      }
      return updated;
    });
  };

  const calculateHours = (inTime,outTime,dateValue=null) => calculateAttendance(inTime,outTime,dateValue||selectedDate,{working_hours:workingHours,check_in_time:checkInTime});

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        const response = await api.post('/attendance', formData);
        if (!response || response.status >= 400) {
          throw new Error('Attendance create request did not complete successfully');
        }

      setIsModalOpen(false);
      fetchData();
      setFormData({
        employee_id: '',
        date: formattedDate,
        check_in: '',
        check_out: '',
        working_hours: 0,
        overtime: '',
        status: 'Present',
        remarks: ''
      });
    } catch (err) {
      console.error('Failed to add manual record:', err);
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.response?.data?.error || err.response?.data?.details || err.message || 'Error saving record';

      if (status === 401 || status === 403) {
        alert(`Error: ${msg}`);
      } else {
        alert(msg);
      }
    }
  };

  // ============================================
  // CSV FILE UPLOAD
  // ============================================
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const records = parseAttendanceCsv(evt.target.result);

        // Send to API
        const res = await api.post('/attendance/bulk', { records });
        if (!res || res.status >= 400) {
          throw new Error('Bulk import request did not complete successfully');
        }

        alert(`✅ Import successful: ${res.data.inserted} records inserted.`);
        fetchData();

      } catch (err) {
        console.error('❌ Import error:', err);
        console.error('❌ Response:', err.response?.data);
        const status = err.response?.status;
        const errorMsg = err.response?.data?.message || err.message || 'Unknown error';

        if (status === 401 || status === 403) {
          alert(`❌ Error importing CSV: ${errorMsg}`);
        } else {
          alert(errorMsg);
        }
      }
    };
    
    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      alert('Error reading file. Please try again.');
    };
    
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ============================================
  // RENDER ATTENDANCE ROW
  // ============================================
  const renderAttendanceRow = (record) => {
    const avatar = getAvatarProps(record.name);
    const isEditing = editingId === record.id;
    const isSundayRecord = isSunday(record.date);

    if (isEditing) {
      return (
        <tr key={record.id} className="att-table-row editing-row">
          <td>
            <div className="att-employee-cell">
              <div className="att-avatar" style={{ background: avatar.avatarColor, color: avatar.avatarText }}>
                {avatar.initials}
              </div>
              <div className="att-emp-info">
                <span className="att-emp-name">{record.name}</span>
                <span className="att-emp-id">{record.employee_id}</span>
              </div>
            </div>
          </td>
          <td className="att-td-dept">{record.department}</td>
          <td className="att-td-time">
            <input
              type="time"
              className="att-edit-input"
              name="check_in"
              value={editFormData.check_in}
              onChange={handleEditChange}
            />
          </td>
          <td className="att-td-time">
            <input
              type="time"
              className="att-edit-input"
              name="check_out"
              value={editFormData.check_out}
              onChange={handleEditChange}
            />
          </td>
          <td className="att-td-hrs">
            <input
              type="number"
              className="att-edit-input-small"
              name="working_hours"
              value={editFormData.working_hours}
              onChange={handleEditChange}
              step="0.5"
              min="0"
              max="24"
            />
          </td>
          <td className="att-td-ot">
            <input
              type="number"
              className="att-edit-input-small"
              name="overtime"
              value={editFormData.overtime}
              onChange={handleEditChange}
              step="0.5"
              min="0"
            />
          </td>
          <td>
            <select
              className="att-edit-select"
              name="status"
              value={editFormData.status}
              onChange={handleEditChange}
            >
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
              <option value="Leave">Leave</option>
            </select>
          </td>
          <td>
            <div className="att-edit-actions">
              <button 
                className="att-save-btn"
                onClick={() => handleSaveEdit(record.id)}
                title="Save"
              >
                <Save size={16} />
              </button>
              <button 
                className="att-cancel-btn"
                onClick={handleCancelEdit}
                title="Cancel"
              >
                <X size={16} />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr key={record.id} className="att-table-row">
        <td>
          <div className="att-employee-cell">
            <div className="att-avatar" style={{ background: avatar.avatarColor, color: avatar.avatarText }}>
              {avatar.initials}
            </div>
            <div className="att-emp-info">
              <span className="att-emp-name">{record.name}</span>
              <span className="att-emp-id">{record.employee_id}</span>
            </div>
          </div>
        </td>
        <td className="att-td-dept">{record.department}</td>
        <td className="att-td-time">{record.check_in || '--:--'}</td>
        <td className="att-td-time">{record.check_out || '--:--'}</td>
        <td className="att-td-hrs">{record.working_hours || 0}h</td>
        {/* ✅ Overtime column with Sunday badge */}
        <td className="att-td-ot">
          {record.overtime || 0}h
          {isSundayRecord && record.overtime > 0 && (
            <span className="sunday-badge" title="Sunday OT Rate Applied">Sunday</span>
          )}
        </td>
        <td>
          <span className={`att-status-badge ${STATUS_CONFIG[record.status]?.className || 'status-present'}`}>
            {STATUS_CONFIG[record.status]?.label || record.status}
          </span>
        </td>
        <td>
          <div className="att-actions">
            <button 
              className="att-action-btn edit"
              onClick={() => handleEditClick(record)}
              title="Edit"
            >
              <Pencil size={16} />
            </button>
            <button 
              className="att-action-btn delete"
              onClick={() => handleDeleteClick(record)}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="attendance-page">
      {/* Page Header */}
      <div className="att-page-header">
        <div className="att-title-block">
          <h1 className="att-title">Attendance</h1>
          <p className="att-subtitle">Manage daily check-ins and overtime records.</p>
        </div>
        <div className="att-header-actions">
          <button className="att-btn-import" onClick={() => {
            const csvContent = "data:text/csv;charset=utf-8,employee_id,date,check_in,check_out,status\nE001,2026-09-01,09:00,17:00,Present\nE002,2026-09-01,09:15,17:30,Late\nE003,2026-09-01,,,Absent\nE004,2026-09-01,,,Leave";
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "attendance_template.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }} style={{ marginRight: '8px', background: '#e2e8f0', color: '#334155' }}>
            Template
          </button>
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button className="att-btn-import" onClick={() => fileInputRef.current?.click()}>
            <Upload size={15} />
            Import Data
          </button>
          <button className="att-btn-add" onClick={() => {
            setFormData(prev => ({ ...prev, date: selectedDate, employee_id: '' }));
            setIsModalOpen(true);
          }}>
            <Plus size={15} />
            Add Manual
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="att-stats-grid">
        <div className="att-stat-card">
          <div className="att-stat-info">
            <span className="att-stat-label">Total Employees</span>
            {totalEmployees === null && !statsError ? (
              <span className="att-stat-skeleton" />
            ) : statsError ? (
              <span className="att-stat-value att-stat-error" title="Could not load from database">—</span>
            ) : (
              <span className="att-stat-value">{totalEmployees}</span>
            )}
          </div>
          <div className="att-stat-icon att-icon-blue">
            <Users size={22} />
          </div>
        </div>

        <div className="att-stat-card">
          <div className="att-stat-info">
            <span className="att-stat-label">Present Today</span>
            <span className="att-stat-value">{presentToday}</span>
          </div>
          <div className="att-stat-icon att-icon-green">
            <CheckCircle size={22} />
          </div>
        </div>

        <div className="att-stat-card">
          <div className="att-stat-info">
            <span className="att-stat-label">Absent Today</span>
            <span className="att-stat-value">{absentToday}</span>
          </div>
          <div className="att-stat-icon att-icon-red">
            <XCircle size={22} />
          </div>
        </div>

        <div className="att-stat-card">
          <div className="att-stat-info">
            <span className="att-stat-label">Late Arrivals</span>
            <span className="att-stat-value">{lateArrivals}</span>
          </div>
          <div className="att-stat-icon att-icon-orange">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="att-table-card">
        <div className="att-filters">
          <div className="att-date-input-wrapper">
            <input
              type="date"
              className="att-date-input"
              value={selectedDate}
              onChange={e => {
                setSelectedDate(e.target.value);
                setFormData(prev => ({ ...prev, date: e.target.value, employee_id: '' }));
              }}
              style={{ width: '160px' }}
            />
          </div>

          <div className="att-select-wrapper">
            <select
              className="att-dept-select"
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
            >
              <option value="All Departments">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.department_name}>{dept.department_name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="att-select-chevron" />
          </div>
        </div>

        <div className="att-table-wrapper">
          <table className="att-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Working Hrs</th>
                <th>Overtime</th>
                <th>Status</th>
                <th className="att-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>
                    No records found for this date.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => renderAttendanceRow(record))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Manual Modal */}
      {isModalOpen && createPortal(
        <div className="att-modal-overlay">
          <div className="att-modal">
            <div className="att-modal-header">
              <h2 className="att-modal-title">Add Manual Attendance</h2>
              <button className="att-modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="att-modal-body">
                <div className="att-form-group">
                  <label className="att-form-label">Employee</label>
                  <select 
                    className="att-form-select" 
                    name="employee_id" 
                    value={formData.employee_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Employee...</option>
                    {availableEmployees.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.full_name} ({emp.employee_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="att-form-group">
                  <label className="att-form-label">Date</label>
                  <input 
                    type="date" 
                    className="att-form-input" 
                    name="date"
                    value={formData.date}
                    onChange={(e) => {
                      handleInputChange(e);
                      setSelectedDate(e.target.value);
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="att-form-group">
                    <label className="att-form-label">Check In Time</label>
                    <input 
                      type="time" 
                      className="att-form-input"
                      name="check_in"
                      value={formData.check_in}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="att-form-group">
                    <label className="att-form-label">Check Out Time</label>
                    <input 
                      type="time" 
                      className="att-form-input"
                      name="check_out"
                      value={formData.check_out}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="att-form-group">
                    <label className="att-form-label">Attendance Status</label>
                    <select
                      className="att-form-select"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="Present">Present</option>
                      <option value="Late">Late</option>
                      <option value="Absent">Absent</option>
                      <option value="Leave">Leave</option>
                    </select>
                  </div>
                  <div className="att-form-group">
                    <label className="att-form-label">Overtime Hours</label>
                    <input 
                      type="text" 
                      className="att-form-input" 
                      name="overtime"
                      value={formData.overtime}
                      onChange={handleInputChange}
                      placeholder="e.g. 1.5"
                    />
                  </div>
                </div>

                <div className="att-form-group">
                  <label className="att-form-label">Remarks (Optional)</label>
                  <input 
                    type="text" 
                    className="att-form-input" 
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    placeholder="Reason for late/manual entry..."
                  />
                </div>
              </div>
              
              <div className="att-modal-footer">
                <button type="button" className="att-btn-cancel" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="att-btn-save">
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className="att-modal-overlay">
          <div className="att-modal" style={{ maxWidth: '400px' }}>
            <div className="att-modal-header" style={{ borderBottomColor: '#fee2e2' }}>
              <h2 className="att-modal-title" style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} /> Confirm Delete
              </h2>
              <button className="att-modal-close" onClick={cancelDelete}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ marginBottom: '8px', fontSize: '15px' }}>
                Are you sure you want to delete this attendance record?
              </p>
              <p style={{ color: '#6b7280', fontSize: '13px' }}>
                <strong>{recordToDelete?.name}</strong> • {recordToDelete?.date}
              </p>
              <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px' }}>
                ⚠️ This action cannot be undone!
              </p>
            </div>
            
            <div className="att-modal-footer" style={{ justifyContent: 'center' }}>
              <button type="button" className="att-btn-cancel" onClick={cancelDelete} disabled={deleting}>
                Cancel
              </button>
              <button 
                type="button" 
                className="att-btn-delete"
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '8px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  opacity: deleting ? 0.7 : 1
                }}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AttendancePage;