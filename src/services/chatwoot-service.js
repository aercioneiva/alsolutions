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

/**
 * Constantes da aplicação
 */
const CONSTANTS = {
   EVENTS: {
      MESSAGE_CREATED: 'message_created',
      CONVERSATION_STATUS_CHANGED: 'conversation_status_changed',
      CONVERSATION_CREATED: 'conversation_created'
   },
   MESSAGE_TYPES: {
      OUTGOING: 'outgoing'
   },
   CONVERSATION_STATUS: {
      RESOLVED: 'resolved',
      OPEN: 'open'
   },
   SESSION_TYPES: {
      CHATWOOT: 'chatwoot'
   },
   FILE_TYPES: {
      FILE: 'file',
      IMAGE: 'image',
      AUDIO: 'audio',
      VIDEO: 'video'
   },
   HOURS_24: 24,
   MS_PER_HOUR: 1000 * 60 * 60,
   SYSTEM_SENDER: 'routerbox',
   MESSAGE_ORIGIN: {
      CONTACT: 'C',
      ATTENDANT: 'A'
   },
   TEMPLATES: {
      NEW_CONVERSATION: '#template_novaconversa'
   },
   ERROR_MESSAGES: {
      WEBHOOK_CREATE_CONVERSATION: '[WHATSAPP] Não conseguiu criar a conversa no TypeBot',
      INTEGRATION_NOT_FOUND: '[CHATWOOT] Não achou a integração',
      SESSION_CREATION_ERROR: '[CHATWOOT] Erro ao iniciar session',
      CHAT_RESOLUTION_ERROR: '[CHATWOOT] Erro ao resolver chat',
      USER_IN_BOT_FLOW: 'está em um fluxo do bot aberto',
      USER_IN_ANOTHER_CONVERSATION: 'está em outra conversa aberta',
      CHAT_OUTSIDE_24H_WINDOW: '[SYSTEM] Chat fora da janela de conversa do whatsapp'
   },
   STATUS_CODES: {
      OK: 200,
      SERVER_ERROR: 500
   }
};

/**
 * Inicia uma conversa no ChatWoot
 */
exports.startChatwoot = async (account, inbox, name, customAttributes) => {
   const token = process.env.CHATWOOT_TOKEN;
   const headers = { headers: { api_access_token: token } };

   try {
      const sourceId = await _getOrCreateContact(account, inbox, name, customAttributes, headers);

      const conversationResponse = await axios.post(
         `${process.env.CHATWOOT_URL}/accounts/${account}/conversations`,
         {
            source_id: sourceId,
            custom_attributes: {
               codigo_cliente: customAttributes.codigo_cliente,
               nome_cliente: customAttributes.nome_cliente
            }
         },
         headers
      );

      return conversationResponse.data.id;
   } catch (error) {
      Logger.error(CONSTANTS.ERROR_MESSAGES.WEBHOOK_CREATE_CONVERSATION);
      Logger.info(error.message);
      return null;
   }
};

/**
 * Processa webhooks do ChatWoot
 */
exports.webhook = async (req) => {
   if (process.env.NODE_ENV === 'development') {
      console.log('[CHATWOOT] webhook message:', JSON.stringify(req.body, null, 1));
   }

   try {
      const { contract } = req.query;
      const company = await _loadCompanyData(contract);

      const eventType = req.body.event;
      const status = req.body.status;

      switch (true) {
         case eventType === CONSTANTS.EVENTS.MESSAGE_CREATED && req.body.message_type === CONSTANTS.MESSAGE_TYPES.OUTGOING:
            return await _handleOutgoingMessage(req, company, contract);

         case eventType === CONSTANTS.EVENTS.CONVERSATION_STATUS_CHANGED && status === CONSTANTS.CONVERSATION_STATUS.RESOLVED:
            return await _handleConversationResolved(req, company, contract);

         case eventType === CONSTANTS.EVENTS.CONVERSATION_STATUS_CHANGED && status === CONSTANTS.CONVERSATION_STATUS.OPEN:
            return await _handleConversationReopened(req, company, contract);

         case eventType === CONSTANTS.EVENTS.CONVERSATION_CREATED && status === CONSTANTS.CONVERSATION_STATUS.OPEN:
            return await _handleConversationCreated(req, company, contract);

         default:
            return new Response(true, CONSTANTS.STATUS_CODES.OK, '');
      }
   } catch (error) {
      Logger.error(`[CHATWOOT] Erro ao processar webhook: ${error.message}`);
      return new Response(true, CONSTANTS.STATUS_CODES.OK, '');
   }
};

/**
 * Trata mensagens de saída (do atendente)
 */
