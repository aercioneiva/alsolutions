const db = require("../db/connection.js");

module.exports = class ContactRepository {
  constructor() {}

  async findContact({ number, contract }) {
    try {
      const [rows] = await db.raw(
        `SELECT id, contract, number, name, created_at, updated_at, last_message
                                          FROM contact 
                                         WHERE number=? AND contract=?
                                      ORDER BY Id DESC 
                                         LIMIT 1`,
        [number, contract]
      );

      if (rows.length > 0) {
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
      console.error("Error in contact repository findContact:", error);
      throw error;
    }
  }

  async create(contact) {
    try {
      const { contract, number, name, customer } = contact;

      const [id] = await db
        .insert({
          contract,
          number,
          name: name.replace("'", "").replace('"', "").trim()
        })
        .into("contact");

      if (customer) {
        await db
          .insert({
            contact_id: id,
            name: customer.name.replace("'", "").replace('"', "").trim(),
            document: customer.document,
            code: customer.code
          })
          .into("contact_customer");
      }

      return id;
    } catch (error) {
      console.error("Error in contact repository create:", error);
      throw error;
    }
  }

  async createCustomer(contactId, customer) {
    try {
      const { name, document, customer_code } = customer;

      const [id] = await db
        .insert({
          contact_id: contactId,
          name: name.replace("'", "").replace('"', "").trim(),
          document: document,
          code: customer_code
        })
        .into("contact_customer");

      return id;
    } catch (error) {
      console.error("Error in contact repository createCustomer:", error);
      throw error;
    }
  }

  async delete(contact) {
    try {
      const result = await db("contact").where({ contract: contact.contract, number: contact.number }).delete().limit(1);

      return result > 0;
    } catch (error) {
      console.error("Error in contact repository delete:", error);
      throw error;
    }
  }

  async updateLastMessage(contactPhoneNumber) {
    try {
      const result = await db("contact")
        .where({ number: contactPhoneNumber })
        .update({ last_message: db.raw("NOW()") })
        .limit(1);

      return result > 0;
    } catch (error) {
      console.error("Error in contact repository updateLastMessage:", error);
      throw error;
    }
  }

  async findCustomer({ contact_id, code }) {
    try {
      const [rows] = await db.raw(
        `SELECT id, contact_id, name, document, code, created_at, updated_at
                                          FROM contact_customer 
                                         WHERE contact_id=? AND code=?
                                      ORDER BY Id DESC 
                                         LIMIT 1`,
        [contact_id, code]
      );

      if (rows.length > 0) {
        return {
          id: rows[0].id,
          contactId: rows[0].contact_id,
          name: rows[0].name,
          document: rows[0].document,
          code: rows[0].code,
          createdAt: rows[0].created_at,
          updatedAt: rows[0].updated_at
        };
      }

      return null;
    } catch (error) {
      console.error("Error in contact repository findCustomer:", error);
      throw error;
    }
  }

  async createCustomer(contactId, customer) {
    try {
      const { name, document, code } = customer;

      const [id] = await db
        .insert({
          contact_id: contactId,
          name: name.replace("'", "").replace('"', "").trim(),
          document: document,
          code: code
        })
        .into("contact_customer");

      return id;
    } catch (error) {
      console.error("Error in contact repository createCustomer:", error);
      throw error;
    }
  }

  async findLastCustomer(contract, number) {
    try {
      const [rows] = await db.raw(
        `SELECT contact_customer.id as id, 
                contact_customer.contact_id as contact_id, 
                contact_customer.name as name, 
                contact_customer.document as document, 
                contact_customer.code as code, 
                contact_customer.created_at as created_at, 
                contact_customer.updated_at as updated_at
           FROM contact_customer 
     INNER JOIN contact ON contact.id = contact_customer.contact_id
          WHERE contact.contract=? AND contact.number=?
       ORDER BY contact_customer.created_at DESC LIMIT 1`,
        [contract, number]
      );

      if (rows.length > 0) {
        return {
          id: rows[0].id,
          contactId: rows[0].contact_id,
          name: rows[0].name,
          document: rows[0].document,
          code: rows[0].code,
          createdAt: rows[0].created_at,
          updatedAt: rows[0].updated_at
        };
      }

      return null;
    } catch (error) {
      console.error("Error in contact repository findLastCustomer:", error);
      throw error;
    }
  }
};
