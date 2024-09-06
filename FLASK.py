from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
import openai
import pytz
from bson import ObjectId
import re
import string
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from gensim import corpora, models

app = Flask(__name__)
CORS(app)

# Download required nltk data
nltk.download('punkt')
nltk.download('stopwords')

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['UNIBOT']
sessions_collection = db['Sessions']
users_collection = db['Users']
documents_collection = db['Documents']

# Set up OpenAI API key
openai.api_key = "YOUR_OPENAI_API_KEY"

username = None
current_session_id = None  # Track the current session ID
session_count = 0  # Track the number of sessions
contents = None

# Function to get response from GPT-3.5-turbo
def get_gpt_response(prompt, document_text=None, chat_history=None):
    messages = [
        {"role": "system", "content": "You are UniBot for University of Management And Technology. Answer the user's questions based on the provided content. Give answer correctly and in detail and you should not apologize frequently. Avoid suggesting the user visit the website."},
    ]
    if document_text:
        messages.append({"role": "system", "content": f"Here is the document content for reference: {document_text}"})
    if chat_history:
        messages.extend(chat_history)

    messages.append({"role": "user", "content": prompt})

    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo-0125",
        messages=messages,
        temperature=0.1
    )
    return response.choices[0].message['content']


# Function to preprocess text for LDA
def preprocess_text(text):
    stop_words = set(stopwords.words('english'))
    tokens = word_tokenize(text.lower())
    tokens = [token for token in tokens if
              token not in stop_words and token not in string.punctuation and len(token) > 2]
    tokens = [re.sub(r'\W+', '', token) for token in tokens]
    return tokens


def perform_lda(conversation):
    texts = [preprocess_text(text) for text in conversation]
    texts = [text for text in texts if text]  # Remove empty lists

    if not texts:
        return "No valid topics found"

    dictionary = corpora.Dictionary(texts)
    corpus = [dictionary.doc2bow(text) for text in texts]

    if not corpus:
        return "No valid topics found"

    lda_model = models.LdaModel(corpus, num_topics=1, id2word=dictionary, passes=25)
    topics = lda_model.show_topics(num_words=3)
    topic_words = re.findall(r'"(.*?)"', topics[0][1])

    # Generate a more descriptive topic
    context_text = ' '.join(topic_words)
    prompt = f"Summarize the following keywords into a single topic: {context_text}"
    summary = get_gpt_response(prompt)
    return summary


@app.route('/login', methods=['POST'])
def login():
    global username, current_session_id
    data = request.get_json()
    username = data['username']
    password = data['password']

    user = users_collection.find_one({'username': username, 'password': password})
    if user:
        current_session_id = None  # Reset current session ID on login
        return jsonify({'success': True, 'message': 'Login successful!'}), 200
    else:
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

def get_embedding(text, is_prompt=False):
    model = "text-embedding-ada-002" if is_prompt else "text-embedding-ada-002"
    response = openai.Embedding.create(
        input=text,
        model=model
    )
    return response['data'][0]['embedding']

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data['username']
    password = data['password']

    existing_user = users_collection.find_one({'username': username})
    if existing_user:
        return jsonify({'success': False, 'message': 'Username already exists'}), 409
    else:
        users_collection.insert_one({'username': username, 'password': password})
        return jsonify({'success': True, 'message': 'User registered successfully'}), 201


@app.route('/upload_text_document', methods=['POST'])
def upload_text_document():
    global contents
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    username = request.form['username']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    content = file.read().decode('utf-8')

    # Split the content into chunks of 8192 tokens
    max_tokens = 8192
    chunks = [content[i:i + max_tokens] for i in range(0, len(content), max_tokens)]

    # Generate embeddings for each chunk
    embeddings = [get_embedding(chunk) for chunk in chunks]

    document_id = documents_collection.insert_one({
        'username': username,
        'document_content': content,
        'embeddings': embeddings,
        'timestamp': datetime.now(pytz.utc)
    }).inserted_id

    # Store document content in global variable or database for later use
    contents = content

    return jsonify({'message': 'File uploaded successfully', 'document_id': str(document_id)}), 200


@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    name = data.get('name')

    if not (username and password and email and name):
        return jsonify({'success': False, 'message': 'All fields are required.'}), 400

    existing_user = users_collection.find_one({'username': username})
    if existing_user:
        return jsonify({'success': False, 'message': 'Username already exists.'}), 409

    users_collection.insert_one({'username': username, 'password': password, 'email': email, 'name': name})
    return jsonify({'success': True, 'message': 'User registered successfully.'}), 201


@app.route('/start_new_chat', methods=['POST'])
def start_new_chat():
    data = request.get_json()
    user_username = data.get('username')
    user = users_collection.find_one({'username': user_username})

    if not user:
        return jsonify({'error': 'User not found'}), 404

    start_time = datetime.now(pytz.timezone('Asia/Karachi')).replace(tzinfo=None)

    # Fetch the user's session data
    session_data = sessions_collection.find_one({'user_id': user['_id']})

    # If no session document exists for the user, create one
    if not session_data:
        session_data = {
            'user_id': user['_id'],
            'sessions': {}
        }
        sessions_collection.insert_one(session_data)

    # Create a new session
    session_count = len(session_data['sessions']) + 1
    current_session_id = f'ChatSession_{session_count}'
    session_data['sessions'][current_session_id] = {
        'start_time': start_time,
        'end_time': None,
        'interactions': []
    }
    sessions_collection.update_one(
        {'user_id': user['_id']},
        {'$set': session_data}
    )

    return jsonify({'success': True, 'session_id': current_session_id})



@app.route('/chat_history', methods=['POST'])
def chat_history():
    data = request.get_json()
    user_username = data.get('username')
    user = users_collection.find_one({'username': user_username})

    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    session_data = sessions_collection.find_one({'user_id': user['_id']})

    if not session_data or 'sessions' not in session_data:
        return jsonify({'success': True, 'chatHistory': []}), 200

    chat_history = []
    for session_id, session in session_data['sessions'].items():
        interactions = session.get('interactions', [])
        messages = []
        for interaction in interactions:
            messages.append({'type': 'user', 'text': interaction['user_text']})
            messages.append({'type': 'bot', 'text': interaction['response_text']})

        chat_history.append({
            'topic': session.get('topic', 'General'),
            'messages': messages,
        })

    return jsonify({'success': True, 'chatHistory': chat_history}), 200


@app.route('/send_text_to_flask', methods=['POST'])
def receive_text():
    data = request.get_json()
    text = str(data['text'])
    user_username = data.get('username')
    user = users_collection.find_one({'username': user_username})

    if not user:
        return jsonify({'error': 'User not found'}), 404

    start_time = datetime.now(pytz.timezone('Asia/Karachi')).replace(tzinfo=None)

    # Fetch the user's session data
    session_data = sessions_collection.find_one({'user_id': user['_id']})

    # Ensure 'sessions' key exists
    if not session_data or 'sessions' not in session_data:
        session_data = {
            'user_id': user['_id'],
            'sessions': {}
        }
        sessions_collection.insert_one(session_data)
    else:
        if 'sessions' not in session_data:
            session_data['sessions'] = {}

    # Create a new session if none exists or if text is empty (indicating a new chat)
    if not data.get('session_id'):
        session_count = len(session_data['sessions']) + 1
        current_session_id = f'ChatSession_{session_count}'
        session_data['sessions'][current_session_id] = {
            'start_time': start_time,
            'end_time': None,
            'interactions': []
        }
    else:
        current_session_id = data.get('session_id')

    # Check if the user wants to generate a quiz or ask a document-related question
    if contents is not None and ("generate quiz" in text.lower() or "document" in text.lower()):
        response = get_gpt_response(text, document_text=contents)
    else:
        response = get_gpt_response(text)

    # Generate embeddings for the prompt
    prompt_embedding = get_embedding(text, is_prompt=True)

    # Add the interaction to the session
    sessions_collection.update_one(
        {'user_id': user['_id']},
        {'$push': {f'sessions.{current_session_id}.interactions': {
            'user_text': text,
            'response_text': response,
            'prompt_embedding': prompt_embedding,  # Store prompt embedding
            'timestamp': start_time
        }}}
    )

    # Get the conversation so far
    conversation = [interaction['user_text'] for interaction in session_data['sessions'][current_session_id]['interactions']]
    conversation.append(text)

    # Perform topic modeling
    topic = perform_lda(conversation)
    sessions_collection.update_one(
        {'user_id': user['_id']},
        {'$set': {f'sessions.{current_session_id}.topic': topic}}
    )

    end_time = datetime.now(pytz.timezone('Asia/Karachi')).replace(tzinfo=None)
    sessions_collection.update_one(
        {'user_id': user['_id']},
        {'$set': {f'sessions.{current_session_id}.end_time': end_time}}
    )

    response_message = {'username': user_username, 'response': response, 'topic': topic, 'session_id': current_session_id}

    return jsonify(response_message)




@app.route('/delete_chat_session', methods=['POST'])
def delete_chat_session():
    data = request.get_json()
    user_username = data.get('username')
    topic = data.get('topic')
    user = users_collection.find_one({'username': user_username})

    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    # Fetch the user's session data
    session_data = sessions_collection.find_one({'user_id': user['_id']})

    if not session_data or 'sessions' not in session_data:
        return jsonify({'success': False, 'message': 'No sessions found for the user'}), 404

    # Find and remove the session with the specified topic
    session_ids_to_delete = [k for k, v in session_data['sessions'].items() if v.get('topic', 'General') == topic]

    if not session_ids_to_delete:
        return jsonify({'success': False, 'message': f'Session with the topic "{topic}" not found'}), 404

    for session_id in session_ids_to_delete:
        del session_data['sessions'][session_id]

    # Update the sessions collection with the remaining sessions
    sessions_collection.update_one(
        {'user_id': user['_id']},
        {'$set': {'sessions': session_data['sessions']}}
    )

    return jsonify({'success': True, 'message': f'Chat session with topic "{topic}" deleted successfully'}), 200



@app.route('/end_session', methods=['POST'])
def end_session():
    global username, current_session_id
    if username is not None:
        # Clear session-related variables
        username = None
        current_session_id = None
        return jsonify({'success': True, 'message': 'Session ended successfully'}), 200
    else:
        return jsonify({'success': False, 'message': 'No active session to end'}), 400


if __name__ == '__main__':
    app.run(debug=True)
