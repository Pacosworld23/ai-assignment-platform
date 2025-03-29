import React, { useState, useEffect } from 'react';
import './AIHintBlock.css';

const AIHintBlock = ({ questionId, aiOption, aiResponse, onRequestAI, customInstructions }) => {
  const [promptInput, setPromptInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [lastRequestId, setLastRequestId] = useState(null);
  
  const isHintMode = aiOption === 'hints';
  const isGuidanceMode = aiOption === 'guidance';
  
  // This effect watches for changes in aiResponse and updates the history
  useEffect(() => {
    if (lastRequestId && aiResponse && aiResponse !== 'Loading...') {
      console.log('Updating history with new AI response:', aiResponse.substring(0, 30) + '...');
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
  
  const handleRequestAI = async () => {
    if (!promptInput.trim()) {
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
      prompt: promptInput,
      response: 'Loading...'
    };
    
    // Add to history
    setHistory(prev => [...prev, newPrompt]);
    
    // Save the prompt and reset input field
    const currentPrompt = promptInput;
    setPromptInput('');
    
    try {
      // Make the request to the AI
      console.log('Sending AI request for:', currentPrompt);
      await onRequestAI(currentPrompt);
      
      // Response will be handled by the useEffect
    } catch (error) {
      console.error('Error in handleRequestAI:', error);
      
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
    <div className={`ai-hint-block ${isHintMode ? 'hint-mode' : 'guidance-mode'}`}>
      <h3>{isHintMode ? 'Request AI Hints' : 'Request AI Guidance'}</h3>
      
      {customInstructions && (
        <div className="instructor-guidance">
          <h4>Instructor Guidelines:</h4>
          <p>{customInstructions}</p>
        </div>
      )}
      
      <div className="ai-prompt-container">
        <div className="prompt-input-area">
          <textarea
            className="prompt-input"
            placeholder={isHintMode 
              ? "Ask for a specific hint (e.g., 'Can you give me a hint about the first step?')" 
              : "Ask for guidance on your approach (e.g., 'What strategy should I use to solve this?')"
            }
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
          />
          <button 
            className="prompt-button"
            onClick={handleRequestAI}
            disabled={loading || !promptInput.trim()}
          >
            {loading ? 'Processing...' : isHintMode ? 'Get Hint' : 'Get Guidance'}
          </button>
        </div>
        
        {history.length > 0 && (
          <div className="ai-conversation-history">
            <h4>Conversation History</h4>
            {history.map((item) => (
              <div key={item.id} className="conversation-item">
                <div className="user-prompt">
                  <strong>You:</strong> {item.prompt}
                </div>
                <div className="ai-response">
                  <strong>AI:</strong> {item.response === 'Loading...' ? (
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

export default AIHintBlock;