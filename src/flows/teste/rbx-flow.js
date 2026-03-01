const axios = require('axios');

const fluxoAtendimentoRBX = {
  nome: 'atendimento_rbx',
  stepInicial: 'inicio',
  
  steps: {
    inicio: {
      acao: async (dados, mensagem) => {
        console.log(dados)
        return {
          mensagem: 'Olá, que bom que você entrou em contato com a Loga!',
          tipo: 'text',
          proximoStep: 'apresentacao',
          aguardarResposta: false
        };
      }
    },

    apresentacao: {
      acao: async (dados, mensagem) => {
        return {
          mensagem: 'Eu sou a Lara, assistente virtual da RBXSoft!',
          tipo: 'text',
          proximoStep: 'solicitarDocumento',
          aguardarResposta: false
        };
      }
    },

    solicitarDocumento: {
      acao: async (dados, mensagem) => {
        if (!mensagem) {
          return {
            mensagem: 'Preciso que você informe o CPF/CNPJ para o qual deseja atendimento',
            tipo: 'text',
            aguardarResposta: true
          };
        }

        const documento = mensagem.trim();
        
        dados.documento = documento;
        
        return {
          mensagem: null,
          tipo: null,
          proximoStep: 'buscarCadastro',
          aguardarResposta: false
        };
      }
    },

    buscarCadastro: {
      acao: async (dados) => {
        // Busca o cadastro
        const response = await buscarCadastroPorDocumento(dados);
        
        if (response) {
            dados.cliente = {
                nome: response.result[0].Nome,
                codigo: parseInt(response.result[0].Codigo),
                documento: response.result[0].CNPJ_CNPF,
                whatsapp: dados.usuarioId,
                boletos: []
            };
            console.log(dados)
            return {
                mensagem: 'Aguarde enquanto localizo o cadastro!',
                tipo: 'text',
                proximoStep: 'confirmarCadastro',
                aguardarResposta: false,
                tempo: 4
            };
        }

        return {
            mensagem: null,
            tipo: null,
            proximoStep: 'erroCadastro',
            aguardarResposta: false
        };
        
      }
    },

    erroCadastro: {
      acao: async (dados, mensagem) => {
        return {
          mensagem: 'Cadastro não encontrado. Por favor, informe outro CPF/CNPJ!',
          tipo: 'text',
          proximoStep: 'solicitarDocumento',
          aguardarResposta: true
        };
      }
    },

    confirmarCadastro: {
      acao: async (dados, mensagem) => {
        if (!mensagem) {

          const nome = dados.cliente.nome;
          
          return {
            mensagem: `✅ Consegui localizar o cadastro em nome de ${nome}\n\nÉ para esse cadastro que você deseja atendimento?\n\n▶️ 1 - Sim\n▶️ 2 - Não`,
            tipo: 'text',
            aguardarResposta: true
          };
        }

        const opcao = mensagem.trim();

        if (opcao == 1) {
            salvarContato(dados);
            return {
              mensagem: null,
              tipo: null,
              proximoStep: 'menuInicial',
              aguardarResposta: false
            };
        } else if (opcao == 2) {
          return {
            mensagem: 'Entendido. Por favor, informe outro CPF/CNPJ!',
            tipo: 'text',
            proximoStep: 'solicitarDocumento',
            aguardarResposta: true
          };
        }
        
        return {
            mensagem: 'Opção inválida. Por favor, digite:\n▶️ 1 - Sim\n▶️ 2 - Não',
            tipo: 'text',
            aguardarResposta: true
        };
        
      }
    },

    menuInicial: {
      acao: async (dados, mensagem) => {
        return {
          mensagem: 'Para seguir com o atendimento, escolha uma das opções abaixo\n\n▶️ 1 - Falar com financeiro\n▶️ 2 - Falar com suporte\n▶️ 3 - Falar com atendente\n▶️ 4 - Sair',
          tipo: 'text',
          proximoStep: 'confirmarMenuInicial',
          aguardarResposta: true
        };
      }
    },
    
    confirmarMenuInicial: {
      acao: async (dados, mensagem) => {
        const opcao = mensagem.trim();

        if (opcao == 1) {
            return {
              mensagem: null,
              tipo: null,
              proximoStep: 'menuFinanceiro',
              aguardarResposta: false
            };
        } else if (opcao == 2 || opcao == 3) {
          const estabelecimentoAberto = validarHorarioAtendimento();
          if (!estabelecimentoAberto) {
            return {
              mensagem: 'Estamos fechados no momento. Por favor, tente novamente mais tarde!',
              tipo: 'text',
              proximoStep: 'finalizar',
              aguardarResposta: false
            };
          }
          
          return {
              mensagem: 'Certo, vou transferir você para o atendimento humano!',
              tipo: 'text',
              abrirChamado: true,
              finalizar: true,
              cliente: { codigo: dados.cliente.codigo, nome: dados.cliente.nome }
            };
        } else if (opcao == 4) {
          return {
              mensagem: null,
              tipo: null,
              proximoStep: 'finalizar',
              aguardarResposta: false
          };
        }
        
        return {
            mensagem: 'Opção inválida. Por favor, digite:\n▶️ 1 - Falar com financeiro\n▶️ 2 - Falar com suporte\n▶️ 3 - Falar com atendente\n▶️ 4 - Sair',
            tipo: 'text',
            aguardarResposta: true
        };
        
      }
    },

    menuFinanceiro: {
      acao: async (dados, mensagem) => {
        return {
          mensagem: 'Escolha uma das opções abaixo\n\n▶️ 1 - Obter segunda via (Boleto em aberto)\n▶️ 2 - Obter Pix Copia e Cola (Boleto em aberto)\n▶️ 3 - Informar aviso de pagamento\n▶️ 4 - Voltar ao menu principal',
          tipo: 'text',
          proximoStep: 'confirmarMenuFinanceiro',
          aguardarResposta: true
        };
      }
    },

    confirmarMenuFinanceiro: {
      acao: async (dados, mensagem) => {
        const opcao = mensagem.trim();

        if (opcao == 1) {
          const boletos = await buscarBoletosEmAberto(dados);
          
          if(boletos){
            dados.cliente.boletos = boletos.map((boleto) => {
              return {
                id: boleto.id,
                due_date: boleto.due_date,
                value_init: boleto.value_init,
                pix_copy_paste: boleto.pix_copy_paste || null
              }
            });

            return {
              mensagem: `Encontrei ${boletos.length} boleto(s) em aberto para  ${dados.cliente.nome}`,
              tipo: 'text',
              proximoStep: 'menuBoletos',
              aguardarResposta: false
            };
          }
          
          return {
            mensagem: `Não exitem boleto(s) em aberto para esse cadastro ${dados.cliente.nome}`,
            tipo: 'text',
            proximoStep: 'finalizar',
            aguardarResposta: false
          };
        } else if (opcao == 2) {
          const boletos = await buscarBoletosEmAberto(dados);

          if(boletos){
            dados.cliente.boletos = boletos.map((boleto) => {
              return {
                id: boleto.id,
                due_date: boleto.due_date,
                value_init: boleto.value_init,
                pix_copy_paste: boleto.pix_copy_paste || null
              }
            });
            
            return {
              mensagem: `Encontrei ${boletos.length} boleto(s) em aberto para  ${dados.cliente.nome}`,
              tipo: 'text',
              proximoStep: 'menuBoletosPIX',
              aguardarResposta: false
            };
          }
          
          return {
            mensagem: `Não exitem boleto(s) em aberto para esse cadastro ${dados.cliente.nome}`,
            tipo: 'text',
            proximoStep: 'finalizar',
            aguardarResposta: false
          };
        } else if(opcao == 3) {
          const boletos = await buscarBoletosEmAberto(dados);

          if(boletos){
            dados.cliente.boletos = boletos.map((boleto) => {
              return {
                id: boleto.id,
                due_date: boleto.due_date,
                value_init: boleto.value_init,
                pix_copy_paste: boleto.pix_copy_paste || null
              }
            });

            return {
              mensagem: `Encontrei ${boletos.length} boleto(s) em aberto para  ${dados.cliente.nome}`,
              tipo: 'text',
              proximoStep: 'menuBoletosAviso',
              aguardarResposta: false
            };
          }
          
          return {
            mensagem: `Não exitem boleto(s) em aberto para esse cadastro ${dados.cliente.nome}`,
            tipo: 'text',
            proximoStep: 'finalizar',
            aguardarResposta: false
          };
        } else if (opcao == 4) {
          return {
              mensagem: null,
              tipo: null,
              proximoStep: 'menuInicial',
              aguardarResposta: false
          };
        }
        
        return {
            mensagem: 'Opção inválida. Por favor, digite:\n▶️ 1 - Obter segunda via (Boleto em aberto)\n▶️ 2 - Obter Pix Copia e Cola (Boleto em aberto)\n▶️ 3 - Informar aviso de pagamento\n▶️ 4 - Voltar ao menu principal',
            tipo: 'text',
            aguardarResposta: true
        };
        
      }
    },

    menuBoletos: {
      acao: async (dados, mensagem) => {
      
        const boletos = dados.cliente.boletos.map((boleto, index) => {
          const partesData = boleto.due_date.split('-');
          let mes = partesData[1];
          let dia = partesData[2];
          let ano = partesData[0];
          let valor = parseFloat(boleto.value_init).toLocaleString('pt-BR');
          return `▶️ ${index+1} - ${dia}/${mes}/${ano} Valor R$${valor}`;
        
        
        }).join('\n').concat(`\n▶️ 0 - Voltar ao menu financeiro`);

        return {
          mensagem: `Escolha um do(s) boleto(s) abaixo\n\n${boletos}`,
          tipo: 'text',
          proximoStep: 'confirmarBoletos',
          aguardarResposta: true
        };
      }
    },

    confirmarBoletos: {
      acao: async (dados, mensagem) => {
        const opcao = parseInt(mensagem.trim());

        if (opcao == 0) {
            return {
              mensagem: null,
              tipo: null,
              proximoStep: 'menuFinanceiro',
              aguardarResposta: false
            };
        } else if (opcao > 0 && opcao <= dados.cliente.boletos.length) {
          const boleto = dados.cliente.boletos[opcao-1];

          const linkBoleto = await buscarBoletoPDF(dados.company, boleto.id);
          if(linkBoleto){
            return {
              mensagem: linkBoleto,
              tipo: 'embed',
              proximoStep: 'finalizar',
              aguardarResposta: false,
              tempo: 5
            };
          }

          return {
            mensagem: `Ocorreu um erro ao tentar recuperar o pdf, tente novamente mais tarde!`,
            tipo: 'text',
            proximoStep: 'finalizar',
            aguardarResposta: false
          };
        } 
        
        return {
            mensagem: 'Opção inválida',
            tipo: 'text',
            proximoStep: 'menuBoletos',
            aguardarResposta: false
        };
      }
    },

    menuBoletosPIX: {
      acao: async (dados, mensagem) => {
      
        const boletos = dados.cliente.boletos.map((boleto, index) => {
          const partesData = boleto.due_date.split('-');
          let mes = partesData[1];
          let dia = partesData[2];
          let ano = partesData[0];
          let valor = parseFloat(boleto.value_init).toLocaleString('pt-BR');
          return `▶️ ${index+1} - ${dia}/${mes}/${ano} Valor R$${valor}`;
        
        
        }).join('\n').concat(`\n▶️ 0 - Voltar ao menu financeiro`);

        return {
          mensagem: `Escolha um do(s) boleto(s) abaixo\n\n${boletos}`,
          tipo: 'text',
          proximoStep: 'confirmarBoletosPIX',
          aguardarResposta: true
        };
      }
    },

    confirmarBoletosPIX: {
      acao: async (dados, mensagem) => {
        const opcao = parseInt(mensagem.trim());

        if (opcao == 0) {
            return {
              mensagem: null,
              tipo: null,
              proximoStep: 'menuFinanceiro',
              aguardarResposta: false
            };
        } else if (opcao > 0 && opcao <= dados.cliente.boletos.length) {
          const boleto = dados.cliente.boletos[opcao-1];

          if(boleto.pix_copy_paste){
            return {
              mensagem: boleto.pix_copy_paste,
              tipo: 'text',
              proximoStep: 'finalizar',
              aguardarResposta: false
            };
          }

          const pixCopiaCola = await buscarBoletoPIX(dados.company, boleto.id);
          if(pixCopiaCola){
            return {
              mensagem: pixCopiaCola,
              tipo: 'text',
              proximoStep: 'finalizar',
              aguardarResposta: false
            };
          }

          return {
            mensagem: `Ocorreu um erro ao tentar recuperar o PIX, tente novamente mais tarde!`,
            tipo: 'text',
            proximoStep: 'finalizar',
            aguardarResposta: false
          };
        } 
        
        return {
            mensagem: 'Opção inválida',
            tipo: 'text',
            proximoStep: 'menuBoletos',
            aguardarResposta: false
        };
      }
    },

     menuBoletosAviso: {
      acao: async (dados, mensagem) => {
      
        const boletos = dados.cliente.boletos.map((boleto, index) => {
          const partesData = boleto.due_date.split('-');
          let mes = partesData[1];
          let dia = partesData[2];
          let ano = partesData[0];
          let valor = parseFloat(boleto.value_init).toLocaleString('pt-BR');
          return `▶️ ${index+1} - ${dia}/${mes}/${ano} Valor R$${valor}`;
        
        
        }).join('\n').concat(`\n▶️ 0 - Voltar ao menu financeiro`);

        return {
          mensagem: `Escolha um do(s) boleto(s) abaixo\n\n${boletos}`,
          tipo: 'text',
          proximoStep: 'confirmarBoletosAviso',
          aguardarResposta: true
        };
      }
    },

    confirmarBoletosAviso: {
      acao: async (dados, mensagem) => {
        const opcao = parseInt(mensagem.trim());

        if (opcao == 0) {
            return {
              mensagem: null,
              tipo: null,
              proximoStep: 'menuFinanceiro',
              aguardarResposta: false
            };
        } else if (opcao > 0 && opcao <= dados.cliente.boletos.length) {
          dados.cliente.boletoSelecionado = dados.cliente.boletos[opcao-1];
          
          return {
            mensagem: `Informe a data de pagamento no formato 00/00/0000`,
            tipo: 'text',
            proximoStep: 'avisoPagamento',
            aguardarResposta: true
          };
        } 
        
        return {
            mensagem: 'Opção inválida',
            tipo: 'text',
            proximoStep: 'menuBoletos',
            aguardarResposta: false
        };
      }
    },

    avisoPagamento: {
      acao: async (dados, mensagem) => {
        console.log(dados);
        if (!mensagem) {
          return {
            mensagem: 'Preciso que você Informe a data de pagamento no formato 00/00/0000',
            tipo: 'text',
            aguardarResposta: true
          };
        }

        const dataPagamento = mensagem.trim();
        
        const partesData = dataPagamento.split('/');
        let mes = partesData[1];
        let dia = partesData[0];
        let ano = partesData[2];

        const resposta = await informarPagamento(dados, `${ano}-${mes}-${dia}`);

        if(resposta){
          return {
            mensagem: 'Seu pagamento foi informado com sucesso, em breve seu sinal deve voltar ao normal',
            tipo: 'text',
            proximoStep: 'finalizar',
            aguardarResposta: false
          };
        }
        
        return {
          mensagem: 'Não foi possível informar o pagamento, tente novamente mais tarde!',
          tipo: 'text',
          proximoStep: 'finalizar',
          aguardarResposta: false
        };
      }
    },

    finalizar: {
      acao: async (dados) => {
        return {
          mensagem: 'Obrigada pelo contato, até mais!',
          tipo: 'text',
          finalizar: true
        };
      }
    }
  }
};

