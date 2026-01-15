const SessionRepository = require('../repositories/session-repository');
const Logger = require('../libs/logger');

const makeSession = () =>{
   return new SessionRepository();
}

exports.getSession = async (number) => {
   const sessionRepository = makeSession();

   if(!number){
      return null;
   }

   try {
      return await sessionRepository.find(number.replace(/\D/g, ''));
   } catch (error) {
      Logger.error(`[SERVICE-SESSION] Não achou a session: ${error}`);
   }

   return null;
}

exports.getExpirationSession = async (contract) => {
   const sessionRepository = makeSession();

   if(!contract){
      return [];
   }

   try {
      return await sessionRepository.findExpirationSession(contract);
   } catch (error) {
      Logger.error(`[SERVICE-SESSION] Não achou as sessions: ${error}`);
   }

   return [];
}

exports.createSession = async (session) => {
   const sessionRepository = makeSession();

   if(!session){
      return null;
   }

   try {
      return await sessionRepository.create(session);
   } catch (error) {
      Logger.error(`[SERVICE-SESSION] Não criou a session: ${error}`);
   }

   return null;
}

exports.deleteSession = async (idSession) => {
   const sessionRepository = makeSession();

   return await sessionRepository.delete(idSession);
}

exports.deleteExpirationSession = async (contract,downtime) => {
   const sessionRepository = makeSession();

   return await sessionRepository.deleteExpirationSession(contract,downtime);
}

exports.updateSession = async (idSession, session) => {
   const sessionRepository = makeSession();

   if(!idSession || !session){
      return null;
   }

   try {
      return await sessionRepository.update(idSession, session);
   } catch (error) {
      Logger.error(`[SERVICE-SESSION] Não atualizou a session: ${error}`);
   }

   return null;
}
