// localStorage utility for managing conversation history

const STORAGE_KEY = 'laundromat_chatbot_history';

/**
 * Get the conversation history from localStorage
 * @returns {Array} The conversation history
 */
export const getConversationHistory = () => {
	try {
		const storedHistory = localStorage.getItem(STORAGE_KEY);

		if (!storedHistory) {
			return [];
		}

		try {
			const parsedHistory = JSON.parse(storedHistory);

			if (!Array.isArray(parsedHistory)) {
				return [];
			}

			// Remove any invalid entries from the history
			const cleanedHistory = parsedHistory.filter(
				(msg) =>
					msg &&
					typeof msg === 'object' &&
					typeof msg.content === 'string' &&
					typeof msg.sender === 'string' &&
					msg.content.trim() !== '',
			);

			return cleanedHistory;
		} catch (parseError) {
			console.error('Error parsing conversation history JSON:', parseError);
			// Clear the corrupted storage
			localStorage.removeItem(STORAGE_KEY);
			return [];
		}
	} catch (error) {
		console.error('Error retrieving conversation history:', error);
		return [];
	}
};

/**
 * Save the conversation history to localStorage
 * @param {Array} history - The conversation history to save
 */
export const saveConversationHistory = (history) => {
	try {
		// Validate history is an array
		if (!Array.isArray(history)) {
			console.error(
				'Cannot save conversation history: history is not an array',
				history,
			);
			return;
		}

		// Clean the history to ensure it only contains valid messages
		const validHistory = history.filter(
			(msg) =>
				msg &&
				typeof msg === 'object' &&
				typeof msg.content === 'string' &&
				typeof msg.sender === 'string' &&
				msg.content.trim() !== '',
		);

		// Stringify and save
		const historyString = JSON.stringify(validHistory);
		localStorage.setItem(STORAGE_KEY, historyString);
	} catch (error) {
		console.error('Error saving conversation history:', error);
	}
};

/**
 * Add a new message to the conversation history
 * @param {Object} message - The message to add to the history
 * @returns {Array} The updated conversation history
 */
export const addMessageToHistory = (message) => {
	const history = getConversationHistory();
	const updatedHistory = [...history, message];
	saveConversationHistory(updatedHistory);
	return updatedHistory;
};

/**
 * Clear the conversation history
 */
export const clearConversationHistory = () => {
	localStorage.removeItem(STORAGE_KEY);
};
