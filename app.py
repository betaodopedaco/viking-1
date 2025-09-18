from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize the model and tokenizer
try:
    logger.info("Loading model and tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-medium")
    model = AutoModelForCausalLM.from_pretrained("microsoft/DialoGPT-medium")
    tokenizer.pad_token = tokenizer.eos_token  # Set pad token to eos token
    logger.info("Model and tokenizer loaded successfully!")
except Exception as e:
    logger.error(f"Error loading model: {e}")
    raise e

# Store conversation histories (in production, use a database)
conversations = {}

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_id = data.get('user_id', 'default')
        message = data.get('message', '')
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        logger.info(f"Received message from user {user_id}: {message}")
        
        # Get or initialize conversation history for this user
        if user_id not in conversations:
            conversations[user_id] = torch.tensor([], dtype=torch.long)
        
        # Encode the new user input
        new_user_input_ids = tokenizer.encode(message + tokenizer.eos_token, return_tensors='pt')
        
        # Append to conversation history
        bot_input_ids = torch.cat([conversations[user_id], new_user_input_ids], dim=-1)
        
        # Generate response
        chat_history_ids = model.generate(
            bot_input_ids,
            max_length=1000,
            pad_token_id=tokenizer.eos_token_id,
            num_return_sequences=1,
            temperature=0.7,
            repetition_penalty=1.1
        )
        
        # Extract the bot's response
        bot_response_ids = chat_history_ids[:, bot_input_ids.shape[-1]:]
        bot_response = tokenizer.decode(bot_response_ids[0], skip_special_tokens=True)
        
        # Update conversation history
        conversations[user_id] = chat_history_ids[:, :1000]  # Keep only the last 1000 tokens
        
        logger.info(f"Response to user {user_id}: {bot_response}")
        
        return jsonify({
            'response': bot_response,
            'user_id': user_id
        })
    
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/reset', methods=['POST'])
def reset_conversation():
    try:
        data = request.json
        user_id = data.get('user_id', 'default')
        
        if user_id in conversations:
            conversations[user_id] = torch.tensor([], dtype=torch.long)
            logger.info(f"Reset conversation for user {user_id}")
            return jsonify({'message': f'Conversation history for {user_id} has been reset'})
        else:
            return jsonify({'message': 'No conversation history found for this user'})
    
    except Exception as e:
        logger.error(f"Error in reset endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': True,
        'active_conversations': len(conversations)
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
