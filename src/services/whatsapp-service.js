const Cache = require('../libs/cache');
const Logger = require('../libs/logger');
const sessionService = require('./session-service');
const companyService = require('./company-service');
const typebotService = require('./typebot-service');
const chatwootService = require('./chatwoot-service');
const contactService = require('./contact-service');
const { getFileWhatsapp } = require('../utils/get-file-whatsapp');
const { enviarMensagemZapMeta } = require('../utils/send-message-whatsapp');
const { enviarMensagemChatWoot } = require('../utils/send-message-chatwoot');



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
   

   const cacheCompany = await Cache.get(contract);

   if(!cacheCompany){
      const responseCompany = await companyService.getCompany(contract);

      if(!responseCompany){
        return; 
      }

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

         const file = await getFileWhatsapp(idMedia);

         formData = {type: 'file', file: file.toString('base64'), content: '', fileName: fileName};
         
      }
      
      await enviarMensagemChatWoot({data: formData, account, conversationId});


      //atualiza a data da da ultima mensagem enviada pelo usuario
      contactService.updateLastMessage(contactPhoneNumber, new Date().toISOString().replace('T', ' ').replace('Z', ''));
      
      return;
   }
      
   //se nao esta em conversa, verifica se ja esta em um fluxo typebot.
   // se nao tem sessao, inicia com o typebot, caso contrario da continuida no fluxo do typebot
   if(!session){
      const data = {
         message: messagem,
         prefilledVariables: {
            cliente_telefone: `${contactPhoneNumber}`,
            cliente_codigo: contactName,
            contract: contract
         }
      };
      
      const resTypebot = await typebotService.startTypeBot(data);

      if(!resTypebot){
         return;
      }
      
      idSession = await sessionService.createSession({contract: contract, number: contactPhoneNumber, session: resTypebot.sessionId});

      if(!idSession){
         return;
      }

      const { messages, clientSideActions } = resTypebot;

      await _processMessageTypeBot(messages, clientSideActions, contactPhoneNumber, idSession, chatwoot, contract); 
      
   }else{
      let mensageSend = messagem;
      
      if(mensageSend == 'nao' || mensageSend == 'não' || mensageSend == 'Nao'){
         mensageSend = 'Não';
      }else if(mensageSend == 'sim'){
         mensageSend = 'Sim';
      }

      const data = JSON.stringify({ "message": mensageSend });

      const resChatTypebot =  await typebotService.sendMessageTypeBot(data, session);

      if(!resChatTypebot){
         return;
      }

      const { messages, clientSideActions, progress} = resChatTypebot;

      await _processMessageTypeBot(messages, clientSideActions, contactPhoneNumber, idSession, chatwoot, contract);  

      //atualiza a data da da ultima mensagem enviada pelo usuario
      sessionService.updateSession(idSession,{ updatedAt: new Date().toISOString().replace('T', ' ').replace('Z', '')});

      if(progress >= 100 && (!clientSideActions || clientSideActions[0]?.type != 'chatwoot')){
         sessionService.deleteSession(idSession);
      }
   }

   return;
}

async function _processMessageTypeBot (messages, clientSideActions, contactPhoneNumber, idSession, chatwoot, contract){
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
            await enviarMensagemZapMeta({messaging_product: 'whatsapp', to: contactPhoneNumber, text: {body: formattedText}, contract:contract});
         }
      }


      if(message.type == 'embed'){
         const data = { messaging_product: 'whatsapp', to: contactPhoneNumber, type: "document",  document: {
            link: message.content.url,
            filename: message.content.url.split('/')[5] || 'Boleto.pdf'
         },
         contract: contract
         };

         await enviarMensagemZapMeta(data);
      }

      await waitIfExists(clientSideActions, message.id);

      //não foi tratado os casos abaixo, pq a ideia não enviar nada alem de boletos atraves do typebot
      //message.type == 'image' || 'video' || 'audio'
   }

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

         await enviarMensagemChatWoot({data: formData, account, conversationId});
         
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
