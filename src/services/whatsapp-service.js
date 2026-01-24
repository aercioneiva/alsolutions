const axios = require('axios');
const qs = require('qs');

const { ChatQueue, ZapQueue } = require('../libs/queue');
const Cache = require('../libs/cache');
const Logger = require('../libs/logger');
const sessionService = require('./session-service');
const companyService = require('./company-service');
const typebotService = require('./typebot-service');
const chatwootService = require('./chatwoot-service');
const contactService = require('./contact-service');
const EnviarMensagemZap = require('../queue-jobs/enviar-mensagem-whatsapp');
const EnviarMensagemChatWoot = require('../queue-jobs/enviar-mensagem-chatwoot');
const { getFileWhatsapp } = require('../utils/get-file-whatsapp');
const Response = require('../utils/response');

exports.webhook = async(req) => {
   if(req.body.entry?.[0]?.changes[0]?.value?.statuses){
      return new Response(true, 200, '');// mensagem de status, nao processar
   }

   if(process.env.NODE_ENV == 'development'){
      console.log("Zap webhook message:", JSON.stringify(req.body, null, 2));
   }

   const contract = req.query?.contract;
   

   if(!contract){
      Logger.error(`[WHATSAPP] Não foi informado o contrato da integração`);
      return new Response(false, 200, '');
   }

   let session;
   let message = '';
   let conversationId = 0;
   let idSession;
   let account;
   let inbox;
   let chatwoot;
   let contactPhoneNumber;
   let contactName;
   

   const cacheCompany = await Cache.get(contract);

   if(!cacheCompany){
      const responseCompany = await companyService.getCompany(contract);

      if(!responseCompany){
         Logger.error(`[WHATSAPP] Não achou a integracão ${contract}`);
         return new Response(false, 500, `[WHATSAPP] Não achou a integracão ${contract}`);
      }

      //salva no cache a empresa
      Cache.set(contract,JSON.stringify({
         name: responseCompany.name,
         contract: contract, 
         account: responseCompany.account,
         inbox: responseCompany.inbox,
         system: responseCompany.system,
         key_integration: responseCompany.key_integration,
         host: responseCompany.host,
         fluxo: responseCompany.fluxo,
         topico: responseCompany.topico
      }));

      account = responseCompany.account;
      inbox = responseCompany.inbox;
      system = responseCompany.system;
      chatwoot = { account, inbox };

   }else{
      const cp = JSON.parse(cacheCompany);
      account = cp.account;
      inbox = cp.inbox;
      system = cp.system;
      chatwoot = { account, inbox };
   }

   contactPhoneNumber = req.body.entry?.[0]?.changes[0]?.value?.contacts?.[0]?.wa_id || '';
   contactName = req.body.entry?.[0]?.changes[0]?.value?.contacts?.[0]?.profile?.name || 'sem nome';

   if(req.body.entry?.[0]?.changes[0]?.value?.messages?.[0]?.type == 'text'){
      message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0]?.text?.body;
   }else if(req.body.entry?.[0]?.changes[0]?.value?.messages?.[0]?.type == 'button'){
      message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0]?.button?.text;
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

      if(message){
         formData = {type: 'content', file: null, content: message, fileName: null};
      }else{
         const {
            type, 
            audio, 
            video, 
            document,
            sticker, 
            image } = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];
            
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
               return new Response(true, 200, '');
            }
         }else if(type == 'sticker'){
            idMedia = sticker?.id;
            fileName = "sticker."+sticker?.mime_type.split("/")[1];
         }

         const file = await getFileWhatsapp(idMedia);

         formData = {type: 'file', file: file.toString('base64'), content: '', fileName: fileName};
         
      }
      
      ChatQueue.add(EnviarMensagemChatWoot.key, {data: formData, account, conversationId});


      //atualiza a data da da ultima mensagem enviada pelo usuario
      contactService.updateLastMessage(contactPhoneNumber, new Date().toISOString().replace('T', ' ').replace('Z', ''));
      
      return new Response(true, 200, '');
   }
      
   //se nao esta em conversa, verifica se ja esta em um fluxo typebot.
   // se nao tem sessao, inicia com o typebot, caso contrario da continuida no fluxo do typebot
   if(!session){
      const data = {
         message: message,
         prefilledVariables: {
            cliente_telefone: `${contactPhoneNumber}`,
            cliente_codigo: contactName,
            contract: contract
         }
      };
      
      const resTypebot = await typebotService.startTypeBot(data);

      if(!resTypebot){
         return new Response(false, 200, '');
      }
      
      idSession = await sessionService.createSession({contract: contract, number: contactPhoneNumber, session: resTypebot.sessionId});

      if(!idSession){
         return new Response(false, 200, '');
      }

      const { messages, input, clientSideActions } = resTypebot;

      await _processMessageTypeBot(messages, input, clientSideActions, contactPhoneNumber, idSession, chatwoot, contract); 
      
   }else{
      let mensageSend = message;
      
      if(mensageSend == 'nao' || mensageSend == 'não' || mensageSend == 'Nao'){
         mensageSend = 'Não';
      }else if(mensageSend == 'sim'){
         mensageSend = 'Sim';
      }

      const data = JSON.stringify({ "message": mensageSend });

      const resChatTypebot =  await typebotService.sendMessageTypeBot(data, session);

      if(!resChatTypebot){
         return new Response(false, 200, '');
      }

      const { messages, input, clientSideActions, progress} = resChatTypebot;

      await _processMessageTypeBot(messages, input, clientSideActions, contactPhoneNumber, idSession, chatwoot, contract);  

      //atualiza a data da da ultima mensagem enviada pelo usuario
      sessionService.updateSession(idSession,{ updatedAt: new Date().toISOString().replace('T', ' ').replace('Z', '')});

      if(progress >= 100 && (!clientSideActions || clientSideActions[0]?.type != 'chatwoot')){
         sessionService.deleteSession(idSession);
      }
   }

   return new Response(true, 200, '');
}