async function _handleOutgoingMessage(req, company, contract) {
   const messagePrivate = req.body.private || false;
   if (messagePrivate) {
      return new Response(true, CONSTANTS.STATUS_CODES.OK, '');
   }

   const customerPhoneNumber = req.body.conversation.meta.sender.phone_number.replace('+', '');
   const sessionExists = await sessionService.getSession(customerPhoneNumber);
   const messageContent = req.body.content;
   const conversationId = req.body.conversation.id;

   // Verifica se o usuário está em outra conversa
   if (sessionExists && sessionExists.conversation !== conversationId) {
      const systemMessage = `[SYSTEM] O Usuário ${_getSessionStatus(sessionExists)}, abra outro chat novamente mais tarde`;
      _sendSystemMessage(company.account, conversationId, systemMessage);
      return new Response(true, CONSTANTS.STATUS_CODES.OK, '');
   }

   const contact = await contactService.getContact({ number: customerPhoneNumber, contract });
   const within24h = _isWithin24hWindow(contact?.lastMessage);

   // Se está fora da janela de 24h
   if (!within24h) {
      return await _handleMessageOutside24hWindow(req, company, messageContent, conversationId, customerPhoneNumber, sessionExists, contract);
   }

   // Processa a mensagem normalmente
   if (sessionExists?.conversation === conversationId) {
      await _processMessage(req, company, contract, customerPhoneNumber);
   }

   return new Response(true, CONSTANTS.STATUS_CODES.OK, '');
}

/**
 * Processa mensagens (texto ou anexos)
 */
async function _processMessage(req, company, contract, customerPhoneNumber) {
   const senderName = req.body.sender.name;

   if (_hasAttachments(req.body.attachments)) {
      for (const file of req.body.attachments) {
         const whatsappFileData = _createWhatsAppFileData(customerPhoneNumber, file, contract);
         ZapQueue.add(EnviarMensagemZap.key, whatsappFileData);
      }
   } else {
      const messageData = {
         messaging_product: 'whatsapp',
         to: customerPhoneNumber,
         text: { body: `*${senderName}:*\n${req.body.content}` },
         contract
      };
      ZapQueue.add(EnviarMensagemZap.key, messageData);
   }
}

/**
 * Trata mensagens fora da janela de 24h
 */
async function _handleMessageOutside24hWindow(req, company, messageContent, conversationId, customerPhoneNumber, sessionExists, contract) {
   if (messageContent.trim() === CONSTANTS.TEMPLATES.NEW_CONVERSATION) {
      if (!sessionExists) {
         const sessionCreated = await sessionService.createSession({
            contract,
            number: customerPhoneNumber,
            session: CONSTANTS.SESSION_TYPES.CHATWOOT,
            conversation: conversationId
         });

         if (!sessionCreated) {
            Logger.error(CONSTANTS.ERROR_MESSAGES.SESSION_CREATION_ERROR);
         }
      }

      const templateData = getTemplateNewMessage(contract, customerPhoneNumber, req.body.conversation.meta.sender.name, conversationId, 'Em análise');
      ZapQueue.add(EnviarMensagemZap.key, templateData);
      return new Response(true, CONSTANTS.STATUS_CODES.OK, '');
   }

   _sendSystemMessage(company.account, conversationId, CONSTANTS.ERROR_MESSAGES.CHAT_OUTSIDE_24H_WINDOW);
   _sendSystemMessage(company.account, conversationId, '[SYSTEM] Para iniciar o atendimento envie o seguinte template: #template_novaconversa, e aguarde o retorno do usuário');

   return new Response(true, CONSTANTS.STATUS_CODES.OK, '');
}

/**
 * Trata conclusão de conversa
 */
async function _handleConversationResolved(req, company, contract) {
   try {
      const customerId = req.body?.custom_attributes?.codigo_cliente || 0;
      const customerPhoneNumber = req.body?.meta?.sender?.phone_number.replace('+', '');
      const conversationId = req.body.id;
      const sessionExists = await sessionService.getSession(customerPhoneNumber);

      if (!sessionExists || sessionExists.conversation !== conversationId) {
         return new Response(true, CONSTANTS.STATUS_CODES.OK, '');
      }

      // Deleta a sessão
      const sessionDeleted = await sessionService.deleteSession(sessionExists.id);
      if (!sessionDeleted) {
         Logger.error(CONSTANTS.ERROR_MESSAGES.SESSION_CREATION_ERROR);
      }

      // Envia mensagem de encerramento se dentro da janela de 24h
      const contact = await contactService.getContact({ number: customerPhoneNumber, contract });
      if (_isWithin24hWindow(contact?.lastMessage)) {
         const data = {
            messaging_product: 'whatsapp',
            to: customerPhoneNumber,
            text: { body: 'Chat finalizado' },
            contract
         };
         ZapQueue.add(EnviarMensagemZap.key, data);
      }

      // Envia mensagens para RBXSoft se houver ticket
      if (sessionExists?.ticket > 0) {
         const messages = await _getMessages(company.account, conversationId);
         if (messages.length > 0) {
            const messagesRbx = _mapMessagesToRbxFormat(messages, customerId, sessionExists.ticket);
            await rbxsoftService.incluirMensagemAtendimento(company, messagesRbx);
         }
      }
   } catch (error) {
      Logger.error(`${CONSTANTS.ERROR_MESSAGES.CHAT_RESOLUTION_ERROR}: ${error.message}`);
   }

   return new Response(true, CONSTANTS.STATUS_CODES.OK, '');
}

