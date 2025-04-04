/**
 * Function to send a message to the OpenAI API and get a response
 * @param {Array} messages - The conversation history
 * @param {Object} escalationData - Data collected for escalation (optional)
 * @returns {Promise<Object>} The API response
 */
export const sendMessageToOpenAI = async (messages, escalationData = null) => {
	// Ensure messages is an array
	if (!Array.isArray(messages)) {
		console.error('Messages is not an array:', messages);
		messages = []; // Default to empty array
	}

	// Format the conversation history for the OpenAI API
	// Ensure each message has the required properties and non-empty content
	const formattedMessages = [
		...messages
			.map((msg) => {
				// Handle potential undefined or malformed messages
				if (!msg) return null;

				// Ensure the content exists and is non-empty
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
			.filter((msg) => msg !== null), // Remove any null messages
	];

	const response = await fetch(
		'http://localhost:5001/api/v1/duda/en/155/chatbot',
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				messages: formattedMessages,
			}),
		},
	);

	const { message } = await response.json();

	return message;
};

/**
 * Function to perform the escalation API call to the backend
 * @param {Object} escalationData - Data collected for escalation
 * @returns {Promise<Object>} The API response
 */
export const escalateToSupport = async (escalationData) => {
	console.log('===== ESCALATION INITIATED =====');

	try {
		// Validate that we have all required fields
		if (
			!escalationData.firstName ||
			!escalationData.lastName ||
			!escalationData.phoneNumber ||
			!escalationData.conversationSummary
		) {
			const missingFields = [];
			if (!escalationData.firstName) missingFields.push('firstName');
			if (!escalationData.lastName) missingFields.push('lastName');
			if (!escalationData.phoneNumber) missingFields.push('phoneNumber');
			if (!escalationData.conversationSummary)
				missingFields.push('conversationSummary');

			const errorMsg = `Missing required fields for escalation: ${missingFields.join(
				', ',
			)}`;
			console.error(errorMsg);
			return {
				success: false,
				message: errorMsg,
			};
		}

		// Simulate API call delay
		await new Promise((resolve) => setTimeout(resolve, 1000));

		console.log('Escalation successful with data:', {
			firstName: escalationData.firstName,
			lastName: escalationData.lastName,
			phoneNumber: escalationData.phoneNumber,
			conversationSummary: escalationData.conversationSummary,
		});

		// Return a mock successful response
		return {
			success: true,
			message: 'Escalation successfully processed',
		};
	} catch (error) {
		console.error('Error escalating to support:', error);
		return {
			success: false,
			message:
				error.message ||
				'There was an error processing your request. Please try again later.',
		};
	}
};
