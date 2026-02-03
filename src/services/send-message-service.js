const companyService  = require('./company-service');
const { ZapApiQueue } = require('../libs/queue');

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
   const data = { messaging_product: 'whatsapp', to: number, text: {body: message}, contract: company.contract};
   
   // ZapApiQueue.add(EnviarMensagemZapApi.key,data,{
   //    attempts: 1,
   //    backoff: { type: 'fixed', delay: 10000 }  // 10 segundos de atraso entre tentativas
   // });
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
