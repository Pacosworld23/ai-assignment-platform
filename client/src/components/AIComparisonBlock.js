import React, { useState } from 'react';
import './AIComparisonBlock.css';

const AIComparisonBlock = ({ questionId, studentAnswer, aiResponse, onRequestAI }) => {
  const [comparing, setComparing] = useState(false);
  const [reflection, setReflection] = useState('');
  const [showHelpText, setShowHelpText] = useState(false);
  
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

  // Help text for reflections
  const reflectionPrompts = [
    "What aspects of the AI's approach seem strong?",
    "Did the AI make any assumptions you didn't?",
    "How could you improve your answer based on the comparison?",
    "What did you understand that the AI might have missed?",
    "Did you use different methods to reach the same conclusion?"
  ];
  
  return (
    <div className="ai-comparison-block">
      <div className="ai-comparison-header">
        <h3>
          <span className="ai-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 9H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 9H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          Compare Your Answer with AI
        </h3>
        <div className="academic-badge">
          <span>Academic Learning Tool</span>
        </div>
      </div>
      
      {!aiResponse || isLoading ? (
        <div className="comparison-controls">
          <div className="info-panel">
            <p><strong>Why compare?</strong> Comparing your work with AI can help identify different approaches and improve critical thinking. The AI's answer is not necessarily "correct" but offers an alternative perspective.</p>
            <p>Complete your own answer first, then request the AI comparison to see how the approaches differ.</p>
          </div>
          <button 
            className="compare-button" 
            onClick={handleCompareClick}
            disabled={comparing || !studentAnswer.trim()}
          >
            {comparing || isLoading ? (
              <>
                <div className="button-spinner"></div>
                Generating AI Response...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12L9 4V20L21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Compare with AI
              </>
            )}
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
            <div className="reflection-header">
              <h4>Self-Reflection</h4>
              <button 
                className="help-button" 
                onClick={() => setShowHelpText(!showHelpText)} 
                aria-label="Toggle help text"
              >
                {showHelpText ? 'Hide Tips' : 'Show Tips'}
              </button>
            </div>
            {showHelpText && (
              <div className="reflection-help">
                <p>Consider these questions as you reflect:</p>
                <ul>
                  {reflectionPrompts.map((prompt, idx) => (
                    <li key={idx}>{prompt}</li>
                  ))}
                </ul>
              </div>
            )}
            <textarea 
              placeholder="Write your reflections here. How did your approach differ from the AI? What did you learn from this comparison?" 
              className="reflection-input"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
            />
            <div className="word-count">{reflection.split(/\s+/).filter(Boolean).length} words</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIComparisonBlock;