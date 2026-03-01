const { fluxoAtendimentoRBX } = require("./teste/rbx-flow");

const flows = new Map();

flows.set("teste", fluxoAtendimentoRBX);

module.exports = {
  flows
};
