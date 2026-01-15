const db = require('../db/connection.js');

module.exports = class ContactRepository {

   constructor(){}

   async findContact(number, contract) {
      try {
         const [ rows ] = await db.raw(`SELECT id, contract, number, name, created_at, updated_at, last_message
                                          FROM contact 
                                         WHERE number=? AND contract=?
                                      ORDER BY Id DESC 
                                         LIMIT 1`,[number,contract]);
         
         if(rows.length > 0){
            return {
               id: rows[0].id,
               contract: rows[0].contract,
               number: rows[0].number,
               name: rows[0].name,
               createdAt: rows[0].created_at,
               updatedAt: rows[0].updated_at,
               lastMessage: rows[0].last_message
            };
         }
         
         return null;
      } catch (error) {
         console.error('Error in contact repository findContact:', error);
         throw error;
      }
   }

   async find({number, contract, code}) {
      try {
         const [ rows ] = await db.raw(`SELECT contact.id, 
                                               contact.contract, 
                                               contact.number, 
                                               contact.name, 
                                               contact.created_at, 
                                               contact.updated_at,
                                               customer.id AS customer_id,
                                               customer.name AS customer_name,
                                               customer.document AS customer_document,
                                               customer.code AS customer_code
                                          FROM contact 
                                          LEFT JOIN contact_customer customer ON customer.contact_id = contact.id AND customer.code=?
                                         WHERE contact.number=? AND contact.contract=?
                                      ORDER BY Id DESC 
                                         LIMIT 1`,[code, number,contract]);
         
         if(rows.length > 0){
            let contact = {
                id: rows[0].id,
               contract: rows[0].contract,
               number: rows[0].number,
               name: rows[0].name,
               customer: {},
               createdAt: rows[0].created_at,
               updatedAt: rows[0].updated_at
            }

            if(rows[0].customer_id){
               contact.customer = {
                  id: rows[0].customer_id,
                  name: rows[0].customer_name,
                  document: rows[0].customer_document,
                  code: rows[0].customer_code   
               }
            }

            return contact;
         }
         
         return null;
      } catch (error) {
         console.error('Error in contact repository find:', error);
         throw error;
      }
   }

   async create(contact) {
      try {
         const {contract, number, name} = contact;
         
         const [ id ] = await db.insert({
            contract,
            number,
            name : name.replace("'", "").replace('"', "").trim()
         })
         .into('contact');

         return id;
      } catch (error) {
         console.error('Error in contact repository create:', error);
         throw error;
      }
   }

   async createCustomer(contactId, customer) {
      try {
         const {name, document, customer_code} = customer;
         
         const [ id ] = await db.insert({
            contact_id: contactId,
            name: name.replace("'", "").replace('"', "").trim(),
            document: document,
            code: customer_code
         })
         .into('contact_customer');

         return id;

      } catch (error) {
         console.error('Error in contact repository createCustomer:', error);
         throw error;
      }
   }

   async delete(contact) {
      try {
         const result = await db('contact')
            .where({contract: contact.contract, number: contact.number})
            .delete()
            .limit(1);
         
         return result > 0;
      } catch (error) {
         console.error('Error in contact repository delete:', error);
         throw error;
      }
   }

   async updateLastMessage(contactPhoneNumber, lastMessage) {
      try {
         const result = await db('contact')
            .where({number: contactPhoneNumber})
            .update({last_message: lastMessage})
            .limit(1);
      
         return result > 0;
      } catch (error) {
         console.error('Error in contact repository updateLastMessage:', error);
         throw error;
      }
   }  
}
