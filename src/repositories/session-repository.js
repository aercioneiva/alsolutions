const db = require('../db/connection.js');

module.exports = class SessiontRepository {

   constructor(){}

   async find(number) {
   const row = await db('session')
         .select('id','number','session','conversation','ticket','updated_at')
         .where('number', number)
         .orderBy('id', 'desc')
         .first();

      if (!row) {
         return null;
      }

      return {
         id: row.id,
         number: row.number,
         session: row.session,
         conversation: row.conversation,
         ticket: row.ticket,
         updatedAt: row.updated_at
      };
   }

   async findExpirationSession(contract) {
      const [ rows ] = await db.raw(`SELECT id, conversation, FLOOR(TIMESTAMPDIFF(SECOND, updated_at, NOW()) / 60) AS uptime FROM session WHERE contract=? ORDER BY id`,[contract]);
   
      return rows;
   }

   async create(sessionCreate) {
      const {contract, number, session, conversation , ticket } = sessionCreate;
      let data = {
         contract,
         number,
         session,
         conversation: 0,
         ticket: 0
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
      return await db('session')
         .where('contract', contract)
         .where('conversation', 0)
         .whereRaw(
            'updated_at <= DATE_SUB(NOW(), INTERVAL ? MINUTE)',
            [downtime]
         )
         .limit(1)
         .delete();
   }

}
