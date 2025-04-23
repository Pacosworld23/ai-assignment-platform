import React, { useState, useEffect, useRef } from 'react';
import './AIHintBlock.css';

const AIHintBlock = ({ questionId, aiOption, aiResponse, onRequestAI, customInstructions }) => {
  const [promptInput, setPromptInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [lastRequestId, setLastRequestId] = useState(null);
  const [hintCount, setHintCount] = useState(0);
  const [showGuidelines, setShowGuidelines] = useState(false);
  
  // Reference to conversation history for auto-scrolling
  const conversationEndRef = useRef(null);
  
  const isHintMode = aiOption === 'hints';
  const isGuidanceMode = aiOption === 'guidance';
  const maxHints = 3; // Limit number of hints per question
  
  // Sample hint request prompts to guide students
  const samplePrompts = isHintMode ? [
    "What's the first step I should consider?",
    "Can you point me to a relevant concept?",
    "What formula might be applicable here?"
  ] : [
    "How should I structure my approach?",
    "How can I verify my answer?",
    "What's a similar problem I could reference?"
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
  
  // Effect for auto-scrolling to the latest message
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);
  
  const handleRequestAI = async () => {
    if (!promptInput.trim()) {
      alert('Please enter a specific question for guidance.');
      return;
    }
    
    if (hintCount >= maxHints && isHintMode) {
      alert(`You've reached the maximum of ${maxHints} hints for this question. Try working with the hints you already have.`);
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
      response: 'Loading...',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    // Add to history
    setHistory(prev => [...prev, newPrompt]);
    
    // Save the prompt and reset input field
    const currentPrompt = promptInput;
    setPromptInput('');
    
    // Increment hint count for hint mode
    if (isHintMode) {
      setHintCount(prev => prev + 1);
    }
    
    try {
      // Make the request to the AI
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
      
      // Decrement hint count if there was an error
      if (isHintMode) {
        setHintCount(prev => Math.max(0, prev - 1));
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleRequestAI();
    }
  };
  
  const insertSamplePrompt = (prompt) => {
    setPromptInput(prompt);
  };
  
  return (
    <div className={`ai-hint-block ${isHintMode ? 'hint-mode' : 'guidance-mode'}`}>
      <div className="hint-block-header">
        <h3>
          <span className="hint-icon">
            {isHintMode ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
          {isHintMode ? 'Request AI Hints' : 'Request AI Guidance'}
        </h3>
        
        <div className="hint-info">
          {isHintMode && (
            <div className="hint-counter">
              <span>Hints: {hintCount}/{maxHints}</span>
            </div>
          )}
          <button 
            className="guidelines-toggle" 
            onClick={() => setShowGuidelines(!showGuidelines)}
          >
            {showGuidelines ? 'Hide Guidelines' : 'Show Guidelines'}
          </button>
        </div>
      </div>
      
      {showGuidelines && (
        <div className="guidelines-panel">
          <h4>How to Use {isHintMode ? 'Hints' : 'Guidance'} Effectively</h4>
          <ul>
            <li>Ask specific questions rather than requesting complete solutions</li>
            <li>Focus on understanding concepts rather than just getting answers</li>
            <li>Try to apply the hint to solve the problem yourself before asking for more help</li>
            {isHintMode && <li>You are limited to {maxHints} hints per question, so use them wisely</li>}
          </ul>
        </div>
      )}
      
      {customInstructions && (
        <div className="instructor-guidance">
          <h4>Instructor Guidelines:</h4>
          <p>{customInstructions}</p>
        </div>
      )}
      
      <div className="ai-prompt-container">
        {history.length > 0 && (
          <div className="ai-conversation-history">
            <h4>Conversation History</h4>
            <div className="conversation-scroll-area">
              {history.map((item) => (
                <div key={item.id} className="conversation-item">
                  <div className="user-prompt">
                    <div className="message-header">
                      <span className="user-icon">You</span>
                      <span className="timestamp">{item.timestamp}</span>
                    </div>
                    <div className="message-content">{item.prompt}</div>
                  </div>
                  <div className="ai-response">
                    <div className="message-header">
                      <span className="ai-icon">AI</span>
                    </div>
                    <div className="message-content">
                      {item.response === 'Loading...' ? (
                        <span className="loading-text">
                          Loading<span className="loading-dots"></span>
                        </span>
                      ) : (
                        item.response
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={conversationEndRef} />
            </div>
          </div>
        )}
        
        <div className="prompt-suggestions">
          <p>Example questions you might ask:</p>
          <div className="suggestion-pills">
            {samplePrompts.map((prompt, index) => (
              <button 
                key={index} 
                className="suggestion-pill"
                onClick={() => insertSamplePrompt(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
        
        <div className="prompt-input-area">
          <textarea
            className="prompt-input"
            placeholder={isHintMode 
              ? "Ask for a specific hint (e.g., 'What concept should I apply here?')" 
              : "Ask for guidance on your approach (e.g., 'How should I start solving this?')"
            }
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || (isHintMode && hintCount >= maxHints)}
          />
          <div className="input-actions">
            <div className="char-counter">
              {promptInput.length}/200
            </div>
            <button 
              className="prompt-button"
              onClick={handleRequestAI}
              disabled={loading || !promptInput.trim() || (isHintMode && hintCount >= maxHints)}
            >
              {loading ? (
                <>
                  <span className="button-spinner"></span>
                  Processing...
                </>
              ) : isHintMode ? 'Get Hint' : 'Get Guidance'}
            </button>
          </div>
          {isHintMode && hintCount >= maxHints && (
            <p className="hint-limit-warning">
              You've used all available hints. Try working with what you've learned so far.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIHintBlock;