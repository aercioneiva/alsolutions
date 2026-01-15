
const companyService = require('../services/company-service');

exports.createCompany = async (req, res) => {
   const { company } = req.body;

   const companyCreated = await companyService.createCompany(company);

   if(!companyCreated){
      return res.status(400).send();
   }

   return res.status(201).send();
}

exports.updateCompany = async (req, res) => {
   const { company } = req.body;

   const companyUpdated = await companyService.updateCompany(company);

   if(!companyUpdated){
      return res.status(400).send();
   }

   return res.status(201).send();
}
