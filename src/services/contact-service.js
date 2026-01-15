const companyService = require('./company-service');
const ContactRepository = require('../repositories/contact-repository');
const Logger = require('../libs/logger');

const makeContact = () => {
   return new ContactRepository();
}
exports.getContact = async ({number,contract}) => {
   const contactRepository = makeContact();

   if(!number || !contract){
      return null;
   }

   const responseCompany = await companyService.getCompany(contract);

   if(!responseCompany){
      return null;
   }

   try {
      return await contactRepository.findContact(number.replace(/\D/g, ''), contract);
   } catch (error) {
      Logger.error(error)
   }

   return null;
}

exports.createContact = async (contact) => {
   const contactRepository = makeContact();

   if(!contact){
      return null;
   }

   const responseCompany = await companyService.getCompany(contact.contract);

   if(!responseCompany){
      return null;
   }

   try {
      const oldContact = await contactRepository.find({number: contact.number.replace(/\D/g, ''), contract: contact.contract, code: contact.customer_code});
      if(!oldContact){
         
         const contactId = await contactRepository.create(contact);
         await contactRepository.createCustomer(contactId, contact);

         return contactId;
      }
      

      if(!oldContact.customer.id){
         await contactRepository.createCustomer(oldContact.id, contact);
         return oldContact.id;
      }

      return oldContact.id;
   } catch (error) {
      console.log(error);
      Logger.error(`[SERVICE-CONTACT] Erro ao cadastrar contato:`,error);
   }
   

   return null;
}
exports.updateLastMessage = async (contactPhoneNumber, lastMessage) => {
   const contactRepository = makeContact();

   try {
      return await contactRepository.updateLastMessage(contactPhoneNumber, lastMessage);
   } catch (error) {
      Logger.error(`[SERVICE-CONTACT] Erro ao atualizar contato:`,error);
   }

   return null;
}  
