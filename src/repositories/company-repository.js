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
               token_whatsapp: rows[0].token_whatsapp,
               version_whatsapp: rows[0].version_whatsapp,
               flow: rows[0].flow,
               chatwoot_account: rows[0].chatwoot_account,
               chatwoot_inbox: rows[0].chatwoot_inbox,
               chatwoot_token: rows[0].chatwoot_token,
               downtime: rows[0].downtime,
               system: rows[0].system,
               host: rows[0].host,
               key_integration: rows[0].key_integration,
               rbx_account: rows[0].rbx_account,
               rbx_user: rows[0].rbx_user,
               fluxo: rows[0].fluxo,
               topico: rows[0].topico,
               cause: rows[0].cause,
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
            token_whatsapp: row.token_whatsapp,
            version_whatsapp: row.version_whatsapp,
            flow: row.flow,
            chatwoot_account: row.chatwoot_account,
            chatwoot_inbox: row.chatwoot_inbox,
            chatwoot_token: row.chatwoot_token,
            downtime: row.downtime,
            system: row.system,
            host: row.host,
            key_integration: row.key_integration,
            rbx_account: row.rbx_account,
            rbx_user: row.rbx_user,
            fluxo: row.fluxo,
            topico: row.topico,
            cause: row.cause,
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
