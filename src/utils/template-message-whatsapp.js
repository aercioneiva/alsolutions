exports.getTemplateNewMessage = (contract, customerPhoneNumber, concatName, conversationId, Status) => {
    return { 
        contract: contract,
        messaging_product: "whatsapp",
        to: customerPhoneNumber,
        type: "template",
        template: {
            name: "novo_chamado",
            language: {
                code: "pt_BR"
            },
            components: [
                {
                    type: "body",
                    parameters: [
                        {
                            type: "text",
                            text: concatName
                        },
                        {
                            type: "text",
                            text: conversationId
                        },
                        {
                            type: "text",
                            text: Status
                        },
                        {
                            type: "text",
                            text: new Date().toLocaleDateString('pt-BR')
                        }
                    ]
                }
            ]
        }
    };
}   