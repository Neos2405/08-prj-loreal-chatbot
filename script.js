/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const newChatFormBtn = document.getElementById("newChatFormBtn");
const newChatFormBtnMobile = document.getElementById("newChatFormBtnMobile");

// Conversation context storage - keeps track of the entire conversation
let conversationHistory = [];

// User profile data - tracks user details for personalized responses
let userProfile = {
  name: null,
  skinType: null,
  beautyPreferences: [],
  pastQuestions: [],
  hasIntroduced: false // Track if user has introduced themselves
};

// Initialize chat with welcome message
function initializeChat() {
  const welcomeMessage = document.createElement("div");
  welcomeMessage.className = "message assistant";
  
  // Check if user has already introduced themselves
  if (userProfile.name && userProfile.hasIntroduced) {
    welcomeMessage.textContent = `Welcome back, ${userProfile.name}! 💄 I'm your L'Oréal Assistant. How can I help you with your beauty routine today?`;
  } else {
    welcomeMessage.textContent = "Hello beauty! 💄 Welcome to L'Oréal. I'm your personal Beauty Assistant! Before we start, I'd love to know your name so I can give you personalized recommendations. What should I call you?";
  }
  
  chatWindow.appendChild(welcomeMessage);
  
  // Add system message to conversation history
  conversationHistory.push({
    role: "assistant",
    content: welcomeMessage.textContent
  });
}

