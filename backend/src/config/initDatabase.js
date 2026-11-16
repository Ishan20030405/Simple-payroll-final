const db = require('./db');
const bcrypt = require('bcrypt');

module.exports = async function initDatabase() {
    await db.ensureDatabase();
    await db.execute(`CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('ADMIN', 'HR', 'EMPLOYEE') DEFAULT 'EMPLOYEE',
                is_active BOOLEAN DEFAULT TRUE,
                otp_code VARCHAR(10) NULL,
                otp_expires_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS user_profile_pictures (
                user_id INT PRIMARY KEY,
                image_data MEDIUMBLOB NOT NULL,
                mime_type VARCHAR(30) NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS company_information (
                id INT AUTO_INCREMENT PRIMARY KEY,
                company_name VARCHAR(150) NOT NULL,
                email VARCHAR(150),
                registration_number VARCHAR(100),
                tax_number VARCHAR(100),
                phone_number VARCHAR(50),
                website VARCHAR(200),
                company_address VARCHAR(255),
                base_currency VARCHAR(30) DEFAULT 'USD ($)',
                time_zone VARCHAR(100) DEFAULT 'UTC -08:00 (Pacific Time)',
                logo_data LONGBLOB,
                logo_mime_type VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS departments (
                department_id VARCHAR(20) PRIMARY KEY,
                department_name VARCHAR(100) NOT NULL,
                department_head VARCHAR(100),
                status ENUM('Active', 'Inactive') DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS designations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                designation_name VARCHAR(100) NOT NULL,
                department VARCHAR(20),
                basic_salary DECIMAL(10,2) DEFAULT 0.00,
                ot_eligible BOOLEAN DEFAULT TRUE,
                status ENUM('Active', 'Inactive') DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (department) REFERENCES departments(department_id) ON DELETE SET NULL
            )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS employees (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id VARCHAR(10) UNIQUE NOT NULL,
                user_id INT NULL,
                full_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                phone VARCHAR(15),
                department VARCHAR(20),
                designation VARCHAR(50),
                status ENUM('Active', 'Inactive') DEFAULT 'Active',
                dob DATE,
                nic VARCHAR(15),
                gender VARCHAR(10),
                marital_status VARCHAR(20),
                address TEXT,
                emergency_contact VARCHAR(100),
                join_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (department) REFERENCES departments(department_id) ON DELETE SET NULL
            )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id INT NOT NULL,
                date DATE NOT NULL,
                check_in TIME NULL,
                check_out TIME NULL,
                working_hours DECIMAL(5,2) DEFAULT 0.00,
                overtime DECIMAL(5,2) DEFAULT 0.00,
                status ENUM('Present', 'Absent', 'Late', 'Leave', 'Holiday') DEFAULT 'Present',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
                UNIQUE KEY unique_attendance (employee_id, date)
            )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS employee_monthly_attendance_summary (
                employee_id VARCHAR(10) NOT NULL,
                year INT NOT NULL,
                month TINYINT NOT NULL,
                total_working_days INT DEFAULT 0,
                total_working_hours DECIMAL(8,2) DEFAULT 0.00,
                total_ot_hours DECIMAL(8,2) DEFAULT 0.00,
                total_sunday_working_hours DECIMAL(8,2) DEFAULT 0.00,
                total_late_hours DECIMAL(8,2) DEFAULT 0.00,
                total_no_pay_days INT DEFAULT 0,
                total_leaves INT DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (employee_id, year, month),
                CONSTRAINT fk_monthly_summary_employee
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
                CONSTRAINT chk_monthly_summary_month CHECK (month BETWEEN 1 AND 12)
            )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS payrolls (
                employee_id INT NOT NULL,
                month_year DATE NOT NULL,
                total_allowances DECIMAL(10,2) DEFAULT 0.00,
                total_deductions DECIMAL(10,2) DEFAULT 0.00,
                total_normal_ot_amount DECIMAL(10,2) DEFAULT 0.00,
                total_sunday_ot_amount DECIMAL(10,2) DEFAULT 0.00,
                total_additions DECIMAL(10,2) DEFAULT 0.00,
                gross_salary DECIMAL(10,2) DEFAULT 0.00,
                net_salary DECIMAL(10,2) DEFAULT 0.00,
                status ENUM('Pending', 'Generated', 'Complete', 'Paid') DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (employee_id, month_year),
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
            )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS salary_structures (
                id INT AUTO_INCREMENT PRIMARY KEY,
                department VARCHAR(20) NOT NULL,
                designation VARCHAR(100) NOT NULL,
                basic_pay DECIMAL(10,2) DEFAULT 0.00,
                attendance_allowance DECIMAL(10,2) DEFAULT 0.00,
                special_allowance DECIMAL(10,2) DEFAULT 0.00,
                other_allowance DECIMAL(10,2) DEFAULT 0.00,
                travelling_allowance DECIMAL(10,2) DEFAULT 0.00,
                normal_ot_rate DECIMAL(10,2) DEFAULT 0.00,
                sunday_ot_rate DECIMAL(10,2) DEFAULT 0.00,
                late_rate DECIMAL(10,2) DEFAULT 0.00,
                no_pay_rate DECIMAL(10,2) DEFAULT 0.00,
                epf DECIMAL(10,2) DEFAULT 0.00,
                other_deductions DECIMAL(10,2) DEFAULT 0.00,
                status ENUM('Active', 'Inactive') DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (department) REFERENCES departments(department_id) ON DELETE CASCADE,
                UNIQUE KEY unique_dept_desig (department, designation)
            )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS payroll_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                working_days INT DEFAULT 26,
                working_hours DECIMAL(5,2) DEFAULT 8.00,
                ot_rate DECIMAL(10,2) DEFAULT 1.50,
                sunday_ot_rate DECIMAL(10,2) DEFAULT 2.00,
                check_in_time TIME DEFAULT '09:00:00',
                check_out_time TIME DEFAULT '17:00:00',
                salary_method VARCHAR(20) DEFAULT 'Monthly',
                epf_percentage DECIMAL(5,2) DEFAULT 12.00,
                etf_percentage DECIMAL(5,2) DEFAULT 3.00,
                updated_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
            )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS payslips (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id INT NOT NULL,
                month_year DATE NOT NULL,
                employee_code VARCHAR(50) NOT NULL,
                employee_name VARCHAR(150) NOT NULL,
                department VARCHAR(100),
                designation VARCHAR(100),
                basic_salary DECIMAL(10,2) DEFAULT 0.00,
                attendance_allowance DECIMAL(10,2) DEFAULT 0.00,
                special_allowance DECIMAL(10,2) DEFAULT 0.00,
                travelling_allowance DECIMAL(10,2) DEFAULT 0.00,
                other_allowance DECIMAL(10,2) DEFAULT 0.00,
                other_deduction DECIMAL(10,2) DEFAULT 0.00,
                employer_epf DECIMAL(10,2) DEFAULT 0.00,
                employer_etf DECIMAL(10,2) DEFAULT 0.00,
                total_allowances DECIMAL(10,2) DEFAULT 0.00,
                total_deductions DECIMAL(10,2) DEFAULT 0.00,
                total_normal_ot_amount DECIMAL(10,2) DEFAULT 0.00,
                total_sunday_ot_amount DECIMAL(10,2) DEFAULT 0.00,
                total_additions DECIMAL(10,2) DEFAULT 0.00,
                gross_salary DECIMAL(10,2) DEFAULT 0.00,
                net_salary DECIMAL(10,2) DEFAULT 0.00,
                total_working_days INT DEFAULT 0,
                total_no_pay_days INT DEFAULT 0,
                total_late_hours DECIMAL(10,2) DEFAULT 0.00,
                no_pay_amount DECIMAL(10,2) DEFAULT 0.00,
                late_amount DECIMAL(10,2) DEFAULT 0.00,
                epf DECIMAL(10,2) DEFAULT 0.00,
                payroll_status VARCHAR(20) NOT NULL,
                payroll_data JSON,
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_employee_month_payslip (employee_id, month_year),
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
            )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS monthly_salary_expenses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                year INT NOT NULL,
                month TINYINT NOT NULL,
                total_monthly_expenses DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_salary_expense_month (year, month),
                CONSTRAINT chk_monthly_salary_expenses_month CHECK (month BETWEEN 1 AND 12)
            )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                action VARCHAR(100) NOT NULL,
                details TEXT,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tax_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                monthly_salary_range VARCHAR(100) NOT NULL,
                tax_rate DECIMAL(5,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS basic_pay (
                employee_id VARCHAR(10) NOT NULL,
                year INT NOT NULL,
                month TINYINT NOT NULL,
                no_pay_amount DECIMAL(10,2) DEFAULT 0.00,
                late_amount DECIMAL(10,2) DEFAULT 0.00,
                net_basic_pay DECIMAL(10,2) DEFAULT 0.00,
                epf DECIMAL(10,2) DEFAULT 0.00,
                PRIMARY KEY (employee_id, year, month),
                CONSTRAINT fk_basic_pay_employee
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
                CONSTRAINT chk_basic_pay_month CHECK (month BETWEEN 1 AND 12)
            )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS employer_epf_etf (
                employee_id INT NOT NULL,
                year INT NOT NULL,
                month TINYINT NOT NULL,
                epf_amount DECIMAL(10,2) DEFAULT 0.00,
                etf_amount DECIMAL(10,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (employee_id, year, month),
                CONSTRAINT fk_employer_epf_etf_employee
                    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
                CONSTRAINT chk_employer_epf_etf_month CHECK (month BETWEEN 1 AND 12)
            )`);

    const ensureColumn = async (table, column, definition) => {
        const [rows] = await db.execute('SELECT COLUMN_TYPE AS Type FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?', [table,column]);
        if (!rows.length) await db.execute('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + definition);
    };
    await ensureColumn('users', 'otp_code', 'VARCHAR(10) NULL');
    await ensureColumn('users', 'otp_expires_at', 'DATETIME NULL');
    const [usernameColumns]=await db.execute('SELECT COLUMN_TYPE AS Type FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?', ['users','username']);
    if(usernameColumns[0]?.Type === 'varchar(50)') await db.execute('ALTER TABLE users MODIFY COLUMN username VARCHAR(150) NOT NULL');
    await ensureColumn('users', 'token_version', 'INT NOT NULL DEFAULT 0');
    await ensureColumn('attendance', 'working_minutes', 'INT NULL');
    await ensureColumn('attendance', 'overtime_minutes', 'INT NULL');
    await ensureColumn('employee_monthly_attendance_summary', 'total_sunday_working_hours', 'DECIMAL(8,2) DEFAULT 0');
    await ensureColumn('payrolls', 'apit_tax', 'DECIMAL(10,2) DEFAULT 0');
    await ensureColumn('payrolls', 'payroll_data', 'JSON NULL');
    await ensureColumn('payrolls', 'tax_calculated', 'BOOLEAN NOT NULL DEFAULT FALSE');
    await ensureColumn('company_information', 'logo_data', 'LONGBLOB NULL');
    await ensureColumn('company_information', 'logo_mime_type', 'VARCHAR(100) NULL');
    await ensureColumn('payroll_settings', 'check_in_time', "TIME DEFAULT '09:00:00'");
    await ensureColumn('payroll_settings', 'check_out_time', "TIME DEFAULT '17:00:00'");
    const [settings] = await db.execute('SELECT id FROM payroll_settings LIMIT 1');
    if (!settings.length) await db.execute("INSERT INTO payroll_settings (working_days, working_hours, ot_rate, sunday_ot_rate, check_in_time, check_out_time, salary_method, epf_percentage, etf_percentage) VALUES (26, 8, 1.5, 2, '09:00', '17:00', 'Monthly', 12, 3)");
    for (const field of ['total_working_hours','total_ot_hours','total_sunday_working_hours','total_late_hours']) {
        const [columns]=await db.execute('SELECT COLUMN_TYPE AS Type FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?', ['employee_monthly_attendance_summary',field]);
        if (columns[0]?.Type !== 'decimal(12,6)') await db.execute('ALTER TABLE employee_monthly_attendance_summary MODIFY COLUMN '+field+' DECIMAL(12,6) DEFAULT 0');
    }
    // Old triggers rewrite historical basic pay and conflict with explicit transactions.
    // They must be removed before writes are enabled; permission failures stop startup.

    const legacyTriggers = ["sync_employer_epf_etf_after_basic_pay_insert","sync_employer_epf_etf_after_basic_pay_update","sync_employer_epf_etf_after_basic_pay_delete","sync_basic_pay_after_summary_insert","sync_basic_pay_after_summary_update","sync_basic_pay_after_summary_delete","sync_basic_pay_after_salary_insert","sync_basic_pay_after_salary_update"];
    const [triggers] = await db.execute('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()');
    for (const row of triggers) if (legacyTriggers.includes(row.TRIGGER_NAME)) await db.query('DROP TRIGGER '+row.TRIGGER_NAME);

    // Bootstrap is opt-in and only creates an account on an empty installation.
    const [existingUsers] = await db.execute('SELECT id FROM users LIMIT 1');
    if (!existingUsers.length && process.env.BOOTSTRAP_ADMIN_PASSWORD && process.env.BOOTSTRAP_ADMIN_EMAIL) {
        if (process.env.BOOTSTRAP_ADMIN_PASSWORD.length < 12) throw new Error('Bootstrap password must be at least 12 characters');
        await db.transaction(async () => {
            const hash = await bcrypt.hash(process.env.BOOTSTRAP_ADMIN_PASSWORD, 10);
            const [result] = await db.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'ADMIN')", [process.env.BOOTSTRAP_ADMIN_EMAIL, hash]);
            await db.execute("INSERT INTO employees (employee_id, user_id, full_name, email, status) VALUES ('EMP000', ?, 'System Admin', ?, 'Active')", [result.insertId, process.env.BOOTSTRAP_ADMIN_EMAIL]);
        });
    }
    console.log('Database schema ready. Existing passwords, salaries and payslips preserved.');
};
