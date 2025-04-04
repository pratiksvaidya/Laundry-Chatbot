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
	const isMounted = useRef(true);

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	const flow = {
		start: {
			message: async (params) => {
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

					const botMessage = {
						content: aiMessage.content,
						sender: 'bot',
						timestamp: new Date().toISOString(),
					};

					saveConversationHistory([...getConversationHistory(), botMessage]);

					await params.injectMessage(botMessage.content);
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
