module.exports = class Response {
   constructor(status,statusCode,message){
      this.status = status;
      this.statusCode = statusCode;
      this.message = message;
   }
}
