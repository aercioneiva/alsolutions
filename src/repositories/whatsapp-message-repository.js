const db = require('../db/connection.js');

module.exports = class WhatsappMessageRepository {

   constructor(){}

   async create(messageId, userId, phoneNumberId, messsage, status, contract) {

      const [ { insertId } ] = await db.raw(
         `INSERT IGNORE INTO whatsapp_messages 
         (message_id, user_id, phone_number, message_data, status, contract) 
         VALUES (?, ?, ?, ?, ?, ?)`,
         [
            messageId,
            userId,           
            phoneNumberId,
            messsage,
            status,
            contract
         ]
      );

      return insertId;
   }

   async setSessionId(whatsappMessageID, idSession) {
      await db.raw(`UPDATE whatsapp_messages SET session_id = ? WHERE id = ?`, [idSession, whatsappMessageID]);
   }

   async getMessageBydSessionId(sessionId) {
      const [ rows ] = await db.raw(`SELECT * FROM whatsapp_messages WHERE session_id = ? ORDER BY id`, [sessionId]);
      
      return rows.map(row => ({
         id: row.id,
         message_id: row.message_id,
         user_id: row.user_id,
         phone_number: row.phone_number,
         message_data: row.message_data,
         status: row.status,
         contract: row.contract,
         session_id: row.session_id
      }));
   }
}
