const Cache = require('../libs/cache');
const Logger = require('../libs/logger');
const sessionService = require('./session-service');
const companyService = require('./company-service');
const chatwootService = require('./chatwoot-service');
const flowService = require('./flow-service');
const contactService = require('./contact-service');
const { getFileWhatsapp } = require('../utils/get-file-whatsapp');
const { enviarMensagemZapMeta } = require('../utils/send-message-whatsapp');
const { enviarMensagemChatWoot } = require('../utils/send-message-chatwoot');



exports.sendMessageWhatsapp = async(data) => {
   await enviarMensagemZapMeta(data);
}

exports.processMessageWhatsapp = async({ message, contacts, contract }) => {
   let session;
   let messagem = '';
   let conversationId = 0;
   let idSession;
   let account;
   let inbox;
   let chatwoot;
   let contactPhoneNumber;
   let contactName;
   const whatsapp = {
      id: '',
      version: '',
      token: ''
   };
   

   const cacheCompany = await Cache.get(contract);

   if(!cacheCompany){
      const responseCompany = await companyService.getCompany(contract);

      if(!responseCompany){
        return; 
      }

      Cache.set(contract,{
         name: responseCompany.name,
         contract: contract,
         id_whatsapp: responseCompany.id_whatsapp,
         token_whatsapp: responseCompany.token_whatsapp,
         version_whatsapp: responseCompany.version_whatsapp,
         flow: responseCompany.flow,
         account: responseCompany.account,
         inbox: responseCompany.inbox,
         system: responseCompany.system,
         key_integration: responseCompany.key_integration,
         rbx_account: responseCompany.rbx_account,
         rbx_user: responseCompany.rbx_user,
         host: responseCompany.host,
         fluxo: responseCompany.fluxo,
         topico: responseCompany.topico,
         cause: responseCompany.cause
      });

      account = responseCompany.account;
      inbox = responseCompany.inbox;
      system = responseCompany.system;
      chatwoot = { account, inbox };
      whatsapp.id = responseCompany.id_whatsapp;
      whatsapp.version = responseCompany.version_whatsapp;
      whatsapp.token = responseCompany.token_whatsapp;
   }else{
      account = cacheCompany.account;
      inbox = cacheCompany.inbox;
      system = cacheCompany.system;
      chatwoot = { account, inbox };
      whatsapp.id = cacheCompany.id_whatsapp;
      whatsapp.version = cacheCompany.version_whatsapp;
      whatsapp.token = cacheCompany.token_whatsapp;
   }

   contactPhoneNumber = contacts?.[0]?.wa_id || '';
   contactName = contacts?.[0]?.profile?.name || 'sem nome';

   if(message?.type == 'text'){
      messagem = message.text?.body;
   }else if(message?.type == 'button'){
      messagem = message.button?.text;
   }
   
   
   const responseSession = await sessionService.getSession(contactPhoneNumber);


   if(responseSession){
      session = responseSession.session;
      idSession = responseSession.id;
      conversationId = responseSession.conversation;
   }


   //se tiver em conversa, troca mensagem com chatwoot e retorna
   if(conversationId > 0){
      let formData;
      let idMedia;
      let fileName = '';

      if(messagem){
         formData = {type: 'content', file: null, content: messagem, fileName: null};
      }else{
         const {
            type, 
            audio, 
            video, 
            document,
            sticker, 
            image } = message;
            
         if(type == 'audio'){
            idMedia = audio?.id;
            fileName = "audio.ogg";
         }else if(type == 'image'){
            idMedia = image?.id;
            fileName = "image."+image?.mime_type.split("/")[1];
         }else if(type == 'video'){
            idMedia = video?.id;
            fileName = "video."+video?.mime_type.split("/")[1];
         }else if(type == 'document'){
            idMedia = document?.id;
            fileName = "document."+document?.filename;

            const ext = document?.filename.split('.').pop();
            const extensionsNotAllowed = ['php', 'exe', 'js', 'sh', 'bat', 'cmd', 'com', 'scr', 'py', 'jar', 'vbs', 'msi', 'reg', 'dll'];
            if(extensionsNotAllowed.includes(ext)){
               return;
            }
         }else if(type == 'sticker'){
            idMedia = sticker?.id;
            fileName = "sticker."+sticker?.mime_type.split("/")[1];
         }

         const file = await getFileWhatsapp(whatsapp, idMedia);

         formData = {type: 'file', file: file.toString('base64'), content: '', fileName: fileName};
         
      }
      
      await enviarMensagemChatWoot({data: formData, account, conversationId});


      //atualiza a data da da ultima mensagem enviada pelo usuario
      contactService.updateLastMessage(contactPhoneNumber);
      
      return;
   }
      
   //se nao esta em conversa, verifica se ja esta em um fluxo.
   // se nao tem sessao, inicia com o fluxo, caso contrario da continuida no fluxo
   if(!session){
      const resFlow = await flowService.startFlow({contract: contract, contactWAID: contactPhoneNumber});
      
      if(!resFlow){
         return;
      }
      
      idSession = await sessionService.createSession({contract: contract, number: contactPhoneNumber, session: resFlow.id});

      if(!idSession){
         return;
      }

      await processMessageFlow(resFlow, contactPhoneNumber, idSession, chatwoot, contract, whatsapp);
   }else{
      const resFlow =  await flowService.sendMessageFlow({contract, session: session, message: messagem});

      if(!resFlow){
         return;
      }

      await processMessageFlow(resFlow, contactPhoneNumber, idSession, chatwoot, contract, whatsapp);  

      //atualiza a data da da ultima mensagem enviada pelo usuario
      sessionService.updateSessionLastMessage(idSession);

      if(resFlow.finalizado == true && resFlow.abrir_chamado == false){
         sessionService.deleteSession(idSession);
      }
   }

   return;
}