async function _processMessageTypeBot (messages, input, clientSideActions, contactPhoneNumber, idSession, chatwoot, contract){
   const abrirChatWoot = (clientSideActions && clientSideActions[0]?.type == 'chatwoot') ? true: false;

   let ultimaMensagem = '';

   for(let i = 0; i < messages.length; i++){
      const message = messages[i];
      if (message.type == 'text') {
         let formattedText = '';

         for (const richText of message.content.richText) {
         for (const element of richText.children) {
            formattedText += _applyFormatting(element);
         }
         formattedText += '\n';
         }
         formattedText = formattedText.replace(/\*\*/g, '').replace(/__/, '').replace(/~~/, '').replace(/\n$/, '');

         ultimaMensagem = formattedText;

         //se nao abrir conversa com o chatwoot, ou abrir e for a ultima mensagem, não envia pq é o nome do cliente para abrir o chamado
         if(!abrirChatWoot || (abrirChatWoot && messages[i+1]?.type)){
            ZapQueue.add(EnviarMensagemZap.key,{messaging_product: 'whatsapp', to: contactPhoneNumber, text: {body: formattedText}, contract:contract});
         }
      }

      if(message.type == 'embed'){
         const data = { messaging_product: 'whatsapp', to: contactPhoneNumber, type: "document",  document: {
            link: message.content.url,
            filename: message.content.url.split('/')[5] || 'Boleto.pdf'
         },
         contract: contract
         };

         ZapQueue.add(EnviarMensagemZap.key,data);
      }

      //não foi tratado os casos abaixo, pq a ideia não enviar nada alem de boletos atraves do typebot
      //message.type == 'image'
      //(message.type == 'video'
      //message.type == 'audio'
   }

   /*if(input){
      if(input.type == 'choice input'){
         const items = input.items;
         let data;
         if(items.length <= 3){
            data = {
               messaging_product: "whatsapp",
               recipient_type: "individual",
               to: contactPhoneNumber,
               type: "interactive",
               interactive: {
                  type: "button",
                  header: {
                     "type":"text",
                     "text": "Titulo"
                  },
                  body: {
                  text: "Corpo"
                  },
                  action: {
                  buttons: []
                  }
               }
            };

            for (const item of items) {
               data.interactive.action.buttons.push({type: "reply", reply: { id: item.content, title: item.content}})
            }
         }else{
            let formattedText = '';

            for (const item of items) {
               formattedText += `▶️ ${item.content}\n`;
            }

            formattedText = formattedText.replace(/\n$/, '');

            data = { messaging_product: 'whatsapp', to: contactPhoneNumber, text: {body: formattedText}}
         }

         data.contract=contract;
         ZapQueue.add(EnviarMensagemZap.key,data);
      }
   }*/

   if(abrirChatWoot){
      const account = chatwoot.account;
      const inbox = chatwoot.inbox;
      const customAttributes = { 
         number: contactPhoneNumber, 
         codigo_cliente: ultimaMensagem.split('|')[1],
         nome_cliente: ultimaMensagem.split('|')[0]
      };
      const name = ultimaMensagem.split('|')[2];//pegar o nome do typetbot
      const conversationId = await chatwootService.startChatwoot(account, inbox, name, customAttributes);

      
      if(conversationId){
         await contactService.updateLastMessage(contactPhoneNumber, new Date().toISOString().replace('T', ' ').replace('Z', ''));
         let formData = {type: 'content', file: '', content: '[SYSTEM] Cliente Solicitando Atendimento', fileName: ''};

         ChatQueue.add(EnviarMensagemChatWoot.key, {data: formData, account, conversationId});
         
         //atualiza para conversa ativa
         sessionService.updateSession(idSession,{ conversation: conversationId});
      }else{
         //nao conseguiu abri o chamado
         Logger.error(`[WHATSAPP] Não conseguiu abri o chamado ${conversationId}`);
      }
   }
}

function _applyFormatting(element) {
   let text = '';

   if (element.text) {
      text += element.text;
   }

   if (
      element.children &&
      (element.type == 'p' ||
         element.type == 'a' ||
         element.type == 'inline-variable' ||
         element.type == 'variable')
   ) {
      for (const child of element.children) {
         text += _applyFormatting(child);
      }
   }

   let formats = '';

   if (element.bold) {
      formats += '*';
   }

   if (element.italic) {
      formats += '_';
   }

   if (element.underline) {
      formats += '~';
   }

   let formattedText = `${formats}${text}${formats.split('').reverse().join('')}`;

   if (element.url) {
      formattedText = element.children[0]?.text ? `[${formattedText}]\n(${element.url})` : `${element.url}`;
   }

   return formattedText;
}
