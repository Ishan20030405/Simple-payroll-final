// src/features/settings/SettingsPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Building2, Network, Briefcase, Banknote, 
  CopyPlus, SlidersHorizontal, Upload, Plus, 
  Search, Pencil, Trash2, X, Eye, CheckCircle2, Loader2, Receipt
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './SettingsPage.css';

const SettingsPage = () => {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  const [activeModal, setActiveModal] = useState(null);
  const [companyInformation, setCompanyInformation] = useState({
    company_name: 'Northfield (Pvt) Ltd',
    email: 'admin@northfield.co',
    registration_number: 'REG-9938472',
    tax_number: 'TAX-449-1120',
    phone_number: '+1 415 555 0100',
    website: 'www.northfield.co',
    company_address: '100 Tech Park Blvd, Suite 400, San Francisco, CA',
    base_currency: 'USD ($)',
    time_zone: 'UTC -08:00 (Pacific Time)'
  });
  const [savedCompanyInformation, setSavedCompanyInformation] = useState(companyInformation);
  const [companyEditing, setCompanyEditing] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const companyLogoInputRef = useRef(null);

  // ============================================
  // SALARY STRUCTURES STATE
  // ============================================
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salarySearch, setSalarySearch] = useState('');

  // Department state
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptError, setDeptError] = useState(null);
  const [deptSearch, setDeptSearch] = useState('');

  // Employee list state (for department head dropdown)
  const [employees, setEmployees] = useState([]);

  // Department form state
  const [deptForm, setDeptForm] = useState({
    id: null,
    department_id: '',
    department_name: '',
    department_head: '',
    status: 'Active'
  });
  const [deptFormSubmitting, setDeptFormSubmitting] = useState(false);
  const [deptFormError, setDeptFormError] = useState(null);

  // Designation state
  const [designations, setDesignations] = useState([]);
  const [desigSearch, setDesigSearch] = useState('');
  const [desigForm, setDesigForm] = useState({
    id: null,
    designation_name: '',
    department: '',
    basic_salary: '',
    ot_eligible: 1,
    status: 'Active'
  });
  const [desigFormSubmitting, setDesigFormSubmitting] = useState(false);
  const [desigFormError, setDesigFormError] = useState(null);

  // Payroll Settings State (for rate calculations)
  const [payrollSettings, setPayrollSettings] = useState({
    working_days: 26,
    working_hours: 8,
    ot_rate: 1.5,
    sunday_ot_rate: 2.0,
    check_in_time: '09:00',
    check_out_time: '17:00',
    salary_method: 'Monthly',
    epf_percentage: 12,
    etf_percentage: 3
  });

  // Salary Structure Form State
  const [salaryForm, setSalaryForm] = useState({
    department: '',
    designation: '',
    basic_pay: '',
    attendance_allowance: '',
    special_allowance: '',
    other_allowance: '',
    travelling_allowance: '',
    normal_ot_rate: '',
    sunday_ot_rate: '',
    late_rate: '',
    no_pay_rate: '',
    epf: '',
    other_deductions: ''
  });
  const [salaryFormSubmitting, setSalaryFormSubmitting] = useState(false);
  const [salaryFormError, setSalaryFormError] = useState(null);

  // Tax Settings State
  const [taxSettings, setTaxSettings] = useState([]);
  const [taxSettingsLoading, setTaxSettingsLoading] = useState(false);
  const [taxSettingsError, setTaxSettingsError] = useState(null);
  const [taxSettingsSuccess, setTaxSettingsSuccess] = useState(null);
  const [isEditingTax, setIsEditingTax] = useState(false);

  const fetchTaxSettings = useCallback(async () => {
    setTaxSettingsLoading(true);
    try {
      const res = await api.get('/tax-settings');
      if (res.data.success) {
        setTaxSettings(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tax settings:', err);
    } finally {
      setTaxSettingsLoading(false);
    }
  }, [api]);

  const handleTaxChange = (index, field, value) => {
    const newSettings = [...taxSettings];
    newSettings[index][field] = value;
    setTaxSettings(newSettings);
  };

  const addTaxBracket = () => {
    setTaxSettings([...taxSettings, { monthly_salary_range: '', tax_rate: '' }]);
  };

  const removeTaxBracket = (index) => {
    const newSettings = taxSettings.filter((_, i) => i !== index);
    setTaxSettings(newSettings);
  };

  const saveTaxSettings = async () => {
    setTaxSettingsLoading(true);
    setTaxSettingsError(null);
    setTaxSettingsSuccess(null);
    try {
      const res = await api.put('/tax-settings', { brackets: taxSettings });
      if (res.data.success) {
        setTaxSettingsSuccess('Tax settings saved successfully!');
        setTaxSettings(res.data.data);
        setIsEditingTax(false);
        setTimeout(() => setTaxSettingsSuccess(null), 3000);
      }
    } catch (err) {
      setTaxSettingsError(err.response?.data?.message || 'Failed to save tax settings');
    } finally {
      setTaxSettingsLoading(false);
    }
  };

  useEffect(() => {
    const fetchCompanyInformation = async () => {
      try {
        const response = await api.get('/company-information');
        if (response.data) {
          const savedInformation = { ...companyInformation, ...response.data };
          setCompanyInformation(savedInformation);
          setSavedCompanyInformation(savedInformation);
        }
      } catch (error) {
        console.error('Failed to fetch company information:', error);
      }
    };

    fetchCompanyInformation();
  }, [api]);

  const loadCompanyLogo = useCallback(async () => {
    try {
      const response = await api.get('/company-information/logo', { responseType: 'blob' });
      const logoUrl = URL.createObjectURL(response.data);
      setCompanyLogoUrl(previousUrl => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return logoUrl;
      });
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Failed to fetch company logo:', error);
      }
    }
  }, [api]);

  useEffect(() => {
    loadCompanyLogo();
    return () => setCompanyLogoUrl(previousUrl => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return '';
    });
  }, [loadCompanyLogo]);

  const uploadCompanyLogo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Please select an image file.');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      window.alert('Logo image must be 30 MB or smaller.');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);
    try {
      await api.post('/company-information/logo', formData, { timeout: 120000 });
      await loadCompanyLogo();
      window.dispatchEvent(new Event('company-information-updated'));
    } catch (error) {
      window.alert(error.response?.data?.message || 'Failed to save company logo.');
    }
  };

  const handleCompanyInformationChange = (event) => {
    const { name, value } = event.target;
    setCompanyInformation(prev => ({ ...prev, [name]: value }));
  };

  const saveCompanyInformation = async () => {
    if (!companyEditing) {
      setCompanyEditing(true);
      return;
    }

    setCompanySaving(true);
    try {
      const response = await api.put('/company-information', companyInformation);
      const savedInformation = { ...companyInformation, ...(response.data.data || {}) };
      setCompanyInformation(savedInformation);
      setSavedCompanyInformation(savedInformation);
      setCompanyEditing(false);
      window.dispatchEvent(new Event('company-information-updated'));
    } catch (error) {
      console.error('Failed to save company information:', error);
    } finally {
      setCompanySaving(false);
    }
  };

  const discardCompanyInformation = () => {
    setCompanyInformation(savedCompanyInformation);
    setCompanyEditing(false);
  };

  const resetCompanyInformation = async () => {
    if (!window.confirm('Reset all company information to default values?')) return;

    setCompanySaving(true);
    try {
      const response = await api.post('/company-information/reset');
      const resetInformation = response.data.data;
      setCompanyInformation(resetInformation);
      setSavedCompanyInformation(resetInformation);
      setCompanyLogoUrl(previousUrl => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return '';
      });
      setCompanyEditing(false);
      window.dispatchEvent(new Event('company-information-updated'));
    } catch (error) {
      window.alert(error.response?.data?.message || 'Failed to reset company information.');
    } finally {
      setCompanySaving(false);
    }
  };

  // ============================================
  // FETCH SALARY STRUCTURES
  // ============================================
  const fetchSalaryStructures = useCallback(async () => {
    setSalaryLoading(true);
    try {
      const res = await api.get('/salary-structures');
      setSalaryStructures(res.data || []);
    } catch (err) {
      console.error('Failed to fetch salary structures:', err);
    } finally {
      setSalaryLoading(false);
    }
  }, [api]);

  // ============================================
  // EDIT SALARY STRUCTURE
  // ============================================
  const handleEditSalaryStructure = (structure) => {
    setSalaryForm({
      department: structure.department || '',
      designation: structure.designation || '',
      basic_pay: structure.basic_pay || '',
      attendance_allowance: structure.attendance_allowance || '',
      special_allowance: structure.special_allowance || '',
      other_allowance: structure.other_allowance || '',
      travelling_allowance: structure.travelling_allowance || '',
      normal_ot_rate: structure.normal_ot_rate || '',
      sunday_ot_rate: structure.sunday_ot_rate || '',
      late_rate: structure.late_rate || '',
      no_pay_rate: structure.no_pay_rate || '',
      epf: structure.epf || '',
      other_deductions: structure.other_deductions || ''
    });
    setSalaryFormError(null);
    setActiveModal('salary');
  };

  // ============================================
  // DELETE SALARY STRUCTURE
  // ============================================
  const handleDeleteSalaryStructure = async (id) => {
    if (!window.confirm('Are you sure you want to delete this salary structure?')) return;
    try {
      await api.delete(`/salary-structures/${id}`);
      await fetchSalaryStructures();
      alert('Salary structure deleted successfully!');
    } catch (err) {
      console.error('Failed to delete salary structure:', err);
      alert(err.response?.data?.message || 'Failed to delete salary structure.');
    }
  };

  // ============================================
  // Payroll Settings - Edit/Save State
  // ============================================
  const [isEditingPayroll, setIsEditingPayroll] = useState(false);
  const [payrollSettingsLoading, setPayrollSettingsLoading] = useState(false);
  const [payrollSettingsError, setPayrollSettingsError] = useState(null);
  const [payrollSettingsSuccess, setPayrollSettingsSuccess] = useState(null);

  // ============================================
  // Fetch Payroll Settings
  // ============================================
  const fetchPayrollSettings = useCallback(async () => {
    setPayrollSettingsLoading(true);
    try {
      const res = await api.get('/payroll-settings');
      if (res.data) {
        setPayrollSettings({
          working_days: parseFloat(res.data.working_days) || 26,
          working_hours: parseFloat(res.data.working_hours) || 8,
          ot_rate: Number(res.data.ot_rate ?? 1.5),
          sunday_ot_rate: Number(res.data.sunday_ot_rate ?? 2.0),
          check_in_time: res.data.check_in_time || '09:00',
          check_out_time: res.data.check_out_time || '17:00',
          salary_method: res.data.salary_method || 'Monthly',
          epf_percentage: Number(res.data.epf_percentage ?? 12),
          etf_percentage: Number(res.data.etf_percentage ?? 3)
        });
      }
    } catch (err) {
      console.error('Failed to fetch payroll settings:', err);
    } finally {
      setPayrollSettingsLoading(false);
    }
  }, [api]);

  // ============================================
  // Handle Payroll Settings Change
  // ============================================
  const handlePayrollSettingChange = (e) => {
    const { name, value } = e.target;
    setPayrollSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ============================================
  // Toggle Edit Mode
  // ============================================
  const togglePayrollEdit = () => {
    if (isEditingPayroll) {
      savePayrollSettings();
    } else {
      setIsEditingPayroll(true);
      setPayrollSettingsError(null);
      setPayrollSettingsSuccess(null);
    }
  };

  // ============================================
  // Save Payroll Settings
  // ============================================
  const savePayrollSettings = async () => {
    setPayrollSettingsLoading(true);
    setPayrollSettingsError(null);
    setPayrollSettingsSuccess(null);

    try {
      const payload = {
        working_days: parseInt(payrollSettings.working_days) || 26,
        working_hours: Number(payrollSettings.working_hours ?? 8),
        ot_rate: Number(payrollSettings.ot_rate ?? 1.5),
        sunday_ot_rate: Number(payrollSettings.sunday_ot_rate ?? 2.0),
        check_in_time: payrollSettings.check_in_time || '09:00',
        check_out_time: payrollSettings.check_out_time || '17:00',
        salary_method: payrollSettings.salary_method || 'Monthly',
        epf_percentage: Number(payrollSettings.epf_percentage ?? 12),
        etf_percentage: Number(payrollSettings.etf_percentage ?? 3)
      };

      await api.put('/payroll-settings', payload);
      setPayrollSettingsSuccess('Settings saved successfully!');
      setIsEditingPayroll(false);
      
      await fetchPayrollSettings();
      
      setTimeout(() => setPayrollSettingsSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save payroll settings:', err);
      setPayrollSettingsError(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setPayrollSettingsLoading(false);
    }
  };

  // ============================================
  // Cancel Edit
  // ============================================
  const cancelPayrollEdit = async () => {
    setIsEditingPayroll(false);
    setPayrollSettingsError(null);
    setPayrollSettingsSuccess(null);
    await fetchPayrollSettings();
  };

  // ============================================
  // Reset to Default
  // ============================================
  const resetPayrollSettings = async () => {
    if (!window.confirm('Are you sure you want to reset all payroll settings to default values?')) {
      return;
    }

    setPayrollSettingsLoading(true);
    setPayrollSettingsError(null);
    setPayrollSettingsSuccess(null);

    try {
      await api.post('/payroll-settings/reset');
      
      setPayrollSettings({
        working_days: 26,
        working_hours: 8,
        ot_rate: 1.5,
        sunday_ot_rate: 2.0,
        check_in_time: '09:00',
        check_out_time: '17:00',
        salary_method: 'Monthly',
        epf_percentage: 12,
        etf_percentage: 3
      });
      
      setPayrollSettingsSuccess('Settings reset to defaults successfully!');
      setIsEditingPayroll(false);
      
      setTimeout(() => setPayrollSettingsSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to reset payroll settings:', err);
      setPayrollSettingsError(err.response?.data?.message || 'Failed to reset settings.');
    } finally {
      setPayrollSettingsLoading(false);
    }
  };

  // ---- Fetch departments ----
  const fetchDepartments = useCallback(async () => {
    setDeptLoading(true);
    setDeptError(null);
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      setDeptError('Failed to load departments.');
    } finally {
      setDeptLoading(false);
    }
  }, [api]);

  // ---- Fetch employees (for department head dropdown) ----
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  }, [api]);

  // ---- Fetch designations ----
  const fetchDesignations = useCallback(async () => {
    try {
      const res = await api.get('/designations');
      setDesignations(res.data);
    } catch (err) {
      console.error('Failed to fetch designations:', err);
    }
  }, [api]);

  // ---- Initial data fetch ----
  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
    fetchDesignations();
    fetchPayrollSettings();
    fetchSalaryStructures();
    fetchTaxSettings();
  }, [fetchDepartments, fetchEmployees, fetchDesignations, fetchPayrollSettings, fetchSalaryStructures, fetchTaxSettings]);

  // ---- Save department ----
  const handleSaveDepartment = async () => {
    if (!deptForm.department_id?.trim() || !deptForm.department_name?.trim()) {
      setDeptFormError('Department ID and name are required.');
      return;
    }
    setDeptFormSubmitting(true);
    setDeptFormError(null);
    try {
      if (deptForm.id) {
        await api.put(`/departments/${deptForm.department_id}`, {
          department_name: deptForm.department_name,
          department_head: deptForm.department_head,
          status: deptForm.status
        });
      } else {
        await api.post('/departments', {
          department_id: deptForm.department_id,
          department_name: deptForm.department_name,
          department_head: deptForm.department_head,
          status: deptForm.status
        });
      }
      await fetchDepartments();
      setDeptForm({ id: null, department_id: '', department_name: '', department_head: '', status: 'Active' });
      setActiveModal(null);
    } catch (err) {
      console.error('Failed to save department:', err);
      const msg = err.response?.data?.message || 'Failed to save department.';
      setDeptFormError(msg);
    } finally {
      setDeptFormSubmitting(false);
    }
  };

  // ---- Edit department ----
  const handleEditDepartment = (dept) => {
    setDeptForm({
      id: dept.department_id || null,
      department_id: dept.department_id || '',
      department_name: dept.department_name || '',
      department_head: dept.department_head || '',
      status: dept.status || 'Active'
    });
    setDeptFormError(null);
    setActiveModal('department');
  };

  // ---- Delete department ----
  const handleDeleteDepartment = async (departmentId) => {
    if (!departmentId) {
      console.error('No department ID provided for deletion');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete this department?`)) {
      return;
    }

    try {
      await api.delete(`/departments/${departmentId}`);
      await fetchDepartments();
      alert('Department deleted successfully!');
    } catch (err) {
      console.error('Failed to delete department:', err);
      let errorMsg = 'Failed to delete department.';
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.response?.status === 409) {
        errorMsg = 'Cannot delete: Department is in use by employees.';
      }
      alert(`Error: ${errorMsg}`);
      setDeptError(errorMsg);
    }
  };

  // ---- Save designation ----
  const handleSaveDesignation = async () => {
    if (!desigForm.designation_name.trim()) {
      setDesigFormError('Designation name is required.');
      return;
    }
    setDesigFormSubmitting(true);
    setDesigFormError(null);
    try {
      const payload = {
        ...desigForm,
        basic_salary: parseFloat(desigForm.basic_salary) || 0,
        ot_eligible: desigForm.ot_eligible ? 1 : 0
      };
      if (desigForm.id) {
        await api.put(`/designations/${desigForm.id}`, payload);
      } else {
        await api.post('/designations', payload);
      }
      await fetchDesignations();
      setDesigForm({ id: null, designation_name: '', department: '', basic_salary: '', ot_eligible: 1, status: 'Active' });
      setActiveModal(null);
    } catch (err) {
      console.error('Failed to save designation:', err);
      const msg = err.response?.data?.message || 'Failed to save designation.';
      setDesigFormError(msg);
    } finally {
      setDesigFormSubmitting(false);
    }
  };

  // ---- Edit designation ----
  const handleEditDesignation = (desig) => {
    setDesigForm({
      id: desig.id,
      designation_name: desig.designation_name,
      department: desig.department || '',
      basic_salary: desig.basic_salary || '',
      ot_eligible: desig.ot_eligible ? 1 : 0,
      status: desig.status
    });
    setDesigFormError(null);
    setActiveModal('designation');
  };

  // ---- Delete designation ----
  const handleDeleteDesignation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this designation?')) return;
    try {
      await api.delete(`/designations/${id}`);
      await fetchDesignations();
    } catch (err) {
      console.error('Failed to delete designation:', err);
      alert(err.response?.data?.message || 'Failed to delete designation.');
    }
  };

  // ---- Filter designations by search ----
  const filteredDesignations = designations.filter(d =>
    (d.designation_name || '').toLowerCase().includes(desigSearch.toLowerCase()) ||
    (d.department || '').toLowerCase().includes(desigSearch.toLowerCase())
  );

  // ---- Salary Structure Form Handlers ----

  // 1. Get unique departments from department table for dropdown
  const uniqueDepartments = departments.filter(
    (dept, index, self) => 
      dept.status === 'Active' && 
      self.findIndex(d => d.department_id === dept.department_id) === index
  );

  // 2. Get designations filtered by selected department
  const filteredDesignationsForSalary = designations.filter(
    desig => desig.department === salaryForm.department && desig.status === 'Active'
  );

  // Helper: Allow only numbers and decimal point
  const validateNumberInput = (value) => {
    if (value === '') return true;
    return /^\d*\.?\d*$/.test(value);
  };

  // Calculate All Rates
  const calculateAllRates = (basicSalary) => {
    const { working_days, working_hours, ot_rate, sunday_ot_rate } = payrollSettings;
    
    const baseRate = (working_days > 0 && working_hours > 0) 
      ? basicSalary / (working_days * working_hours) 
      : 0;
    
    const lateRate = baseRate;
    const noPayRate = (working_days > 0) ? basicSalary / working_days : 0;
    const normalOtRate = baseRate * ot_rate;
    const sundayOtRate = baseRate * sunday_ot_rate;
    
    return { lateRate, noPayRate, normalOtRate, sundayOtRate };
  };

  // 3. When designation changes, auto-fill all rates
  const handleSalaryFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'attendance_allowance' || name === 'special_allowance' || 
        name === 'other_allowance' || name === 'travelling_allowance' ||
        name === 'epf' || name === 'other_deductions') {
      if (!validateNumberInput(value)) {
        return;
      }
    }
    
    if (name === 'designation') {
      const selectedDesig = designations.find(d => d.designation_name === value && d.department === salaryForm.department);
      const basicPay = selectedDesig?.basic_salary || 0;
      
      const { lateRate, noPayRate, normalOtRate, sundayOtRate } = calculateAllRates(parseFloat(basicPay) || 0);
      
      setSalaryForm({
        ...salaryForm,
        designation: value,
        basic_pay: basicPay,
        late_rate: lateRate.toFixed(2),
        no_pay_rate: noPayRate.toFixed(2),
        normal_ot_rate: normalOtRate.toFixed(2),
        sunday_ot_rate: sundayOtRate.toFixed(2)
      });
    } else if (name === 'department') {
      setSalaryForm({
        ...salaryForm,
        department: value,
        designation: '',
        basic_pay: '',
        late_rate: '',
        no_pay_rate: '',
        normal_ot_rate: '',
        sunday_ot_rate: ''
      });
    } else {
      setSalaryForm({
        ...salaryForm,
        [name]: value
      });
    }
  };

  // Reset salary form when modal opens
  const openSalaryModal = () => {
    setSalaryForm({
      department: '',
      designation: '',
      basic_pay: '',
      attendance_allowance: '',
      special_allowance: '',
      other_allowance: '',
      travelling_allowance: '',
      normal_ot_rate: '',
      sunday_ot_rate: '',
      late_rate: '',
      no_pay_rate: '',
      epf: '',
      other_deductions: ''
    });
    setSalaryFormError(null);
    setActiveModal('salary');
  };

  // Save salary structure
  const handleSaveSalaryStructure = async () => {
    if (!salaryForm.department || !salaryForm.designation) {
      setSalaryFormError('Department and Designation are required.');
      return;
    }
    
    setSalaryFormSubmitting(true);
    setSalaryFormError(null);
    
    try {
      const payload = {
        department: salaryForm.department,
        designation: salaryForm.designation,
        basic_pay: parseFloat(salaryForm.basic_pay) || 0,
        attendance_allowance: parseFloat(salaryForm.attendance_allowance) || 0,
        special_allowance: parseFloat(salaryForm.special_allowance) || 0,
        other_allowance: parseFloat(salaryForm.other_allowance) || 0,
        travelling_allowance: parseFloat(salaryForm.travelling_allowance) || 0,
        normal_ot_rate: parseFloat(salaryForm.normal_ot_rate) || 0,
        sunday_ot_rate: parseFloat(salaryForm.sunday_ot_rate) || 0,
        late_rate: parseFloat(salaryForm.late_rate) || 0,
        no_pay_rate: parseFloat(salaryForm.no_pay_rate) || 0,
        epf: parseFloat(salaryForm.epf) || 0,
        other_deductions: parseFloat(salaryForm.other_deductions) || 0
      };
      
      const existing = await api.get('/salary-structures/search', { params: { department: salaryForm.department, designation: salaryForm.designation } }).catch(error=>{if(error.response?.status===404)return {data:null};throw error;});
      
      if (existing.data && existing.data.id) {
        await api.put(`/salary-structures/${existing.data.id}`, payload);
        alert('Salary structure updated successfully!');
      } else {
        await api.post('/salary-structures', payload);
        alert('Salary structure saved successfully!');
      }
      
      await fetchSalaryStructures();
      setActiveModal(null);
      setSalaryForm({
        department: '',
        designation: '',
        basic_pay: '',
        attendance_allowance: '',
        special_allowance: '',
        other_allowance: '',
        travelling_allowance: '',
        normal_ot_rate: '',
        sunday_ot_rate: '',
        late_rate: '',
        no_pay_rate: '',
        epf: '',
        other_deductions: ''
      });
      
    } catch (err) {
      console.error('Failed to save salary structure:', err);
      if (err.response?.status === 409) {
        const msg = err.response?.data?.message || 'Salary structure already exists for this department and designation.';
        setSalaryFormError(msg);
        alert(`⚠️ ${msg}`);
      } else {
        const msg = err.response?.data?.message || 'Failed to save salary structure.';
        setSalaryFormError(msg);
        alert(`Error: ${msg}`);
      }
    } finally {
      setSalaryFormSubmitting(false);
    }
  };

  // ---- Helper Functions ----
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const nameToColor = (name) => {
    if (!name) return { bg: '#eee', fg: '#555' };
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return { bg: `hsl(${hue} 45% 88%)`, fg: `hsl(${hue} 55% 28%)` };
  };

  const filteredDepartments = departments.filter(d =>
    (d.department_name || '').toLowerCase().includes(deptSearch.toLowerCase()) ||
    (d.department_id || '').toLowerCase().includes(deptSearch.toLowerCase())
  );

  // Filter salary structures by search
  const filteredSalaryStructures = salaryStructures.filter(s =>
    s.department?.toLowerCase().includes(salarySearch.toLowerCase()) ||
    s.designation?.toLowerCase().includes(salarySearch.toLowerCase())
  );

  const openModal = (modalId) => {
    if (modalId === 'department') {
      setDeptForm({ id: null, department_id: '', department_name: '', department_head: '', status: 'Active' });
      setDeptFormError(null);
    }
    if (modalId === 'designation') {
      setDesigForm({ id: null, designation_name: '', department: '', basic_salary: '', ot_eligible: 1, status: 'Active' });
      setDesigFormError(null);
    }
    if (modalId === 'salary') {
      openSalaryModal();
    }
    setActiveModal(modalId);
  };

  const closeModal = () => {
    setActiveModal(null);
    setDeptFormError(null);
    setDesigFormError(null);
    setSalaryFormError(null);
  };

  // Format currency in Rs
  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'Rs. 0.00';
    return `Rs. ${Number(value).toLocaleString('en-IN')}`;
  };

  // Display structures
  const displayStructures = salarySearch ? filteredSalaryStructures : salaryStructures;

  return (
    <div className="settings-page-wrapper view-section fade-in active">
      <div style={{ marginBottom: '24px' }}>
        <h1 className="disp" style={{ fontSize: '26px', margin: '0 0 6px' }}>Company Management</h1>
        <p style={{ color: 'var(--text-mute)', fontSize: '14.5px', margin: 0 }}>Manage company information, departments, designations, salary structures and payroll settings.</p>
      </div>

      <div className="tabs-container scrollbar-thin">
        <button 
          className={`tab-btn ${activeTab === 'company' ? 'active' : ''}`} 
          onClick={() => setActiveTab('company')}
        >
          <Building2 style={{ width: '15px' }} /> Company Information
        </button>
        <button 
          className={`tab-btn ${activeTab === 'departments' ? 'active' : ''}`} 
          onClick={() => setActiveTab('departments')}
        >
          <Network style={{ width: '15px' }} /> Departments
        </button>
        <button 
          className={`tab-btn ${activeTab === 'designations' ? 'active' : ''}`} 
          onClick={() => setActiveTab('designations')}
        >
          <Briefcase style={{ width: '15px' }} /> Designations
        </button>
        <button 
          className={`tab-btn ${activeTab === 'salary' ? 'active' : ''}`} 
          onClick={() => setActiveTab('salary')}
        >
          <Banknote style={{ width: '15px' }} /> Salary Structures
        </button>
        <button 
          className={`tab-btn ${activeTab === 'bulk' ? 'active' : ''}`} 
          onClick={() => setActiveTab('bulk')}
        >
          <CopyPlus style={{ width: '15px' }} /> Bulk Salary Update
        </button>
        <button 
          className={`tab-btn ${activeTab === 'payroll' ? 'active' : ''}`} 
          onClick={() => setActiveTab('payroll')}
        >
          <SlidersHorizontal style={{ width: '15px' }} /> Payroll Settings
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tax' ? 'active' : ''}`} 
          onClick={() => setActiveTab('tax')}
        >
          <Receipt style={{ width: '15px' }} /> Tax Settings
        </button>
      </div>

      {/* 1. Company Information */}
      <div className={`setting-tab-content ${activeTab === 'company' ? 'active fade-in' : ''}`}>
        <div className="stub" style={{ maxWidth: '800px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
            <div
              role="button"
              tabIndex={companyEditing ? 0 : -1}
              onClick={() => companyEditing && companyLogoInputRef.current?.click()}
              onKeyDown={(event) => { if (companyEditing && (event.key === 'Enter' || event.key === ' ')) companyLogoInputRef.current?.click(); }}
              aria-disabled={!companyEditing}
              style={{ width: '72px', height: '72px', borderRadius: '12px', border: '1px dashed var(--steel)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)', color: 'var(--steel)', cursor: companyEditing ? 'pointer' : 'default', opacity: companyEditing ? 1 : 0.75, overflow: 'hidden' }}
            >
              {companyLogoUrl ? <img src={companyLogoUrl} alt="Company logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : (
                <div style={{ textAlign: 'center' }}>
                  <Upload style={{ width: '20px', marginBottom: '4px' }} />
                  <div style={{ fontSize: '10px', fontWeight: 600 }}>LOGO</div>
                </div>
              )}
              {companyEditing && <input ref={companyLogoInputRef} type="file" accept="image/*" onChange={uploadCompanyLogo} style={{ display: 'none' }} />}
            </div>
            <div>
              <h3 className="disp" style={{ fontSize: '18px', margin: '0 0 4px' }}>{companyInformation.company_name}</h3>
              <p style={{ color: 'var(--text-mute)', fontSize: '13px', margin: 0 }}>Primary organizational profile</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input className="input-style" name="company_name" value={companyInformation.company_name} onChange={handleCompanyInformationChange} disabled={!companyEditing} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="input-style" name="email" value={companyInformation.email} onChange={handleCompanyInformationChange} disabled={!companyEditing} />
            </div>
            <div className="form-group">
              <label className="form-label">Registration Number</label>
              <input className="input-style mono" name="registration_number" value={companyInformation.registration_number} onChange={handleCompanyInformationChange} disabled={!companyEditing} />
            </div>
            <div className="form-group">
              <label className="form-label">Tax Number</label>
              <input className="input-style mono" name="tax_number" value={companyInformation.tax_number} onChange={handleCompanyInformationChange} disabled={!companyEditing} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="input-style mono" name="phone_number" value={companyInformation.phone_number} onChange={handleCompanyInformationChange} disabled={!companyEditing} />
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="input-style" name="website" value={companyInformation.website} onChange={handleCompanyInformationChange} disabled={!companyEditing} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Company Address</label>
              <input className="input-style" name="company_address" value={companyInformation.company_address} onChange={handleCompanyInformationChange} disabled={!companyEditing} />
            </div>
            <div className="form-group">
              <label className="form-label">Base Currency</label>
              <select className="input-style" name="base_currency" value={companyInformation.base_currency} onChange={handleCompanyInformationChange} disabled={!companyEditing}>
                <option>USD ($)</option>
                <option>EUR (€)</option>
                <option>LKR (Rs)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Time Zone</label>
              <select className="input-style" name="time_zone" value={companyInformation.time_zone} onChange={handleCompanyInformationChange} disabled={!companyEditing}>
                <option>UTC -08:00 (Pacific Time)</option>
                <option>UTC +00:00 (GMT)</option>
                <option>UTC +05:30 (IST)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button className="btn-primary" onClick={saveCompanyInformation} disabled={companySaving}>{companySaving ? 'Saving...' : companyEditing ? 'Save Changes' : 'Edit settings'}</button>
            {companyEditing && <button className="btn-secondary" onClick={discardCompanyInformation}>Discard</button>}
            <button className="btn-secondary" onClick={resetCompanyInformation} disabled={companySaving}>Reset</button>
          </div>
        </div>
      </div>

      {/* 2. Departments */}
      <div className={`setting-tab-content ${activeTab === 'departments' ? 'active fade-in' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-mute)', width: '15px' }} />
            <input 
              placeholder="Search departments…" 
              className="input-style" 
              style={{ paddingLeft: '34px', background: 'var(--card)' }} 
              value={deptSearch}
              onChange={(e) => setDeptSearch(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => openModal('department')}><Plus style={{ width: '15px' }} /> Add Department</button>
        </div>

        {deptError && (
          <div style={{ padding: '12px 16px', background: 'var(--coral-light)', color: 'var(--coral)', borderRadius: '9px', marginBottom: '16px', fontSize: '13.5px', fontWeight: 500 }}>
            {deptError}
          </div>
        )}

        <div className="stub" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Department ID</th>
                <th>Department Name</th>
                <th>Department Head</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deptLoading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-mute)' }}>
                    <Loader2 style={{ width: '20px', animation: 'spin 1s linear infinite', marginRight: '8px', verticalAlign: 'middle' }} />
                    Loading departments…
                  </td>
                </tr>
              ) : filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-mute)' }}>
                    {deptSearch ? 'No departments match your search.' : 'No departments found. Add one to get started.'}
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((dept) => {
                  const colors = nameToColor(dept.department_head);
                  return (
                    <tr key={dept.department_id}>
                      <td className="mono" style={{ color: 'var(--text-mute)' }}>{dept.department_id}</td>
                      <td style={{ fontWeight: 500 }}>{dept.department_name}</td>
                      <td>
                        {dept.department_head ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="avatar" style={{ width: '24px', height: '24px', background: colors.bg, color: colors.fg, fontSize: '9px' }}>
                              {getInitials(dept.department_head)}
                            </div>
                            <span>{dept.department_head}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-mute)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-pill ${dept.status === 'Active' ? 'pill-active' : 'pill-inactive'}`}>
                          {dept.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="icon-btn" onClick={() => handleEditDepartment(dept)}><Pencil style={{ width: '14px' }} /></button>
                        <button 
                          className="icon-btn" 
                          style={{ color: 'var(--coral)' }} 
                          onClick={() => handleDeleteDepartment(dept.department_id)}
                        >
                          <Trash2 style={{ width: '14px' }} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Designations */}
      <div className={`setting-tab-content ${activeTab === 'designations' ? 'active fade-in' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-mute)', width: '15px' }} />
            <input placeholder="Search designations…" className="input-style" style={{ paddingLeft: '34px', background: 'var(--card)' }} value={desigSearch} onChange={e => setDesigSearch(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={() => openModal('designation')}><Plus style={{ width: '15px' }} /> Add Designation</button>
        </div>

        <div className="stub" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Designation Name</th>
                <th>Department</th>
                <th>Default Basic Salary</th>
                <th>OT Eligible</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDesignations.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-mute)' }}>No designations found.</td></tr>
              ) : filteredDesignations.map(desig => (
                <tr key={desig.id}>
                  <td style={{ fontWeight: 500 }}>{desig.designation_name}</td>
                  <td>{desig.department || '—'}</td>
                  <td className="mono">Rs. {desig.basic_salary ? Number(desig.basic_salary).toLocaleString('en-IN') : '0'}</td>
                  <td><span className={`status-pill ${desig.ot_eligible ? 'pill-active' : 'pill-inactive'}`} style={{ background: 'transparent', color: desig.ot_eligible ? 'var(--text)' : undefined, border: '1px solid var(--line)' }}>{desig.ot_eligible ? 'Yes' : 'No'}</span></td>
                  <td><span className={`status-pill ${desig.status === 'Active' ? 'pill-active' : 'pill-inactive'}`}>{desig.status}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-btn" onClick={() => handleEditDesignation(desig)}><Pencil style={{ width: '14px' }} /></button>
                    <button className="icon-btn" style={{ color: 'var(--coral)' }} onClick={() => handleDeleteDesignation(desig.id)}><Trash2 style={{ width: '14px' }} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Salary Structures - UPDATED with Rs currency */}
      <div className={`setting-tab-content ${activeTab === 'salary' ? 'active fade-in' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-mute)', width: '15px' }} />
            <input 
              placeholder="Filter structures…" 
              className="input-style" 
              style={{ paddingLeft: '34px', background: 'var(--card)' }} 
              onChange={(e) => setSalarySearch(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => openModal('salary')}>
            <Plus style={{ width: '15px' }} /> Add Salary Structure
          </button>
        </div>

        <div className="stub scrollbar-thin" style={{ padding: 0, overflowX: 'auto' }}>
          {salaryLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-mute)' }}>
              <Loader2 style={{ width: '20px', animation: 'spin 1s linear infinite', marginRight: '8px', verticalAlign: 'middle' }} />
              Loading salary structures…
            </div>
          ) : (
            <table className="data-table" style={{ minWidth: '1400px' }}>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Basic Pay</th>
                  <th>Attendance</th>
                  <th>Special</th>
                  <th>Other</th>
                  <th>Travelling</th>
                  <th>Normal OT</th>
                  <th>Sunday OT</th>
                  <th>Late Rate</th>
                  <th>No Pay Rate</th>
                  <th>EPF</th>
                  <th>Other Ded.</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', position: 'sticky', right: 0, background: 'var(--paper)', borderLeft: '1px solid var(--line)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayStructures.length === 0 ? (
                  <tr>
                    <td colSpan="15" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-mute)' }}>
                      {salarySearch ? 'No salary structures match your search.' : 'No salary structures found. Click "Add Salary Structure" to create one.'}
                    </td>
                  </tr>
                ) : (
                  displayStructures.map((structure) => (
                    <tr key={structure.id}>
                      <td>{structure.department}</td>
                      <td style={{ fontWeight: 500 }}>{structure.designation}</td>
                      <td className="mono">{formatCurrency(structure.basic_pay)}</td>
                      <td className="mono">{formatCurrency(structure.attendance_allowance)}</td>
                      <td className="mono">{formatCurrency(structure.special_allowance)}</td>
                      <td className="mono">{formatCurrency(structure.other_allowance)}</td>
                      <td className="mono">{formatCurrency(structure.travelling_allowance)}</td>
                      <td className="mono">Rs. {Number(structure.normal_ot_rate).toFixed(2)}</td>
                      <td className="mono">Rs. {Number(structure.sunday_ot_rate).toFixed(2)}</td>
                      <td className="mono">Rs. {Number(structure.late_rate).toFixed(2)}</td>
                      <td className="mono">Rs. {Number(structure.no_pay_rate).toFixed(2)}</td>
                      <td className="mono">{formatCurrency(structure.epf)}</td>
                      <td className="mono">{formatCurrency(structure.other_deductions)}</td>
                      <td>
                        <span className={`status-pill ${structure.status === 'Active' ? 'pill-active' : 'pill-inactive'}`}>
                          {structure.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', position: 'sticky', right: 0, background: 'var(--card)', borderLeft: '1px solid var(--line)' }}>
                        <button className="icon-btn" onClick={() => handleEditSalaryStructure(structure)}>
                          <Pencil style={{ width: '14px' }} />
                        </button>
                        <button className="icon-btn" style={{ color: 'var(--coral)' }} onClick={() => handleDeleteSalaryStructure(structure.id)}>
                          <Trash2 style={{ width: '14px' }} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 5. Bulk Salary Update */}
      <div className={`setting-tab-content ${activeTab === 'bulk' ? 'active fade-in' : ''}`}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <div className="stub">
            <h3 className="disp" style={{ fontSize: '16px', margin: '0 0 16px', color: 'var(--text)' }}>1. Filter Target Group</h3>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="input-style"><option>Engineering</option><option>All Departments</option></select>
            </div>
            <div className="form-group">
              <label className="form-label">Designation</label>
              <select className="input-style"><option>Software Engineer</option><option>All Designations</option></select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Employment Type</label>
              <select className="input-style"><option>Full-Time</option><option>Contract</option></select>
            </div>
          </div>

          <div className="stub" style={{ borderTop: '4px solid var(--steel)' }}>
            <h3 className="disp" style={{ fontSize: '16px', margin: '0 0 16px', color: 'var(--text)' }}>2. Define Action</h3>
            <div className="form-group">
              <label className="form-label">Update Type</label>
              <select className="input-style">
                <option>Increase Basic Salary by %</option>
                <option>Decrease Basic Salary by %</option>
                <option>Replace Basic Salary</option>
                <option>Replace Allowances</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Value / Percentage</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input className="input-style mono" type="number" defaultValue="12" style={{ flex: 1 }} />
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '9px', fontWeight: 600 }}>%</span>
              </div>
            </div>
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              <Eye style={{ width: '14px' }} /> Preview Changes
            </button>
          </div>
        </div>

        <div className="stub">
          <h3 className="disp" style={{ fontSize: '16px', margin: '0 0 16px', color: 'var(--text)' }}>3. Preview & Apply (14 Employees Affected)</h3>
          <table className="data-table" style={{ marginBottom: '20px' }}>
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Current Basic</th>
                <th>New Basic (+12%)</th>
                <th>Net Difference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 500 }}>Aria Fernwood</td>
                <td className="mono" style={{ color: 'var(--text-mute)', textDecoration: 'line-through' }}>Rs. 120,000</td>
                <td className="mono" style={{ fontWeight: 600, color: 'var(--ledger)' }}>Rs. 134,400</td>
                <td className="mono" style={{ color: 'var(--ledger)' }}>+Rs. 14,400</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500 }}>Yuki Tanaka</td>
                <td className="mono" style={{ color: 'var(--text-mute)', textDecoration: 'line-through' }}>Rs. 150,000</td>
                <td className="mono" style={{ fontWeight: 600, color: 'var(--ledger)' }}>Rs. 168,000</td>
                <td className="mono" style={{ color: 'var(--ledger)' }}>+Rs. 18,000</td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" style={{ background: 'var(--ledger)' }}>
              <CheckCircle2 style={{ width: '16px' }} /> Apply Changes to All
            </button>
          </div>
        </div>
      </div>

      {/* 6. Payroll Settings */}
      <div className={`setting-tab-content ${activeTab === 'payroll' ? 'active fade-in' : ''}`}>
        <div className="stub" style={{ maxWidth: '800px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px', 
            borderBottom: '1px solid var(--line)', 
            paddingBottom: '12px' 
          }}>
            <h3 className="disp" style={{ fontSize: '16px', margin: 0, color: 'var(--text)' }}>
              Global Payroll Defaults
            </h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {payrollSettingsSuccess && (
                <span style={{ color: 'var(--ledger)', fontSize: '13px', fontWeight: 500 }}>
                  ✅ {payrollSettingsSuccess}
                </span>
              )}
              {payrollSettingsError && (
                <span style={{ color: 'var(--coral)', fontSize: '13px', fontWeight: 500 }}>
                  ❌ {payrollSettingsError}
                </span>
              )}
              {payrollSettingsLoading && (
                <Loader2 style={{ width: '16px', animation: 'spin 1s linear infinite' }} />
              )}
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <div className="form-group">
              <label className="form-label">Working Days Per Month</label>
              {isEditingPayroll ? (
                <input 
                  type="number" 
                  className="input-style mono" 
                  name="working_days"
                  value={payrollSettings.working_days}
                  onChange={handlePayrollSettingChange}
                />
              ) : (
                <div className="input-style" style={{ background: 'var(--paper)', cursor: 'default', fontFamily: 'monospace' }}>
                  {payrollSettings.working_days || '26'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Working Hours Per Day</label>
              {isEditingPayroll ? (
                <input 
                  type="number" 
                  className="input-style mono" 
                  name="working_hours"
                  value={payrollSettings.working_hours}
                  onChange={handlePayrollSettingChange}
                />
              ) : (
                <div className="input-style" style={{ background: 'var(--paper)', cursor: 'default', fontFamily: 'monospace' }}>
                  {payrollSettings.working_hours || '8'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Default Overtime Rate (Normal - per hour)</label>
              {isEditingPayroll ? (
                <input 
                  type="number" 
                  className="input-style mono" 
                  name="ot_rate"
                  value={payrollSettings.ot_rate}
                  onChange={handlePayrollSettingChange}
                  step="0.01"
                />
              ) : (
                <div className="input-style" style={{ background: 'var(--paper)', cursor: 'default', fontFamily: 'monospace' }}>
                  {payrollSettings.ot_rate || '1.5'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Sunday Overtime Rate (per hour)</label>
              {isEditingPayroll ? (
                <input 
                  type="number" 
                  className="input-style mono" 
                  name="sunday_ot_rate"
                  value={payrollSettings.sunday_ot_rate}
                  onChange={handlePayrollSettingChange}
                  step="0.01"
                />
              ) : (
                <div className="input-style" style={{ background: 'var(--paper)', cursor: 'default', fontFamily: 'monospace' }}>
                  {payrollSettings.sunday_ot_rate || '2.0'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Salary Calculation Method</label>
              {isEditingPayroll ? (
                <select 
                  className="input-style" 
                  name="salary_method"
                  value={payrollSettings.salary_method}
                  onChange={handlePayrollSettingChange}
                >
                  <option>Monthly</option>
                  <option>Daily</option>
                  <option>Hourly</option>
                </select>
              ) : (
                <div className="input-style" style={{ background: 'var(--paper)', cursor: 'default' }}>
                  {payrollSettings.salary_method || 'Monthly'}
                </div>
              )}
            </div>
          </div>

          <h3 className="disp" style={{ 
            fontSize: '14px', 
            margin: '20px 0 16px', 
            color: 'var(--text-mute)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px' 
          }}>
            Attendance
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <div className="form-group">
              <label className="form-label">Check in time</label>
              {isEditingPayroll ? (
                <input
                  type="time"
                  className="input-style mono"
                  name="check_in_time"
                  value={payrollSettings.check_in_time}
                  onChange={handlePayrollSettingChange}
                />
              ) : (
                <div className="input-style" style={{ background: 'var(--paper)', cursor: 'default', fontFamily: 'monospace' }}>
                  {payrollSettings.check_in_time || '09:00'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Check out time</label>
              {isEditingPayroll ? (
                <input
                  type="time"
                  className="input-style mono"
                  name="check_out_time"
                  value={payrollSettings.check_out_time}
                  onChange={handlePayrollSettingChange}
                />
              ) : (
                <div className="input-style" style={{ background: 'var(--paper)', cursor: 'default', fontFamily: 'monospace' }}>
                  {payrollSettings.check_out_time || '17:00'}
                </div>
              )}
            </div>
          </div>

          <h3 className="disp" style={{ 
            fontSize: '14px', 
            margin: '20px 0 16px', 
            color: 'var(--text-mute)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px' 
          }}>
            Statutory Deductions
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <div className="form-group">
              <label className="form-label">Employer EPF Percentage (%)</label>
              {isEditingPayroll ? (
                <input 
                  type="number" 
                  className="input-style mono" 
                  name="epf_percentage"
                  value={payrollSettings.epf_percentage}
                  onChange={handlePayrollSettingChange}
                />
              ) : (
                <div className="input-style" style={{ background: 'var(--paper)', cursor: 'default', fontFamily: 'monospace' }}>
                  {payrollSettings.epf_percentage || '12'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Employer ETF Percentage (%)</label>
              {isEditingPayroll ? (
                <input 
                  type="number" 
                  className="input-style mono" 
                  name="etf_percentage"
                  value={payrollSettings.etf_percentage}
                  onChange={handlePayrollSettingChange}
                />
              ) : (
                <div className="input-style" style={{ background: 'var(--paper)', cursor: 'default', fontFamily: 'monospace' }}>
                  {payrollSettings.etf_percentage || '3'}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            {isEditingPayroll ? (
              <>
                <button 
                  className="btn-primary" 
                  onClick={togglePayrollEdit}
                  disabled={payrollSettingsLoading}
                >
                  {payrollSettingsLoading ? (
                    <><Loader2 style={{ width: '14px', animation: 'spin 1s linear infinite' }} /> Saving…</>
                  ) : (
                    'Save Settings'
                  )}
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={cancelPayrollEdit}
                  disabled={payrollSettingsLoading}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button className="btn-primary" onClick={togglePayrollEdit}>
                Edit Settings
              </button>
            )}
            <button 
              className="btn-secondary" 
              onClick={resetPayrollSettings}
              disabled={payrollSettingsLoading}
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>

      {/* 7. Tax Settings */}
      <div className={`setting-tab-content ${activeTab === 'tax' ? 'active fade-in' : ''}`}>
        <div className="stub" style={{ maxWidth: '800px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px', 
            borderBottom: '1px solid var(--line)', 
            paddingBottom: '12px' 
          }}>
            <h3 className="disp" style={{ fontSize: '16px', margin: 0, color: 'var(--text)' }}>
              Tax Configuration (APIT / PAYE)
            </h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {taxSettingsSuccess && (
                <span style={{ color: 'var(--ledger)', fontSize: '13px', fontWeight: 500 }}>✅ {taxSettingsSuccess}</span>
              )}
              {taxSettingsError && (
                <span style={{ color: 'var(--coral)', fontSize: '13px', fontWeight: 500 }}>❌ {taxSettingsError}</span>
              )}
              {taxSettingsLoading && (
                <Loader2 style={{ width: '16px', animation: 'spin 1s linear infinite' }} />
              )}
            </div>
          </div>
          
          <p style={{ color: 'var(--text-mute)', fontSize: '14px', marginBottom: '20px' }}>
            Configure APIT (Advance Personal Income Tax) brackets and rules.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div className="form-group" style={{ padding: '16px', background: 'var(--paper)', borderRadius: '8px', border: '1px dashed var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: 'var(--text)' }}>APIT Deduction Enabled</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-mute)' }}>Automatically calculate and deduct APIT from employee salaries.</p>
                </div>
                <div className="toggle-switch">
                  <input type="checkbox" id="apit_toggle" defaultChecked disabled />
                  <label htmlFor="apit_toggle" style={{ background: '#e5e7eb', cursor: 'not-allowed' }}></label>
                </div>
              </div>
            </div>
            
            <div className="form-group" style={{ padding: '16px', background: 'var(--paper)', borderRadius: '8px', border: '1px dashed var(--line)' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text)' }}>Tax Brackets (Monthly)</h4>
              <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-mute)' }}>Current tax brackets applied for salary calculations.</p>
              
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Monthly Salary Range</th>
                    <th>Tax Rate (%)</th>
                    {isEditingTax && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {taxSettings.map((bracket, index) => (
                    <tr key={index}>
                      <td>
                        {isEditingTax ? (
                          <input type="text" className="input-style" value={bracket.monthly_salary_range} onChange={(e) => handleTaxChange(index, 'monthly_salary_range', e.target.value)} placeholder="e.g. 100,001 - 141,667" />
                        ) : (
                          bracket.monthly_salary_range
                        )}
                      </td>
                      <td>
                        {isEditingTax ? (
                          <input type="number" className="input-style" value={bracket.tax_rate} onChange={(e) => handleTaxChange(index, 'tax_rate', e.target.value)} />
                        ) : (
                          bracket.tax_rate + '%'
                        )}
                      </td>
                      {isEditingTax && (
                        <td>
                          <button className="icon-btn" onClick={() => removeTaxBracket(index)}><Trash2 size={16} color="var(--coral)" /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {isEditingTax && (
                <div style={{ marginTop: '16px', textAlign: 'left' }}>
                  <button className="btn-secondary" onClick={addTaxBracket}><Plus size={14} /> Add Bracket</button>
                </div>
              )}

              <div style={{ marginTop: '24px', textAlign: 'right', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                 {isEditingTax ? (
                   <>
                     <button className="btn-secondary" onClick={() => { setIsEditingTax(false); fetchTaxSettings(); }} disabled={taxSettingsLoading}>Cancel</button>
                     <button className="btn-primary" onClick={saveTaxSettings} disabled={taxSettingsLoading}>{taxSettingsLoading ? 'Saving...' : 'Save Brackets'}</button>
                   </>
                 ) : (
                   <button className="btn-secondary" onClick={() => setIsEditingTax(true)}>Edit Brackets</button>
                 )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {createPortal(
        <div className="settings-page-wrapper" style={{ position: 'static', zIndex: 'auto' }}>
      
      {/* Add Department Modal */}
      <div className={`modal-overlay ${activeModal === 'department' ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="modal-content">
          <div className="modal-header">
            <h3 className="disp" style={{ fontSize: '18px', margin: 0 }}>{deptForm.id ? 'Edit Department' : 'Add New Department'}</h3>
            <button className="icon-btn" onClick={closeModal}><X style={{ width: '18px' }} /></button>
          </div>
          <div className="modal-body">
            {deptFormError && (
              <div style={{ padding: '10px 14px', background: 'var(--coral-light)', color: 'var(--coral)', borderRadius: '9px', marginBottom: '16px', fontSize: '13px', fontWeight: 500 }}>
                {deptFormError}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Department ID <span className="text-danger">*</span></label>
              <input 
                type="text" 
                className="input-style" 
                placeholder="e.g. DEP-MKT" 
                value={deptForm.department_id}
                onChange={(e) => setDeptForm({ ...deptForm, department_id: e.target.value.toUpperCase().replace(/\s/g, '-') })}
                disabled={!!deptForm.id}
              />
              <small style={{ color: 'var(--text-mute)', fontSize: '12px' }}>
                {deptForm.id ? 'Department ID cannot be changed' : 'Use a unique identifier (e.g., DEP-ENG)'}
              </small>
            </div>
            <div className="form-group">
              <label className="form-label">Department Name <span className="text-danger">*</span></label>
              <input 
                type="text" 
                className="input-style" 
                placeholder="e.g. Marketing" 
                value={deptForm.department_name}
                onChange={(e) => setDeptForm({ ...deptForm, department_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Department Head</label>
              <select 
                className="input-style" 
                value={deptForm.department_head}
                onChange={(e) => setDeptForm({ ...deptForm, department_head: e.target.value })}
              >
                <option value="">Select Employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.full_name}>
                    {emp.full_name} — {emp.department || 'No Dept'}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Status</label>
              <select 
                className="input-style" 
                value={deptForm.status}
                onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={closeModal} disabled={deptFormSubmitting}>Cancel</button>
            <button 
              className="btn-primary" 
              onClick={handleSaveDepartment} 
              disabled={deptFormSubmitting}
              style={{ opacity: deptFormSubmitting ? 0.7 : 1 }}
            >
              {deptFormSubmitting ? (
                <><Loader2 style={{ width: '14px', animation: 'spin 1s linear infinite' }} /> Saving…</>
              ) : (
                deptForm.id ? 'Save Changes' : 'Create Department'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Add Designation Modal */}
      <div className={`modal-overlay ${activeModal === 'designation' ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="modal-content">
          <div className="modal-header">
            <h3 className="disp" style={{ fontSize: '18px', margin: 0 }}>{desigForm.id ? 'Edit Designation' : 'Add New Designation'}</h3>
            <button className="icon-btn" onClick={closeModal}><X style={{ width: '18px' }} /></button>
          </div>
          <div className="modal-body">
            {desigFormError && <div style={{ color: 'var(--coral)', fontSize: '13px', marginBottom: '12px', padding: '8px 12px', background: 'rgba(255,100,100,0.08)', borderRadius: '6px' }}>{desigFormError}</div>}
            <div className="form-group">
              <label className="form-label">Designation Title</label>
              <input type="text" className="input-style" placeholder="e.g. UX Designer" value={desigForm.designation_name} onChange={e => setDesigForm({...desigForm, designation_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Assign to Department</label>
              <select className="input-style" value={desigForm.department} onChange={e => setDesigForm({...desigForm, department: e.target.value})}>
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Default Basic Salary</label>
              <input type="number" className="input-style mono" placeholder="0" value={desigForm.basic_salary} onChange={e => setDesigForm({...desigForm, basic_salary: e.target.value})} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: '16px', height: '16px', cursor: 'pointer' }} checked={!!desigForm.ot_eligible} onChange={e => setDesigForm({...desigForm, ot_eligible: e.target.checked ? 1 : 0})} />
                Eligible for Overtime (OT) Pay
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={closeModal} disabled={desigFormSubmitting}>Cancel</button>
            <button 
              className="btn-primary" 
              onClick={handleSaveDesignation} 
              disabled={desigFormSubmitting}
              style={{ opacity: desigFormSubmitting ? 0.7 : 1 }}
            >
              {desigFormSubmitting ? (
                <><Loader2 style={{ width: '14px', animation: 'spin 1s linear infinite' }} /> Saving…</>
              ) : (
                desigForm.id ? 'Save Changes' : 'Create Designation'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Add Salary Structure Modal */}
      <div className={`modal-overlay ${activeModal === 'salary' ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="modal-content large">
          <div className="modal-header">
            <h3 className="disp" style={{ fontSize: '18px', margin: 0 }}>Create Salary Structure</h3>
            <button className="icon-btn" onClick={closeModal}><X style={{ width: '18px' }} /></button>
          </div>
          <div className="modal-body scrollbar-thin">
            {salaryFormError && (
              <div style={{ 
                padding: '10px 14px', 
                background: 'var(--coral-light)', 
                color: 'var(--coral)', 
                borderRadius: '9px', 
                marginBottom: '16px', 
                fontSize: '13px', 
                fontWeight: 500 
              }}>
                ❌ {salaryFormError}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              
              {/* Left Column */}
              <div>
                <h4 className="disp" style={{ fontSize: '14px', margin: '0 0 16px', color: 'var(--steel)' }}>Assignment</h4>
                
                {/* 1. Department Dropdown */}
                <div className="form-group">
                  <label className="form-label">Department <span className="text-danger">*</span></label>
                  <select 
                    className="input-style" 
                    name="department"
                    value={salaryForm.department}
                    onChange={handleSalaryFormChange}
                    required
                  >
                    <option value="">Select Department</option>
                    {uniqueDepartments.map(dept => (
                      <option key={dept.department_id} value={dept.department_id}>
                        {dept.department_name} ({dept.department_id})
                      </option>
                    ))}
                  </select>
                  {uniqueDepartments.length === 0 && (
                    <small style={{ color: 'var(--coral)', fontSize: '12px' }}>
                      No active departments found. Please add a department first.
                    </small>
                  )}
                </div>

                {/* 2. Designation Dropdown */}
                <div className="form-group">
                  <label className="form-label">Designation <span className="text-danger">*</span></label>
                  <select 
                    className="input-style" 
                    name="designation"
                    value={salaryForm.designation}
                    onChange={handleSalaryFormChange}
                    required
                    disabled={!salaryForm.department}
                  >
                    <option value="">{salaryForm.department ? 'Select Designation' : 'Select Department First'}</option>
                    {filteredDesignationsForSalary.map(desig => (
                      <option key={desig.id} value={desig.designation_name}>
                        {desig.designation_name}
                      </option>
                    ))}
                  </select>
                  {salaryForm.department && filteredDesignationsForSalary.length === 0 && (
                    <small style={{ color: 'var(--warning)', fontSize: '12px' }}>
                      No designations found for this department.
                    </small>
                  )}
                </div>

                {/* 3. Basic Pay - Auto-filled */}
                <div className="form-group">
                  <label className="form-label">Basic Pay <span className="text-danger">*</span></label>
                  <input 
                    type="text" 
                    className="input-style mono" 
                    name="basic_pay"
                    value={salaryForm.basic_pay}
                    onChange={handleSalaryFormChange}
                    placeholder="Auto-filled from designation"
                    readOnly={!!salaryForm.designation}
                    style={{ 
                      backgroundColor: salaryForm.designation ? '#f0f7ff' : '#fff',
                      borderColor: salaryForm.designation ? 'var(--steel)' : 'var(--line)'
                    }}
                  />
                  {!salaryForm.designation && (
                    <small style={{ color: 'var(--text-mute)', fontSize: '12px' }}>
                      Select a designation to auto-fill
                    </small>
                  )}
                </div>

                {/* Rate Calculations Section */}
                <div style={{ 
                  marginTop: '16px', 
                  padding: '16px', 
                  background: 'var(--paper)', 
                  borderRadius: '9px',
                  border: '1px solid var(--line)'
                }}>
                  <h4 className="disp" style={{ fontSize: '13px', margin: '0 0 12px 0', color: 'var(--steel)' }}>
                    Rate Calculations
                  </h4>
                  
                  {/* Late Rate */}
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Late Rate (per hour)</label>
                    <input 
                      type="text" 
                      className="input-style mono" 
                      name="late_rate"
                      value={salaryForm.late_rate}
                      onChange={handleSalaryFormChange}
                      placeholder="Auto-calculated"
                      readOnly
                      style={{ 
                        backgroundColor: '#f0f7ff',
                        borderColor: 'var(--steel)',
                        fontFamily: 'monospace'
                      }}
                    />
                    <small style={{ color: 'var(--text-mute)', fontSize: '11px' }}>
                      Formula: Basic Salary / (Working Days × Working Hours)
                    </small>
                  </div>

                  {/* No Pay Rate */}
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">No Pay Rate (per day)</label>
                    <input 
                      type="text" 
                      className="input-style mono" 
                      name="no_pay_rate"
                      value={salaryForm.no_pay_rate}
                      onChange={handleSalaryFormChange}
                      placeholder="Auto-calculated"
                      readOnly
                      style={{ 
                        backgroundColor: '#f0f7ff',
                        borderColor: 'var(--steel)',
                        fontFamily: 'monospace'
                      }}
                    />
                    <small style={{ color: 'var(--text-mute)', fontSize: '11px' }}>
                      Formula: Basic Salary / Working Days
                    </small>
                  </div>

                  {/* Normal OT Rate - Auto-calculated */}
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Normal OT Rate (per hour)</label>
                    <input 
                      type="text" 
                      className="input-style mono" 
                      name="normal_ot_rate"
                      value={salaryForm.normal_ot_rate}
                      onChange={handleSalaryFormChange}
                      placeholder="Auto-calculated"
                      readOnly
                      style={{ 
                        backgroundColor: '#f0f7ff',
                        borderColor: 'var(--steel)',
                        fontFamily: 'monospace'
                      }}
                    />
                    <small style={{ color: 'var(--text-mute)', fontSize: '11px' }}>
                      Formula: Base Rate × OT Rate (from payroll settings)
                    </small>
                  </div>

                  {/* Sunday OT Rate - Auto-calculated */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Sunday OT Rate (per hour)</label>
                    <input 
                      type="text" 
                      className="input-style mono" 
                      name="sunday_ot_rate"
                      value={salaryForm.sunday_ot_rate}
                      onChange={handleSalaryFormChange}
                      placeholder="Auto-calculated"
                      readOnly
                      style={{ 
                        backgroundColor: '#f0f7ff',
                        borderColor: 'var(--steel)',
                        fontFamily: 'monospace'
                      }}
                    />
                    <small style={{ color: 'var(--text-mute)', fontSize: '11px' }}>
                      Formula: Base Rate × Sunday OT Rate (from payroll settings)
                    </small>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div>
                <h4 className="disp" style={{ fontSize: '14px', margin: '0 0 16px', color: 'var(--steel)' }}>Allowances</h4>
                
                {/* Allowances Section */}
                <div style={{ 
                  padding: '16px', 
                  background: 'var(--paper)', 
                  borderRadius: '9px',
                  border: '1px solid var(--line)'
                }}>
                  <h4 className="disp" style={{ fontSize: '13px', margin: '0 0 12px 0', color: 'var(--steel)' }}>
                    Allowance
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    {/* Attendance Allowance */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Attendance Allowance</label>
                      <input 
                        type="text" 
                        className="input-style mono" 
                        name="attendance_allowance"
                        value={salaryForm.attendance_allowance}
                        onChange={handleSalaryFormChange}
                        placeholder="e.g. 1000.00"
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>

                    {/* Special Allowance */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Special Allowance</label>
                      <input 
                        type="text" 
                        className="input-style mono" 
                        name="special_allowance"
                        value={salaryForm.special_allowance}
                        onChange={handleSalaryFormChange}
                        placeholder="e.g. 500.00"
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>

                    {/* Other Allowance */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Other Allowance</label>
                      <input 
                        type="text" 
                        className="input-style mono" 
                        name="other_allowance"
                        value={salaryForm.other_allowance}
                        onChange={handleSalaryFormChange}
                        placeholder="e.g. 300.00"
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>

                    {/* Travelling Allowance */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Travelling Allowance</label>
                      <input 
                        type="text" 
                        className="input-style mono" 
                        name="travelling_allowance"
                        value={salaryForm.travelling_allowance}
                        onChange={handleSalaryFormChange}
                        placeholder="e.g. 200.00"
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Deductions Section */}
                <h4 className="disp" style={{ fontSize: '14px', margin: '16px 0 16px', color: 'var(--steel)' }}>Deductions</h4>
                <div style={{ 
                  padding: '16px', 
                  background: 'var(--paper)', 
                  borderRadius: '9px',
                  border: '1px solid var(--line)'
                }}>
                  <h4 className="disp" style={{ fontSize: '13px', margin: '0 0 12px 0', color: 'var(--steel)' }}>
                    Deduction
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    {/* EPF */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">EPF</label>
                      <input 
                        type="text" 
                        className="input-style mono" 
                        name="epf"
                        value={salaryForm.epf}
                        onChange={handleSalaryFormChange}
                        placeholder="e.g. 8% or 960.00"
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>

                    {/* Other Deductions */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Other Deductions</label>
                      <input 
                        type="text" 
                        className="input-style mono" 
                        name="other_deductions"
                        value={salaryForm.other_deductions}
                        onChange={handleSalaryFormChange}
                        placeholder="e.g. 200.00"
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={closeModal} disabled={salaryFormSubmitting}>Cancel</button>
            <button 
              className="btn-primary" 
              onClick={handleSaveSalaryStructure} 
              disabled={salaryFormSubmitting || !salaryForm.department || !salaryForm.designation}
              style={{ opacity: (salaryFormSubmitting || !salaryForm.department || !salaryForm.designation) ? 0.7 : 1 }}
            >
              {salaryFormSubmitting ? (
                <><Loader2 style={{ width: '14px', animation: 'spin 1s linear infinite' }} /> Saving…</>
              ) : (
                'Save Structure'
              )}
            </button>
          </div>
        </div>
      </div>
      
        </div>,
        document.body
      )}
    </div>
  );
};

export default SettingsPage;