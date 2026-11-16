const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const backend=path.join(root,'backend/.env');
if(!fs.existsSync(backend)){
  const template=fs.readFileSync(path.join(root,'backend/.env.example'),'utf8');
  fs.writeFileSync(backend,template.replace(/^JWT_SECRET=.*$/m,'JWT_SECRET='+crypto.randomBytes(32).toString('hex')),{flag:'wx'});
  console.log('Created backend/.env with a private random signing secret. Configure database and email next.');
}else console.log('Preserved existing backend/.env.');
const frontend=path.join(root,'frontend/.env.local');
if(!fs.existsSync(frontend)){fs.copyFileSync(path.join(root,'frontend/.env.example'),frontend,fs.constants.COPYFILE_EXCL);console.log('Created frontend/.env.local.');}
else console.log('Preserved existing frontend/.env.local.');
