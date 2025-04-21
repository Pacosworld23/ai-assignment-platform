import React, { useState, useEffect } from 'react';
import './SocraticMethodBlock.css';

const SocraticMethodBlock = ({ 
  questionId, 
  aiResponse, 
  onRequestAI, 
  customInstructions 
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [lastRequestId, setLastRequestId] = useState(null);
  const [reflections, setReflections] = useState({});
  const [threadPrompt, setThreadPrompt] = useState('');
  
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
  
  // Parse questions from AI response
  const parseQuestions = (response) => {
    if (!response || response === 'Loading...') return [];
    
    // Try to extract questions using regex (looking for question marks)
    const lines = response.split('\n');
    const questions = lines.filter(line => 
      line.trim().endsWith('?') && line.trim().length > 10
    );
    
    return questions;
  };
  
  const questions = aiResponse ? parseQuestions(aiResponse) : [];
  
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
    setThreadPrompt('');
    
    try {
      // Make the request to the AI
      await onRequestAI(userPrompt);
      
      // Response will be handled by the useEffect
    } catch (error) {
      console.error('Error in Socratic dialogue:', error);
      
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
  
  const handleReflectionChange = (questionIndex, text) => {
    setReflections({
      ...reflections,
      [questionIndex]: text
    });
  };
  
  const handleThreadContinue = () => {
    if (!threadPrompt.trim()) {
      alert('Please enter your thoughts to continue the discussion.');
      return;
    }
    
    // Combine reflections into the prompt
    let fullPrompt = threadPrompt;
    
    if (Object.keys(reflections).length > 0) {
      fullPrompt += "\n\nMy reflections on your questions:\n";
      
      Object.entries(reflections).forEach(([index, text]) => {
        if (text.trim()) {
          const question = questions[parseInt(index)];
          fullPrompt += `\nOn "${question}": ${text}\n`;
        }
      });
    }
    
    // Send the full prompt to the AI
    handleRequestAI(fullPrompt);
    
    // Reset for next interaction
    setReflections({});
  };
  
  return (
    <div className="socratic-method-block">
      <h3>Socratic Method</h3>
      
      {customInstructions && (
        <div className="instructor-guidance">
          <h4>Instructor Guidelines:</h4>
          <p>{customInstructions}</p>
        </div>
      )}
      
      {questions.length > 0 && (
        <div className="socratic-questions">
          <h4>Guiding Questions to Consider</h4>
          <div className="questions-list">
            {questions.map((question, index) => (
              <div key={index} className="question-item">
                <div className="question-text">{question}</div>
                <textarea
                  className="reflection-input"
                  placeholder="Your thoughts on this question..."
                  value={reflections[index] || ''}
                  onChange={(e) => handleReflectionChange(index, e.target.value)}
                />
              </div>
            ))}
          </div>
          
          <div className="thread-continuation">
            <h4>Continue the Discussion</h4>
            <textarea
              className="thread-prompt"
              placeholder="Share your thoughts based on the questions above..."
              value={threadPrompt}
              onChange={(e) => setThreadPrompt(e.target.value)}
            />
            <button 
              className="continue-button"
              onClick={handleThreadContinue}
              disabled={!threadPrompt.trim() || loading}
            >
              {loading ? 'Processing...' : 'Continue Discussion'}
            </button>
          </div>
        </div>
      )}
      
      <div className="ai-prompt-container">
        <div className="prompt-input-area">
          <textarea
            className="prompt-input"
            placeholder="Share your current understanding of the problem or concept..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
          />
          <button 
            className="prompt-button"
            onClick={() => handleRequestAI()}
            disabled={loading || !promptInput.trim()}
          >
            {loading ? 'Processing...' : 'Start Discussion'}
          </button>
        </div>
        
        {history.length > 0 && (
          <div className="conversation-history">
            <h4>Discussion History</h4>
            {history.map((item) => (
              <div key={item.id} className="conversation-item">
                <div className="user-prompt">
                  <strong>Your input:</strong> {item.prompt}
                </div>
                <div className="ai-response">
                  <strong>AI response:</strong> {item.response === 'Loading...' ? (
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

export default SocraticMethodBlock;