async function buscarCadastroPorDocumento(dados) {
  try {
        const res = await axios({
            method: "POST",
            url: `${dados.company.host}/routerbox/ws/rbx_server_json.php`,
            headers: {
                'Content-Type': 'application/json'
            },
            data : {
                ConsultaClientes: {
                    Autenticacao: {
                        ChaveIntegracao: dados.company.key_integration
                    },
                    Filtro: `CNPJ_CNPF='${dados.documento}'`
                }
            }
        });

        return res.data;
    } catch (error) {
        console.log(`[SERVICE-RBXSOFT] Não conseguiu buscar o cliente`);
    }

    return null;
}

async function salvarContato({contract, cliente}) {
    try {
      const res = await axios({
          method: "POST",
          url: `https://alsolutions.onrender.com/api/v1/contact`,
          headers: {
              'Content-Type': 'application/json'
          },
          data : {
              contact: {
                  contract: contract,
                  number: cliente.whatsapp,
                  name: cliente.nome
              }
          }
      });
    } catch (error) {
        console.log(`[SERVICE-ALSOLUTIONS] Não conseguiu cadastrar o contato`, error);
    }
}

async function buscarBoletosEmAberto(dados) {
  try {
    const response = await axios({
        method: "POST",
        url: `${dados.company.host}/routerbox/ws_json/ws_json.php`,
        headers: {
            'Content-Type': 'application/json',
            'authentication_key': dados.company.key_integration
        },
        data : {
          get_unpaid_document: {
            customer_id: dados.cliente.codigo, 
            account_number: dados.company.rbx_account
          }
        }
    });

    return response.data.result.length > 0 ? response.data.result : null;
  } catch (error) {
      console.log(`[SERVICE-RBXSOFT] Não conseguiu buscar os boletos em aberto`, error);
  }

  return null;
}

