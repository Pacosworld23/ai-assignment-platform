import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import QuestionBlock from '../components/QuestionBlock';
import TableDisplay from '../components/TableDisplay';
import AIComparisonBlock from '../components/AIComparisonBlock';
import AIHintBlock from '../components/AIHintBlock';
// Import new AI interaction components
import ExampleGenerationBlock from '../components/ExampleGenerationBlock';
import StepFrameworkBlock from '../components/StepFrameworkBlock';
import SocraticMethodBlock from '../components/SocraticMethodBlock';
import ErrorDetectionBlock from '../components/ErrorDetectionBlock';
import GlobalInstructionsPanel from '../components/GlobalInstructionsPanel';
import './StudentView.css';

const StudentView = () => {
  const { assignmentId } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentAnswers, setStudentAnswers] = useState({});
  const [aiResponses, setAiResponses] = useState({});
  const [unlockedQuestions, setUnlockedQuestions] = useState({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  // Track whether global instructions are displayed
  const [showGlobalInstructions, setShowGlobalInstructions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [grade, setGrade] = useState(null);
  
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
        
        // Initialize unlocked questions
        const initialUnlocked = {};
        response.data.questions.forEach(question => {
          // First question is always unlocked, others depend on dependencies
          initialUnlocked[question.id] = 
            question.number === 1 || 
            !question.dependencies || 
            question.dependencies.length === 0;
        });
        setUnlockedQuestions(initialUnlocked);
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
    const handleSubmitAssignment = async () => {
      if (Object.values(studentAnswers).some(answer => !answer.trim())) {
        alert('Please answer all questions before submitting.');
        return;
      }
      
      setSubmitting(true);
      
      try {
        const response = await axios.post('/api/assignments/submit', {
          assignmentId,
          studentId: 'student123', // In a real app, get from auth context
          answers: studentAnswers
        });
        
        setGrade(response.data.grade);
        setSubmitted(true);
      } catch (err) {
        console.error('Error submitting assignment:', err);
        setError('Failed to submit assignment. Please try again.');
      } finally {
        setSubmitting(false);
      }
    };
    // Check if completing this question unlocks any other questions
    if (assignment) {
      // Get questions that depend on this one
      const dependentQuestions = assignment.questions.filter(q => 
        q.dependencies && q.dependencies.includes(questionId)
      );
      
      if (dependentQuestions.length > 0) {
        const updatedUnlocked = { ...unlockedQuestions };
        
        // For each dependent question, check if all its dependencies are satisfied
        dependentQuestions.forEach(depQuestion => {
          // A question is unlocked if it has an answer for all its dependencies
          const allDependenciesMet = depQuestion.dependencies.every(depId => 
            studentAnswers[depId] && studentAnswers[depId].trim().length > 0
          );
          
          if (allDependenciesMet) {
            updatedUnlocked[depQuestion.id] = true;
          }
        });
        
        setUnlockedQuestions(updatedUnlocked);
      }
    }
  };
  
const handleAIRequest = async (questionId, prompt) => {
  try {
    console.log("Starting AI request for question:", questionId);
    const question = assignment.questions.find(q => q.id === questionId);
    
    // Prepare the question text including table data if available
    let fullQuestionText = question.text;
    
    if (question.tableData && Array.isArray(question.tableData) && question.tableData.length > 0) {
      fullQuestionText += "\n\nTable data:\n";
      question.tableData.forEach(row => {
        fullQuestionText += row.join(" | ") + "\n";
      });
    }
    
    const requestData = {
      assignmentId,
      questionId,
      questionText: fullQuestionText, // Include table data
      studentInput: studentAnswers[questionId] || '',
      customPrompt: question.customPrompt || '',
      aiOption: question.aiOption,
      userPrompt: prompt
    };
    
    // Rest of the function remains the same
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
    return response.data.aiResponse;
  } catch (err) {
    console.error('Error getting AI response:', err);
    setAiResponses(prev => ({
      ...prev,
      [questionId]: 'Failed to get AI response. Please try again.'
    }));
    return 'Error: ' + err.message;
  }
};
  
  const handleSaveProgress = async () => {
    try {
      // Save all progress to the server
      await axios.post(`/api/assignments/${assignmentId}/progress`, {
        studentAnswers,
        timestamp: new Date().toISOString()
      });
      
      alert('Progress saved successfully!');
    } catch (err) {
      console.error('Error saving progress:', err);
      alert('Failed to save progress. Please try again.');
    }
  };
  
  const handleSubmitAssignment = async () => {
    try {
      // Submit the assignment
      await axios.post(`/api/assignments/${assignmentId}/submit`, {
        studentAnswers,
        timestamp: new Date().toISOString()
      });
      
      alert('Assignment submitted successfully!');
    } catch (err) {
      console.error('Error submitting assignment:', err);
      alert('Failed to submit assignment. Please try again.');
    }
  };
  
  // Helper function to render the appropriate AI interaction component
  const renderAIComponent = (question) => {
    const questionId = question.id;
    const aiOption = question.aiOption;
    const aiResponse = aiResponses[questionId];
    // At the start of renderAIComponent
    console.log("Rendering AI component for mode:", aiOption, "Question ID:", questionId);
    
    switch (aiOption) {
      case 'compare':
        return (
          <AIComparisonBlock
            questionId={questionId}
            studentAnswer={studentAnswers[questionId] || ''}
            aiResponse={aiResponse || ''}
            onRequestAI={() => handleAIRequest(questionId, 'Compare with my answer')}
          />
        );
      case 'hints':
        return (
          <AIHintBlock
            questionId={questionId}
            aiOption={aiOption}
            aiResponse={aiResponse || ''}
            onRequestAI={(prompt) => handleAIRequest(questionId, prompt)}
            customInstructions={question.customPrompt}
          />
        );
      case 'guidance':
        return (
          <AIHintBlock
            questionId={questionId}
            aiOption={aiOption}
            aiResponse={aiResponse || ''}
            onRequestAI={(prompt) => handleAIRequest(questionId, prompt)}
            customInstructions={question.customPrompt}
          />
        );
      case 'examples':
        return (
          <ExampleGenerationBlock
            questionId={questionId}
            aiResponse={aiResponse || ''}
            onRequestAI={(prompt) => handleAIRequest(questionId, prompt)}
            customInstructions={question.customPrompt}
          />
        );
      case 'step_framework':
        return (
          <StepFrameworkBlock
            questionId={questionId}
            aiResponse={aiResponse || ''}
            onRequestAI={(prompt) => handleAIRequest(questionId, prompt)}
            customInstructions={question.customPrompt}
          />
        );
      case 'socratic':
        return (
          <SocraticMethodBlock
            questionId={questionId}
            aiResponse={aiResponse || ''}
            onRequestAI={(prompt) => handleAIRequest(questionId, prompt)}
            customInstructions={question.customPrompt}
          />
        );
      case 'error_detection':
        return (
          <ErrorDetectionBlock
            questionId={questionId}
            aiResponse={aiResponse || ''}
            onRequestAI={(prompt) => handleAIRequest(questionId, prompt)}
            customInstructions={question.customPrompt}
          />
        );
      default:
        return null;
    }
  };
  
  const handleQuestionSelect = (index) => {
    // Only allow selecting unlocked questions
    if (assignment && assignment.questions[index] && 
        unlockedQuestions[assignment.questions[index].id]) {
      setActiveQuestionIndex(index);
    }
  };
  
  const handleNextQuestion = () => {
    if (assignment) {
      let nextIndex = activeQuestionIndex + 1;
      
      // Find the next unlocked question
      while (nextIndex < assignment.questions.length) {
        if (unlockedQuestions[assignment.questions[nextIndex].id]) {
          setActiveQuestionIndex(nextIndex);
          break;
        }
        nextIndex++;
      }
    }
  };
  
  const handlePreviousQuestion = () => {
    if (assignment) {
      let prevIndex = activeQuestionIndex - 1;
      
      // Find the previous unlocked question
      while (prevIndex >= 0) {
        if (unlockedQuestions[assignment.questions[prevIndex].id]) {
          setActiveQuestionIndex(prevIndex);
          break;
        }
        prevIndex--;
      }
    }
  };
  
  if (loading) {
    return <div className="loading">Loading assignment...</div>;
  }
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  // Get the active question
  const activeQuestion = assignment.questions[activeQuestionIndex];
  
  return (
    <div className="student-view">
      <div className="assignment-header">
        <h1>{assignment.title}</h1>
        
        {/* Add global instructions toggle button */}
        {assignment.globalInstructions && (
          <div className="global-instructions-toggle">
            <button 
              className={`toggle-button ${showGlobalInstructions ? 'active' : ''}`}
              onClick={() => setShowGlobalInstructions(!showGlobalInstructions)}
            >
              {showGlobalInstructions ? 'Hide Instructions' : 'Show Instructions'}
            </button>
          </div>
        )}
        
        <p className="instructions">
          Complete the assignment according to your instructor's guidelines.
          Some questions may allow AI assistance while others require your independent work.
        </p>
      </div>
      
      {/* Global Instructions Panel - appears below header when showGlobalInstructions is true */}
      {assignment.globalInstructions && showGlobalInstructions && (
        <GlobalInstructionsPanel 
          instructions={assignment.globalInstructions}
          onClose={() => setShowGlobalInstructions(false)}
        />
      )}
      
      {/* Table Display - appears after instructions, before question navigation */}
      {assignment.tables && assignment.tables.length > 0 && (
        <TableDisplay tables={assignment.tables} />
      )}
      
      {/* Horizontal Question Navigation Tabs */}
      <div className="question-tabs">
        {assignment.questions.map((question, index) => (
          <button 
            key={question.id}
            className={`question-tab ${index === activeQuestionIndex ? 'active' : ''} ${!unlockedQuestions[question.id] ? 'locked' : ''}`}
            onClick={() => handleQuestionSelect(index)}
            disabled={!unlockedQuestions[question.id]}
          >
            {!unlockedQuestions[question.id] && (
              <span className="lock-indicator">
                <i className="material-icons lock-icon-small">lock</i>
              </span>
            )}
            Question {question.number}
          </button>
        ))}
      </div>
      
      {/* Active Question Container */}
      <div className="active-question-container">
        <div className="question-block">
          <h2>Question {activeQuestion.number}</h2>
          
          {!unlockedQuestions[activeQuestion.id] ? (
            <div className="question-locked-message">
              <div className="lock-icon">
                <i className="material-icons">lock</i>
              </div>
              <p>This question will be unlocked after you complete previous questions.</p>
            </div>
          ) : (
            <>
              <div className="question-text">{activeQuestion.text}</div>
              
              {/* Question answer area with copy/paste prevention */}
              <QuestionBlock 
               questionId={activeQuestion.id}
               aiOption={activeQuestion.aiOption}
               value={studentAnswers[activeQuestion.id] || ''}
               onChange={(value) => handleAnswerChange(activeQuestion.id, value)}
               question={activeQuestion} // Pass the active question object
              />
              
              {/* Render the appropriate AI interaction component based on the AI option */}
              {activeQuestion.aiOption !== 'no_ai' && renderAIComponent(activeQuestion)}
            </>
          )}
        </div>
        
        {/* Navigation Controls */}
        <div className="question-navigation">
          <button 
            className="nav-button prev-button" 
            onClick={handlePreviousQuestion}
            disabled={activeQuestionIndex === 0 || !assignment.questions.slice(0, activeQuestionIndex).some(q => unlockedQuestions[q.id])}
          >
            Previous Question
          </button>
          <span className="question-indicator">
            Question {activeQuestionIndex + 1} of {assignment.questions.length}
          </span>
          <button 
            className="nav-button next-button" 
            onClick={handleNextQuestion}
            disabled={activeQuestionIndex === assignment.questions.length - 1 || !assignment.questions.slice(activeQuestionIndex + 1).some(q => unlockedQuestions[q.id])}
          >
            Next Question
          </button>
        </div>
      </div>
      
      <div className="submission-area">
        {!submitted ? (
          <>
            <button 
              className="save-button"
              onClick={handleSaveProgress}
            >
              Save Progress
            </button>
            <button 
              className="submit-button"
              onClick={handleSubmitAssignment}
              disabled={submitting || Object.values(unlockedQuestions).some(unlocked => !unlocked)}
            >
              {submitting ? 'Submitting...' : 'Submit Assignment'}
            </button>
          </>
        ) : (
          <div className="submission-confirmation">
            <h3>Assignment Submitted Successfully!</h3>
            {grade && (
              <div className="grade-display">
                <h4>Your Grade</h4>
                <div className="grade-score">{grade.totalScore}%</div>
                <div className="grade-breakdown">
                  {grade.criteria.map((criterion, index) => (
                    <div key={index} className="criterion-grade">
                      <span className="criterion-name">{criterion.name}</span>
                      <span className="criterion-score">{criterion.achievedPoints}/{criterion.totalPoints}</span>
                    </div>
                  ))}
                </div>
                <div className="grade-feedback">
                  <h5>AI Feedback</h5>
                  <p>{grade.feedback}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentView;