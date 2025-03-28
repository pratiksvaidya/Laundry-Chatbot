import React from 'react';
import ChatbotContainer from './components/ChatbotContainer';

function App() {
  return (
    <div className="container">
      <header className="header">
        <h1>Laundromat Chatbot</h1>
        <p>Welcome to our laundromat assistant. Ask any questions about our services!</p>
      </header>
      <ChatbotContainer />
    </div>
  );
}

export default App; 