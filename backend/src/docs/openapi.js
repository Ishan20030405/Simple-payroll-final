// Runtime OpenAPI documentation source.
const ref = name => ({ $ref: `#/components/schemas/${name}` });
const str = (example,extra={}) => ({type:'string',...(example===undefined?{}:{example}),...extra});
const num = (example,extra={}) => ({type:'number',example,...extra});
const integer = (example,extra={}) => ({type:'integer',example,...extra});
const object = (properties,required=[]) => ({type:'object',properties,...(required.length?{required}:{})});
const array = items => ({type:'array',items});
const date = str('2026-11-14',{format:'date'});
const month = str('2026-11',{pattern:'^\\d{4}-\\d{2}(-01)?$',description:'YYYY-MM or the first day of the month (YYYY-MM-01).'});
const time = str('09:00',{pattern:'^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$',nullable:true});
const status = str('Active',{enum:['Active','Inactive']});
const role = str('EMPLOYEE',{enum:['ADMIN','HR','EMPLOYEE']});
const decimal = {oneOf:[{type:'number'},{type:'string'}],example:'1.50',description:'Database numeric values may be returned as strings.'};
const money = {...decimal,example:'1500.00',description:'Database DECIMAL values may be returned as strings; monetary values are in Rs.'};
const password = str(undefined,{format:'password',minLength:8,writeOnly:true});
const id = integer(7,{minimum:1});
const code = str('E002',{description:'Employee business code, distinct from the numeric database id.'});
const loose = {type:'object',additionalProperties:true};
const envelope = (key,schema,extra={}) => object({message:str('Operation completed successfully'),[key]:schema,...extra});
const nullableText = example => str(example,{nullable:true});
const employeeWrite = {
 employeeId:code,fullName:str('Sample Employee'),email:str('employee@example.test',{format:'email'}),phone:nullableText('0770000000'),
 department:nullableText('FIN'),designation:nullableText('Accountant'),joinDate:{...date,nullable:true},address:nullableText('Colombo'),status,
 dob:{...date,nullable:true},nic:str('000000000V'),gender:nullableText('Female'),maritalStatus:nullableText('Single'),emergencyContact:nullableText('0770000001'),
 userRole:{...role,description:'Only ADMIN can assign ADMIN or HR. HR can create EMPLOYEE accounts only and cannot change existing roles.'}
};
const salaryFields=Object.fromEntries(['basic_pay','attendance_allowance','special_allowance','travelling_allowance','other_allowance','normal_ot_rate','sunday_ot_rate','late_rate','no_pay_rate','epf','other_deductions'].map(key=>[key,num(0,{minimum:0})]));
const allowanceFields=Object.fromEntries(['attendance_allowance','special_allowance','travelling_allowance','other_allowance'].map(key=>[key,num(0,{minimum:0})]));
const payrollNumbers=Object.fromEntries(['total_allowances','total_deductions','total_normal_ot_amount','total_sunday_ot_amount','total_additions','gross_salary','net_salary','apit_tax'].map(key=>[key,money]));
const employeeRead=object({id,employee_id:code,user_id:{...id,nullable:true},full_name:str('Sample Employee'),email:str('employee@example.test'),phone:nullableText('0770000000'),department:nullableText('FIN'),designation:nullableText('Accountant'),join_date:{...date,nullable:true},status,user_role:role,user_account_active:integer(1),designation_basic_salary:money});
employeeRead.description='Employee directory row. HR receives an explicit safe field list: user_id and salary fields are omitted. Other employee contact/personal fields can also be present.';
const attendanceRead=object({id,employee_id:{oneOf:[integer(7),code]},employee_db_id:id,employee_code:code,full_name:str('Sample Employee'),date,check_in:time,check_out:time,status:str('Present',{enum:['Present','Late','Absent','Leave','Holiday']}),working_hours:decimal,overtime:decimal,working_minutes:integer(570),overtime_minutes:integer(90)});
attendanceRead.description='Hours are decimal hours (1.5 = 1h30m). List/detail endpoints expose the employee business code and employee_db_id; history endpoints may return the raw numeric employee_id.';
const attendanceInput={employee_id:{oneOf:[code,id],description:'Active employee business code or numeric database id.'},date,check_in:time,check_out:time,status:str('Present',{enum:['Present','Late','Absent','Leave','Holiday'],description:'Present/Late require both times. Actual Present/Late status and durations are calculated from configured settings. Absent/Leave/Holiday clear times and durations.'})};
const payrollRead=object({employee_id:id,employee_code:code,month_year:{...date,example:'2026-11-01'},status:str('Pending',{enum:['Pending','Generated','Complete','Paid']}),...payrollNumbers,tax_calculated:{oneOf:[{type:'boolean'},{type:'integer'}]},payroll_data:{oneOf:[loose,str()],nullable:true,description:'Saved payroll snapshot; database driver may return JSON as an object or a string.'}});
const slipRead=object({id,employee_id:id,employee_code:code,employee_name:str('Sample Employee'),month_year:date,month_year_text:date,department:str('FIN'),designation:str('Accountant'),basic_salary:money,...payrollNumbers,payroll_data:payrollRead.properties.payroll_data});
const departmentWrite={department_id:str('FIN'),department_name:str('Finance'),department_head:nullableText('Sample Manager'),status};
const designationWrite={designation_name:str('Accountant'),department:str('FIN'),basic_salary:num(50000),ot_eligible:integer(1,{enum:[0,1]}),status};
const settingsFields={working_days:integer(26,{minimum:1,maximum:31}),working_hours:num(8,{minimum:1,maximum:24}),ot_rate:num(1.5,{minimum:0}),sunday_ot_rate:num(2,{minimum:0}),check_in_time:time,check_out_time:{...time,example:'17:00'},salary_method:str('Monthly'),epf_percentage:num(12,{minimum:0,maximum:100}),etf_percentage:num(3,{minimum:0,maximum:100})};
const companyFields={company_name:str('Sample Company'),email:str('office@example.test'),registration_number:str('REG-001'),tax_number:str('TAX-001'),phone_number:str('0110000000'),website:str('https://example.test'),company_address:str('Colombo'),base_currency:str('LKR'),time_zone:str('Asia/Colombo')};
const reportFilters=object({type:str('daily-attendance',{enum:['payroll','payslips','attendance','overtime','contributions','daily-attendance']}),date,year:integer(2026),month:integer(11),employee:code,department:str('FIN')});
const reportRow=object({employee_code:code,employee_name:str('Sample Employee'),department:str('FIN'),department_name:str('Finance'),date,status:str('Present'),check_in:time,check_out:time,working_hours:decimal,overtime_hours:decimal,present_days:decimal,absent_days:decimal,leave_days:decimal,late_hours:decimal,no_pay_days:decimal,normal_ot_hours:decimal,sunday_ot_hours:decimal,...payrollNumbers});
reportRow.description='Fields vary by report type. Daily attendance contains date, status, check-in/out, working_hours and overtime_hours. HR receives attendance/hour fields only; monetary fields and snapshots are removed.';
const schemas={
 Error:object({message:str('Unable to complete the request'),error:str('Additional error information'),success:{type:'boolean',example:false}}),
 Message:object({message:str('Operation completed successfully')}),
 User:object({id,username:str('employee@example.test'),role,is_active:{oneOf:[{type:'integer'},{type:'boolean'}]},employee:{...employeeRead,nullable:true}}),
 LoginRequest:object({username:str('employee@example.test'),password:{...password,minLength:1}},['username','password']),
 LoginChallenge:object({require2FA:{type:'boolean',example:true},message:str('Verification code sent to em***@example.test'),username:str('employee@example.test'),email:str('em***@example.test')}),
 OtpRequest:object({username:str('employee@example.test'),otp:str('123456',{pattern:'^\\d{6}$'})},['username','otp']),
 LoginSuccess:object({message:str('Login successful'),token:str(undefined,{description:'JWT access token. Paste this value into Swagger Authorize, without the Bearer prefix.'}),user:ref('User')}),
 RegisterRequest:object({username:str('employee@example.test'),password,role},['username','password']),
 RegisterLinkedRequest:object({username:str('employee@example.test'),password,role,employeeId:code},['username','password','employeeId']),
 UserUpdate:object({username:str('employee@example.test'),password,role,is_active:{type:'boolean',example:true}}),
 EmployeeCreate:object({...employeeWrite,initialPassword:password},['fullName','email','nic','initialPassword']),
 EmployeeUpdate:object(employeeWrite),Employee:employeeRead,
 Department:object(departmentWrite),DepartmentCreate:object(departmentWrite,['department_id','department_name']),
 DepartmentUpdate:object({department_name:departmentWrite.department_name,department_head:departmentWrite.department_head,status}),
 Designation:object({id,...designationWrite}),DesignationCreate:object(designationWrite,['designation_name']),DesignationUpdate:object(designationWrite),
 SalaryStructure:object({id,department:str('FIN'),designation:str('Accountant'),...salaryFields,status}),
 SalaryStructureCreate:object({department:str('FIN'),designation:str('Accountant'),...salaryFields,status},['department','designation']),
 SalaryStructureUpdate:object({department:str('FIN'),designation:str('Accountant'),...salaryFields,status}),
 Attendance:attendanceRead,AttendanceCreate:object(attendanceInput,['employee_id','date']),
 AttendanceUpdate:object({check_in:time,check_out:time,status:attendanceInput.status}),
 AttendanceBulk:object({records:{...array(ref('AttendanceCreate')),minItems:1,maxItems:2000}},['records']),
 AttendanceSummary:object({total_days:integer(22),present_days:decimal,absent_days:decimal,late_days:decimal,leave_days:decimal,total_hours:decimal,total_overtime:decimal}),
 StoredAttendanceSummary:object({employee_id:code,year:integer(2026),month:integer(11),...Object.fromEntries(['total_working_days','total_working_hours','total_ot_hours','total_sunday_working_hours','total_late_hours','total_no_pay_days','total_leaves'].map(key=>[key,{oneOf:[{type:'number'},{type:'string'}]}]))}),
 BasicPay:object({employee_id:code,year:integer(2026),month:integer(11),no_pay_amount:money,late_amount:money,net_basic_pay:money,epf:money}),
 Payroll:payrollRead,PayrollCreate:object({employee_id:id,month_year:month},['employee_id','month_year']),
 PayrollStatus:object({status:str('Complete',{enum:['Complete','Paid']})},['status']),
 MonthRequest:object({month_year:month},['month_year']),
 DraftEdit:object({...Object.fromEntries(['basic_salary','salary_for_epf','no_pay_amount','late_amount','normal_ot_hours','sunday_ot_hours','normal_ot_rate','sunday_ot_rate','epf','other_deduction'].map(key=>[key,num(0,{minimum:0})])),allowances:object(allowanceFields),total_no_pay_days:integer(0,{minimum:0,maximum:31}),total_late_hours:num(0,{minimum:0,maximum:744})}),
 Payslip:slipRead,PayslipGenerate:object({month_year:month,mode:str('All',{enum:['All','One by one','department','designation']}),employee_id:id,department:str('FIN'),designation:str('Accountant')},['month_year']),
 PayrollSettings:object(settingsFields),ShiftSettings:object({working_days:settingsFields.working_days,working_hours:settingsFields.working_hours,check_in_time:time,check_out_time:time}),
 Company:object(companyFields),TaxBracket:object({monthly_salary_range:str('0 - 100000'),tax_rate:num(6,{minimum:0,maximum:100})},['monthly_salary_range','tax_rate']),
 TaxSettings:object({brackets:{...array(ref('TaxBracket')),minItems:1}},['brackets']),
 TaxSummary:object({payroll_id:id,month_year:date,emp_code:code,full_name:str('Sample Employee'),gross_salary:money,net_salary:money,apit_tax:money}),
 TaxCalculation:object({employee_id:code,full_name:str('Sample Employee'),month_year:date,gross_salary:money,apit_tax:money,breakdown:array(loose)}),
 Contribution:object({employee_id:id,year:integer(2026),month:integer(11),epf_amount:money,etf_amount:money}),
 MonthlyExpense:object({id,year:integer(2026),month:integer(11),total_monthly_expenses:money}),
 Activity:object({id,user_id:{...id,nullable:true},username:str('employee@example.test'),user_role:role,full_name:nullableText('Sample Employee'),action:str('Update employee'),details:str('Completed. Employee E002 updated.'),ip_address:nullableText('127.0.0.1'),created_at:str('2026-11-14 09:00:00')}),
 ReportFilters:reportFilters,ReportRow:reportRow,
 ReportResult:object({filters:ref('ReportFilters'),rows:array(ref('ReportRow'))}),
 ReportOptions:object({employees:array(object({employee_id:code,full_name:str('Sample Employee'),department:str('FIN')})),departments:array(ref('Department'))})
};
const A=['ADMIN'], H=['ADMIN','HR'], ALL=['ADMIN','HR','EMPLOYEE'];
const paths={};
const json = schema => ({'application/json':{schema}});
const response = (schema,description='Successful response') => ({description,content:json(schema)});
const param=(name,schema,required=false,description='')=>({name,in:'query',required,schema,...(description?{description}:{})});
const searchParam=param('query',str('Sample'),true,'Search term.');
const yearParam=param('year',integer(2026,{minimum:1900,maximum:9999}),true);
const monthParam=param('month',integer(11,{minimum:1,maximum:12}),true);
const pathId=(name,description='Numeric database primary key.')=>({name,in:'path',required:true,description,schema:id});
const pathCode=(name,description='Employee business code (E002).')=>({name,in:'path',required:true,description,schema:code});
const periodPath=[pathId('employeeId'),{name:'monthYear',in:'path',required:true,schema:month}];
function add(method,path,tag,summary,{roles=A,description='',parameters=[],body,success=ref('Message'),status=200,errors=[],example,examples,content}={}){
 const responses={ [status]:response(success),500:{$ref:'#/components/responses/ServerError'} };
 if(roles.length){responses[401]={$ref:'#/components/responses/Unauthorized'};responses[403]={$ref:'#/components/responses/Forbidden'};}
 for(const error of errors)responses[error]={$ref:`#/components/responses/Error${error}`};
 const operation={tags:[tag],summary,operationId:method+path.replace(/[^a-zA-Z0-9]+/g,'_'),description:`${roles.length?'Allowed roles: '+roles.join(', '):'Public endpoint.'}${description?'\n\n'+description:''}`,
  'x-roles':roles,security:roles.length?[{bearerAuth:[]}]:[],responses};
 if(parameters.length)operation.parameters=parameters;
 if(body)operation.requestBody={required:true,content:content||{'application/json':{schema:body,...(example?{example}:{}),...(examples?{examples}:{})}}};
 paths[path]??={};paths[path][method]=operation;
 return operation;
}
const auth=(method,path,summary,options)=>add(method,'/auth'+path,'Authentication',summary,options);
auth('post','/login','Verify password and send email OTP',{roles:[],body:ref('LoginRequest'),success:ref('LoginChallenge'),description:'Step 1 only: this response does not contain a token. Requires a linked employee email and SMTP configuration. OTP expires after 10 minutes. Login and OTP attempts are rate limited.',errors:[400,401,403,429]});
auth('post','/verify-otp','Verify email OTP and issue a JWT',{roles:[],body:ref('OtpRequest'),success:ref('LoginSuccess'),description:'Step 2: use the latest emailed code. On success it is consumed and a 24-hour access token is returned. The database account must still be active.',errors:[400,403,404,429]});
auth('post','/forgot-password','Request password-reset email',{roles:[],body:object({username:str('employee@example.test')},['username']),description:'Returns the same generic response for unknown/inactive accounts. Reset links expire in 15 minutes; they are not access tokens.',errors:[400,429]});
auth('post','/reset-password','Consume a password-reset link',{roles:[],body:object({token:str(undefined,{writeOnly:true}),newPassword:{...password,description:'8 or more characters; at most 72 UTF-8 bytes.'}},['token','newPassword']),description:'Use the token from the emailed link, not the email OTP or login JWT. Invalidates previous sessions and reset links.',errors:[400,429]});
auth('get','/me','Read current account and linked employee',{roles:ALL,success:ref('User')});
auth('post','/logout','Revoke account sessions and pending OTPs',{roles:ALL});
auth('put','/change-password','Change own password',{roles:ALL,body:object({currentPassword:{...password,minLength:1},newPassword:password},['currentPassword','newPassword']),description:'After success, sign in again. Incorrect current password returns 400.',errors:[400,404]});
auth('post','/register','Create an account (Admin only)',{body:ref('RegisterRequest'),success:envelope('user',ref('User')),status:201,description:'Not public self-registration. Prefer POST /employees to create an employee and login atomically; an unlinked account cannot receive a login OTP.',errors:[400,409]});
auth('post','/register-user','Link a login to an existing employee',{body:ref('RegisterLinkedRequest'),success:object({success:{type:'boolean'},message:str(),user:ref('User')}),status:201,description:'Legacy linking endpoint. Employee must exist, have no login, and username must equal their email. Use an initial password, not an NIC.',errors:[400,404,409]});
auth('put','/update/{id}','Update an account role, status, username or password',{parameters:[pathId('id','Numeric user account id, not an employee id.')],body:ref('UserUpdate'),success:envelope('user',ref('User')),description:'Security changes revoke existing tokens and OTPs.',errors:[400,404,409]});
const binaryResponse={description:'Image bytes',content:Object.fromEntries(['image/png','image/jpeg','image/webp'].map(type=>[type,{schema:{type:'string',format:'binary'}}]))};
function pictureGet(path,tag,roles,parameters=[]){const op=add('get',path,tag,'Download profile picture',{roles,parameters,errors:[404]});op.responses[200]=binaryResponse;}
pictureGet('/auth/profile-picture','Profile pictures',ALL);
pictureGet('/employees/{id}/profile-picture','Profile pictures',H,[pathId('id')]);
add('put','/auth/profile-picture','Profile pictures','Upload own profile picture',{roles:ALL,body:loose,content:{'multipart/form-data':{schema:object({picture:{type:'string',format:'binary'}},['picture'])}},description:'One JPG, PNG or WebP file in the picture field; maximum 2 MB. File signatures are checked. Supplied user IDs are ignored.',errors:[400]});
add('delete','/auth/profile-picture','Profile pictures','Remove own profile picture',{roles:ALL});
add('get','/employees','Employees','List employees',{roles:H,success:array(ref('Employee')),description:'HR salary/user-id fields are removed.'});
add('get','/employees/search','Employees','Search employees',{roles:H,parameters:[searchParam],success:array(ref('Employee')),errors:[400]});
add('get','/employees/stats','Employees','Read employee counts',{roles:H,success:object({total:integer(10),active:integer(9),inactive:integer(1)})});
add('get','/employees/{id}','Employees','Read an employee',{roles:H,parameters:[pathId('id')],success:ref('Employee'),errors:[404]});
add('post','/employees','Employees','Create employee and linked login atomically',{roles:H,body:ref('EmployeeCreate'),status:201,success:envelope('data',ref('Employee')),description:'Omit employeeId for an automatic business code. HR may create EMPLOYEE accounts only. ADMIN can choose ADMIN, HR or EMPLOYEE.',example:{fullName:'Sample Employee',email:'employee@example.test',nic:'000000000V',initialPassword:'Example-password-123',department:'FIN',designation:'Accountant',userRole:'EMPLOYEE'},errors:[400,409]});
add('put','/employees/{id}','Employees','Update employee and linked account details',{roles:H,parameters:[pathId('id')],body:ref('EmployeeUpdate'),success:envelope('data',ref('Employee')),description:'Employee code is immutable. Email changes synchronize the login username. HR cannot modify Admin records or assign roles. Deactivation invalidates login sessions; users cannot deactivate themselves.',errors:[400,404,409]});
add('delete','/employees/{id}','Employees','Delete employee and linked login',{parameters:[pathId('id')],description:'Cannot delete own account or employees with Complete/Paid payroll; deactivate those employees instead.',errors:[404,409]});
function directory(tag,base,read,create,update,writeKey){
 add('get',base,tag,`List ${tag.toLowerCase()}`,{roles:H,success:array(ref(read)),description:tag==='Designations'?'HR responses omit basic_salary and other financial values.':''});
 add('get',base+'/search',tag,`Search ${tag.toLowerCase()}`,{roles:H,parameters:[searchParam],success:array(ref(read)),errors:[400]});
 const key=writeKey==='code'?{name:'id',in:'path',required:true,schema:str('FIN'),description:'Department business code, not a numeric id.'}:pathId('id');
 add('get',base+'/{id}',tag,'Read '+read.toLowerCase(),{roles:H,parameters:[key],success:ref(read),errors:[404]});
 add('post',base,tag,'Create '+read.toLowerCase(),{body:ref(create),success:envelope('id',writeKey==='code'?str('FIN'):id,tag==='Designations'?{designation:ref(read)}:{}),status:201,errors:[400,409]});
 add('put',base+'/{id}',tag,'Update '+read.toLowerCase(),{parameters:[key],body:ref(update),success:tag==='Designations'?envelope('designation',ref(read)):ref('Message'),description:tag==='Designations'?'Renames update employee/salary references. Moving an existing designation between departments is rejected.':'Department id is immutable.',errors:[400,404,409]});
 add('delete',base+'/{id}',tag,'Delete '+read.toLowerCase(),{parameters:[key],description:'Assigned records cannot be deleted.',errors:[404,409]});
}
directory('Departments','/departments','Department','DepartmentCreate','DepartmentUpdate','code');
directory('Designations','/designations','Designation','DesignationCreate','DesignationUpdate');
add('get','/salary-structures','Salary structures','List salary structures',{success:array(ref('SalaryStructure'))});
add('get','/salary-structures/search','Salary structures','Find salary structure by department and designation',{parameters:[param('department',str('FIN'),true),param('designation',str('Accountant'),true)],success:{oneOf:[ref('SalaryStructure'),array(ref('SalaryStructure'))]},errors:[400]});
add('get','/salary-structures/{id}','Salary structures','Read salary structure',{parameters:[pathId('id')],success:ref('SalaryStructure'),errors:[404]});
add('post','/salary-structures','Salary structures','Create salary structure',{body:ref('SalaryStructureCreate'),success:envelope('data',ref('SalaryStructure')),status:201,errors:[400,409]});
add('put','/salary-structures/{id}','Salary structures','Update salary structure',{parameters:[pathId('id')],body:ref('SalaryStructureUpdate'),success:envelope('data',ref('SalaryStructure')),errors:[400,404,409]});
add('delete','/salary-structures/{id}','Salary structures','Delete salary structure',{parameters:[pathId('id')],errors:[404]});
const attendance=(method,path,summary,options={})=>add(method,'/attendance'+path,'Attendance',summary,{roles:H,...options});
attendance('get','','Read attendance for one date',{parameters:[param('date',date,true)],success:array(ref('Attendance')),errors:[400]});
attendance('post','','Add attendance',{body:ref('AttendanceCreate'),status:201,success:envelope('data',ref('Attendance')),description:'Server calculates hours and refreshes draft payroll. Complete/Paid payroll is locked.',errors:[400,409]});
attendance('post','/bulk','Import attendance records atomically',{body:ref('AttendanceBulk'),success:object({message:str(),inserted:integer(1)}),description:'JSON records, not a multipart CSV file. Frontend CSV import converts rows to this format. 1-2000 records; duplicate employee/date entries and invalid/locked records reject the operation.',errors:[400,409]});
attendance('get','/employee/{employeeId}','Read attendance history',{parameters:[pathCode('employeeId','Employee business code or numeric database id.'),param('startDate',date),param('endDate',date)],success:array(ref('Attendance')),errors:[404]});
attendance('get','/summary/{employeeId}','Read calculated monthly attendance totals',{parameters:[pathCode('employeeId','Employee business code or numeric database id.'),yearParam,monthParam],success:ref('AttendanceSummary'),errors:[400,404]});
attendance('get','/summary-months/{employeeId}','List stored attendance months',{parameters:[pathCode('employeeId')],success:array(object({year:integer(2026),month:integer(11)}))});
attendance('get','/summary-record/{employeeId}','Read stored monthly attendance summary',{parameters:[pathCode('employeeId'),yearParam,monthParam],success:ref('StoredAttendanceSummary'),description:'Returns an empty object when no stored summary exists.',errors:[400]});
attendance('get','/basic-pay/{employeeId}','Read calculated basic pay',{roles:A,parameters:[pathCode('employeeId'),yearParam,monthParam],success:ref('BasicPay'),description:'Returns an empty object when absent. This financial endpoint is not available to HR.',errors:[400]});
attendance('get','/{id}','Read attendance record',{parameters:[pathId('id')],success:ref('Attendance'),errors:[404]});
attendance('put','/{id}','Edit attendance times or status',{parameters:[pathId('id')],body:ref('AttendanceUpdate'),success:envelope('data',ref('Attendance')),description:'Employee and date stay fixed; durations are recomputed. Reopen completed payroll before changing attendance.',errors:[400,404,409]});
attendance('delete','/{id}','Delete attendance',{parameters:[pathId('id')],description:'Locked payroll is protected. Deleting the last draft attendance clears its draft summaries and payroll.',errors:[404,409]});
add('get','/payrolls','Payroll','List payroll records',{success:array(ref('Payroll')),description:'Read-only; does not recalculate history.'});
add('get','/payrolls/months','Payroll','List payroll months',{success:array(object({month_year:date}))});
add('get','/payrolls/employee/{employeeId}','Payroll','List payroll for an employee',{parameters:[pathId('employeeId')],success:array(ref('Payroll'))});
add('get','/payrolls/employee/{employeeId}/month/{monthYear}','Payroll','Read payroll for employee and month',{parameters:periodPath,success:ref('Payroll'),errors:[404]});
add('post','/payrolls','Payroll','Calculate draft payroll for one employee',{body:ref('PayrollCreate'),status:201,success:envelope('id',ref('Payroll')),description:'Recalculates from stored summaries; supplied totals are not the source of truth. The legacy response key id contains the calculated payroll object, not a scalar id. Duplicate employee/month returns 409. Prefer /generate after attendance.',errors:[400,409]});
add('post','/payrolls/generate','Payroll','Calculate draft payroll for a month',{body:ref('MonthRequest'),success:envelope('data',object({created:integer(1),skipped:integer(0)})),description:'Refreshes attendance summaries and drafts. Skips Complete/Paid records. Then calculate tax, review and approve.',errors:[400,409]});
add('put','/payrolls/employee/{employeeId}/month/{monthYear}','Payroll','Approve payroll or mark it paid',{parameters:periodPath,body:ref('PayrollStatus'),description:'Complete requires tax_calculated, including zero-tax results. Paid requires Complete and a matching generated payslip revision. Financial edits belong to the draft editor.',errors:[400,404,409]});
add('delete','/payrolls/employee/{employeeId}/month/{monthYear}','Payroll','Delete draft payroll',{parameters:periodPath,description:'Complete/Paid records cannot be deleted.',errors:[404,409]});
add('post','/payrolls/employee/{employeeId}/month/{monthYear}/reopen','Payroll','Reopen completed payroll',{parameters:periodPath,description:'Only Complete can be reopened. Paid is immutable. Old payslips are hidden until a matching approved revision is regenerated.',errors:[404,409]});
add('get','/payslips/my','Payslips','Read own approved payslips',{roles:ALL,success:array(ref('Payslip')),description:'Uses authenticated account id. Query/body employee ids cannot select another user. Only current matching Complete/Paid snapshots are returned.'});
add('get','/payslips/options','Payslips','List current generated payslips',{success:array(ref('Payslip'))});
add('get','/payslips/generation-options','Payslips','List approved payroll available for generation',{success:array(ref('Payroll'))});
add('get','/payslips/employee/{employeeId}/month/{monthYear}','Payslips','Read stored payslip snapshot',{parameters:periodPath,success:ref('Payslip'),description:'Admin inspection can include an older snapshot. Use /options for the currently approved generated selection.',errors:[404]});
add('put','/payslips/employee/{employeeId}/month/{monthYear}','Payslips','Edit draft payroll values',{parameters:periodPath,body:ref('DraftEdit'),description:'Updates draft payroll, not the generated slip directly. Resets tax review. Recalculate tax, approve, then generate. Complete/Paid payroll rejects edits.',errors:[400,404,409]});
add('post','/payslips/generate','Payslips','Generate approved payslip snapshots',{body:ref('PayslipGenerate'),success:object({message:str(),saved:integer(1)}),description:'Only Complete payroll with reviewed tax and a snapshot can be generated. One by one requires numeric employee_id; department/designation modes require their matching field. Reconciles monthly expenses.',errors:[400,409]});
add('get','/payroll-settings','Settings','Read payroll settings',{success:ref('PayrollSettings')});
add('get','/payroll-settings/attendance','Settings','Read shift settings without salary rates',{roles:H,success:ref('ShiftSettings')});
add('put','/payroll-settings','Settings','Save payroll settings',{body:ref('PayrollSettings'),success:envelope('data',ref('PayrollSettings')),description:'Send the full settings object. Omitted values use controller defaults.',errors:[400]});
add('post','/payroll-settings/reset','Settings','Reset payroll settings',{success:envelope('data',ref('PayrollSettings'))});
add('get','/company-information','Company','Read company branding/details',{roles:ALL,success:ref('Company')});
add('put','/company-information','Company','Save company details',{body:ref('Company'),success:envelope('data',ref('Company'))});
add('post','/company-information/reset','Company','Reset company information',{success:envelope('data',ref('Company'))});
const logo=add('get','/company-information/logo','Company','Download company logo',{roles:ALL,errors:[404]});logo.responses[200]={description:'Stored image bytes',content:{'image/*':{schema:{type:'string',format:'binary'}}}};
add('post','/company-information/logo','Company','Upload company logo',{body:loose,content:{'multipart/form-data':{schema:object({logo:{type:'string',format:'binary'}},['logo'])}},success:envelope('data',ref('Company')),description:'Image in logo field; maximum 30 MB.',errors:[400]});
add('get','/tax-settings','Tax','Read APIT tax brackets',{success:object({success:{type:'boolean'},data:array(ref('TaxBracket'))})});
add('put','/tax-settings','Tax','Replace tax brackets atomically',{body:ref('TaxSettings'),success:object({success:{type:'boolean'},message:str(),data:array(ref('TaxBracket'))}),description:'Rates 0-100. Ranges must be ascending without overlaps or gaps; use numeric ranges or an open-ended final band.',errors:[400]});
add('post','/tax-settings/calculate','Tax','Calculate and save tax for draft month',{body:ref('MonthRequest'),success:object({success:{type:'boolean'},message:str(),data:array(ref('TaxCalculation'))}),description:'Updates only Pending/Generated payroll in the selected month. Recalculates deductions/net salary consistently and records tax review. Complete/Paid are not changed.',errors:[400,409]});
add('get','/tax-settings/summary','Tax','Read saved payroll tax summary',{parameters:[param('month',{...date,example:'2026-11-01',pattern:'^\\d{4}-\\d{2}-01$'},false,'Optional first day of the month, YYYY-MM-01. This endpoint compares the stored date directly.')],success:object({success:{type:'boolean'},data:array(ref('TaxSummary'))})});
add('get','/employer-epf-etf/employee/{employeeId}/year/{year}/month/{month}','Contributions and expenses','Read employer contributions',{parameters:[pathId('employeeId'),{...yearParam,in:'path'},{...monthParam,in:'path'}],success:ref('Contribution'),errors:[404]});
add('get','/monthly-salary-expenses','Contributions and expenses','Read recent monthly salary expenses',{parameters:[param('limit',integer(12,{minimum:1,maximum:36}))],success:array(ref('MonthlyExpense')),description:'Chronological monthly totals from current generated Complete/Paid slips, including employer contributions. Requested limit is clamped to 1-36.'});
add('get','/activities','Activity','Read recent activity logs',{parameters:[param('limit',integer(100,{minimum:1,maximum:200}))],success:array(ref('Activity')),description:'Newest first; limit is clamped to 1-200.'});
add('get','/reports/options','Reports','Read employee and department report filters',{roles:H,success:ref('ReportOptions')});
add('get','/reports','Reports','Read daily or monthly report data',{roles:H,
 parameters:[param('type',reportFilters.properties.type,true),param('date',date,false,'Required only for daily-attendance. A real YYYY-MM-DD calendar date.'),param('year',integer(2026,{minimum:1900,maximum:9999}),false,'Required for every monthly report.'),param('month',integer(11,{minimum:1,maximum:12}),false,'Required for every monthly report.'),param('employee',code),param('department',str('FIN'))],success:ref('ReportResult'),
 description:'Returns JSON, not a PDF attachment. Frontend Reports exports this data as PDF. HR may request attendance, overtime or daily-attendance only; salary/rate fields are removed. Monthly filters require year and month. Daily attendance requires date, includes saved records only, does not infer absences, and uses current employee departments. Working hours include overtime. Empty results return rows: [].',errors:[400]});
