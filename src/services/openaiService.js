import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

// Escalation tool definition to be used with OpenAI Responses API
const escalationTool = {
  type: "function",
  name: "escalateToSupport",
  function: {
    name: "escalateToSupport",
    description: 'Escalate a conversation to human customer support when the user has a complex issue, wants an update on their order, wants to place a new order, asks to escalate, or question that cannot be answered with the available FAQ information.',
    parameters: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          description: 'Customer\'s first name',
        },
        lastName: {
          type: 'string',
          description: 'Customer\'s last name',
        },
        phoneNumber: {
          type: 'string',
          description: 'Customer\'s phone number for contact purposes',
        },
        conversationSummary: {
          type: 'string',
          description: 'Generate a comprehensive summary of the conversation that explains why this issue needs human support, including the specific questions or problems the customer is experiencing.',
        },
      },
      required: ['firstName', 'lastName', 'phoneNumber', 'conversationSummary'],
    }
  }
};

/**
 * Function to send a message to the OpenAI API and get a response
 * @param {Array} messages - The conversation history
 * @param {Object} escalationData - Data collected for escalation (optional)
 * @returns {Promise<Object>} The API response
 */
export const sendMessageToOpenAI = async (messages, escalationData = null) => {
  try {
    // Ensure messages is an array
    if (!Array.isArray(messages)) {
      console.error('Messages is not an array:', messages);
      messages = []; // Default to empty array
    }
    
    // Prepare the system message with FAQs context
    const systemMessage = {
      role: 'system',
      content: `You are an AI SMS assistant for a laundromat. Your task is to provide helpful, polite, and efficient service to customers calling with various inquiries.

                Here’s how you should respond based on the type of request:

                General Information (Hours & Locations):
                When customers ask about operating hours or locations, politely provide the current hours of operation and the addresses of the laundromat locations:
                We are open Monday through Friday from 9am to 9pm and Saturday & Sunday from 8am to 9pm. The last wash every day is at 7:30pm. Dryers must be started by 8:15pm. We are located at 7807 Evergreen Way in Everett, WA.

                Services & Pricing:
                For inquiries about services or prices, clearly describe available options and provide up-to-date pricing:
                We have 4 sizes of washers starting at $5 per cycle. Our drop off wash and fold services start at $2 per pound and we clean items like comforters at a per item price. Our premium wash-dry-fold service is $2.70 per pound and we also offer our Basic service where your laundry is washed and dried and put in a bag without being folded for $2 per pound. The minimum order value for our drop off service is $20. Pickup and delivery services in Snohomish County are available with a minimum order value based on how far you are from our Everett location.

                Existing Orders (Pickup or Delivery):
                If customers inquire about an existing pickup or delivery order, call the escalateToSupport function.

                Placing a New Pickup or Delivery Order:
                When a customer wants to place a new order, call the escalateToSupport function.

                Reporting a Broken Machine:
                When a customer messages to report a broken machine, call the escalateToSupport function. You cannot remotely start machines.

                Request to Speak with an Attendant:
                If a customer asks to chat with an attendant, politely ask for the reason for the escalation. If you can answer the question, try to provide a helpful answer. Then, ask the user if they would still like to escalate the request to an attendant. If they do or you cannot give a helpful answer, call the escalateToSupport function.

                Here is a list of FAQs formatted with the question starting with “Q:” and the answer starting with “A:”:
                Q: Do you accept coins?
                A: Bring your coins to the counter and our attendant will exchange them for dollar bills which you can use to load a laundry card.
                Q: What is the price of a laundry card?
                A: A laundry card is $1.
                Q: How can I check my card balance?
                A: You can check your card balance online at www.laundrycat.com.
                Q: How can I load money onto my laundry card?
                A: You can load money onto your card at www.laundrycat.com.
                Q: Do you wash horse blankets?
                A: No, we do not wash horse blankets.
                Q: Do you wash blankets?
                A: Yes, we wash regular blankets. We do not wash horse blankets.
                Q: What is the pricing for blankets?
                A: Full and queen size down comforters are $30 each and king size down comforters are $35 each. If the comforter is not filled with down, Full and queen size are $23 each and king size are $27.

                Always maintain a friendly and professional tone, answer questions as accurately as possible, and offer to escalate to a human attendant using the escalateToSupport function if you don’t know the answer.

                When using the escalateToSupport function:
                1. You MUST collect all required information from the user (first name, last name, phone number). Continue to ask for these details until you have received all of them and then call the escalateToSupport function.
                2. Always generate a detailed conversationSummary parameter that explains why this needs human attention.
                3. Call the function after you have collected ALL required parameters (firstName, lastName, phoneNumber).
                4. If the user seems hesitant to provide information, explain that their contact details are necessary for our team to follow up on their request.`
    };
    
    // Format the conversation history for the OpenAI API
    // Ensure each message has the required properties and non-empty content
    const formattedMessages = [
      systemMessage,
      ...messages.map(msg => {
        // Handle potential undefined or malformed messages
        if (!msg) return null;
        
        // Ensure the content exists and is non-empty
        if (!msg.content || typeof msg.content !== 'string' || msg.content.trim() === '') {
          return null;
        }
        
        return {
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.content
        };
      }).filter(msg => msg !== null) // Remove any null messages
    ];
    
    // Use the Responses API with the correct parameters
    console.log('Sending request to OpenAI Responses API with tools:', JSON.stringify([escalationTool]));
    console.log('Formatted messages:', formattedMessages);
    const response = await openai.responses.create({
      model: 'gpt-4-turbo',
      input: formattedMessages, // Pass the messages array directly
      temperature: 0.7,
      tools: [escalationTool]
    });
    
    console.log('Raw response from OpenAI:', JSON.stringify(response));
    
    // Transform the response to match the expected format in the component
    let content = '';
    let tool_calls = null;
    
    // Simplified parsing logic for the OpenAI Responses API
    if (response.output_text) {
      // If output_text is directly available at the top level, use it
      content = response.output_text;
    } else if (response.output && Array.isArray(response.output)) {
      // Process the output array (main response structure for Responses API)
      
      // First, look for text content
      const textItem = response.output.find(item => 
        item.type === 'text' || 
        (item.type === 'message' && item.content && Array.isArray(item.content))
      );
      
      if (textItem) {
        if (textItem.type === 'text') {
          content = textItem.text || '';
        } else if (textItem.type === 'message' && textItem.content) {
          const textContent = textItem.content.find(c => c.type === 'output_text');
          if (textContent && textContent.text) {
            content = textContent.text;
          }
        }
      }
      
      // Then, look for function calls
      const functionCallItem = response.output.find(item => item.type === 'function_call');
      if (functionCallItem) {
        tool_calls = [{
          id: functionCallItem.call_id || functionCallItem.id || `call_${Date.now()}`,
          type: 'function',
          function: {
            name: functionCallItem.name,
            arguments: functionCallItem.arguments
          }
        }];
        console.log('Found function call:', functionCallItem);
      }
    }
    
    console.log('Processed response:', { content, tool_calls });
    
    // Return in the format expected by the component
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: content,
            tool_calls: tool_calls
          }
        }
      ]
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
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
    if (!escalationData.firstName || !escalationData.lastName || !escalationData.phoneNumber || !escalationData.conversationSummary) {
      const missingFields = [];
      if (!escalationData.firstName) missingFields.push('firstName');
      if (!escalationData.lastName) missingFields.push('lastName');
      if (!escalationData.phoneNumber) missingFields.push('phoneNumber');
      if (!escalationData.conversationSummary) missingFields.push('conversationSummary');
      
      const errorMsg = `Missing required fields for escalation: ${missingFields.join(', ')}`;
      console.error(errorMsg);
      return {
        success: false,
        message: errorMsg,
      };
    }
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Escalation successful with data:', {
      firstName: escalationData.firstName,
      lastName: escalationData.lastName,
      phoneNumber: escalationData.phoneNumber,
      conversationSummary: escalationData.conversationSummary
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
      message: error.message || 'There was an error processing your request. Please try again later.',
    };
  }
}; 