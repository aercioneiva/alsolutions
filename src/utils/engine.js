const { v4: uuidv4 } = require('uuid');
const Cache = require('../libs/cache');

class FlowEngine {
  constructor(fluxo) {
    this.fluxo = fluxo;
  }

  async iniciarFluxo(company, usuarioId) {
    
    const id = uuidv4();
    await Cache.set(id,{
      id: id,
      contract: company.contract,
      fluxoAtual: this.fluxo.nome,
      stepAtual: this.fluxo.stepInicial,
      dados: {contract: company.contract, usuarioId, company},
      historico: [],
    },60 * 60 * 24);

    console.log('Sessão iniciada com ID:', id);

    return this.executarStep(id);
  }

  async processarMensagem(usuarioId, mensagem) {
    const sessao = await Cache.get(usuarioId);

    if(!sessao) {
      return {
        mensagens: [{mensagem: 'Sessão não encontrada. Inicie um novo atendimento.', tipo: 'text'}],
        finalizado: true,
        aguardandoResposta: false,
        abrir_chamado: false,
        cliente: null
      };
    }

    // Armazena a mensagem do usuário
    sessao.dados.ultimaMensagem = mensagem;
    sessao.historico.push({ tipo: 'usuario', mensagem });

    await Cache.del(usuarioId);

    await Cache.set(usuarioId,{
           id: sessao.id,
           contract: sessao.contract,
           fluxoAtual: sessao.fluxoAtual,
           stepAtual: sessao.stepAtual,
           dados: sessao.dados,
           historico: sessao.historico,
        },
        60 * 60 * 24);

    // Executa o step atual com a mensagem do usuário
    return await this.executarStep(usuarioId, mensagem);
  }

  async executarStep(usuarioId, mensagemUsuario = null, _mensagensAcumuladas = []) {
    const sessao = await Cache.get(usuarioId);
    
    if(!sessao) {
      return {
        mensagens: [{mensagem: 'Sessão não encontrada. Inicie um novo atendimento.', tipo: 'text'}],
        finalizado: true,
        aguardandoResposta: false,
        abrir_chamado: false,
        cliente: null
      };
    }
    
    const step = this.fluxo.steps[sessao.stepAtual];

    if (!step) {
      return {
        mensagens: [..._mensagensAcumuladas, {mensagem: 'Step não encontrado. Encerrando atendimento.', tipo: 'text'}],
        finalizado: true,
        aguardandoResposta: false,
        abrir_chamado: false,
        cliente: null
      };
    }

    // Executa a ação do step
    const resultado = await step.acao(sessao.dados, mensagemUsuario);

    // Acumula a mensagem deste step (se houver)
    if (resultado.mensagem) {
      sessao.historico.push({ tipo: 'bot', mensagem: resultado.mensagem });
      _mensagensAcumuladas.push({
        tipo: resultado.tipo || null,
        mensagem: resultado.mensagem,
        tempo: resultado.tempo || 0
      });
    }

    // Verifica se deve finalizar
    if (resultado.finalizar) {
      Cache.del(usuarioId);
      return {
        mensagens: _mensagensAcumuladas,
        finalizado: true,
        aguardandoResposta: false,
        abrir_chamado: resultado.abrirChamado || false,
        cliente: resultado.cliente || null
      };
    }

    // Define o próximo step
    if (resultado.proximoStep) {
      sessao.stepAtual = resultado.proximoStep;
    }

    Cache.del(usuarioId);

    await Cache.set(usuarioId,{
           id: sessao.id,
           contract: sessao.contract,
           fluxoAtual: sessao.fluxoAtual,
           stepAtual: sessao.stepAtual,
           dados: sessao.dados,
           historico: sessao.historico,
        },
        60 * 60 * 24
    );

    // Se não aguarda resposta, continua executando e acumulando mensagens
    if (!resultado.aguardarResposta && resultado.proximoStep) {
      return await this.executarStep(usuarioId, null, _mensagensAcumuladas);
    }

    return {
      id: usuarioId,
      mensagens: _mensagensAcumuladas,
      finalizado: false,
      aguardandoResposta: resultado.aguardarResposta,
      abrir_chamado: false,
      cliente: null
    };
  }

  obterSessao(usuarioId) {
    return Cache.get(usuarioId);
  }
}

// Exporta para uso externo
module.exports = {
  FlowEngine
};
