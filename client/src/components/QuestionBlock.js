import React from 'react';
import './QuestionBlock.css';

// Component to render table data if present
const TableDisplay = ({ tableData }) => {
  console.log("TableData received:", tableData);
  if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
    return null;
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <tbody>
          {tableData.map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex === 0 ? "header-row" : ""}>
              {Array.isArray(row)
                ? row.map((cell, cellIndex) => (
                    <td key={cellIndex} className={rowIndex === 0 ? "header-cell" : ""}>
                      {cell}
                    </td>
                  ))
                : <td>{row}</td>
              }
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * QuestionBlock component
 * Props:
 * - questionId: string
 * - aiOption: 'no_ai' | 'compare' | 'hints' | 'guidance'
 * - value: string
 * - onChange: function
 * - isLocked: boolean
 * - question: object (may include tableData)
 */
const QuestionBlock = ({ questionId, aiOption, value, onChange, isLocked, question }) => {
  // Debug logging
  console.log("Question in QuestionBlock:", question);

  // Determine if this question has associated table data
  const hasTableData = question && question.tableData &&
                       Array.isArray(question.tableData) &&
                       question.tableData.length > 0;

  // CSS classes based on AI option and lock state
  const getBlockClass = () => {
    const classes = [];
    if (isLocked) classes.push('locked');
    switch (aiOption) {
      case 'no_ai': classes.push('no-ai'); break;
      case 'compare': classes.push('compare-ai'); break;
      case 'hints': classes.push('hints-ai'); break;
      case 'guidance': classes.push('guidance-ai'); break;
      default: break;
    }
    return classes.join(' ');
  };

  // Label for AI status
  const getAIStatusLabel = () => {
    switch (aiOption) {
      case 'no_ai': return 'AI Not Allowed';
      case 'compare': return 'Compare with AI Available';
      case 'hints': return 'AI Hints Available';
      case 'guidance': return 'AI Guidance Available';
      default: return '';
    }
  };

  return (
    <div className={`question-answer-block ${getBlockClass()}`}>
      <div className="ai-status">
        <span className="ai-label">{getAIStatusLabel()}</span>
        {isLocked && <span className="locked-label">Locked 🔒</span>}
      </div>

      {/* Render table if question has table data */}
      {hasTableData && <TableDisplay tableData={question.tableData} />}

      {/* Answer textarea */}
      <textarea
        className="answer-input"
        placeholder={isLocked
          ? "Complete previous questions to unlock this one"
          : "Type your answer here..."
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-question-id={questionId}
        disabled={isLocked}
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

      {/* AI warning or lock message */}
      {aiOption === 'no_ai' && !isLocked && (
        <div className="ai-warning">
          <p>Your instructor requires you to complete this question without AI assistance.</p>
        </div>
      )}
      {isLocked && (
        <div className="locked-message">
          <p>This question is locked until you complete the prerequisite questions.</p>
        </div>
      )}
    </div>
  );
};

export default QuestionBlock;
