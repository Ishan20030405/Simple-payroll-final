# Payroll frontend

See the package root README for configuration and startup. From this folder run npm ci --include=dev, then npm start. Windows PowerShell can use npm.cmd.

The frontend uses http://localhost:3000 and connects to the VITE_API_URL in .env.local, defaulting to http://localhost:5000/api. Restart after configuration changes. npm run build produces a dist folder for build inspection.
