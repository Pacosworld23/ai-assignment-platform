import React, { useState } from 'react';
import TableDisplay from '../components/TableDisplay';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './AssignmentConfig.css';

// Expanded AI options with new interaction modes
const AI_OPTIONS = [
  { id: 'no_ai', label: 'No AI Allowed', description: 'Students must complete this question without AI assistance.' },
  { id: 'compare', label: 'Compare with AI', description: 'Students answer first, then compare with AI-generated response.' },
  { id: 'hints', label: 'AI Hints Only', description: 'Students can request specific hints from AI but not full answers.' },
  { id: 'guidance', label: 'AI Guidance', description: 'AI can provide process guidance without giving direct answers.' },
  { id: 'examples', label: 'Example Generation', description: 'AI provides relevant examples but does not solve the specific problem.' },
  { id: 'step_framework', label: 'Step-by-Step Framework', description: 'AI outlines a structured approach without providing the solution.' },
  { id: 'socratic', label: 'Socratic Method', description: 'AI asks guiding questions to lead students to discover answers themselves.' },
  { id: 'error_detection', label: 'Error Detection', description: 'Students submit work and AI identifies possible errors without corrections.' }
];

const AssignmentConfig = ({ assignment, setAssignment }) => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [openDependencyDropdowns, setOpenDependencyDropdowns] = useState({});
  
  // Redirect if no assignment data
  if (!assignment) {
    navigate('/');
    return null;
  }
  
  const { title, questions } = assignment;
  
  const handleOptionChange = (questionId, optionId) => {
    const updatedQuestions = questions.map(q => 
      q.id === questionId ? { ...q, aiOption: optionId } : q
    );
    setAssignment({ ...assignment, questions: updatedQuestions });
  };
  
  const handleCustomPromptChange = (questionId, prompt) => {
    const updatedQuestions = questions.map(q => 
      q.id === questionId ? { ...q, customPrompt: prompt } : q
    );
    setAssignment({ ...assignment, questions: updatedQuestions });
  };
  
  const handleDependencyChange = (questionId, dependencyId, isChecked) => {
    const updatedQuestions = questions.map(q => {
      if (q.id !== questionId) return q;
      const deps = q.dependencies || [];
      return {
        ...q,
        dependencies: isChecked 
          ? [...deps, dependencyId] 
          : deps.filter(id => id !== dependencyId)
      };
    });
    setAssignment({ ...assignment, questions: updatedQuestions });
  };
  
  const toggleDependencyDropdown = id => {
    setOpenDependencyDropdowns(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  const getDependencyLabel = q => {
    const deps = q.dependencies || [];
    return deps.length
      ? `${deps.length} question${deps.length > 1 ? 's' : ''} selected`
      : 'Select prerequisite questions';
  };
  
  const getPromptPlaceholder = mode => {
    switch (mode) {
      case 'hints': return 'E.g., "Provide hints about relevant formulas..."';
      case 'guidance': return 'E.g., "Guide students to think about the context..."';
      case 'examples': return 'E.g., "Provide examples of similar problems..."';
      case 'step_framework': return 'E.g., "Outline the analysis steps..."';
      case 'socratic': return 'E.g., "Ask questions that help students identify principles..."';
      case 'error_detection': return 'E.g., "Focus on identifying logical fallacies..."';
      default: return 'Provide specific instructions for AI assistance...';
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await axios.post('/api/assignments/configure', assignment);
      navigate(`/student-view/${response.data.assignmentId}`);
    } catch (err) {
      console.error(err);
      setError('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="config-container">
      <h1>Configure Assignment: {title}</h1>
      
      {/* Render parsed tables here in the config view */}
      {assignment.tables?.length > 0 && (
        <TableDisplay tables={assignment.tables} />
      )}

      <p className="instructions">
        Select how you want to integrate AI for each question in your assignment.
      </p>
      
      <div className="questions-list">
        {questions.map(question => (
          <div key={question.id} className="question-card">
            <h3>Question {question.number}</h3>
            <div className="question-preview">
              <p>{question.text}</p>
            </div>
            
            {/* AI Options */}
            <div className="ai-options">
              <h4>AI Integration Options:</h4>
              {AI_OPTIONS.map(option => (
                <div key={option.id} className="option">
                  <input
                    type="radio"
                    id={`${question.id}-${option.id}`}
                    name={`question-${question.id}`}
                    checked={question.aiOption === option.id}
                    onChange={() => handleOptionChange(question.id, option.id)}
                  />
                  <label htmlFor={`${question.id}-${option.id}`}>
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </label>
                </div>
              ))}
            </div>
            
            {/* Dependencies Dropdown */}
            {question.number > 1 && (
              <div className="dependencies-section">
                <h4>Question Dependencies:</h4>
                <div className="dropdown-container">
                  <div 
                    className="dropdown-header"
                    onClick={() => toggleDependencyDropdown(question.id)}
                  >
                    <span>{getDependencyLabel(question)}</span>
                    <span className="dropdown-arrow">
                      {openDependencyDropdowns[question.id] ? '▲' : '▼'}
                    </span>
                  </div>
                  {openDependencyDropdowns[question.id] && (
                    <div className="dropdown-content">
                      <p className="dropdown-description">
                        Select previous questions this depends on.
                      </p>
                      <div className="dependency-options">
                        {questions
                          .filter(q => q.number < question.number)
                          .map(prev => (
                            <div key={prev.id} className="dependency-option">
                              <input
                                type="checkbox"
                                id={`dep-${question.id}-${prev.id}`}
                                checked={question.dependencies?.includes(prev.id)}
                                onChange={e => handleDependencyChange(
                                  question.id,
                                  prev.id,
                                  e.target.checked
                                )}
                              />
                              <label htmlFor={`dep-${question.id}-${prev.id}`}>
                                Question {prev.number}: {prev.text.slice(0, 60)}...
                              </label>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Custom Prompt for AI Modes */}
            {['hints','guidance','examples','step_framework','socratic','error_detection']
              .includes(question.aiOption) && (
              <div className="custom-prompt">
                <h4>Customize AI Guidance:</h4>
                <textarea
                  placeholder={getPromptPlaceholder(question.aiOption)}
                  value={question.customPrompt || ''}
                  onChange={e => handleCustomPromptChange(question.id, e.target.value)}
                />
              </div>
            )}
            
          </div>
        ))}
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="action-buttons">
        <button 
          className="back-button" 
          onClick={() => navigate('/')}
          disabled={saving}
        >
          Back
        </button>
        
        <button 
          className="save-button" 
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save and Generate Student View'}
        </button>
      </div>
       {/* Show button to review submissions */}
       {assignment?.id && (
        <div className="navigation-section">
          <Link to={`/teacher-review/${assignment.id}`} className="review-button">
            Review Student Submissions
          </Link>
        </div>
      )}
    </div>
  );
};

export default AssignmentConfig;