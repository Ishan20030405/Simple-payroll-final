const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { Report, validateFilters } = require('../models/Report');

router.use(authenticate, authorize('ADMIN','HR'));
router.use((req,res,next)=>{if(req.user.role==='HR' && req.path!=='/options' && !['attendance','overtime','daily-attendance'].includes(req.query.type))return res.status(403).json({message:'HR can view attendance and overtime hours reports only.'});next();});
router.get('/options', async (req, res, next) => {
    try { res.json(await Report.options()); } catch (error) { next(error); }
});
router.get('/', async (req, res, next) => {
    let filters;
    try { filters = validateFilters(req.query); }
    catch (error) { return res.status(400).json({ message: error.message }); }
    try { const rows=await Report.getRows(filters);res.json({ filters, rows:req.user.role==='HR'?rows.map(require('../middleware/hrAccess').hours):rows }); }
    catch (error) { next(error); }
});
const transactional = require('../middleware/transactional');
for (const layer of router.stack) {
 if (layer.route && Object.keys(layer.route.methods).some(method => ['post', 'put', 'patch', 'delete'].includes(method))) {
  const handlers = layer.route.stack;
  const last = handlers[handlers.length - 1];
  if (last.handle.name !== 'uploadCompanyLogo') last.handle = transactional(last.handle);
 }
}
module.exports = router;
