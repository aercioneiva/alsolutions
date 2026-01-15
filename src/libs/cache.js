const redis = require('../db/redis');
const Logger = require('./logger');

/**
 * Define um valor no cache com TTL opcional
 * @param {string} key - Chave do cache
 * @param {*} value - Valor a ser armazenado
 * @param {number} ttl - Time to live em segundos (opcional)
 */
async function set(key, value, ttl = null){
   try {
      if (ttl) {
         await redis.setex(key, ttl, JSON.stringify(value));
      } else {
         await redis.set(key, JSON.stringify(value));
      }
   } catch (error) {
      Logger.error('Error setting cache:', error);
      throw error;
   }
}

/**
 * Recupera um valor do cache
 * @param {string} key - Chave do cache
 * @returns {*} Valor armazenado ou null se não encontrado
 */
async function get(key){
   try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
   } catch (error) {
      Logger.error('Error getting cache:', error);
      return null;
   }
}

/**
 * Remove uma chave do cache
 * @param {string} key - Chave a ser removida
 * @returns {boolean} True se removido com sucesso
 */
async function del(key){
   try {
      const result = await redis.del(key);
      return result > 0;
   } catch (error) {
      Logger.error('Error deleting cache:', error);
      return false;
   }
}

/**
 * Verifica se uma chave existe no cache
 * @param {string} key - Chave a ser verificada
 * @returns {boolean} True se a chave existe
 */
async function exists(key){
   try {
      const result = await redis.exists(key);
      return result === 1;
   } catch (error) {
      Logger.error('Error checking cache existence:', error);
      return false;
   }
}

/**
 * Define TTL para uma chave existente
 * @param {string} key - Chave do cache
 * @param {number} ttl - Time to live em segundos
 * @returns {boolean} True se definido com sucesso
 */
async function expire(key, ttl){
   try {
      const result = await redis.expire(key, ttl);
      return result === 1;
   } catch (error) {
      Logger.error('Error setting cache expiration:', error);
      return false;
   }
}

module.exports = {
   set,
   get,
   del,
   exists,
   expire
}
