import React, { useState } from 'react';
import './AIComparisonBlock.css';

const AIComparisonBlock = ({ questionId, studentAnswer, aiResponse, onRequestAI }) => {
  const [comparing, setComparing] = useState(false);
  
  const handleCompareClick = async () => {
    if (!studentAnswer.trim()) {
      alert('Please provide your answer first before comparing with AI.');
      return;
    }
    
    setComparing(true);
    try {
      await onRequestAI();
    } finally {
      setComparing(false);
    }
  };
  
  // Check if AI is still loading
  const isLoading = aiResponse === 'Loading...';
  
  return (
    <div className="ai-comparison-block">
      <h3>Compare Your Answer with AI</h3>
      
      {!aiResponse || isLoading ? (
        <div className="comparison-controls">
          <p>Once you've completed your answer, you can compare it with an AI-generated response.</p>
          <button 
            className="compare-button" 
            onClick={handleCompareClick}
            disabled={comparing || !studentAnswer.trim()}
          >
            {comparing || isLoading ? 'Generating AI Response...' : 'Compare with AI'}
          </button>
          
          {(comparing || isLoading) && (
            <div className="loading-indicator">
              <p>AI is generating an answer to this question...</p>
              <div className="loading-spinner"></div>
            </div>
          )}
        </div>
      ) : (
        <div className="comparison-results">
          <div className="comparison-grid">
            <div className="comparison-column">
              <h4>Your Answer</h4>
              <div className="answer-box student-answer">
                {studentAnswer || <em>No answer provided</em>}
              </div>
            </div>
            <div className="comparison-column">
              <h4>AI Answer</h4>
              <div className="answer-box ai-answer">
                {aiResponse}
              </div>
            </div>
          </div>
          
          <div className="reflection-prompt">
            <h4>Reflect on the Comparison</h4>
            <p>What similarities and differences do you notice? What can you learn from the AI's approach?</p>
            <textarea 
              placeholder="Write your reflections here..." 
              className="reflection-input"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AIComparisonBlock;