async function processMessageFlow(flow, contactPhoneNumber, idSession, chatwoot, contract, whatsapp){
   const abrirChatWoot = flow.abrir_chamado || false;

   for(let i = 0; i < flow.mensagens.length; i++){
      const message = flow.mensagens[i];

      if(message.tipo == 'text'){
         await enviarMensagemZapMeta(whatsapp,
            {
               messaging_product: 'whatsapp', 
               to: contactPhoneNumber, 
               text: {
                  body:  message.mensagem
               }, 
               contract: contract
            }
         );
      }

      if(message.tipo == 'embed'){
         const data = { messaging_product: 'whatsapp', to: contactPhoneNumber, type: "document",  document: {
               link: message.mensagem,
               filename: message.mensagem.split('/')[5] || 'Boleto.pdf'
            },
            contract: contract
         };

         await enviarMensagemZapMeta(whatsapp, data);
      }
   }

   if(abrirChatWoot){
      const account = chatwoot.account;
      const inbox = chatwoot.inbox;
      const customAttributes = { 
         number: contactPhoneNumber, 
         codigo_cliente: flow.cliente.codigo,
         nome_cliente: flow.cliente.nome
      };
      const name = contactPhoneNumber;
      const conversationId = await chatwootService.startChatwoot(account, inbox, name, customAttributes);

      
      if(conversationId){
         await contactService.updateLastMessage(contactPhoneNumber);
         let formData = {type: 'content', file: '', content: '[SYSTEM] Cliente Solicitando Atendimento', fileName: ''};

         await enviarMensagemChatWoot({data: formData, account, conversationId});
         
         //atualiza para conversa ativa
         sessionService.updateSession(idSession,{ conversation: conversationId});
      }else{
         //nao conseguiu abri o chamado
         Logger.error(`[WHATSAPP] Não conseguiu abri o chamado ${conversationId}`);
      }
   }
}


async function waitIfExists(clientSideActions, bubbleId) {
   if(!clientSideActions || !Array.isArray(clientSideActions)) {
    return;
  }

  const action = clientSideActions.find(
    item => item.lastBubbleBlockId === bubbleId
  );

  if (!action || action.type !== 'wait' || !action.wait?.secondsToWaitFor) {
    return;
  }

  const seconds = action.wait.secondsToWaitFor;

  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
