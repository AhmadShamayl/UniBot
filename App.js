import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import umtlogo from './assets/Umt_logo.png';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import SignUp from './SignUp';

function App() {
  const [textInput, setTextInput] = useState('');
  const [conversation, setConversation] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [message, setMessage] = useState('');
  const [showSignUp, setShowSignUp] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [topic, setTopic] = useState('General');
  const [chatHistory, setChatHistory] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (loggedIn) {
      inputRef.current?.focus();
    }
  }, [loggedIn]);

  useEffect(() => {
    const conversationContainer = document.getElementById('conversation-container');
    if (conversationContainer) {
      conversationContainer.scrollTop = conversationContainer.scrollHeight;
    }
  }, [conversation]);

  useEffect(() => {
    const sidePanelContent = document.getElementById('side-panel-content');
    if (sidePanelContent) {
      sidePanelContent.scrollTop = sidePanelContent.scrollHeight;
    }
  }, [chatHistory]);

  const sendToFlask = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/send_text_to_flask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput, username, topic, documentContent: uploadedFile }),
      });

      const data = await response.json();
      const formattedResponse = formatQuestionsInBold(data.response);

      setConversation(prev => [
        ...prev,
        { type: 'user', text: `user: ${textInput}` },
        { type: 'bot', text: formattedResponse },
      ]);

      setTopic(data.topic);
      setTextInput('');
    } catch (error) {
      console.error('Error sending text to Flask:', error);
    }
  };

  const formatQuestionsInBold = (text) => {
    const formattedText = text
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/### (.+)/g, '<h3>$1</h3>')
      .replace(/## (.+)/g, '<h2>$1</h2>')
      .replace(/# (.+)/g, '<h1>$1</h1>')
      .replace(/\\(.+)\\/g, '<strong>$1</strong>')
      .replace(/^(\d+\.\s.+)$/gm, '<strong>$1</strong>');

    return formattedText;
  };

  const handleFileChange = (e) => {
    setUploadedFile(e.target.files[0]);
  };

  const uploadTextDocument = async () => {
    if (!uploadedFile) {
      console.error('No file selected for upload');
      return;
    }
    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('username', username);

    try {
      const response = await fetch('http://127.0.0.1:5000/upload_text_document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('Server response:', data);

      setUploadMessage('Document uploaded successfully');

      setTimeout(() => {
        setUploadMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error uploading text document:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendToFlask();
    }
  };

  const handleLoginKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        setLoggedIn(true);
        setMessage('');
        fetchChatHistory(username); // Fetch chat history after successful login
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  const fetchChatHistory = async (username) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/chat_history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (data.success) {
        setChatHistory(data.chatHistory); // Set the chat history in state
      } else {
        console.error('Error fetching chat history:', data.message);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const handleRegister = () => {
    setShowSignUp(true);
  };

  const handleLogout = async () => {
    try {
      await fetch('http://127.0.0.1:5000/end_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      setLoggedIn(false);
      setConversation([]);
      setUsername('');
      setPassword('');
      setMessage('');
      setShowSignUp(false);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const handleSignUpSuccess = () => {
    setShowSignUp(true);
    setMessage('The user has registered successfully. Please return to the login tab.');
  };
  

  const startNewChat = async () => {
    try {
        if (conversation.length > 0) {
            const newChatEntry = { topic, messages: conversation };

            const isDuplicate = chatHistory.some(chat => 
                chat.topic === newChatEntry.topic && JSON.stringify(chat.messages) === JSON.stringify(newChatEntry.messages)
            );

            if (!isDuplicate) {
                setChatHistory(prev => [newChatEntry, ...prev]);
            }
        }

        setConversation([]);
        setTopic('General');

        const response = await fetch('http://127.0.0.1:5000/start_new_chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
        });

        const data = await response.json();
        if (!data.success) {
            console.error('Error starting new chat:', data.error);
        }
    } catch (error) {
        console.error('Error starting new chat:', error);
    }
  };

  const openChatFromHistory = (chat) => {
    setConversation(chat.messages);
    setTopic(chat.topic);
  };

  const deleteChatSession = async (topic) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/delete_chat_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, topic }),
      });

      const data = await response.json();
      if (data.success) {
        setChatHistory(prev => prev.filter(chat => chat.topic !== topic));
      } else {
        console.error('Error deleting chat session:', data.message);
      }
    } catch (error) {
      console.error('Error deleting chat session:', error);
    }
  };

  return (
    <div className="container">
      {!loggedIn && !showSignUp && (
        <Login
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          handleLogin={handleLogin}
          handleRegister={handleRegister}
          handleLoginKeyPress={handleLoginKeyPress}
          message={message}
        />
      )}
      {loggedIn && !showSignUp && (
        <MainPanel
          umtlogo={umtlogo}
          chatHistory={chatHistory}
          startNewChat={startNewChat}
          openChatFromHistory={openChatFromHistory}
          deleteChatSession={deleteChatSession}
          conversation={conversation}
          textInput={textInput}
          setTextInput={setTextInput}
          handleKeyPress={handleKeyPress}
          sendToFlask={sendToFlask}
          handleFileChange={handleFileChange}
          uploadTextDocument={uploadTextDocument}
          uploadMessage={uploadMessage}
          handleLogout={handleLogout}
          inputRef={inputRef}
        />
      )}
      {showSignUp && <SignUp onSignUpSuccess={handleSignUpSuccess} onBackToLogin={() => setShowSignUp(false)} />}
    </div>
  );
}

const Login = ({ username, setUsername, password, setPassword, handleLogin, handleRegister, handleLoginKeyPress, message }) => (
  <div className="login-container">
    <img src={umtlogo} alt="UMT Logo" className="umt-logo" />
    <h2>Welcome</h2>
    <input
      type="text"
      placeholder="Username"
      value={username}
      onChange={(e) => setUsername(e.target.value)}
      onKeyPress={handleLoginKeyPress}
    />
    <input
      type="password"
      placeholder="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      onKeyPress={handleLoginKeyPress}
    />
    <div className="login-buttons">
      <button onClick={handleLogin}>Login</button>
      <p className="signup-prompt">Don't have an account? <button onClick={handleRegister}>Sign up</button></p>
    </div>
    <p className="message">{message}</p>
  </div>
);

const MainPanel = ({
  umtlogo,
  chatHistory,
  startNewChat,
  openChatFromHistory,
  deleteChatSession,
  conversation,
  textInput,
  setTextInput,
  handleKeyPress,
  sendToFlask,
  handleFileChange,
  uploadTextDocument,
  uploadMessage,
  handleLogout,
  inputRef
}) => (
  <>
    <div className="conversation-heading">
      <h2>Conversation</h2>
    </div>
    <div className="side-panel">
      <img src={umtlogo} alt='UMT Logo' className="umt-logo" />
      <h2>Chat History</h2>
      <div id="side-panel-content" className="side-panel-content">
        <ul>
          {chatHistory.map((chat, index) => (
            <li key={index} className="chat-item">
              <span onClick={() => openChatFromHistory(chat)}>{chat.topic}</span>
              <FontAwesomeIcon 
                icon={faTrash} 
                style={{ color: '#c0c0c0', marginLeft: '8px', cursor: 'pointer' }} 
                onClick={() => deleteChatSession(chat.topic)} 
              />
            </li>
          ))}
        </ul>
      </div>
      <button className="new-chat-button" onClick={startNewChat}>New Chat</button>
    </div>
    <div className="main-panel" id="conversation-container">
      <div className="conversation">
        {conversation.map((entry, index) => (
          <div key={index} className={`conversation-entry ${entry.type}`}>
            {entry.text.split('\n').map((line, idx) => (
              <p key={idx} dangerouslySetInnerHTML={{ __html: line }}></p>
            ))}
          </div>
        ))}
      </div>
      <div className="input-container">
        <input
          ref={inputRef}
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message here..."
        />
        <button onClick={sendToFlask}>Send</button>
        <button className="choose-file-button">
          <label htmlFor="fileInput" style={{ margin: 0, cursor: 'pointer' }}>Choose .txt File</label>
        </button>
        <input
          id="fileInput"
          type="file"
          accept=".txt"
          onChange={handleFileChange}
        />
        <button onClick={uploadTextDocument}>Upload Document</button>
        {uploadMessage && <p className="upload-message">{uploadMessage}</p>}
      </div>
      <button onClick={handleLogout} className="logout-button">Logout</button>
    </div>
  </>
);

export default App;
