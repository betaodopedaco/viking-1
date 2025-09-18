document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const resetButton = document.getElementById('reset-button');
    const typingIndicator = document.getElementById('typing-indicator');
    
    // Token de API do Hugging Face
    const HF_API_TOKEN = "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";
    
    // URL da API do Hugging Face para o DialoGPT-medium
    const API_URL = "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium";
    
    // Histórico da conversa
    let pastUserInputs = [];
    let generatedResponses = [];
    
    // Adicionar mensagem ao chat
    function addMessage(text, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isUser ? 'user-message' : 'bot-message');
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        
        const senderDiv = document.createElement('div');
        senderDiv.classList.add('message-sender');
        senderDiv.textContent = isUser ? 'Você' : 'DialoGPT';
        
        const textDiv = document.createElement('div');
        textDiv.classList.add('message-text');
        textDiv.textContent = text;
        
        messageContent.appendChild(senderDiv);
        messageContent.appendChild(textDiv);
        messageDiv.appendChild(messageContent);
        
        chatMessages.appendChild(messageDiv);
        
        // Rolagem automática para a última mensagem
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Mostrar indicador de digitação
    function showTypingIndicator() {
        typingIndicator.style.display = 'flex';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Ocultar indicador de digitação
    function hideTypingIndicator() {
        typingIndicator.style.display = 'none';
    }
    
    // Enviar mensagem para a API
    async function sendMessageToAPI(message) {
        showTypingIndicator();
        
        try {
            // Adicionar a mensagem do usuário ao histórico
            pastUserInputs.push(message);
            
            // Preparar os dados para a API no formato correto para o DialoGPT
            const data = {
                inputs: {
                    text: message,
                    past_user_inputs: pastUserInputs.slice(0, -1), // Todas exceto a última
                    generated_responses: generatedResponses
                },
                parameters: {
                    max_length: 1000,
                    temperature: 0.7,
                    repetition_penalty: 1.1,
                    return_full_text: false
                }
            };
            
            console.log("Enviando para API:", data);
            
            // Fazer a requisição para a API
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Erro na resposta da API:', response.status, errorText);
                
                if (response.status === 503) {
                    // Modelo está carregando
                    const errorData = JSON.parse(errorText);
                    addMessage("O modelo está carregando. Por favor, aguarde alguns segundos e tente novamente.", false);
                    return;
                }
                
                throw new Error(`Erro na API: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log("Resposta da API:", result);
            
            // Extrair a resposta
            let botResponse = result.generated_text;
            
            // Adicionar a resposta ao histórico
            generatedResponses.push(botResponse);
            
            // Adicionar a resposta ao chat
            addMessage(botResponse, false);
            
        } catch (error) {
            console.error('Erro:', error);
            addMessage("Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.", false);
            
            // Se ocorrer um erro, remover a última mensagem do usuário do histórico
            pastUserInputs.pop();
        } finally {
            hideTypingIndicator();
        }
    }
    
    // Enviar mensagem
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Adicionar mensagem do usuário ao chat
        addMessage(message, true);
        
        // Limpar o campo de entrada
        messageInput.value = '';
        
        // Enviar para a API
        sendMessageToAPI(message);
    }
    
    // Limpar conversa
    function resetConversation() {
        pastUserInputs = [];
        generatedResponses = [];
        chatMessages.innerHTML = '';
        
        // Adicionar mensagem inicial do bot
        addMessage("Olá! Eu sou um assistente virtual baseado no modelo DialoGPT. Como posso ajudar você hoje?", false);
    }
    
    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    resetButton.addEventListener('click', resetConversation);
    
    // Focar no campo de entrada ao carregar a página
    messageInput.focus();
    
    // Adicionar mensagem inicial do bot
    setTimeout(() => {
        addMessage("Olá! Eu sou um assistente virtual baseado no modelo DialoGPT. Como posso ajudar você hoje?", false);
    }, 500);
});
