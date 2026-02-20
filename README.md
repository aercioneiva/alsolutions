## parte 1 
>(API)
- [ ] implementar linter no codigo
- [ ] implementar novo fluxo, sem typebot
- [X] terminar fila de mensagem, aplicar lock
- [X] tratar anexo malicioso vindo do zap 
- [ ] rever template de nova conversa, esta fixo
- [ ] montar logica de template para envio de mensagens avulsas
- [ ] montar logica de template para envio de notificacoes
- [X] trocar o id do whatsapp para vir como parametro, hj ta fixo
- [X] ao encerrar uma conversa, validar se é a mesma que o usuario esta em aberta para poder noficar corretamente
- [X] implementar uma logica para mensagem ativa conversa
- [x] implementar a logica de cache para pegar os dados da empresa, aplicar padrão adpter
- [X] implementar recurso de atualizar a data da ultima mensagem enviada pelo usuario
- [X] implementar a logica de aproveitar o contato do chatwoot para nao ficar abrindo novos cadastros
- [X] implementar o reconhecimento do usuario pelo telefone, perguntar se ele esta falando daquele cadastro senao pedir a informação e cadastrar esse novo cadastro
- [X] trocar o baserow por postgres
- [X] implementar endpoint sms para disparo de mensagens
- [X] implementar alguma trativa para inatividade. (limpar tabela de session apenas se nao estiver em uma conversa no chatwoot)
- [X] criar api para cadastrar/atualizar a empresa (remover do cache na atualizacao)
- [X] tratar evento de atualizacao da conexao, para atualizar o painel via api.
- [X] tratar mensagem Sim/Nao quando nao for api oficial
- [X] criar endpoint que recebe a notificacao de cobranca. com isso buscamos o boleto e pix, e enviamos para o cliente(hj envia o codigo do cliente, ae teria que buscar os boletsos em aberto do mesmo)
- [X] criar endpoint para notificar usuario quando contrato entrar em redução de banda/bloqueio/sespensao/cancelamento e reativacao (verificar de utilizar api generica da loga)
- [X] criar a api definitiva
    - [X] implementar tratamento de erros
    - [X] segurança contra alguns ataques (cors,ratelimit ddos)
    - [X] verificar se vai tratar com fila ou rabbitmq as mensagens
    - [X] ajustar o nome da instancia para ficar igual o contract no arquivo de consumer do zap, hj esta fixo (alsolutions)
    - [X] analisar todos console.log()/console.error


desabilitar a criação de conta pelo login do chatwoot
https://chatwoot.aercioneiva.com/installation/onboarding  (cria uma conta admin)

bloquear por autenticacao
https://evo.aercioneiva.com/manager/alsolutions


desabilitar notificacao falando que o chatwoot tem versao mais nova


https://meujames.com/api/playsms?&op=pv&u=|USUARIO|&h=|SENHA|&msg=|MENSAGEM|&to=|CELULAR|
telefones são os números que devem receber a mensagem (para vários números separe-os por vírgula).


## parte 2
- o recurso de enviar notificacoes ta fixo a url,conta e key da loga (precisa criar recurso de criar os dados de integracao do provedor)
- tratar mensagem "Invalid message. Please, try again." typebot
- tratar typebot, hj esta fixo par ao bot alsolutions(precisa ser por cliente integrado)
- ajustar o id do telefone oficial que ta fixo hj no codigo para api oficial
- tratar mensagem Sim/Nao botao oficial
- criar uma tabela de lock, nao deixar rodar uma rotina mais de uma vez ao mesmo tempo cronjob
- implementar uma logica para armazenar as conversas do usuario caso ele precise iniciar um atendimento. hj inicia o chatwoot sem nada (salvar no banco e ir limpando todo dia para nao acumular, ou até ele iniciar a conversa no chatwoot. salvar só as mensagens dele em trativa com o bot)
- implementar uma logica para avisar o usuario do chatwoot que ele tem que enviar um template (chamar a api do chatwoot pansado alguma coisa na conversa e pedido talvez um comando para iniciar esse template)
- implementar a troca de usuarios na conversa(ex muda de atendente ou setor). verificar se tem mais alguma ação na conversa para tratar
- a janela de conversa com a meta, dura 24hs apartir da ultima mensagem do usuario. se eu mandar um template e ele nao responder, nao consigo mandar outra mensagem que nao seja um template e tbm a janela nao é aberta essa janela só é aberta quando ele responde (implementar uma logica para controle de janela de conversa da meta(para pode fazer uma mensagem ativa ou até mesmo responder o usuario))
- implementar o envio de templates e tbm o cadastro dos mesmos por um painel
- tratar reabertura de conversa pelo chatwoot no zap da meta. não oficial ja esta funcionando (webhook)
- tratar validação com o contract no webhook de cadastro da meta(pegar o contract por querystring e verificar se existe cadastrado)
- criar painel para acomapanhamento em tempo real dos gastos com envio de mensagem para META, usar a doc para saber o processo
- ver a posibilidade de enviar uma localização pelo zap, e chegar no chatwoot a localização utilizando o googlemaps. link do maps com localização em questao
- porder conectar uma api oficial e não oficial ao mesmo tempo para reduzir custos (oficial para entreda, não oficial para mensagem ativa, como aviso cobrança etc...)
- implementar controle de inatividade para sessions que esta em conversa no chatwoot? (avisar o usuario do chatwoot que a conversa foi finalizada por inatividade.)
- foi implementado apenas uma Queue/Worker para tratar mensagens de api, por causa do daley de 5 segundos, talvez vai ter que mudar isso para uma Queue/worker por empresa, pensa que cada empresa manda 1k de mensagem, a ultima que enviar vai ter que aguardar todo processamento da primeira empresa para seguir com suas mensagens (se fazer por contract/empresa como desativar uma queue de uma empresa que não antedemos mais)
- hj se abrir conversa pelo chatwoot, então nao abre o atendimento pq a convesa nao esta vinculada ao cliente e sim ao contato

CREATE DATABASE alsolutions;

CREATE TABLE whatsapp_messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  message_id VARCHAR(255) UNIQUE,
  user_id VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  message_data JSON NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  attempts INT DEFAULT 0,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  
  INDEX idx_user_status (user_id, status, created_at),
  INDEX idx_status_created (status, created_at),
  INDEX idx_phone (phone_number)
) ENGINE=InnoDB;

CREATE TABLE company(
    id bigint(18) PRIMARY KEY AUTO_INCREMENT,
    contract uuid NOT NULL,
    name VARCHAR(100) NOT NULL,
    contract uuid NOT NULL,
    id_whatsapp VARCHAR(50) NOT NULL,
    version_whatsapp VARCHAR(10) NOT NULL,
    account INT(5) NOT NULL,
    inbox INT(5) NOT NULL,
    downtime INT(3) NOT NULL,
    system VARCHAR(60) NOT NULL,
    host VARCHAR(255) NOT NULL,
    key_integration varchar(100) NOT NULL,
    fluxo int(3) NOT NULL,
    topico int(3) NOT NULL,
    status char(1) NOT NULL
);

CREATE TABLE contact(
    id bigint(18) PRIMARY KEY AUTO_INCREMENT,
    contract uuid NOT NULL,
    number VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    last_message DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_contact_number (number)
);

CREATE TABLE `contact_customer` (
  `Id` bigint(18) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `contact_id` bigint(18) NOT NULL,
  `name` varchar(100) NOT NULL,
  `document` varchar(19) NOT NULL,
  `code` varchar(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`contact_id`) REFERENCES `contact` (`id`) ON DELETE RESTRICT
);


CREATE TABLE session(
    id bigint(18) PRIMARY KEY AUTO_INCREMENT,
    contract uuid NOT NULL,
    number VARCHAR(20) NOT NULL,
    session VARCHAR(60) NOT NULL,
    conversation bigint NOT NULL,
    ticket bigint NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);



ALTER TABLE `contact`
ADD INDEX `contract_number` (`contract`, `number`);


INSERT INTO company (name,contract,account,inbox,downtime,system,status, host,key_integration,fluxo,topico) VALUES ('my company','1220F3E9-F792-40CD-937A-F9FC6F79395F',1,1,5,'routerbox','A','','',0,0);



{
  "Cliente":  123456
  "Contrato": 123456
  "Evento": "BLOCK"
}

ACTIVATE => 'Ativado'
BLOCK => 'Bloqueado'
UNBLOCK => 'Desbloqueado'
SUSPEND => 'Suspenso'
REACTIVATE => 'Reativado'
CANCEL => 'Cancelado'
BANDWIDTH_LIMIT	=> 'Reduzido a banda de navegação'

Olá [fulano], seu contrato foi [evento] em nossa base 

se evento (BLOCK,CANCEL,BANDWIDTH_LIMIT)
, para regularização entre em contato com a gente pelo telefone (44) 98888-8888

ACTIVATE,BLOCK,UNBLOCK,SUSPEND,REACTIVATE,CANCEL,BANDWIDTH_LIMIT

// Adicionar compressão para valores grandes
const zlib = require('zlib');

async function set(key, value, ttl = null) {
   try {
      const serialized = JSON.stringify(value);
      const compressed = await zlib.gzipSync(serialized);
      
      if (ttl) {
         await redis.setex(key, ttl, compressed);
      } else {
         await redis.set(key, compressed);
      }
   } catch (error) {
      Logger.error('Error setting cache:', error);
      throw error;
   }
}

async function get(key) {
   try {
      const compressed = await redis.get(key);
      if (!compressed) return null;
      
      const decompressed = zlib.gunzipSync(compressed);
      return JSON.parse(decompressed);
   } catch (error) {
      Logger.error('Error getting cache:', error);
      return null;
   }
}