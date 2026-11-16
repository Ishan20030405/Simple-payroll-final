const path=require('node:path');
require('dotenv').config({path:path.resolve(__dirname,'../.env')});
const required=['DB_HOST','DB_USER','DB_NAME','EMAIL_USER','EMAIL_PASS','JWT_SECRET'];
const placeholders=new Set(['your-cloud-mysql-host','your_database_user','your_database_name','your-mailbox@gmail.com','replace_with_gmail_app_password','replace_with_database_password']);
let bad=required.filter(key=>!process.env[key] || placeholders.has(process.env[key]));
if(placeholders.has(process.env.DB_PASSWORD))bad.push('DB_PASSWORD');
if((process.env.JWT_SECRET||'').length<32 && !bad.includes('JWT_SECRET'))bad.push('JWT_SECRET');
for(const key of ['PORT','DB_PORT']){const value=Number(process.env[key] || (key==='PORT'?5000:3306));if(!Number.isInteger(value)||value<1||value>65535)bad.push(key);}
if(!/^[A-Za-z0-9_$]+$/.test(process.env.DB_NAME||'') && !bad.includes('DB_NAME'))bad.push('DB_NAME');
if(Boolean(process.env.BOOTSTRAP_ADMIN_EMAIL)!==Boolean(process.env.BOOTSTRAP_ADMIN_PASSWORD))bad.push('both BOOTSTRAP_ADMIN values');
if(process.env.BOOTSTRAP_ADMIN_PASSWORD && process.env.BOOTSTRAP_ADMIN_PASSWORD.length<12)bad.push('BOOTSTRAP_ADMIN_PASSWORD minimum 12 characters');
if(bad.length){console.error('Configure backend/.env before starting. Check: '+bad.join(', '));process.exitCode=1;}
else console.log('Required configuration is present. Database and email connectivity will be checked by actual operations.');
