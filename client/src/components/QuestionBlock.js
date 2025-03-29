import React from 'react';
import './QuestionBlock.css';

const QuestionBlock = ({ questionId, aiOption, value, onChange }) => {
  // Add visual indicators based on AI option
  const getBlockClass = () => {
    switch (aiOption) {
      case 'no_ai':
        return 'no-ai';
      case 'compare':
        return 'compare-ai';
      case 'hints':
        return 'hints-ai';
      case 'guidance':
        return 'guidance-ai';
      default:
        return '';
    }
  };
  
  const getAIStatusLabel = () => {
    switch (aiOption) {
      case 'no_ai':
        return 'AI Not Allowed';
      case 'compare':
        return 'Compare with AI Available';
      case 'hints':
        return 'AI Hints Available';
      case 'guidance':
        return 'AI Guidance Available';
      default:
        return '';
    }
  };
  
  return (
    <div className={`question-answer-block ${getBlockClass()}`}>
      <div className="ai-status">
        <span className="ai-label">{getAIStatusLabel()}</span>
      </div>
      
      <textarea
        className="answer-input"
        placeholder="Type your answer here..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-question-id={questionId}
        onCopy={(e) => {
          if (aiOption === 'no_ai') {
            e.preventDefault();
            alert('Copy is disabled for this question as per instructor settings.');
          }
        }}
        onPaste={(e) => {
          if (aiOption === 'no_ai') {
            e.preventDefault();
            alert('Paste is disabled for this question as per instructor settings.');
          }
        }}
      />
      
      {aiOption === 'no_ai' && (
        <div className="ai-warning">
          <p>Your instructor requires you to complete this question without AI assistance.</p>
        </div>
      )}
    </div>
  );
};

export default QuestionBlock;
