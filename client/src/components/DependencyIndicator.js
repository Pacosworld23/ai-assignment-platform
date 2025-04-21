import React from 'react';
import './DependencyIndicator.css';

const DependencyIndicator = ({ dependencies, questionMap, questionStatus }) => {
  if (!dependencies || dependencies.length === 0) {
    return null;
  }
  
  return (
    <div className="dependency-indicator">
      <div className="dependency-header">
        <span className="dependency-icon">⚠️</span>
        This question builds upon:
      </div>
      <ul className="dependency-list">
        {dependencies.map(depId => {
          const question = questionMap[depId];
          const status = questionStatus[depId] || {};
          
          if (!question) return null;
          
          return (
            <li 
              key={depId} 
              className={`dependency-item ${status.complete ? 'complete' : 'incomplete'}`}
            >
              Question {question.number}: {question.text.substring(0, 50)}
              {question.text.length > 50 ? '...' : ''}
              {status.complete ? 
                <span className="status-badge complete">Completed ✓</span> : 
                <span className="status-badge incomplete">Incomplete ⚠️</span>
              }
            </li>
          );
        })}
      </ul>
      <p className="dependency-note">
        {questionStatus[dependencies[0]]?.complete ? 
          'You may proceed with this question.' : 
          'You must complete the prerequisite questions before working on this one.'
        }
      </p>
    </div>
  );
};

export default DependencyIndicator;