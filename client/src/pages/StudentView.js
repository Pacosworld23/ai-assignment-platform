import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import QuestionBlock from '../components/QuestionBlock';
import AIComparisonBlock from '../components/AIComparisonBlock';
import AIHintBlock from '../components/AIHintBlock';
import './StudentView.css';

const StudentView = () => {
  const { assignmentId } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentAnswers, setStudentAnswers] = useState({});
  const [aiResponses, setAiResponses] = useState({});
  
  // Prevent copy/paste for questions with no AI allowed
  useEffect(() => {
    const handleCopyPaste = (e) => {
      const target = e.target;
      const questionId = target.dataset.questionId;
      
      if (questionId && assignment) {
        const question = assignment.questions.find(q => q.id === questionId);
        if (question && question.aiOption === 'no_ai') {
          e.preventDefault();
          alert('Copy and paste are disabled for this question as per instructor settings.');
        }
      }
    };
    
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    
    return () => {
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
    };
  }, [assignment]);
  
  // Fetch assignment data
  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const response = await axios.get(`/api/assignments/${assignmentId}`);
        setAssignment(response.data);
        
        // Initialize student answers
        const initialAnswers = {};
        response.data.questions.forEach(question => {
          initialAnswers[question.id] = '';
        });
        setStudentAnswers(initialAnswers);
      } catch (err) {
        console.error('Error fetching assignment:', err);
        setError('Failed to load the assignment. Please try again or contact your instructor.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignment();
  }, [assignmentId]);
  
  const handleAnswerChange = (questionId, answer) => {
    setStudentAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };
  const handleAIRequest = async (questionId, prompt) => {
    try {
      console.log("Starting AI request for question:", questionId);
      const question = assignment.questions.find(q => q.id === questionId);
      
      const requestData = {
        assignmentId,
        questionId,
        questionText: question.text,
        studentInput: studentAnswers[questionId] || '',
        customPrompt: question.customPrompt || '',
        aiOption: question.aiOption,
        userPrompt: prompt
      };
      
      console.log("Request data:", requestData);
      
      // Set to loading state
      setAiResponses(prev => ({
        ...prev,
        [questionId]: 'Loading...'
      }));
      
      const response = await axios.post('/api/ai/generate', requestData);
      console.log("Received API response:", response.data);
      
      // Update with the actual response
      setAiResponses(prev => ({
        ...prev,
        [questionId]: response.data.aiResponse
      }));
      
      console.log("Updated AI responses state:", questionId, response.data.aiResponse);
      return response.data.aiResponse; // Return the response for components that need it
    } catch (err) {
      console.error('Error getting AI response:', err);
      setAiResponses(prev => ({
        ...prev,
        [questionId]: 'Failed to get AI response. Please try again.'
      }));
      return 'Error: ' + err.message;
    }
  };
  
  if (loading) {
    return <div className="loading">Loading assignment...</div>;
  }
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  return (
    <div className="student-view">
      <div className="assignment-header">
        <h1>{assignment.title}</h1>
        <p className="instructions">
          Complete the assignment according to your instructor's guidelines.
          Some questions may allow AI assistance while others require your independent work.
        </p>
      </div>
      
      <div className="questions-container">
        {assignment.questions.map((question) => (
          <div key={question.id} className="question-block">
            <h2>Question {question.number}</h2>
            <div className="question-text">{question.text}</div>
            
            {/* Question answer area with copy/paste prevention */}
            <QuestionBlock 
              questionId={question.id}
              aiOption={question.aiOption}
              value={studentAnswers[question.id] || ''}
              onChange={(value) => handleAnswerChange(question.id, value)}
            />
            
            {/* AI comparison block for compare mode */}
            {question.aiOption === 'compare' && (
              <AIComparisonBlock
                questionId={question.id}
                studentAnswer={studentAnswers[question.id] || ''}
                aiResponse={aiResponses[question.id] || ''}
                onRequestAI={() => handleAIRequest(question.id, 'Compare with my answer')}
              />
            )}
            
            {/* AI hint block for hint mode */}
            {(question.aiOption === 'hints' || question.aiOption === 'guidance') && (
              <AIHintBlock
                questionId={question.id}
                aiOption={question.aiOption}
                aiResponse={aiResponses[question.id] || ''}
                onRequestAI={(prompt) => handleAIRequest(question.id, prompt)}
                customInstructions={question.customPrompt}
              />
            )}
          </div>
        ))}
      </div>
      
      <div className="submission-area">
        <button className="save-button">Save Progress</button>
        <button className="submit-button">Submit Assignment</button>
      </div>
    </div>
  );
};
export default StudentView;
