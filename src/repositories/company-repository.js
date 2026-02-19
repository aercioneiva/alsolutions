const db = require('../db/connection.js');

module.exports = class CompanyRepository {
   constructor(){}

   async find(contract) {
      try {
         const [ rows ] = await db.raw(`SELECT * FROM company WHERE contract=? AND status='A' LIMIT 1`,[contract]);
         
         if(rows.length > 0){
            return {
               id: rows[0].id,
               name: rows[0].name,
               contract: rows[0].contract,
               id_whatsapp: rows[0].id_whatsapp,
               timezone: rows[0].timezone,
               account: rows[0].account,
               inbox: rows[0].inbox,
               downtime: rows[0].downtime,
               system: rows[0].system,
               host: rows[0].host,
               key_integration: rows[0].key_integration,
               fluxo: rows[0].fluxo,
               topico: rows[0].topico,
               status: rows[0].status
            };
         }
         
         return null;
      } catch (error) {
         console.error('Error in company repository find:', error);
         throw error;
      }
   }

   async findAll() {
      try {
         const [ rows ] = await db.raw(`SELECT * FROM company WHERE status='A'`);

         return rows.map(row => ({
            id: row.id,
            name: row.name,
            contract: row.contract,
            id_whatsapp: row.id_whatsapp,
            timezone: row.timezone,
            account: row.account,
            inbox: row.inbox,
            downtime: row.downtime,
            system: row.system,
            host: row.host,
            key_integration: row.key_integration,
            fluxo: row.fluxo,
            topico: row.topico,
            status: row.status
         }));
      } catch (error) {
         console.error('Error in company repository findAll:', error);
         throw error;
      }
   }

   async create(company) {
      try {
         const {contract, account, inbox, downtime, system, name , id_whatsapp} = company;

         const [ id ] = await db.insert({
            name,
            id_whatsapp,
            contract,
            account, 
            inbox, 
            downtime, 
            system,
            status: 'A'
         })
         .into('company');

         return id || null;
      } catch (error) {
         console.error('Error in company repository create:', error);
         throw error;
      }
   }

   async update(company) {
      try {
         const {downtime, system, status, account, inbox, contract} = company;
         
         const data = {};
         
         // Só adiciona campos que foram fornecidos
         if(downtime !== undefined) data.downtime = downtime;
         if(system !== undefined) data.system = system;
         if(status !== undefined) data.status = status;
         if(account !== undefined) data.account = account;
         if(inbox !== undefined) data.inbox = inbox;

         if(Object.keys(data).length === 0) {
            return null; // Nenhum campo para atualizar
         }

         const update = await db('company')
            .where({ contract: contract })
            .update(data)
            .limit(1);

         return update || null;
      } catch (error) {
         console.error('Error in company repository update:', error);
         throw error;
      }
   }
}