/**
 * Trata reabertura de conversa
 */
async function _handleConversationReopened(req, company, contract) {
   const customerPhoneNumber = req.body?.meta?.sender?.phone_number.replace('+', '');
   const sessionExists = await sessionService.getSession(customerPhoneNumber);
   const conversationId = req.body?.id;

   if (sessionExists) {
      const statusMessage = _getSessionStatus(sessionExists);
      _sendSystemMessage(company.account, conversationId, `[SYSTEM] O Usuário ${statusMessage} tente novamente mais tarde`);
      _sendSystemMessage(company.account, conversationId, '[SYSTEM] Reabra essa conversa novamente mais tarde!');
   } else {
      // Abre conversa novamente
      const contact = await contactService.getContact({ number: customerPhoneNumber, contract });
      const within24h = _isWithin24hWindow(contact?.lastMessage);

      await sessionService.createSession({
         contract,
         number: customerPhoneNumber,
         session: CONSTANTS.SESSION_TYPES.CHATWOOT,
         conversation: conversationId
      });

      if (within24h) {
         _sendSystemMessage(company.account, conversationId, '[SYSTEM] Conversa reaberta com whatsapp');
      } else {
         _sendSystemMessage(company.account, conversationId, CONSTANTS.ERROR_MESSAGES.CHAT_OUTSIDE_24H_WINDOW);
         _sendSystemMessage(company.account, conversationId, '[SYSTEM] Para iniciar o atendimento envie o seguinte template: #template_novaconversa, e aguarde o retorno do usuário');
      }
   }

   return new Response(true, CONSTANTS.STATUS_CODES.OK, '');
}

/**
 * Trata criação de conversa
 */
async function _handleConversationCreated(req, company, contract) {
   try {
      const customerId = req.body?.custom_attributes?.codigo_cliente || 0;
      const customerPhoneNumber = req.body?.meta?.sender?.phone_number.replace('+', '');
      const sessionExists = await sessionService.getSession(customerPhoneNumber);

      if (customerId) {
         const ticketResponse = await rbxsoftService.abrirAtendimento(company, { customer: customerId });
         console.log('[CHATWOOT] Ticket criado:', ticketResponse);

         if (sessionExists) {
            await sessionService.updateSession(sessionExists.id, {
               ticket: ticketResponse.result.NumeroAtendimento
            });
         }
      }
   } catch (error) {
      Logger.error(`[CHATWOOT] Erro ao criar conversa: ${error.message}`);
   }

   return new Response(true, CONSTANTS.STATUS_CODES.OK, '');
}

/**
 * ==================== FUNÇÕES AUXILIARES ====================
 */

/**
 * Carrega dados da empresa do cache ou banco de dados
 */
async function _loadCompanyData(contract) {
   const cachedCompany = await Cache.get(contract);

   if (cachedCompany) {
      return JSON.parse(cachedCompany);
   }

   const company = await companyService.getCompany(contract);

   if (!company) {
      throw new Error(`${CONSTANTS.ERROR_MESSAGES.INTEGRATION_NOT_FOUND} ${contract}`);
   }

   const companyData = {
      contract,
      account: company.account,
      inbox: company.inbox,
      system: company.system,
      key_integration: company.key_integration,
      host: company.host,
      fluxo: company.fluxo,
      topico: company.topico
   };

   Cache.set(contract, JSON.stringify(companyData));
   return companyData;
}

/**
 * Busca ou cria um contato no ChatWoot
 */
