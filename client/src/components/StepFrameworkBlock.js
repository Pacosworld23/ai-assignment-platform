import React, { useState, useEffect } from 'react';
import './StepFrameworkBlock.css';

const StepFrameworkBlock = ({ 
  questionId, 
  aiResponse, 
  onRequestAI, 
  customInstructions 
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [lastRequestId, setLastRequestId] = useState(null);
  
  // State for tracking steps
  const [expandedStep, setExpandedStep] = useState(null);
  const [steps, setSteps] = useState([]);
  const [stepNotes, setStepNotes] = useState({});
  
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
      
      // Try to parse steps from the AI response
      if (aiResponse.includes('Step') || aiResponse.includes('step')) {
        parseStepsFromResponse(aiResponse);
      }
      
      // Reset lastRequestId after updating
      setLastRequestId(null);
    }
  }, [aiResponse, lastRequestId]);
  
  // Parse steps from the AI response text
  const parseStepsFromResponse = (text) => {
    try {
      // Try to extract steps using regex (looking for numbered steps)
      const stepRegex = /(?:Step|STEP)\s*(\d+)[:.]\s*([^\n]+)(?:\n|$)/g;
      const extractedSteps = [];
      let match;
      
      while ((match = stepRegex.exec(text)) !== null) {
        extractedSteps.push({
          number: parseInt(match[1]),
          title: match[2].trim(),
          completed: false
        });
      }
      
      // If no steps found, try alternative pattern
      if (extractedSteps.length === 0) {
        const numberRegex = /(\d+)[:.]\s*([^\n]+)(?:\n|$)/g;
        while ((match = numberRegex.exec(text)) !== null) {
          extractedSteps.push({
            number: parseInt(match[1]),
            title: match[2].trim(),
            completed: false
          });
        }
      }
      
      if (extractedSteps.length > 0) {
        setSteps(extractedSteps);
      }
    } catch (error) {
      console.error('Error parsing steps:', error);
    }
  };
  
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
    setPromptInput('');
    
    try {
      // Make the request to the AI
      await onRequestAI(promptInput);
      
      // Response will be handled by the useEffect
    } catch (error) {
      console.error('Error requesting AI framework:', error);
      
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
  
  const toggleStep = (index) => {
    setExpandedStep(expandedStep === index ? null : index);
  };
  
  const toggleStepCompletion = (index) => {
    const updatedSteps = [...steps];
    updatedSteps[index].completed = !updatedSteps[index].completed;
    setSteps(updatedSteps);
  };
  
  const handleStepNoteChange = (index, note) => {
    setStepNotes({
      ...stepNotes,
      [index]: note
    });
  };
  
  return (
    <div className="step-framework-block">
      <h3>Step-by-Step Framework</h3>
      
      {customInstructions && (
        <div className="instructor-guidance">
          <h4>Instructor Guidelines:</h4>
          <p>{customInstructions}</p>
        </div>
      )}
      
      {steps.length > 0 && (
        <div className="steps-framework">
          <h4>Problem-Solving Framework</h4>
          <div className="steps-list">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className={`step-item ${expandedStep === index ? 'expanded' : ''} ${step.completed ? 'completed' : ''}`}
              >
                <div className="step-header" onClick={() => toggleStep(index)}>
                  <div className="step-checkbox">
                    <input 
                      type="checkbox" 
                      checked={step.completed}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleStepCompletion(index);
                      }}
                    />
                  </div>
                  <div className="step-number">Step {step.number}</div>
                  <div className="step-title">{step.title}</div>
                  <div className="step-toggle">
                    {expandedStep === index ? '▲' : '▼'}
                  </div>
                </div>
                
                {expandedStep === index && (
                  <div className="step-details">
                    <textarea 
                      className="step-notes"
                      placeholder="Take notes on this step here..."
                      value={stepNotes[index] || ''}
                      onChange={(e) => handleStepNoteChange(index, e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="step-progress">
            <div className="progress-text">
              {steps.filter(s => s.completed).length} of {steps.length} steps completed
            </div>
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${(steps.filter(s => s.completed).length / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
      
      <div className="ai-prompt-container">
        <div className="prompt-input-area">
          <textarea
            className="prompt-input"
            placeholder="Ask for a step-by-step framework to approach this problem..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
          />
          <button 
            className="prompt-button"
            onClick={handleRequestAI}
            disabled={loading || !promptInput.trim()}
          >
            {loading ? 'Processing...' : 'Get Framework'}
          </button>
        </div>
        
        {history.length > 0 && (
          <div className="conversation-history">
            <h4>Framework History</h4>
            {history.map((item) => (
              <div key={item.id} className="conversation-item">
                <div className="user-prompt">
                  <strong>Your request:</strong> {item.prompt}
                </div>
                <div className="ai-response">
                  <strong>AI framework:</strong> {item.response === 'Loading...' ? (
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

export default StepFrameworkBlock;