const axios = require('axios');

const { ZapQueue, ChatQueue } = require('../libs/queue');
const Cache = require('../libs/cache');
const Logger = require('../libs/logger');
const sessionService = require('./session-service');
const companyService = require('./company-service');
const rbxsoftService = require('./rbxsoft-service');
const contactService = require('./contact-service');
const EnviarMensagemZap = require('../queue-jobs/enviar-mensagem-whatsapp');
const EnviarMensagemChatWoot = require('../queue-jobs/enviar-mensagem-chatwoot');
const Response = require('../utils/response');
const { getTemplateNewMessage } = require('../utils/template-message-whatsapp');

exports.startChatwoot = async(account, inbox, name, customAttributes) => {
   const token_chatwoot = process.env.CHATWOOT_TOKEN;
   let conversationId;
   let sourceId = 0;
   const headers = { headers: { api_access_token : token_chatwoot } };

   try {
      const payload = {
         payload: [
            {
               attribute_key: "phone_number",
               filter_operator: "contains",
               values: [
               `+${customAttributes.number}`
               ],
               query_operator: null
            }
         ]
      };

      const getContact = await axios.post(`${process.env.CHATWOOT_URL}/accounts/${account}/contacts/filter`,payload,headers);

      if(getContact.data?.payload[0]?.contact_inboxes[0]?.source_id){
         sourceId = getContact.data?.payload[0]?.contact_inboxes[0]?.source_id;
      }else{
         const data = {
            inbox_id: inbox,
            name: name,
            phone_number: `+${customAttributes.number}`
         };

         const responseContact = await axios.post(`${process.env.CHATWOOT_URL}/accounts/${account}/contacts`,data,headers);

         sourceId = responseContact.data.payload.contact_inbox.source_id;
      }

      const responseConversation = await axios.post(`${process.env.CHATWOOT_URL}/accounts/${account}/conversations`,{ source_id: sourceId,custom_attributes: { codigo_cliente: customAttributes.codigo_cliente, nome_cliente: customAttributes.nome_cliente} },headers);

      conversationId = responseConversation.data.id;
   } catch (error) {
      Logger.error(`[WHATSAPP] Não conseguiu criar a conversa no TypeBot`);
      Logger.info(error);
   }

   return conversationId;
}

