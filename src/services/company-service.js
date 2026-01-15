const CompanyRepository = require('../repositories/company-repository');
const Cache = require('../libs/cache');
const Logger = require('../libs/logger');

const makeCompany = () => {
   return new CompanyRepository(); 
}
exports.getCompany = async (contract) => {
   const companyRepository = makeCompany();

   if(!contract){
      return null;
   }

   try {
      return await companyRepository.find(contract);
   } catch (error) {
      Logger.error(`[SERVICE-COMPANY] Não achou a company: ${error}`);
   }

   return null;
}

exports.getCompanies = async () => {
   const companyRepository = makeCompany();

   try {
      return await companyRepository.findAll();
   } catch (error) {
      Logger.error(`[SERVICE-COMPANY] Não achou as companies: ${error}`);
   }

   return [];
}

exports.createCompany = async (company) => {
   const companyRepository = makeCompany();

   if(!company || !company.contract){
      return null;
   }

   try {
      return await companyRepository.create(company);
   } catch (error) {
      Logger.error(`[SERVICE-COMPANY] Não criou a company: ${error}`);
   }

   return null;
}

exports.updateCompany = async (company) => {
   const companyRepository = makeCompany();

   if(!company || !company.contract){
      return null;
   }

   if(company.status && company.status != 'A' && company.status != 'I'){
      return null;
   }

   try {
      const companyUpdated = await companyRepository.update(company);
      await Cache.del(company.contract);

      return companyUpdated;
   } catch (error) {
      Logger.error(`[SERVICE-COMPANY] Não atualizou company: ${error}`);
   }

   return null;
}
