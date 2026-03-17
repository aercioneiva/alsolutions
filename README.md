## parte 1

> (API)

- [x] implementar linter no codigo
- [ ] rever template de nova conversa, esta fixo
- [ ] montar logica de template para envio de mensagens avulsas
- [ ] montar logica de template para envio de notificacoes (charge-notifications)
- [ ] montar logica de template para envio de notificacoes (contract-notifications)
- [x] implementar wait nas mensagens vinda do fluxo
- [x] se o usuario iniciar uma nova conversa no chatwoot, abrir um atendimento no rbx. (vai precisar voltar a salvar o cliente vinculado ao contato)
- [x] ao abrir o chatwoot, levar todas mensagens que o usuario dirigitou no zap
- [x] ajustar o fluxo para nao salvar o boleto completo
- [x] apagar whatsapp_messages após 1h
- [ ] separar cron e work da API
- [x] add segurança na chamada da meta para api com header

desabilitar a criação de conta pelo login do chatwoot
https://chatwoot.aercioneiva.com/installation/onboarding (cria uma conta admin)

desabilitar notificacao falando que o chatwoot tem versao mais nova

https://meujames.com/api/playsms?&op=pv&u=|USUARIO|&h=|SENHA|&msg=|MENSAGEM|&to=|CELULAR|
telefones são os números que devem receber a mensagem (para vários números separe-os por vírgula).

## parte 2

- criar uma tabela de lock, nao deixar rodar uma rotina mais de uma vez ao mesmo tempo cronjob
- implementar uma logica para armazenar as conversas do usuario caso ele precise iniciar um atendimento. hj inicia o chatwoot sem nada (salvar no banco e ir limpando todo dia para nao acumular, ou até ele iniciar a conversa no chatwoot. salvar só as mensagens dele em trativa com o bot)
- implementar a troca de usuarios na conversa(ex muda de atendente ou setor). verificar se tem mais alguma ação na conversa para tratar
- implementar o envio de templates e tbm o cadastro dos mesmos por um painel
- criar painel para acomapanhamento em tempo real dos gastos com envio de mensagem para META, usar a doc para saber o processo
- ver a posibilidade de enviar uma localização pelo zap, e chegar no chatwoot a localização utilizando o googlemaps. link do maps com localização em questao
- porder conectar uma api oficial e não oficial ao mesmo tempo para reduzir custos (oficial para entreda, não oficial para mensagem ativa, como aviso cobrança etc...)

CREATE DATABASE alsolutions;

