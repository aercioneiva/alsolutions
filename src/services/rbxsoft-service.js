const axios = require('axios');

const Logger = require('../libs/logger');

exports.abrirAtendimento = async (company, data) => {
    let dadosAtendimento = {
        Data_Abertura: new Date().toISOString().split('T')[0],
        Hora_Abertura: new Date().toISOString().split('T')[1].split('.')[0],
        Iniciativa: "C",
        Modo: "T",
        TipoCliente: "C",
        Cliente: data.customer,
        Prioridade: "1",
        Situacao: "A",
        Assunto: "Chat bot"
    };

    if(company.fluxo > 0){
        dadosAtendimento.Fluxo = company.fluxo;
    }else{
        dadosAtendimento.Topico = company.topico;
        dadosAtendimento.Tipo = "T";
    } 

    try {
        const res = await axios({
            method: "POST",
            url: `${company.host}/routerbox/ws/rbx_server_json.php`,
            headers: {
                'Content-Type': 'application/json'
            },
            data : { 
                AtendimentoCadastro: {
                    Autenticacao: {
                        ChaveIntegracao: company.key_integration
                    },
                    DadosAtendimento: dadosAtendimento
                }
            }
        });

        return res.data;
    } catch (error) {
        Logger.error(`[SERVICE-RBXSOFT] Não conseguiu abrir atendimento`);
        Logger.info(error);
    }
    return null;
}

exports.incluirMensagemAtendimento = async (company, messages) => {
    try {
        const res = await axios({
            method: "POST",
            url: `${company.host}/routerbox/ws_json/ws_json.php`,
            headers: {
                'Content-Type': 'application/json',
                'authentication_key': company.key_integration
            },
            data : { 
                chat_messages: messages 
            }
        });

        console.log('incluirMensagemAtendimento', res.data);

        return res.data;
    } catch (error) {
        Logger.error(`[SERVICE-RBXSOFT] Não conseguiu incuir as mensagens no atendimento`);
        Logger.info(error);
    }
    return null;
}