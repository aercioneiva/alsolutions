const dotenv = require('dotenv');
dotenv.config();

const logger = require('pino')();

function info(msg){
   logger.info(msg);
}

function error(msg){
   logger.error(msg);
}

module.exports = {
   info,
   error
}