function validarHorarioAtendimento() {
  let dataAtual = new Date();
  dataAtual = new Date(dataAtual.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));

  let diaAtual = dataAtual.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  let horaAtual = dataAtual.getHours();
  let minutoAtual = dataAtual.getMinutes();

  // Segunda a Sexta
  if (diaAtual >= 1 && diaAtual <= 5) {
    if (
      (horaAtual >= 8) &&
      (horaAtual < 18 || (horaAtual === 18 && minutoAtual === 0))
    ) {
      return true;
    }
  }else if (diaAtual === 6) {// Sábado
    if (
      (horaAtual >= 8) &&
      (horaAtual < 12 || (horaAtual === 12 && minutoAtual === 0))
    ) {
      return true;
    }
  }

  return true;
}

async function buscarBoletoPDF(company, sequencia) {
  try {
    const response = await axios({
        method: "POST",
        url: `${company.host}/routerbox/ws_json/ws_json.php`,
        headers: {
            'Content-Type': 'application/json',
            'authentication_key': company.key_integration
        },
        data : {
          get_banking_billet: {
            document_id: sequencia
          }
        }
    });

    return response.data.result.banking_billet_link || null;
  } catch (error) {
      console.log(`[SERVICE-RBXSOFT] Não conseguiu buscar os boletos em aberto`, error);
  }

  return null;
}

