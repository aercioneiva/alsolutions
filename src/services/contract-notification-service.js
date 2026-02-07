const axios = require('axios');
const Logger = require('../libs/logger');


const companyService  = require('./company-service');
const { ZapNotificationsQueue } = require('../libs/queue');

async function _processarMessage(cliente, contrato, evento, company, number) {
   try {
      const payload = {
         ConsultaClientes: {
               Autenticacao: {
                  ChaveIntegracao: `ITI58HF6F77UGFMZ3XVRPF4W57LJR3`
               },
               Filtro: `Codigo='${cliente}'`
         }
      };

      const response = await axios({
         method: "POST",
         url: `https://integra.loga.net.br/routerbox/ws/rbx_server_json.php`,
         data : payload
      });

      if(response.data.result){
         const { Nome, TelCelular, TelResidencial } = response.data.result[0];

         let telefone = TelResidencial;
         if(TelCelular != ''){
               telefone = TelCelular;
         }

         if(number){
               telefone = number;
         }
         let eventoDescricao;
         let eventoDescricaoComplemento = '';

         switch (evento) {
               case 'BLOCK':
                  eventoDescricao = 'bloqueado';
                  eventoDescricaoComplemento = ', para regularização entre em contato com a gente pelo telefone (44) 98888-8888';
                  break;
               case 'UNBLOCK':
                  eventoDescricao = 'desbloqueado';
                  break;
               case 'SUSPEND':
                  eventoDescricao = 'suspenso';
                  break;
               case 'REACTIVATE':
                  eventoDescricao = 'reativado';
                  break;
               case 'CANCEL':
                  eventoDescricao = 'cancelado';
                  eventoDescricaoComplemento = ', para regularização entre em contato com a gente pelo telefone (44) 98888-8888';
                  break;
               case 'BANDWIDTH_LIMIT':
                  eventoDescricao = 'reduzido a banda de navegação';
                  eventoDescricaoComplemento = ', para regularização entre em contato com a gente pelo telefone (44) 98888-8888';
                  break;
         }

         const message = `Olá ${Nome}, seu contrato foi ${eventoDescricao} em nossa base${eventoDescricaoComplemento}`;

         const data = { 
               messaging_product: 'whatsapp', 
               to: `55${telefone}`, 
               text: { body: message },
               contract: company.contract
         };

         ZapNotificationsQueue.add('EnviarMensagemZapNotifications',data);
      }
   } catch (error) {
      Logger.error(`[SERVICE-CONTRACT-NOTIFICATION] Erro ao recuperar cliente: ${cliente} - ${error}`);
   }
}

exports.sendNotification = async (contract, cliente, contrato, evento, number) => {
   if(!contract || !cliente || !contrato || !evento){
      return false;
   }

   const company = await companyService.getCompany(contract);

   if(!company){
      return false;
   }
   
   _processarMessage(cliente, contrato, evento, company, number);

   return true;
}
