import React, { useState, useEffect } from 'react';
import './ExampleGenerationBlock.css';

const ExampleGenerationBlock = ({ 
  questionId, 
  aiResponse, 
  onRequestAI, 
  customInstructions 
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [lastRequestId, setLastRequestId] = useState(null);
  
  // Predefined example prompt suggestions
  const examplePrompts = [
    "Can you provide a similar example?",
    "Show me a simpler version of this problem",
    "Give me an example with different values",
    "Show an alternative approach to this type of problem"
  ];
  
  // This effect watches for changes in aiResponse and updates the history
  useEffect(() => {
    if (lastRequestId && aiResponse && aiResponse !== 'Loading...') {
      setHistory(prev => 
        prev.map(item => 
          item.id === lastRequestId 
            ? { ...item, response: aiResponse }
            : item
        )
      );
      
      // Reset lastRequestId after updating
      setLastRequestId(null);
    }
  }, [aiResponse, lastRequestId]);
  
  const handleRequestAI = async (customPrompt = null) => {
    // Use provided custom prompt or the input value
    const userPrompt = customPrompt || promptInput;
    
    if (!userPrompt.trim()) {
      alert('Please enter a prompt for the AI.');
      return;
    }
    
    setLoading(true);
    
    // Create a unique ID for this request
    const requestId = Date.now();
    setLastRequestId(requestId);
    
    // Add prompt to history with loading state
    const newPrompt = {
      id: requestId,
      prompt: userPrompt,
      response: 'Loading...'
    };
    
    // Add to history
    setHistory(prev => [...prev, newPrompt]);
    
    // Save the prompt and reset input field
    setPromptInput('');
    
    try {
      // Make the request to the AI
      await onRequestAI(userPrompt);
      
      // Response will be handled by the useEffect
    } catch (error) {
      console.error('Error requesting AI example:', error);
      
      // Handle error by updating the history directly
      setHistory(prev => 
        prev.map(item => 
          item.id === requestId 
            ? { ...item, response: 'Error getting response. Please try again.' }
            : item
        )
      );
      
      setLastRequestId(null);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="example-generation-block">
      <h3>Example Generation</h3>
      
      {customInstructions && (
        <div className="instructor-guidance">
          <h4>Instructor Guidelines:</h4>
          <p>{customInstructions}</p>
        </div>
      )}
      
      <div className="example-quick-prompts">
        <p>Quick example requests:</p>
        <div className="quick-prompt-buttons">
          {examplePrompts.map((prompt, index) => (
            <button 
              key={index} 
              className="quick-prompt-button"
              onClick={() => handleRequestAI(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
      
      <div className="ai-prompt-container">
        <div className="prompt-input-area">
          <textarea
            className="prompt-input"
            placeholder="Request specific examples to help you understand the concept or problem..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
          />
          <button 
            className="prompt-button"
            onClick={() => handleRequestAI()}
            disabled={loading || !promptInput.trim()}
          >
            {loading ? 'Processing...' : 'Get Examples'}
          </button>
        </div>
        
        {history.length > 0 && (
          <div className="conversation-history">
            <h4>Examples History</h4>
            {history.map((item) => (
              <div key={item.id} className="conversation-item">
                <div className="user-prompt">
                  <strong>Your request:</strong> {item.prompt}
                </div>
                <div className="ai-response">
                  <strong>AI example:</strong> {item.response === 'Loading...' ? (
                    <span className="loading-text">
                      Loading<span className="loading-dots"></span>
                    </span>
                  ) : (
                    item.response
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExampleGenerationBlock;