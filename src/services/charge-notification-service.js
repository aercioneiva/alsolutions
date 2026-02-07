const axios = require('axios');
const Logger = require('../libs/logger');

const companyService  = require('./company-service');
const { ZapNotificationsQueue } = require('../libs/queue');


async function _processarMessage(message, numbers, company) {
   const cliente = parseInt(message);
   const number = `55${numbers}`;
   try {
      const headers = {
         'authentication_key': 'ITI58HF6F77UGFMZ3XVRPF4W57LJR3'
      };

      const response = await axios({
         method: "POST",
         url: `https://integra.loga.net.br/routerbox/ws_json/ws_json.php`,
         headers,
         data : { get_unpaid_document: { customer_id: cliente, account_number: 3 } }
      });

      if(response.data.result){
         //manda mensagem de cobrança
         const data = { 
               messaging_product: 'whatsapp', 
               to: number, 
               text: { 
                  body: `Aqui vai uma mensagem de cobrança a ser definida` 
               },
               contract: company.contract
         };
         
         ZapNotificationsQueue.add('EnviarMensagemZapNotifications',data);

         //manda pdf/pix de cobrança
         for(const boleto of response.data.result) {
               const responseFileUrl = axios({
                  method: "POST",
                  url: `https://integra.loga.net.br/routerbox/ws_json/ws_json.php`,
                  headers,
                  data : { get_banking_billet:{ document_id: boleto.id } }
               });

               const responsePix = axios({
                  method: "POST",
                  url: `https://integra.loga.net.br/routerbox/ws_json/ws_json.php`,
                  headers,
                  data : { get_pix_copia_cola:{ banking_billet_id: boleto.id, send_pix_copia_cola: false } }
               });

               const [pdf, pixCopiaCola] = await Promise.all([
                  responseFileUrl.catch((error) => Logger.error(`[SERVICE-CHARGE-NOTIFICATION] Erro ao buscar link pdf: ${error}`)),
                  responsePix.catch((error) => Logger.error(`[SERVICE-CHARGE-NOTIFICATION] Erro ao buscar pix-copiaecola ${error}`))
               ]);

               if(pdf){
                  const data = { 
                     messaging_product: 'whatsapp', 
                     to: number, 
                     type: "document",  
                     document: {
                           link: pdf.data.result.banking_billet_link,
                           filename: pdf.data.result.banking_billet_link.split('/')[5] || 'Boleto.pdf'
                     },
                     contract: company.contract
                  };
                  
                  ZapNotificationsQueue.add('EnviarMensagemZapNotifications',data);
               }

               if(pixCopiaCola){
                  const data = { 
                     messaging_product: 'whatsapp', 
                     to: number, 
                     text: { 
                           body: pixCopiaCola.data.result
                     },
                     contract: company.contract
                  };
                  
                  ZapNotificationsQueue.add('EnviarMensagemZapNotifications',data);
               }
         }
      }
   } catch (error) {
      Logger.error(`[SERVICE-CHARGE-NOTIFICATION] Erro ao recuperar cliente: ${cliente}-${error}`);
   }
}

exports.sendNotification = async (contract, message, numbers) => {
   if(!contract || !message || !numbers){
      return false;
   }

   const company = await companyService.getCompany(contract);

   if(!company){
      return false;
   }
   
   _processarMessage(message, numbers, company);

   return true;
}