add('get','/health','System','Check server health',{roles:[],success:object({status:str('OK'),message:str('Server is running')})});
const responses={
 Unauthorized:response(ref('Error'),'Missing, invalid, expired or revoked access token.'),Forbidden:response(ref('Error'),'Account role cannot perform this action.'),ServerError:response(ref('Error'),'Server/database/email operation failed.'),
 Error400:response(ref('Error'),'Invalid or missing input.'),Error401:response(ref('Error'),'Invalid credentials or access token.'),Error403:response(ref('Error'),'Inactive account or insufficient permissions.'),
 Error404:response(ref('Error'),'Record or image not found.'),Error409:response(ref('Error'),'Duplicate record, locked payroll or invalid workflow transition.'),Error429:response(ref('Error'),'Authentication attempt limit reached; try again in 15 minutes.')
};
module.exports={openapi:'3.0.3',info:{title:'Payroll and HR REST API',version:require('../../package.json').version,
 description:'Local Express backend with MySQL and a React SPA.\n\n**Login:** POST /auth/login sends an email OTP; POST /auth/verify-otp returns the JWT. Click Authorize and paste the JWT without a Bearer prefix. No real credentials or tokens are embedded in this documentation.\n\n**Roles:** ADMIN manages payroll, accounts and settings; HR manages employee records, unlocked attendance and hours-only reports; EMPLOYEE uses own account/payslips. Permissions remain enforced on all API calls.\n\n**Payroll:** attendance -> calculate draft -> edit draft if needed -> calculate month tax -> approve (Complete) -> generate payslip -> mark Paid. Reopen Complete before corrections; Paid is immutable.\n\n**Identifiers:** employee id is a numeric database key; employee_id in directory responses is a business code such as E002. Each operation documents which to use. Dates use YYYY-MM-DD; payroll months use YYYY-MM or YYYY-MM-01; durations are decimal hours. Database DECIMAL columns may return strings. Some legacy database rows contain additional fields.\n\n**Reports:** daily and monthly endpoints return JSON. PDF download occurs in the SPA. Swagger Try it out executes real API calls when you choose Execute; use a test account/database for demonstrations.'},
 servers:[{url:'/api',description:'Backend on the current host and port'}],security:[{bearerAuth:[]}],tags:[...new Set(Object.values(paths).flatMap(item=>Object.values(item).flatMap(op=>op.tags)))].map(name=>({name})),paths,
 components:{securitySchemes:{bearerAuth:{type:'http',scheme:'bearer',bearerFormat:'JWT',description:'24-hour JWT from POST /auth/verify-otp. Logout, password, role and activation changes can revoke sessions.'}},schemas,responses}};
