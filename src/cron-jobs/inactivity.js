const dotenv = require('dotenv');
dotenv.config();

const Logger = require('../libs/logger');
const companyService = require('../services/company-service');
const sessionService = require('../services/session-service');


exports.inactivity = async () =>{
   try {
      const companies = await companyService.getCompanies();
      for (const company of companies) {
         const downtime = company.downtime;
         sessionService.deleteExpirationSession(company.contract,downtime);
      }
   } catch (error) {
      Logger.error(`Error executing inactivity cron job: ${error}`);
   }
}
