import React, { useState, useEffect, useRef } from 'react';
import Chatbot, {
	getDefaultSettings,
	getDefaultStyles,
} from 'react-chatbotify';
import {
	sendMessageToOpenAI,
	escalateToSupport,
} from '../services/openaiService';
import {
	getConversationHistory,
	saveConversationHistory,
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
				await params.injectMessage(
					"Hello! Welcome to Pratik's Wild Wash's virtual assistant. How can I help you today?",
				);
			},
			path: 'chat',
		},
		chat: {
			message: async (params) => {
				try {
					let messages = [];

					console.log('params', params);

					const storedHistory = getConversationHistory();

					if (
						storedHistory &&
						Array.isArray(storedHistory) &&
						storedHistory.length > 0
					) {
						messages = storedHistory.map((msg) => ({
							content: msg.content,
							isUser: msg.sender === 'USER',
						}));
					}

					if (messages.length === 0) {
						if (params && params.userInput) {
							messages = [
								{
									content: params.userInput,
									isUser: true,
								},
							];
						} else {
							await params.injectMessage(
								"I'm sorry, I'm having trouble processing your request. Could you try again?",
							);
							return;
						}
					}

					const aiMessage = await sendMessageToOpenAI(messages);

					if (aiMessage.escalationDetails) {
						console.log('Escalation data:', aiMessage.escalationDetails);

						//const result = await escalateToSupport(escalationData);

						const escalationMessage = `Thank you, ${aiMessage.escalationDetails.firstName}. Your request has been escalated to our team. We'll contact you at the phone number you provided (${aiMessage.escalationDetails.phoneNumber}) as soon as possible.`;

						const botMessage = {
							content: aiMessage.content | 'Escalated',
							sender: 'bot',
							timestamp: new Date().toISOString(),
						};
						saveConversationHistory([...getConversationHistory(), botMessage]);

						await params.injectMessage(escalationMessage);
					} else {
						const botMessage = {
							content: aiMessage.content,
							sender: 'bot',
							timestamp: new Date().toISOString(),
						};

						saveConversationHistory([...getConversationHistory(), botMessage]);

						await params.injectMessage(botMessage.content);
					}
				} catch (error) {
					console.error('Error calling OpenAI:', error);
					await params.injectMessage(
						"I'm sorry, I'm having trouble connecting to my knowledge base. Please try again later.",
					);
				}
			},
			path: 'chat',
		},
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
			storageKey: 'laundromat_chatbot_history',
		},
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
		<div className='chatbot-container'>
			<Chatbot
				flow={flow}
				styles={chatbotStyles}
				settings={chatbotSettings}
				headerText='CleanSpot Laundromat Assistant'
			/>
		</div>
	);
};

export default ChatbotContainer;