// Extract user information from messages to build profile
function updateUserProfile(userMessage, aiResponse) {
  const lowerMessage = userMessage.toLowerCase();
  
  // Extract name if user mentions it
  const namePatterns = [
    /my name is (\w+)/i,
    /i'm (\w+)/i,
    /i am (\w+)/i,
    /call me (\w+)/i,
    /^(\w+)$/i  // Single word response (likely a name)
  ];
  
  // If user hasn't provided name yet, treat their response as their name
  if (!userProfile.name && !userProfile.hasIntroduced) {
    // Clean the message to extract just the name
    let potentialName = userMessage.trim();
    
    // Check if it's a greeting with name (like "Hi, I'm Sarah")
    for (const pattern of namePatterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        potentialName = match[1];
        break;
      }
    }
    
    // If it's a simple word/name (not a full sentence about beauty)
    if (potentialName.split(' ').length <= 2 && !lowerMessage.includes('beauty') && !lowerMessage.includes('help')) {
      userProfile.name = potentialName.split(' ')[0]; // Take first word as name
      userProfile.hasIntroduced = true;
      return; // Don't process other profile data yet
    }
  }
  
  // If name already set, look for other patterns
  if (!userProfile.name) {
    for (const pattern of namePatterns.slice(0, 4)) { // Exclude single word pattern
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        userProfile.name = match[1];
        userProfile.hasIntroduced = true;
        break;
      }
    }
  }
  
  // Extract skin type information (only after name is provided)
  if (userProfile.hasIntroduced) {
    const skinTypes = ['oily', 'dry', 'combination', 'sensitive', 'normal', 'acne-prone'];
    for (const skinType of skinTypes) {
      if (lowerMessage.includes(skinType) && !userProfile.skinType) {
        userProfile.skinType = skinType;
        break;
      }
    }
    
    // Track beauty preferences and interests
    const beautyKeywords = ['foundation', 'mascara', 'lipstick', 'skincare', 'moisturizer', 'serum', 'cleanser', 'sunscreen', 'concealer', 'blush', 'eyeshadow'];
    for (const keyword of beautyKeywords) {
      if (lowerMessage.includes(keyword) && !userProfile.beautyPreferences.includes(keyword)) {
        userProfile.beautyPreferences.push(keyword);
      }
    }
    
    // Store past questions for context
    userProfile.pastQuestions.push({
      question: userMessage,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 5 questions to avoid too much data
    if (userProfile.pastQuestions.length > 5) {
      userProfile.pastQuestions = userProfile.pastQuestions.slice(-5);
    }
  }
}

// Generate personalized system prompt based on user profile
function generateSystemPrompt() {
  let systemPrompt = `You are a friendly L'Oréal Beauty Assistant. Use a warm, encouraging tone.`;
  
  // Check if user has introduced themselves
  if (!userProfile.hasIntroduced || !userProfile.name) {
    systemPrompt += ` The user hasn't introduced themselves yet. If they just provided their name, welcome them warmly by name and then ask how you can help them with their beauty routine today. Do not provide product recommendations until they've told you their name and you've welcomed them.`;
    return systemPrompt;
  }
  
  // Add user name if known
  if (userProfile.name) {
    systemPrompt += ` The user's name is ${userProfile.name}, so address them personally when appropriate.`;
  }
  
  // Add skin type context if known
  if (userProfile.skinType) {
    systemPrompt += ` The user has ${userProfile.skinType} skin, so tailor your product recommendations accordingly.`;
  }
  
  // Add beauty preferences if known
  if (userProfile.beautyPreferences.length > 0) {
    systemPrompt += ` The user has shown interest in: ${userProfile.beautyPreferences.join(', ')}. Keep this in mind for recommendations.`;
  }
  
  // Add conversation context
  if (userProfile.pastQuestions.length > 0) {
    const recentTopics = userProfile.pastQuestions.slice(-3).map(q => q.question).join('; ');
    systemPrompt += ` Previous conversation topics include: ${recentTopics}. Reference past discussions when relevant.`;
  }
  
  systemPrompt += `

IMPORTANT: Only respond to beauty-related questions about L'Oréal products, skincare routines, makeup tips, beauty advice, and cosmetic recommendations. If asked about unrelated topics (politics, weather, general knowledge, other brands, etc.), politely redirect the conversation back to beauty and L'Oréal products.

For non-beauty questions, respond with: "I'm here to help you with beauty advice and L'Oréal products! Is there anything about skincare, makeup, or beauty routines I can assist you with today?"

Follow this response structure for beauty questions:
1. First, assess if you have enough information about their request
2. If yes: Provide a brief explanation or solution (2-3 sentences max)
3. List 2-3 specific L'Oréal products that help using this format:
   **Recommended Products:**
   • Product Name - Brief description
   • Product Name - Brief description
4. End with a practical beauty tip using this format:
   **Beauty Tip:** Your helpful tip here

Make sure to not overly question the user. You can first recommend products after gathering enough information then ask for clarification only if absolutely necessary.
If you need more information, ask 1-2 specific questions to better understand their needs. Keep responses conversational, helpful, and focused on L'Oréal products only.
Make sure the formatting of the response is clear and easy to read, using bullet points (•) and **bold headings** where appropriate.

Use only L'Oréal brands: L'Oréal Paris, Lancôme, Urban Decay, YSL Beauty, Giorgio Armani Beauty, Kiehl's, Garnier, Maybelline, etc.`;

  return systemPrompt;
}

// Create a message element
function createMessageElement(content, isUser = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = isUser ? "message user" : "message assistant";
  
  // For user messages, use plain text (security)
  if (isUser) {
    messageDiv.textContent = content;
  } else {
    // For AI responses, allow HTML formatting for bullet points and headings
    messageDiv.innerHTML = formatAIResponse(content);
  }
  
  return messageDiv;
}

// Format AI response to convert markdown-style text to HTML
function formatAIResponse(text) {
  let formattedText = text;
  
  // Convert bullet points (• or -) to HTML list items
  formattedText = formattedText.replace(/^[•-]\s(.+)$/gm, '<li>$1</li>');
  
  // Wrap consecutive list items in <ul> tags
  formattedText = formattedText.replace(/(<li>.*?<\/li>\s*)+/gs, '<ul>$&</ul>');
  
  // Convert **bold** text to HTML
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert line breaks to HTML breaks
  formattedText = formattedText.replace(/\n/g, '<br>');
  
  return formattedText;
}

// Create loading indicator
function createLoadingElement() {
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "message loading";
  loadingDiv.innerHTML = `
    <div class="typing-indicator">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <span>Beauty Assistant is thinking...</span>
  `;
  return loadingDiv;
}

// Scroll chat window to bottom
function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Save conversation to localStorage for persistence across sessions
function saveConversationToStorage() {
  try {
    localStorage.setItem('lorealChatHistory', JSON.stringify(conversationHistory));
    localStorage.setItem('lorealUserProfile', JSON.stringify(userProfile));
  } catch (error) {
    console.log('Could not save conversation to localStorage:', error);
  }
}

// Load conversation from localStorage on page load
function loadConversationFromStorage() {
  try {
    const savedHistory = localStorage.getItem('lorealChatHistory');
    const savedProfile = localStorage.getItem('lorealUserProfile');
    
    if (savedHistory) {
      conversationHistory = JSON.parse(savedHistory);
    }
    
    if (savedProfile) {
      userProfile = JSON.parse(savedProfile);
    }
    
    // If we have conversation history, restore the chat interface
    if (conversationHistory.length > 1) { // More than just the initial welcome
      chatWindow.innerHTML = ''; // Clear the chat window
      
      // Recreate messages from history
      conversationHistory.forEach(message => {
        if (message.role === 'assistant' || message.role === 'user') {
          const messageElement = createMessageElement(message.content, message.role === 'user');
          chatWindow.appendChild(messageElement);
        }
      });
      
      scrollToBottom();
    }
  } catch (error) {
    console.log('Could not load conversation from localStorage:', error);
  }
}

// Clear conversation history (useful for new user or reset)
function clearConversationHistory() {
  conversationHistory = [];
  userProfile = {
    name: null,
    skinType: null,
    beautyPreferences: [],
    pastQuestions: [],
    hasIntroduced: false
  };
  
  try {
    localStorage.removeItem('lorealChatHistory');
    localStorage.removeItem('lorealUserProfile');
  } catch (error) {
    console.log('Could not clear localStorage:', error);
  }
  
  // Restart the chat
  chatWindow.innerHTML = '';
  initializeChat();
}

// Show/hide new chat button based on conversation history
function updateNewChatButton() {
  const shouldShow = conversationHistory.length > 1; // More than just welcome message
  
  // Update both desktop and mobile buttons visibility
  if (shouldShow) {
    newChatFormBtn.style.display = "";
    if (newChatFormBtnMobile) {
      newChatFormBtnMobile.style.display = "";
    }
  } else {
    newChatFormBtn.style.display = "none";
    if (newChatFormBtnMobile) {
      newChatFormBtnMobile.style.display = "none";
    }
  }
}

// Show user profile information for debugging (hidden from user)
function logUserProfile() {
  console.log('Current User Profile:', userProfile);
  console.log('Conversation History Length:', conversationHistory.length);
}

// Send message to OpenAI API with conversation context
async function sendMessageToOpenAI(userMessage) {
  try {
    // Add user message to conversation history
    conversationHistory.push({
      role: "user",
      content: userMessage
    });
    
    // Update user profile with information from this message
    updateUserProfile(userMessage, "");
    
    // Build messages array with system prompt and conversation history
    const messages = [
      {
        role: "system",
        content: generateSystemPrompt()
      },
      // Include conversation history for context (last 10 messages to avoid token limits)
      ...conversationHistory.slice(-10)
    ];

    // Create the request body for OpenAI API
    const requestBody = {
      model: "gpt-4o-mini", // Using gpt-4o-mini for faster and more cost-effective responses
      messages: messages,
      max_tokens: 400,
      temperature: 0.6
    };

    // Make the API request to Cloudflare Worker (secure proxy)
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
        // No Authorization header needed! The Worker handles this securely
      },
      body: JSON.stringify(requestBody)
    });

    // Check if the response is ok
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    // Parse the JSON response
    const data = await response.json();
    
    // Extract the assistant's message
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const aiResponse = data.choices[0].message.content;
      
      // Add AI response to conversation history
      conversationHistory.push({
        role: "assistant",
        content: aiResponse
      });
      
      // Update user profile with any additional context from AI response
      updateUserProfile(userMessage, aiResponse);
      
      return aiResponse;
    } else {
      throw new Error("Invalid response format from OpenAI API");
    }

  } catch (error) {
    console.error("Error calling Cloudflare Worker:", error);
    return "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.";
  }
}

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get user input and trim whitespace
  const message = userInput.value.trim();
  
  // Don't send empty messages
  if (!message) return;

  // Add user message to chat
  const userMessageElement = createMessageElement(message, true);
  chatWindow.appendChild(userMessageElement);
  
  // Clear input field
  userInput.value = "";
  
  // Scroll to bottom
  scrollToBottom();

  // Show loading indicator
  const loadingElement = createLoadingElement();
  chatWindow.appendChild(loadingElement);
  scrollToBottom();

  try {
    // Send message to OpenAI and get response
    const aiResponse = await sendMessageToOpenAI(message);
    
    // Remove loading element
    chatWindow.removeChild(loadingElement);
    
    // Add AI response to chat
    const aiMessageElement = createMessageElement(aiResponse, false);
    chatWindow.appendChild(aiMessageElement);
    
    // Save conversation state after successful interaction
    saveConversationToStorage();
    
    // Update new chat button visibility
    updateNewChatButton();
    
    // Log user profile for debugging (only in console)
    logUserProfile();
    
  } catch (error) {
    // Remove loading element
    chatWindow.removeChild(loadingElement);
    
    // Show error message
    const errorElement = createMessageElement("I'm sorry, something went wrong. Please try again.", false);
    chatWindow.appendChild(errorElement);
    
    console.error("Chat error:", error);
  }
  
  // Scroll to bottom after adding response
  scrollToBottom();
});

// Allow Enter key to send message (in addition to clicking send button)
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event("submit"));
  }
});

// Handle new chat form button click
newChatFormBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to start a new conversation? This will clear your chat history.")) {
    clearConversationHistory();
    updateNewChatButton();
  }
});

// Handle mobile new chat button click
if (newChatFormBtnMobile) {
  newChatFormBtnMobile.addEventListener("click", () => {
    if (confirm("Are you sure you want to start a new conversation? This will clear your chat history.")) {
      clearConversationHistory();
      updateNewChatButton();
    }
  });
}

// Initialize the chat when page loads
document.addEventListener("DOMContentLoaded", () => {
  // Load previous conversation if available
  loadConversationFromStorage();
  
  // If no previous conversation, start fresh
  if (conversationHistory.length === 0) {
    initializeChat();
  }
  
  // Update new chat button visibility on load
  updateNewChatButton();
});
