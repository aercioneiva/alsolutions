const contactService = require('../services/contact-service');

exports.getContact = async (req, res) => {
   const { number, contract } = req.params;

   const contact = await contactService.getContact({ number, contract });

   if(!contact){
      return res.status(404).send('');
   }

   return res.json(contact);
}

exports.createContact = async (req, res) => {
   const { contact } = req.body;

   const contactCreated = await contactService.createContact(contact);

   if(!contactCreated){
      return res.status(400).send();
   }

   return res.status(201).send();
}