async function _getOrCreateContact(account, inbox, name, customAttributes, headers) {
   const payload = {
      payload: [
         {
            attribute_key: 'phone_number',
            filter_operator: 'contains',
            values: [`+${customAttributes.number}`],
            query_operator: null
         }
      ]
   };

   try {
      const response = await axios.post(
         `${process.env.CHATWOOT_URL}/accounts/${account}/contacts/filter`,
         payload,
         headers
      );

      if (response.data?.payload[0]?.contact_inboxes[0]?.source_id) {
         return response.data.payload[0].contact_inboxes[0].source_id;
      }
   } catch (error) {
      Logger.info(`[CHATWOOT] Contato não encontrado, criando novo: ${error.message}`);
   }

   const newContactData = {
      inbox_id: inbox,
      name,
      phone_number: `+${customAttributes.number}`
   };

   const newContactResponse = await axios.post(
      `${process.env.CHATWOOT_URL}/accounts/${account}/contacts`,
      newContactData,
      headers
   );

   return newContactResponse.data.payload.contact_inbox.source_id;
}

/**
 * Envia uma mensagem de sistema para o ChatWoot
 */
function _sendSystemMessage(account, conversationId, messageContent) {
   const messageData = {
      type: 'content',
      file: null,
      content: messageContent,
      fileName: null
   };
   ChatQueue.add(EnviarMensagemChatWoot.key, {
      data: messageData,
      account,
      conversationId
   });
}

/**
 * Cria dados de arquivo para envio via WhatsApp
 */
function _createWhatsAppFileData(customerPhoneNumber, file, contract) {
   const baseData = {
      messaging_product: 'whatsapp',
      to: customerPhoneNumber,
      contract
   };

   const fileType = file.file_type;
   const urlFile = file.data_url;
   const fileName = urlFile.split('/').at(-1);

   const fileConfigs = {
      [CONSTANTS.FILE_TYPES.FILE]: {
         type: 'document',
         document: { link: urlFile, filename: fileName }
      },
      [CONSTANTS.FILE_TYPES.IMAGE]: {
         type: 'image',
         image: { link: urlFile }
      },
      [CONSTANTS.FILE_TYPES.AUDIO]: {
         type: 'audio',
         audio: { link: urlFile }
      },
      [CONSTANTS.FILE_TYPES.VIDEO]: {
         type: 'video',
         video: { link: urlFile }
      }
   };

   const config = fileConfigs[fileType];
   if (!config) {
      throw new Error(`Tipo de arquivo não suportado: ${fileType}`);
   }

   return { ...baseData, ...config };
}

/**
 * Valida se há dados de anexos
 */
function _hasAttachments(attachments) {
   return Array.isArray(attachments) && attachments.length > 0;
}

/**
 * Verifica o status da sessão para mensagem de erro
 */
function _getSessionStatus(session) {
   return session?.conversation > 0
      ? CONSTANTS.ERROR_MESSAGES.USER_IN_ANOTHER_CONVERSATION
      : CONSTANTS.ERROR_MESSAGES.USER_IN_BOT_FLOW;
}

/**
 * Verifica se a conversa está dentro da janela de 24 horas
 */
function _isWithin24hWindow(date) {
   if (!date) return false;
   const lastMessageDate = new Date(date);
   const diffMs = Date.now() - lastMessageDate.getTime();
   const diffHours = diffMs / CONSTANTS.MS_PER_HOUR;
   return diffHours <= CONSTANTS.HOURS_24;
}

/**
 * Converte timestamp Unix para formato DateTime (YYYY-MM-DD HH:MM:SS)
 */
function _getDateTime(timestamp) {
   const date = new Date(timestamp * 1000);

   const year = date.getFullYear();
   const month = String(date.getMonth() + 1).padStart(2, '0');
   const day = String(date.getDate()).padStart(2, '0');

   const hours = String(date.getHours()).padStart(2, '0');
   const minutes = String(date.getMinutes()).padStart(2, '0');
   const seconds = String(date.getSeconds()).padStart(2, '0');

   return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Busca mensagens de uma conversa no ChatWoot
 */
async function _getMessages(account, conversationId) {
   try {
      const token = process.env.CHATWOOT_TOKEN;
      const headers = { headers: { api_access_token: token } };

      const response = await axios.get(
         `${process.env.CHATWOOT_URL}/accounts/${account}/conversations/${conversationId}/messages`,
         headers
      );

      return response.data?.payload || [];
   } catch (error) {
      Logger.error(`[CHATWOOT] Erro ao buscar mensagens: ${error.message}`);
      return [];
   }
}

/**
 * Converte mensagens do ChatWoot para formato RBXSoft
 */
function _mapMessagesToRbxFormat(messages, customerId, ticketId) {
   return messages
      .filter(msg => msg.private === false)
      .map(msg => ({
         record: _getDateTime(msg.created_at),
         customer: customerId,
         ticket_id: ticketId,
         attendant: CONSTANTS.SYSTEM_SENDER,
         origin: msg?.sender?.type === 'contact' ? CONSTANTS.MESSAGE_ORIGIN.CONTACT : CONSTANTS.MESSAGE_ORIGIN.ATTENDANT,
         content: msg.content
      }));
}
