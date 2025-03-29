import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AssignmentConfig.css';

const AI_OPTIONS = [
  { id: 'no_ai', label: 'No AI Allowed', description: 'Students must complete this question without AI assistance.' },
  { id: 'compare', label: 'Compare with AI', description: 'Students answer first, then compare with AI-generated response.' },
  { id: 'hints', label: 'AI Hints Only', description: 'Students can request specific hints from AI but not full answers.' },
  { id: 'guidance', label: 'AI Guidance', description: 'AI can provide process guidance without giving direct answers.' }
];

const AssignmentConfig = ({ assignment, setAssignment }) => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Redirect if no assignment data
  if (!assignment) {
    navigate('/');
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
      if (err.response) {
        console.log('Server responded with:', err.response.status, err.response.data);
      } else if (err.request) {
        console.log('No response received from server');
      } else {
        console.log('Error setting up request:', err.message);
      }
      setError('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="config-container">
      <h1>Configure Assignment: {title}</h1>
      <p className="instructions">
        Select how you want to integrate AI for each question in your assignment.
      </p>
      
      <div className="questions-list">
        {questions.map((question) => (
          <div key={question.id} className="question-card">
            <h3>Question {question.number}</h3>
            <div className="question-preview">
              <p>{question.text}</p>
            </div>
            
            <div className="ai-options">
              <h4>AI Integration Options:</h4>
              {AI_OPTIONS.map((option) => (
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
            
            {(question.aiOption === 'hints' || question.aiOption === 'guidance') && (
              <div className="custom-prompt">
                <h4>Customize AI Guidance:</h4>
                <textarea
                  placeholder="Provide specific instructions for how AI should assist students with this question..."
                  value={question.customPrompt || ''}
                  onChange={(e) => handleCustomPromptChange(question.id, e.target.value)}
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
    </div>
  );
};

export default AssignmentConfig;
