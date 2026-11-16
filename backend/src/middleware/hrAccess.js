// HR responses use explicit field lists so future financial fields stay private.
const pick = (row, fields) => row == null ? row : Object.fromEntries(fields.filter(key=>row[key]!==undefined).map(key=>[key,row[key]]));
const employeeFields=['id','employee_id','full_name','email','phone','department','designation','designation_name','join_date','address','status','dob','nic','gender','marital_status','emergency_contact','user_role','user_account_active','created_at','updated_at'];
const designationFields=['id','designation_name','department','status'];
const hoursFields=['employee_code','employee_name','department','department_name','working_days','present_days','absent_days','leave_days','late_hours','no_pay_days','normal_ot_hours','sunday_ot_hours','date','status','check_in','check_out','working_hours','overtime_hours'];
const employee = row => pick(row,employeeFields);
const hours = row => pick(row,hoursFields);
function designationResponse(req,res,next){
 if(req.user.role==='HR'){
  const send=res.json.bind(res);
  res.json=value=>send(res.statusCode>=400?value:Array.isArray(value)?value.map(row=>pick(row,designationFields)):pick(value,designationFields));
 }
 next();
}
module.exports={employee,hours,designationResponse};