CREATE TABLE `company` (
`id` bigint(18) NOT NULL AUTO_INCREMENT,
`name` varchar(100) NOT NULL,
`contract` varchar(50) NOT NULL,
`id_whatsapp` varchar(50) NOT NULL,
`token_whatsapp` varchar(255) NOT NULL,
`version_whatsapp` varchar(10) NOT NULL,
`secret_whatsapp` varchar(255) NOT NULL,
`flow` varchar(50) NOT NULL,
`chatwoot_account` int(5) NOT NULL,
`chatwoot_inbox` int(5) NOT NULL,
`chatwoot_token` varchar(100) NOT NULL,
`downtime` int(3) NOT NULL,
`system` varchar(60) NOT NULL,
`host` varchar(255) NOT NULL,
`key_integration` varchar(100) NOT NULL,
`rbx_account` bigint(15) NOT NULL,
`rbx_user` varchar(20) NOT NULL,
`fluxo` int(3) NOT NULL,
`topico` int(5) NOT NULL,
`cause` int(5) NOT NULL,
`status` char(1) NOT NULL,
PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `company` (`id`, `name`, `contract`, `id_whatsapp`, `token_whatsapp`, `version_whatsapp`, `secret_whatsapp`, `flow`, `chatwoot_account`, `chatwoot_inbox`, `chatwoot_token`, `downtime`, `system`, `host`, `key_integration`, `rbx_account`, `rbx_user`, `fluxo`, `topico`, `cause`, `status`) VALUES
(1, 'my company', '1220f3e9-f792-40cd-937a-f9fc6f79395f', '238910019300032', 'EAAMsez0q62sBQakDv1EO20PfaunBkqVxVxG81XywEEbmwzv61Xoyx3GkMApp0KJXgLo4aGdnKnhZAxZA5ZCFqHW5MDKkAZAzoUSZARZAl3Qg302ctPndhNUsxEopGieP4BJFjIqAfkUovJxeg6AKtbKWd3vOi7tElLgczBMPv6ffUYzyZCsTVeVUFfs7OjBLgZDZD', 'v25.0', 'c48bdf55806013fe55be13b978916e3d', 'teste', 1, 1, 'LM5p5ENsWKeGcGCtDtfgmfJD', 5, 'routerbox', 'https://desenv-deb12.rbxsoft.com', 'UZ2H3FF7YBAHTHZW8DRZ6T2L3RAV85', 3, 'aercio', 0, 14, 2, 'A');

DROP TABLE IF EXISTS `contact`;
CREATE TABLE `contact` (
`id` bigint(18) NOT NULL AUTO_INCREMENT,
`contract` varchar(50) NOT NULL,
`number` varchar(20) NOT NULL,
`name` varchar(100) NOT NULL,
`last_message` datetime DEFAULT NULL,
`created_at` datetime NOT NULL DEFAULT current_timestamp(),
`updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
PRIMARY KEY (`id`),
UNIQUE KEY `uk_contact_number` (`number`),
KEY `contract_number` (`contract`,`number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `contact` (`id`, `contract`, `number`, `name`, `last_message`, `created_at`, `updated_at`) VALUES
(9, '1220f3e9-f792-40cd-937a-f9fc6f79395f', '554498004059', 'Aercio Bom Pagador', '2026-03-14 20:25:05', '2026-03-01 21:37:26', '2026-03-14 20:25:05'),
(10, '1220f3e9-f792-40cd-937a-f9fc6f79395f', '554498009387', 'Aercio Bom Pagador', '2026-03-03 22:03:44', '2026-03-01 21:37:26', '2026-03-03 22:03:44');

DROP TABLE IF EXISTS `contact_customer`;
CREATE TABLE `contact_customer` (
`id` bigint(18) NOT NULL AUTO_INCREMENT,
`contact_id` bigint(18) NOT NULL,
`name` varchar(100) NOT NULL,
`document` varchar(19) NOT NULL,
`code` varchar(36) NOT NULL,
`created_at` datetime NOT NULL DEFAULT current_timestamp(),
`updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
PRIMARY KEY (`id`),
KEY `contact_id` (`contact_id`),
CONSTRAINT `contact_customer_ibfk_1` FOREIGN KEY (`contact_id`) REFERENCES `contact` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `contact_customer` (`id`, `contact_id`, `name`, `document`, `code`, `created_at`, `updated_at`) VALUES
(8, 9, 'Aercio Bom Pagador', '06533029916', '489', '2026-03-01 21:37:26', '2026-03-01 21:37:26'),
(10, 10, 'Wila da silva', '06533029916', '111', '2026-03-01 21:37:26', '2026-03-01 21:37:26');

DROP TABLE IF EXISTS `session`;
CREATE TABLE `session` (
`id` bigint(18) NOT NULL AUTO_INCREMENT,
`contract` varchar(50) NOT NULL,
`number` varchar(20) NOT NULL,
`session` varchar(60) NOT NULL,
`conversation` bigint(20) NOT NULL,
`ticket` bigint(20) NOT NULL,
`updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
PRIMARY KEY (`id`),
UNIQUE KEY `number` (`number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `whatsapp_messages`;
CREATE TABLE `whatsapp_messages` (
`id` bigint(20) NOT NULL AUTO_INCREMENT,
`contract` varchar(50) NOT NULL,
`message_id` varchar(255) DEFAULT NULL,
`user_id` varchar(255) NOT NULL,
`session_id` bigint(18) DEFAULT NULL,
`phone_number` varchar(50) NOT NULL,
`message_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`message_data`)),
`status` enum('pending','processing','completed','failed') DEFAULT 'pending',
`attempts` int(11) DEFAULT 0,
`error_message` text DEFAULT NULL,
`created_at` datetime DEFAULT current_timestamp(),
`processed_at` datetime DEFAULT NULL,
PRIMARY KEY (`id`),
UNIQUE KEY `message_id` (`message_id`),
KEY `idx_user_status` (`user_id`,`status`,`created_at`),
KEY `idx_status_created` (`status`,`created_at`),
KEY `idx_phone` (`phone_number`),
KEY `session_id` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `contact`
ADD INDEX `contract_number` (`contract`, `number`);

INSERT INTO company (name,contract,account,inbox,downtime,system,status, host,key_integration,fluxo,topico) VALUES ('my company','1220F3E9-F792-40CD-937A-F9FC6F79395F',1,1,5,'routerbox','A','','',0,0);

{
"Cliente": 123456
"Contrato": 123456
"Evento": "BLOCK"
}

ACTIVATE => 'Ativado'
BLOCK => 'Bloqueado'
UNBLOCK => 'Desbloqueado'
SUSPEND => 'Suspenso'
REACTIVATE => 'Reativado'
CANCEL => 'Cancelado'
BANDWIDTH_LIMIT => 'Reduzido a banda de navegação'

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

```
{
    "nome_template": "cobranca_pix",
    "params": {
        "nome_cliente": "|NOME|",
        "status_vencimento": "consta débitos em aberto. Após o pagamento, seus serviços serão restabelecidos em poucos minutos. Seguem as opções de pagamento."
    },
    "order_details": {
        "valor": "|DOCUMENTO_VALOR_TOTAL| ",
        "copia_e_cola": "|PIX_COPIA_E_COLA|",
        "linha_digitavel": "|LINHA_DIGITAVEL|"
    }
}

{
    "nome_template": "cobranca_pix",
    "params": {
        "nome_cliente": "|NOME|",
        "status_vencimento": "ainda não foi quitada, RESPONDA essa mensagem para agendamento da retirada dos equipamentos e evite a cobrança de MULTA referente ao equipamento em comodato!"
    },
    "order_details": {
        "valor": "|DOCUMENTO_VALOR_TOTAL|",
        "copia_e_cola": "|PIX_COPIA_E_COLA|",
        "linha_digitavel": "|LINHA_DIGITAVEL|"
    }
}
```