async function buscarBoletoPIX(company, sequencia) {
  try {
    const response = await axios({
        method: "POST",
        url: `${company.host}/routerbox/ws_json/ws_json.php`,
        headers: {
            'Content-Type': 'application/json',
            'authentication_key': company.key_integration
        },
        data : {
          get_pix_copia_cola: {
              banking_billet_id: sequencia,
              send_pix_copia_cola: false
          }
        }
    });

    return response.data.result || null;
  } catch (error) {
      console.log(`[SERVICE-RBXSOFT] Não conseguiu buscar o PIX`, error);
  }

  return null;
}

async function informarPagamento(dados, dataPagamento) {
  try {
    const response = await axios({
        method: "POST",
        url: `${dados.company.host}/routerbox/ws_json/ws_json.php`,
        headers: {
            'Content-Type': 'application/json',
            'authentication_key': dados.company.key_integration
        },
        data : {
          send_payment_notification: {
              document_id: dados.cliente.boletoSelecionado.id,
              payment_date: dataPagamento,
              customer_id: dados.cliente.codigo,
          }
        }
    });

    return response.data.result;
  } catch (error) {
      console.log(`[SERVICE-RBXSOFT] Não conseguiu informar o pagamento`, error);
  }

  return null;
}

module.exports = {
  fluxoAtendimentoRBX
};
