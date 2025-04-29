import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import TableDisplay from '../components/TableDisplay'; // Re-added the import
import './AssignmentConfig.css';

// Define AI options with their icons and classes
const AI_OPTIONS = [
  { 
    id: 'no_ai', 
    label: 'No AI Mode', 
    description: 'Block AI use for independent work',
    class: 'no-ai-mode',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M4.93 4.93L19.07 19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    )
  },
  { 
    id: 'compare', 
    label: 'Compare Mode', 
    description: 'Answer first, then see AI\'s response',
    class: 'compare-mode',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 19H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 5H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 12H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 19H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  { 
    id: 'hints', 
    label: 'Hint Mode', 
    description: 'Get hints without full answers',
    class: 'hint-mode',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.66347 17H14.3364" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 3V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 20V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6.34314 6.34326L7.05024 7.05036" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16.9497 16.9495L17.6568 17.6566" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6.34314 17.6566L7.05024 16.9495" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16.9497 7.05036L17.6568 6.34326" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  { 
    id: 'guidance', 
    label: 'Guidance Mode', 
    description: 'Get approach guidance only',
    class: 'guidance-mode',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 17V17.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 14C11.9816 13.5769 12.0692 13.1543 12.2495 12.7833C12.4299 12.4122 12.6961 12.1091 13.02 11.91C13.3367 11.7008 13.6137 11.4387 13.84 11.134C14.0662 10.8292 14.2383 10.4856 14.348 10.1218C14.4576 9.75798 14.5032 9.37953 14.483 9.00203C14.4627 8.62453 14.377 8.25425 14.2308 7.90752C14.0846 7.56079 13.8807 7.24343 13.6301 6.97045C13.3795 6.69747 13.0868 6.47363 12.7654 6.30982C12.444 6.14601 12.0987 6.04533 11.745 6.01413C11.3913 5.98293 11.0345 6.02175 10.6943 6.12853C10.3541 6.23531 10.036 6.4078 9.75784 6.63713C9.47968 6.86647 9.24797 7.14826 9.07598 7.46604C8.90399 7.78382 8.7947 8.13148 8.75465 8.49106C8.7146 8.85064 8.74457 9.21467 8.844 9.56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  { 
    id: 'examples', 
    label: 'Example Gen', 
    description: 'Get examples, not answers',
    class: 'example-mode',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4H20V20H4V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 10H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10 4V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  { 
    id: 'step_framework', 
    label: 'Step Framework', 
    description: 'Get approach structure only',
    class: 'framework-mode',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  { 
    id: 'socratic', 
    label: 'Socratic Method', 
    description: 'AI asks guiding questions',
    class: 'socratic-mode',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9.08997 9.00001C9.32507 8.33167 9.78912 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4271 7.03871C13.1254 7.15849 13.7587 7.52152 14.215 8.06353C14.6713 8.60553 14.921 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  { 
    id: 'error_detection', 
    label: 'Error Detection', 
    description: 'Find errors without fixes',
    class: 'error-mode',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10.29 3.86001L1.82001 18C1.64537 18.3024 1.55296 18.6453 1.55199 18.9945C1.55101 19.3438 1.6415 19.6873 1.81443 19.9905C1.98737 20.2938 2.23673 20.5467 2.53771 20.7239C2.83869 20.901 3.18082 20.9962 3.53001 21H20.47C20.8192 20.9962 21.1613 20.901 21.4623 20.7239C21.7633 20.5467 22.0126 20.2938 22.1856 19.9905C22.3585 19.6873 22.449 19.3438 22.448 18.9945C22.447 18.6453 22.3546 18.3024 22.18 18L13.71 3.86001C13.5317 3.56611 13.2793 3.32313 12.9805 3.15449C12.6817 2.98585 12.3437 2.89726 12 2.89726C11.6563 2.89726 11.3183 2.98585 11.0195 3.15449C10.7207 3.32313 10.4683 3.56611 10.29 3.86001Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
];

const AssignmentConfig = ({ assignment, setAssignment }) => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [autoSaved, setAutoSaved] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [openDependencyDropdowns, setOpenDependencyDropdowns] = useState({}); // Re-added dependency state
  
  // Redirect if no assignment data
  useEffect(() => {
    if (!assignment) {
      navigate('/');
    }
  }, [assignment, navigate]);
  
  if (!assignment) {
    return null;
  }
  
  const { title, questions } = assignment;
  
  const handleOptionChange = (questionId, optionId) => {
    const updatedQuestions = questions.map(question => 
      question.id === questionId 
        ? { ...question, aiOption: optionId }
        : question
    );
    
    setAssignment({
      ...assignment,
      questions: updatedQuestions
    });
    
    // Show auto-save indicator
    setAutoSaved(true);
    setTimeout(() => setAutoSaved(false), 3000);
  };
  
  const handleCustomPromptChange = (questionId, prompt) => {
    const updatedQuestions = questions.map(question => 
      question.id === questionId 
        ? { ...question, customPrompt: prompt }
        : question
    );
    
    setAssignment({
      ...assignment,
      questions: updatedQuestions
    });
    
    // Show auto-save indicator
    setAutoSaved(true);
    setTimeout(() => setAutoSaved(false), 3000);
  };
  
  // Re-added dependency handling functions
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
    
    // Show auto-save indicator
    setAutoSaved(true);
    setTimeout(() => setAutoSaved(false), 3000);
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
      console.log('Sending configuration data - Assignment ID:', assignment.id);
      console.log('Number of questions being configured:', assignment.questions.length);
      
      // Send the configured assignment to the backend
      const response = await axios.post('/api/assignments/configure', assignment);
      
      console.log('Configuration response:', response.data);
      
      // Navigate to the student view with the assignment ID
      navigate(`/student-view/${response.data.assignmentId}`);
    } catch (err) {
      console.error('Error saving configuration:', err);
      setError('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Check if custom prompt is needed
  const needsCustomPrompt = (aiOption) => {
    return ['hints', 'guidance', 'examples', 'step_framework', 'socratic', 'error_detection'].includes(aiOption);
  };
  
  return (
    <div className="config-container">
      <div className="config-header">
        <h1>Configure Assignment: {title}</h1>
        <p className="instructions">
          Select how you want to integrate AI for each question in your assignment.
        </p>
      </div>
      
      {/* Re-added TableDisplay component */}
      {assignment.tables?.length > 0 && (
        <div className="tables-section">
          <h2>Assignment Tables</h2>
          <TableDisplay tables={assignment.tables} />
        </div>
      )} 
      <div className="questions-list">
        {questions.map((question, index) => (
          <div 
            key={question.id} 
            id={`question-${question.id}`}
            className={`question-card ${index === activeQuestionIndex ? 'active-question' : ''}`}
          >
            <div className="question-header">
              <h3>Question {question.number}</h3>
            </div>
            
            <div className="question-preview">
              {question.text}
            </div>
            
            <div className="ai-options">
              <div className="ai-options-title">AI Integration Options:</div>
              
              <div className="ai-cards-grid">
                {AI_OPTIONS.map((option) => {
                  const isSelected = question.aiOption === option.id;
                  return (
                    <label 
                      key={option.id} 
                      className={`ai-option-card ${option.class} ${isSelected ? 'selected' : ''}`}
                      htmlFor={`${question.id}-${option.id}`}
                    >
                      <input
                        type="radio"
                        id={`${question.id}-${option.id}`}
                        name={`question-${question.id}`}
                        checked={isSelected}
                        onChange={() => handleOptionChange(question.id, option.id)}
                      />
                      <div className="option-content">
                        <div className="option-icon">{option.icon}</div>
                        <div className="option-text">
                          <div className="option-title">{option.label}</div>
                          <div className="option-description">{option.description}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              
              {/* Re-added Dependencies Dropdown */}
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
              
              <div className={`custom-prompt ${needsCustomPrompt(question.aiOption) ? 'visible' : ''}`}>
                <h4>Customize AI Instructions:</h4>
                <textarea
                  placeholder={getPromptPlaceholder(question.aiOption)}
                  value={question.customPrompt || ''}
                  onChange={(e) => handleCustomPromptChange(question.id, e.target.value)}
                />
                <p>These instructions will guide how the AI responds to student requests for this question.</p>
              </div>
            </div>
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
      
      {/* Re-added Review Button */}
      {assignment?.id && (
        <div className="navigation-section">
          <Link to={`/teacher-review/${assignment.id}`} className="review-button">
            Review Student Submissions
          </Link>
        </div>
      )}
      
      {autoSaved && (
        <div className="save-indicator">
          <div className="save-indicator-dot"></div>
          <span className="save-indicator-text">Changes saved automatically</span>
        </div>
      )}
    </div>
  );
};

export default AssignmentConfig;