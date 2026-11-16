# API documentation

With the backend running, open http://localhost:5000/api-docs/ or /openapi.json on its configured port. openapi.json in this folder is a standalone contract for API tools.

Login requires POST /api/auth/login followed by POST /api/auth/verify-otp. Paste the returned JWT into Swagger Authorize without the Bearer prefix. Operations list their roles and workflow requirements. Execute performs a real request with the authorized account.

Report endpoints return JSON. PDF export is performed by the application frontend. See the package root README for setup and normal workflows.
