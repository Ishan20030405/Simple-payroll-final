const router = require('express').Router();
const swaggerUi = require('swagger-ui-express');
const document = require('./openapi');

router.get('/openapi.json', (req,res)=>res.json(document));
router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(document, {
    customSiteTitle:'Payroll API documentation',
    swaggerOptions:{validatorUrl:null,persistAuthorization:false,tryItOutEnabled:false,filter:true,displayRequestDuration:true}
}));
module.exports=router;
