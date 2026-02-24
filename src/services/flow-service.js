const { FlowEngine } = require('../utils/engine');
const companyService = require('./company-service');

const { flows } = require('../flows/index');

exports.startFlow = async ({ contract, contactWAID }) => {
  const company = await companyService.getCompany(contract);

  if(!company){
    return; 
  }
  
  const flow = flows.get(company.flow);

  if(!flow){
    return;
  }

  const flowEngine = new FlowEngine(flow);

  return await flowEngine.iniciarFluxo(company, contactWAID, contract);
}

exports.sendMessageFlow = async ({ contract, session, message }) => {

  const company = await companyService.getCompany(contract);

  if(!company){
    return; 
  }
  
  const flow = flows.get(company.flow);

  if(!flow){
    return;
  }

  const flowEngine = new FlowEngine(flow);
  
  return await flowEngine.processarMensagem(session, message);
}