exports.webhook = async (req) => { 
   if(process.env.NODE_ENV == 'development'){
     console.log("[CHATWOOT] webhook message:", JSON.stringify(req.body, null, 1));
   }
   
   const { contract } = req.query;
   let company;

   const cacheCompany = await Cache.get(contract);

   if(!cacheCompany){
      const responseCompany = await companyService.getCompany(contract);

      if(!responseCompany){
         Logger.error(`[CHATWOOT] Não achou a integracão ${contract}`);
         return new Response(false, 500, `[CHATWOOT] Não achou a integracão ${contract}`);
      }

      //salva no cache a empresa
      Cache.set(contract,JSON.stringify({
         contract: contract, 
         account: responseCompany.account,
         inbox: responseCompany.inbox,
         system: responseCompany.system,
         key_integration: responseCompany.key_integration,
         host: responseCompany.host,
         fluxo: responseCompany.fluxo,
         topico: responseCompany.topico
      }));

      company = responseCompany;
   }else{
      company = JSON.parse(cacheCompany);
   }

   const { event, message_type, content, status, id } = req.body;

  


   if(event =='message_created' && message_type == 'outgoing'){
      const messagePrivate = req.body.private || false;
      if(messagePrivate == true){
         return new Response(true, 200, '');
      }


      const customerPhoneNumber = req.body.conversation.meta.sender.phone_number.replace('+','');
      const sessionExists = await sessionService.getSession(customerPhoneNumber);

      
      if(sessionExists && sessionExists.conversation != req.body.conversation.id){
         let message = 'está em um fluxo do bot aberto';
         if(sessionExists && sessionExists.conversation > 0){
            message = 'está em outra conversa aberta';
         }
         const data = {type: 'content', file: null, content: `[SYSTEM] O Usuário ${message}, abra outro chat novamente mais tarde`, fileName: null};
         ChatQueue.add(EnviarMensagemChatWoot.key, {data: data, account: company.account, conversationId: req.body.conversation.id});

         return new Response(true, 200, '');
      }

      const senderName = req.body.sender.name;
      const contact = await contactService.getContact({number: customerPhoneNumber, contract: contract});
      const within24h = _isWithin24hWindow(contact.lastMessage);

      

      if(!within24h){
         if(content.trim() === '#template_novaconversa'){
            if(!sessionExists){
               const sessionCreated = await sessionService.createSession({contract: contract,number: customerPhoneNumber, session: 'chatwoot', conversation: req.body.conversation?.id});
               if(!sessionCreated){
                  Logger.error(`[CHATWOOT] Erro ao iniciar session`);
               }
            }
            
            const data  = getTemplateNewMessage(contract, customerPhoneNumber, req.body.conversation.meta.sender.name, req.body.conversation.id, 'Em análise');
            ZapQueue.add(EnviarMensagemZap.key,data);

            return new Response(true, 200, '');
         }

         //precisa avisar o usuario para enviar um template para iniciar o atendimento
         const data = {type: 'content', file: null, content: `[SYSTEM] Chat fora da janela de conversa do whatsapp`, fileName: null};
         ChatQueue.add(EnviarMensagemChatWoot.key, {data: data, account: company.account, conversationId: req.body?.conversation?.id});

         const data2 = {type: 'content', file: null, content: `[SYSTEM] Para iniciar o atendimento envie o seguinte template: #template_novaconversa, e aguarde o retorno do usuário`, fileName: null};
         ChatQueue.add(EnviarMensagemChatWoot.key, {data: data2, account: company.account, conversationId: req.body?.conversation?.id});

         return new Response(true, 200, '');
      }


      if(sessionExists && sessionExists.conversation > 0 && sessionExists.conversation == req.body.conversation.id){
         if(req.body.attachments && req.body.attachments.length > 0){
            const files = req.body.attachments;
            
            for (const file of files) {
               let data;
               const chatwootUrl = process.env.CHATWOOT_URL;
               const urlFile = file.data_url;
               if(file.file_type == 'file'){
                  data = { 
                     messaging_product: 'whatsapp', 
                     to: customerPhoneNumber, 
                     type: 'document',
                     document: { 
                     link: urlFile,
                     filename: urlFile.split('/').at(-1)
                     }
                  };
               }else if(file.file_type == 'image'){
                  data = { 
                     messaging_product: 'whatsapp', 
                     to: customerPhoneNumber, 
                     type: 'image',
                     image: { 
                     link: urlFile
                     }
                  };
               }else if(file.file_type == 'audio'){
                  data = { 
                     messaging_product: 'whatsapp', 
                     to: customerPhoneNumber, 
                     type: 'audio',
                     audio: { 
                     link: urlFile
                     }
                  };
               }else if(file.file_type == 'video'){
                  data = { 
                     messaging_product: 'whatsapp', 
                     to: customerPhoneNumber, 
                     type: 'video',
                     video: { 
                     link: urlFile
                     }
                  };
               }
               data.contract = contract;
               ZapQueue.add(EnviarMensagemZap.key,data);
            }
         }else{
            const data = { messaging_product: 'whatsapp', to: customerPhoneNumber, text: {body: `*${senderName}:*\n${content}`}, contract:contract };
            
            ZapQueue.add(EnviarMensagemZap.key,data);
         }

      }

      return new Response(true, 200, '');
   }

   //conversa resolvida no chatwoot
   if(event =='conversation_status_changed' && status == 'resolved'){
      try {
         const customer = req.body?.custom_attributes?.codigo_cliente || 0;
         const customerPhoneNumber = req.body?.meta?.sender?.phone_number.replace('+','');
         const sessionExists = await sessionService.getSession(customerPhoneNumber);

         
         
         if(sessionExists && sessionExists.conversation > 0 && sessionExists.conversation == id){
            const sessionDeleted = sessionService.deleteSession(sessionExists.id);
            if(!sessionDeleted){
               Logger.error(`[CHATWOOT] Erro ao excluir session`);
            }
            const contact = await contactService.getContact({number: customerPhoneNumber, contract: contract});
            const within24h = _isWithin24hWindow(contact.lastMessage);
            if(within24h){
               const data = { messaging_product: 'whatsapp', to: customerPhoneNumber, text: {body: 'Chat finalizado'}, contract: contract };
               ZapQueue.add(EnviarMensagemZap.key,data);
            }
         }

         if(sessionExists && sessionExists.ticket > 0){
            const chatwootMessages = await _getMessages(company.account, id);
            
            if(chatwootMessages.length > 0){
               
               const messagesRbx = chatwootMessages.map(msg => {

                  if(msg.private == false){
                     return {
                        record: _getDateTime(msg.created_at),
                        customer: customer,
                        ticket_id: sessionExists.ticket,
                        attendant:  'routerbox',
                        origin: (msg?.sender?.type == 'contact') ? "C" : "A",
                        content: msg.content
                     };
                  }
                  
               });

               rbxsoftService.incluirMensagemAtendimento(company,messagesRbx);
            }
         }
      } catch (error) {
         Logger.error(`[CHATWOOT] Erro ao resolver chat: ${error}`);
      }

      return new Response(true, 200, '');
   }

   //conversa resolvida no chatwoot foi reaberta
   if(event =='conversation_status_changed' && status == 'open'){
      const customerPhoneNumber = req.body?.meta?.sender?.phone_number.replace('+','');
      const sessionExists = await sessionService.getSession(customerPhoneNumber);

      if(sessionExists){// se achou resultado, o cliente esta em uma conversa ou em andamento pelo fluxo do bot
         const message = (sessionExists.conversation) ? 'está em outra conversa aberta' : 'está em um fluxo do bot aberto';
         const data = {type: 'content', file: null, content: `[SYSTEM] O Usuário ${message} tente novamente mais tarde`, fileName: null};
         ChatQueue.add(EnviarMensagemChatWoot.key, {data: data, account: company.account, conversationId: req.body?.id});
         
         const data2 = {type: 'content', file: null, content: `[SYSTEM] Reabra essa conversa novamente mais tarde!`, fileName: null};
         ChatQueue.add(EnviarMensagemChatWoot.key, {data: data2, account: company.account, conversationId: req.body?.id});
      }else{
         // abre uma conversa novamente com o usuario
         const contact = await contactService.getContact({number: customerPhoneNumber, contract: contract});
         const within24h = _isWithin24hWindow(contact.lastMessage);

         await sessionService.createSession({contract: contract, number: customerPhoneNumber, session: 'chatwoot', conversation: req.body?.id});

         if(within24h){
            const data = {type: 'content', file: null, content: `[SYSTEM] Conversa reaberta com whatsapp`, fileName: null};
            ChatQueue.add(EnviarMensagemChatWoot.key, {data: data, account: company.account, conversationId: req.body?.id});
         }else{
            //precisa avisar o usuario para enviar um template para iniciar o atendimento
            const data = {type: 'content', file: null, content: `[SYSTEM] Chat fora da janela de conversa do whatsapp`, fileName: null};
            ChatQueue.add(EnviarMensagemChatWoot.key, {data: data, account: company.account, conversationId: req.body?.id});

            const data2 = {type: 'content', file: null, content: `[SYSTEM] Para iniciar o atendimento envie o seguinte template: #template_novaconversa, e aguarde o retorno do usuário`, fileName: null};
            ChatQueue.add(EnviarMensagemChatWoot.key, {data: data2, account: company.account, conversationId: req.body?.id});
         }
      }

      return new Response(true, 200, '');
   }

   if(event =='conversation_created' && status == 'open'){
      const customer = req.body?.custom_attributes?.codigo_cliente || 0;
      const customerPhoneNumber = req.body?.meta?.sender?.phone_number.replace('+','');
      const sessionExists = await sessionService.getSession(customerPhoneNumber);

      if(customer){
         const restAtendimento = await rbxsoftService.abrirAtendimento(company, {customer});
         console.log('restAtendimento',restAtendimento);

         await sessionService.updateSession(sessionExists.id, {ticket: restAtendimento.result.NumeroAtendimento});
      }
      
      return new Response(true, 200, '');
   }
   
   return new Response(true, 200, '');
}


async function _getMessages(account, conversationId){
   const token_chatwoot = process.env.CHATWOOT_TOKEN;

   const headers = { headers: { api_access_token : token_chatwoot } };
   
   const returnMessages = await axios.get(`${process.env.CHATWOOT_URL}/accounts/${account}/conversations/${conversationId}/messages`,headers);

   if(returnMessages.data?.payload){
      return returnMessages.data.payload;
   }

   return [];
}

function _getDateTime(ts) {
  const date = new Date(ts * 1000); // converter de segundos para milissegundos

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function _isWithin24hWindow(date) {
  const lastMessageDate = new Date(date);

  const diffMs = Date.now() - lastMessageDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours <= 24;
}