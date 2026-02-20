const companyService  = require('./company-service');
const { ZapQueue } = require('../libs/queue');
const { version } = require('react');

async function _processarMessage(message,numbers, company) {
   const numbersSend = numbers.split(',');
   for (let index = 0; index < numbersSend.length; index++) {
      let number = numbersSend[index].replace(/\D/g, '');
      if(number){
         await _sendMessage(message,'55'+number,company);
      }
      
   }
}

async function _sendMessage(message,number, company) {
   const data = { messaging_product: 'whatsapp', to: number, text: {body: message}, contract: company.contract, id_whatsapp: company.id_whatsapp, version_whatsapp: company.version_whatsapp };
   ZapQueue.add('EnviarMensagemWhatsapp',data);
}


exports.sendMessage = async (contract, message, numbers) => {
   if(!contract || !message || !numbers){
      return false;
   }

   const company = await companyService.getCompany(contract);

   if(!company){
      return false;
   }
   
   _processarMessage(message,numbers,company);

   return true;
}
