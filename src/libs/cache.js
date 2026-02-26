const { createRedisConnection } = require('../db/redis');
const Logger = require('./logger');


const redis = createRedisConnection();

async function set(key, value, ttl = null){
   try {
      if (ttl) {
         await redis.set(key, JSON.stringify(value), 'EX', ttl);
      } else {
         await redis.set(key, JSON.stringify(value));
      }
   } catch (error) {
      Logger.error('Error setting cache:');
      throw error;
   }
}


async function get(key){
   try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
   } catch (error) {
      Logger.error('Error getting cache:');
      return null;
   }
}


async function del(key){
   try {
      const result = await redis.del(key);
      return result > 0;
   } catch (error) {
      Logger.error('Error deleting cache:');
      return false;
   }
}


async function exists(key){
   try {
      const result = await redis.exists(key);
      return result === 1;
   } catch (error) {
      Logger.error('Error checking cache existence:');
      return false;
   }
}


async function expire(key, ttl){
   try {
      const result = await redis.expire(key, ttl);
      return result === 1;
   } catch (error) {
      Logger.error('Error setting cache expiration:');
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
