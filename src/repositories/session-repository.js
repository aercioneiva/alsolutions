const db = require('../db/connection.js');

module.exports = class SessiontRepository {

   constructor(){}

   async find(number) {
      const [ rows ] = await db.raw(`SELECT * FROM session WHERE number=? ORDER BY Id DESC LIMIT 1`,[number]);

      let session = {};
      if(rows.length > 0){
         session.id = rows[0].id;
         session.number = rows[0].number;
         session.session = rows[0].session;
         session.conversation = rows[0].conversation;
         session.ticket = rows[0].ticket;
         session.updatedAt = rows[0].updated_at;
         
         return session;
      }
      
      return null;
   }

   async findExpirationSession(contract) {
      const [ rows ] = await db.raw(`SELECT id, conversation, FLOOR(TIMESTAMPDIFF(SECOND, updated_at, NOW()) / 60) AS uptime FROM session WHERE contract=? ORDER BY id`,[contract]);
   
      return rows;
   }

   async create(sessionCreate) {
      const {contract, number, session, conversation , ticket } = sessionCreate;
      const time = new Date().toISOString().replace('T', ' ').replace('Z', '');
      let data = {
         contract,
         number,
         session,
         conversation: 0,
         ticket: 0,
         updated_at: time,
      }

      if(conversation){
         data.conversation = conversation;
      }
      if(ticket){
         data.ticket = ticket;
      }
      const [id] = await db.insert(data).into('session');

      if(id){
         return id;
      }
      
      return null;
   }

   async update(idSession, sessionUpdate) {
      const {conversation, updatedAt , ticket} = sessionUpdate;
      
      let data = {}

      if(conversation){
         data.conversation = conversation;
      }
      if(ticket){
         data.ticket = ticket;
      }

      if(updatedAt){
         data.updated_at = updatedAt;
      }
      const affectedRows = await db('session').where({ id: idSession }).update(data);

      if(affectedRows){
         return affectedRows;
      }
      
      return null;
   }

   async delete(idSession) {
      const affectedRows = await db('session').where({id: idSession}).delete().limit(1);

      return affectedRows;
   }

   async deleteExpirationSession(contract, downtime) {
      return await db('session').whereRaw('contract=? AND FLOOR(TIMESTAMPDIFF(SECOND, updated_at, NOW()) / 60) >=? AND conversation=0',[contract,downtime]).delete().limit(1);
   }

}
