const BE_ENDPOINT_URL = 'http://localhost:5001/api/v1/duda/en/155/chatbot';

export const sendMessageToOpenAI = async (messages) => {
	if (!Array.isArray(messages)) {
		console.error('Messages is not an array:', messages);
		messages = [];
	}

	const formattedMessages = [
		...messages
			.map((msg) => {
				if (!msg) return null;

				if (
					!msg.content ||
					typeof msg.content !== 'string' ||
					msg.content.trim() === ''
				) {
					return null;
				}

				return {
					role: msg.isUser ? 'user' : 'assistant',
					content: msg.content,
				};
			})
			.filter((msg) => msg !== null),
	];

	const response = await fetch(BE_ENDPOINT_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			messages: formattedMessages,
		}),
	});

	return response.json();
};
