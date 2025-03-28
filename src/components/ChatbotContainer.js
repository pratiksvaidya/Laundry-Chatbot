import React, { useState, useEffect, useRef } from 'react';
import Chatbot, { getDefaultSettings, getDefaultStyles } from 'react-chatbotify';
import { sendMessageToOpenAI, escalateToSupport } from '../services/openaiService';
import { 
  getConversationHistory, 
  saveConversationHistory
} from '../utils/localStorage';

const ChatbotContainer = () => {
  // Reference to track if the component is mounted
  const isMounted = useRef(true);
  
  // Effect to clean up when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Define the flow for the chatbot
  const flow = {
    start: {
      message: async (params) => {
        // Inject the welcome message but don't save it to conversation history
        await params.injectMessage("Hello! Welcome to Pratik's Wild Wash's virtual assistant. How can I help you today?");
      },
      path: "chat"
    },
    chat: {
      message: async (params) => {
        try {
          // Create messages array from chat history
          let messages = [];
          let useLocalHistory = false;
          
          // Check if chatHistory exists in params
          if (params && params.chatHistory && Array.isArray(params.chatHistory) && params.chatHistory.length > 0) {
            // Get the entire conversation history from params
            messages = params.chatHistory.map(msg => ({
              content: msg.content, 
              isUser: msg.sender === 'user'
            }));
          } else {
            // If no chat history in params, use the history from localStorage
            const storedHistory = getConversationHistory();
            useLocalHistory = true;
            
            if (storedHistory && Array.isArray(storedHistory) && storedHistory.length > 0) {
              messages = storedHistory.map(msg => ({
                content: msg.content,
                isUser: msg.sender === 'user'
              }));
            }
            
            // If there's user input in the current params, make sure to include it
            if (params && params.userInput) {
              // Add current user input to messages if not already included
              const currentUserMessage = {
                content: params.userInput,
                isUser: true
              };
              
              // If using stored history, append the new message
              if (messages.length > 0) {
                messages.push(currentUserMessage);
              } else {
                // If no stored history, just use the current message
                messages = [currentUserMessage];
              }
            }
          }
          
          // If we still have no messages, check if we at least have current input
          if (messages.length === 0) {
            if (params && params.userInput) {
              messages = [{
                content: params.userInput,
                isUser: true
              }];
            } else {
              await params.injectMessage("I'm sorry, I'm having trouble processing your request. Could you try again?");
              return;
            }
          }
          
          // Always save to localStorage to ensure persistence
          if (params && params.userInput && !useLocalHistory) {
            // Save the latest user message to local storage 
            const userMessage = {
              content: params.userInput,
              sender: 'user',
              timestamp: new Date().toISOString()
            };
            saveConversationHistory([...getConversationHistory(), userMessage]);
          }
          
          // Send to OpenAI with full conversation history
          const response = await sendMessageToOpenAI(messages);
          
          // Process the response
          const aiMessage = response.choices[0].message;
          
          // Check if we have a tool call for escalation
          if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
            const toolCall = aiMessage.tool_calls[0];
            
            // Process the specific tool call
            if (toolCall.function.name === 'escalateToSupport') {
              
              try {
                // Parse the tool call arguments
                const escalationData = JSON.parse(toolCall.function.arguments);
                console.log('Escalation data:', JSON.stringify(escalationData, null, 2));
                
                // Call the escalation API with the data provided by OpenAI
                const result = await escalateToSupport(escalationData);
                
                if (result.success) {
                  // Create escalation message with full name
                  const escalationMessage = `Thank you, ${escalationData.firstName}. Your request has been escalated to our team. We'll contact you at the phone number you provided (${escalationData.phoneNumber}) as soon as possible.`;
                  
                  // Save bot response to conversation history
                  const botMessage = {
                    content: escalationMessage,
                    sender: 'bot',
                    timestamp: new Date().toISOString()
                  };
                  saveConversationHistory([...getConversationHistory(), botMessage]);
                  
                  // Inject the escalation message
                  await params.injectMessage(escalationMessage);
                } else {
                  // Handle failed escalation
                  let errorMessage = "I'm sorry, there was an issue escalating your request. ";
                  
                  // If the error is about missing fields, let the AI continue collecting them
                  if (result.message && result.message.includes('Missing required fields')) {
                    // Just pass the AI's original message which should be asking for the missing information
                    await params.injectMessage(aiMessage.content);
                  } else {
                    // For other errors, provide contact information
                    errorMessage += `Please try again or contact us directly.`;
                    
                    // Save the error message to conversation history
                    const botMessage = {
                      content: errorMessage,
                      sender: 'bot',
                      timestamp: new Date().toISOString()
                    };
                    saveConversationHistory([...getConversationHistory(), botMessage]);
                    
                    // Inject the error message
                    await params.injectMessage(errorMessage);
                  }
                }
                return;
              } catch (parseError) {
                console.error('Error parsing tool call arguments:', parseError);
                // Handle parsing error
                const errorMessage = "I'm sorry, I encountered an error processing your request. Please try again or contact us directly.";
                
                // Save the error message to conversation history
                const botMessage = {
                  content: errorMessage,
                  sender: 'bot',
                  timestamp: new Date().toISOString()
                };
                saveConversationHistory([...getConversationHistory(), botMessage]);
                
                // Inject the error message
                await params.injectMessage(errorMessage);
                return;
              }
            }
          }
          
          // For regular responses (no tool calls or unhandled tool calls)
          // Save the regular AI response to localStorage
          const botMessage = {
            content: aiMessage.content || "I understand your request and will help you with that.",
            sender: 'bot',
            timestamp: new Date().toISOString()
          };
          saveConversationHistory([...getConversationHistory(), botMessage]);
          
          // Inject the normal response
          await params.injectMessage(botMessage.content);
        } catch (error) {
          console.error('Error calling OpenAI:', error);
          await params.injectMessage("I'm sorry, I'm having trouble connecting to my knowledge base. Please try again later.");
        }
      },
      path: "chat"
    }
  };

  // Custom settings for the chatbot
  const chatbotSettings = {
    ...getDefaultSettings(),
    general: {
      language: 'en',
    },
    device: {
      desktopEnabled: true,
      mobileEnabled: true,
    },
    fileAttachment: {
      enabled: false,
      sendFileName: true,
      showMediaDisplay: true,
    },
    voice: {
      enabled: false,
    },
    chatHistory: {
      storageKey: "laundromat_chatbot_history"
    }
  };

  // Custom styling for the chatbot
  const chatbotStyles = {
    ...getDefaultStyles(),
    chatContainer: {
      height: '600px',
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      borderRadius: '8px',
    },
    header: {
      backgroundColor: '#2c3e50',
      color: 'white',
    },
    botMessageBubble: {
      backgroundColor: '#e1f5fe',
      color: '#333',
    },
    userMessageBubble: {
      backgroundColor: '#2c3e50',
      color: 'white',
    },
    inputContainer: {
      borderTop: '1px solid #e0e0e0',
    },
  };

  return (
    <div className="chatbot-container">
      <Chatbot
        flow={flow}
        styles={chatbotStyles}
        settings={chatbotSettings}
        headerText="CleanSpot Laundromat Assistant"
      />
    </div>
  );
};

export default ChatbotContainer; 