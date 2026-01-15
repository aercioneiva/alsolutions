const dotenv = require('dotenv');
dotenv.config();

const authUsername = process.env.BASIC_AUTH_USERNAME;
const authPassword = process.env.BASIC_AUTH_PASSWORD;

const basicAuth = (req, res, next) => {
   const authHeader = req.headers['authorization'];

   if (!authHeader) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Restricted Access"');
      return res.status(401).send('Authentication required');
   }

   const base64Credentials = authHeader.split(' ')[1];
   const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
   const [username, password] = credentials.split(':');

   if (username === authUsername && password === authPassword) {
      return next();
   }

   res.setHeader('WWW-Authenticate', 'Basic realm="Restricted Access"');
   return res.status(401).send('Invalid credentials');
}

module.exports = basicAuth;