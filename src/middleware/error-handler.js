const Logger = require('../libs/logger');

const errorHandler = (err, req, res, next) => {
   Logger.error('Error occurred', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
   });

   res.status(500).send('Internal Server Error');
}

module.exports= errorHandler;
