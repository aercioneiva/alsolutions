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
}
