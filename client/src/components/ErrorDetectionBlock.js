import React, { useState, useEffect } from 'react';
import './ErrorDetectionBlock.css';

const ErrorDetectionBlock = ({ 
  questionId, 
  aiResponse, 
  onRequestAI, 
  customInstructions 
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [studentWork, setStudentWork] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [lastRequestId, setLastRequestId] = useState(null);
  const [submittingWork, setSubmittingWork] = useState(false);
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [revisions, setRevisions] = useState({});
  
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
      
      // If we were submitting work, try to parse feedback
      if (submittingWork) {
        parseFeedback(aiResponse);
        setSubmittingWork(false);
      }
      
      // Reset lastRequestId after updating
      setLastRequestId(null);
    }
  }, [aiResponse, lastRequestId, submittingWork]);
  
  // Parse feedback from AI response
  const parseFeedback = (response) => {
    try {
      // Try to identify feedback points
      const items = [];
      
      // Look for bullet points or numbers first
      const bulletRegex = /[-•*]\s*([^\n]+)/g;
      const numberedRegex = /\d+\.\s*([^\n]+)/g;
      
      let match;
      while ((match = bulletRegex.exec(response)) !== null) {
        items.push(match[1].trim());
      }
      
      while ((match = numberedRegex.exec(response)) !== null) {
        items.push(match[1].trim());
      }
      
      // If no bullet points found, try to split by paragraphs
      if (items.length === 0) {
        const paragraphs = response.split('\n\n');
        paragraphs.forEach(para => {
          if (para.trim().length > 20 && !para.startsWith('I noticed') && !para.toLowerCase().includes('overall')) {
            items.push(para.trim());
          }
        });
      }
      
      if (items.length > 0) {
        setFeedbackItems(items);
      } else {
        // Fallback: just use the whole response
        setFeedbackItems([response.trim()]);
      }
    } catch (error) {
      console.error('Error parsing feedback:', error);
    }
  };
  
  const handleSubmitWork = () => {
    if (!studentWork.trim()) {
      alert('Please enter your work before submitting for feedback.');
      return;
    }
    
    setSubmittingWork(true);
    setFeedbackItems([]);
    setRevisions({});
    
    // Create a unique ID for this request
    const requestId = Date.now();
    setLastRequestId(requestId);
    
    // Add to history
    const newPrompt = {
      id: requestId,
      prompt: "Submitted work for review",
      response: 'Loading...'
    };
    
    setHistory(prev => [...prev, newPrompt]);
    
    // Send the work to the AI
    setLoading(true);
    onRequestAI(`Please review my work and identify any errors or areas for improvement. Don't provide corrections, just identify the issues:\n\n${studentWork}`)
      .finally(() => {
        setLoading(false);
      });
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
      console.error('Error requesting AI feedback:', error);
      
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
  
  const handleRevisionChange = (index, text) => {
    setRevisions({
      ...revisions,
      [index]: text
    });
  };
  
  return (
    <div className="error-detection-block">
      <h3>Error Detection</h3>
      
      {customInstructions && (
        <div className="instructor-guidance">
          <h4>Instructor Guidelines:</h4>
          <p>{customInstructions}</p>
        </div>
      )}
      
      <div className="error-detection-workflow">
        <div className="work-submission">
          <h4>Submit Your Work for Review</h4>
          <p className="workflow-description">
            Enter your work below. AI will identify potential errors without providing solutions.
          </p>
          <textarea
            className="work-input"
            placeholder="Type or paste your work here..."
            value={studentWork}
            onChange={(e) => setStudentWork(e.target.value)}
          />
          <button 
            className="submit-work-button"
            onClick={handleSubmitWork}
            disabled={!studentWork.trim() || loading}
          >
            {loading && submittingWork ? 'Analyzing...' : 'Analyze Work'}
          </button>
        </div>
        
        {feedbackItems.length > 0 && (
          <div className="feedback-container">
            <h4>Areas for Improvement</h4>
            <div className="feedback-items">
              {feedbackItems.map((item, index) => (
                <div key={index} className="feedback-item">
                  <div className="feedback-point">
                    <span className="feedback-number">{index + 1}</span>
                    <p>{item}</p>
                  </div>
                  <div className="revision-section">
                    <textarea
                      className="revision-input"
                      placeholder="Notes on how you'll address this..."
                      value={revisions[index] || ''}
                      onChange={(e) => handleRevisionChange(index, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="ai-prompt-container">
        <div className="prompt-input-area">
          <textarea
            className="prompt-input"
            placeholder="Ask a specific question about your work..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
          />
          <button 
            className="prompt-button"
            onClick={handleRequestAI}
            disabled={loading || !promptInput.trim()}
          >
            {loading && !submittingWork ? 'Processing...' : 'Ask Question'}
          </button>
        </div>
        
        {history.length > 0 && (
          <div className="conversation-history">
            <h4>Feedback History</h4>
            {history.map((item) => (
              <div key={item.id} className="conversation-item">
                <div className="user-prompt">
                  <strong>Your request:</strong> {item.prompt}
                </div>
                <div className="ai-response">
                  <strong>AI feedback:</strong> {item.response === 'Loading...' ? (
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

export default ErrorDetectionBlock;