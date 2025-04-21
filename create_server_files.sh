#!/bin/bash

# Create directories if they don't exist
mkdir -p server/services
mkdir -p server/controllers
mkdir -p server/routes

# Create enhanced AI service file
cat > server/services/aiService.js << 'EOL'
const { OpenAI } = require('openai');
const NodeCache = require('node-cache');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache for responses to improve performance
const aiCache = new NodeCache({ stdTTL: 7200 }); // 2 hour cache

/**
 * Enhanced AI service that maintains context across related questions
 */
class EnhancedAIService {
  
  /**
   * Generate an AI response for a student's question
   * @param {Object} options - Configuration for the AI request
   * @param {string} options.questionId - ID of the current question
   * @param {string} options.questionText - Text of the current question
   * @param {string} options.aiOption - Type of AI assistance (hints, guidance, compare)
   * @param {string} options.userPrompt - The student's specific request
   * @param {string} options.customPrompt - Instructor's custom guidance for the AI
   * @param {string} options.studentInput - The student's current answer
   * @param {string} options.globalInstructions - The overall assignment instructions
   * @param {Object} options.dependencyAnswers - Previous answers that this question depends on
   */
  async generateResponse(options) {
    const {
      questionId,
      questionText,
      aiOption,
      userPrompt,
      customPrompt,
      studentInput,
      globalInstructions,
      dependencyAnswers
    } = options;

    // Different handling based on AI option
    switch(aiOption) {
      case 'compare':
        return this.generateComparison(questionText, studentInput, globalInstructions);
      case 'hints':
        return this.generateHint(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers);
      case 'guidance':
        return this.generateGuidance(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers);
      default:
        return "AI assistance is not enabled for this question.";
    }
  }

  /**
   * Generate a hint for the student
   */
  async generateHint(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers) {
    if (!userPrompt || userPrompt.trim().length < 3) {
      return "Please provide more details in your request for a hint.";
    }

    // Create cache key
    const cacheKey = `hint-${Buffer.from(questionText + userPrompt + JSON.stringify(dependencyAnswers || {})).toString('base64').substring(0, 64)}`;
    
    // Check cache
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Using cached AI hint');
      return cachedResponse;
    }
    
    try {
      console.log('Generating AI hint with context...');
      // Prepare context from previous answers
      let contextText = '';
      if (dependencyAnswers && Object.keys(dependencyAnswers).length > 0) {
        contextText = 'Previous related answers:\n';
        for (const [id, answer] of Object.entries(dependencyAnswers)) {
          contextText += `Question: ${answer.questionText}\nStudent's Answer: ${answer.content}\n\n`;
        }
      }
      
      // Set timeout for API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Create system prompt with context
      let systemPrompt = "You are an AI tutor that provides helpful hints without directly solving problems for students. Keep responses concise.";
      
      if (globalInstructions) {
        systemPrompt += `\n\nAssignment Instructions: ${globalInstructions}`;
      }
      
      if (customPrompt) {
        systemPrompt += `\n\nInstructor Guidelines: ${customPrompt}`;
      }
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k", // Using a larger context model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${contextText ? contextText + "\n" : ""}Current question: ${questionText}\n\nStudent's current work: ${studentInput || "Not started yet"}\n\nStudent's request: ${userPrompt}` }
        ],
        max_tokens: 500,
        temperature: 0.7
      }, { signal: controller.signal });
      
      clearTimeout(timeoutId);
      const result = response.choices[0].message.content;
      
      // Cache result
      aiCache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        return "Request timed out. Please try with a simpler question.";
      }
      console.error('Error generating AI hint:', error);
      return "There was an error generating the hint. Please try again.";
    }
  }

  /**
   * Generate process guidance for the student
   */
  async generateGuidance(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers) {
    if (!userPrompt || userPrompt.trim().length < 3) {
      return "Please provide more details in your request for guidance.";
    }

    // Create cache key 
    const cacheKey = `guidance-${Buffer.from(questionText + userPrompt + JSON.stringify(dependencyAnswers || {})).toString('base64').substring(0, 64)}`;
    
    // Check cache
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Using cached AI guidance');
      return cachedResponse;
    }
    
    try {
      console.log('Generating AI guidance with context...');
      
      // Prepare context from previous answers
      let contextText = '';
      if (dependencyAnswers && Object.keys(dependencyAnswers).length > 0) {
        contextText = 'Previous related answers:\n';
        for (const [id, answer] of Object.entries(dependencyAnswers)) {
          contextText += `Question: ${answer.questionText}\nStudent's Answer: ${answer.content}\n\n`;
        }
      }
      
      // Set timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Create system prompt with context
      let systemPrompt = "You are an AI tutor that provides process guidance and approach strategies without giving direct answers.";
      
      if (globalInstructions) {
        systemPrompt += `\n\nAssignment Instructions: ${globalInstructions}`;
      }
      
      if (customPrompt) {
        systemPrompt += `\n\nInstructor Guidelines: ${customPrompt}`;
      }
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${contextText ? contextText + "\n" : ""}Current question: ${questionText}\n\nStudent's current work: ${studentInput || "Not started yet"}\n\nStudent's request: ${userPrompt}` }
        ],
        max_tokens: 650,
        temperature: 0.7
      }, { signal: controller.signal });
      
      clearTimeout(timeoutId);
      const result = response.choices[0].message.content;
      
      // Cache result
      aiCache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        return "Request timed out. Please try with a simpler question.";
      }
      console.error('Error generating AI guidance:', error);
      return "There was an error generating guidance. Please try again.";
    }
  }

  /**
   * Generate a comparison solution
   */
  async generateComparison(questionText, studentInput, globalInstructions) {
    if (!questionText || questionText.trim().length < 5) {
      return "I need a proper question to provide an answer. Please ensure the question is complete.";
    }
    
    // Create a cache key based on the question
    const cacheKey = `ai-answer-${Buffer.from(questionText + (globalInstructions || "")).toString('base64').substring(0, 64)}`;
    
    // Check cache first
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Using cached AI answer');
      return cachedResponse;
    }
    
    try {
      console.log('Generating AI answer for comparison...');
      // Set a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      let systemPrompt = "You are a knowledgeable AI. Answer the following assignment question thoroughly and accurately.";
      
      if (globalInstructions) {
        systemPrompt += `\n\nAssignment Context: ${globalInstructions}`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please answer this question: ${questionText}` }
        ],
        max_tokens: 800,
        temperature: 0.7
      }, { signal: controller.signal });
      
      clearTimeout(timeoutId);
      const result = response.choices[0].message.content;
      
      // Cache the result
      aiCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error generating AI answer:', error);
      if (error.name === 'AbortError') {
        return "Request timed out. Please try again.";
      }
      return "There was an error generating the AI answer. Please try again.";
    }
  }

  /**
   * Clear cache entries related to a specific assignment
   */
  clearAssignmentCache(assignmentId) {
    // Implement cache clearing logic if needed
    console.log(`Clearing cache for assignment: ${assignmentId}`);
    // This would require tracking which cache keys belong to which assignment
  }
}

module.exports = new EnhancedAIService();
EOL

# Create assignment parser service file
cat > server/services/assignmentParserService.js << 'EOL'
const { OpenAI } = require('openai');
const NodeCache = require('node-cache');
const { v4: uuidv4 } = require('uuid');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache for parsed assignments
const parseCache = new NodeCache({ stdTTL: 86400 }); // 24 hour cache

/**
 * Service for parsing assignments from PDF text using AI
 */
class AssignmentParserService {
  /**
   * Parse an assignment from PDF text using AI
   * @param {string} pdfText - Text extracted from PDF
   * @returns {Object} - Parsed assignment data
   */
  async parseAssignment(pdfText) {
    // Check cache first
    const cacheKey = `assignment-${Buffer.from(pdfText.substring(0, 500)).toString('base64')}`;
    const cachedResult = parseCache.get(cacheKey);
    if (cachedResult) {
      console.log('Using cached assignment parsing result');
      return cachedResult;
    }

    try {
      console.log('Parsing assignment with OpenAI...');
      // Set timeout for API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds timeout

      const promptText = `
      Extract the following from the provided assignment text:
      1. The assignment title
      2. Global instructions that apply to all questions
      3. Each individual question, numbered in order
      4. For each question, identify if it depends on previous questions
      
      Format your response as a JSON object with:
      - "title": The assignment title
      - "globalInstructions": Overall instructions for the assignment
      - "questions": Array of questions, each with:
        - "number": The question number
        - "text": The question text
        - "dependsOn": Array of question numbers this question depends on (empty if none)
        - "requiredForNext": Boolean indicating if this question is required for the next
      
      Here is the assignment text:
      ${pdfText.substring(0, 6000)}
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k", // Using a larger model for better parsing
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing educational assignments. You can identify interdependent problems and extract structured information from assignment documents."
          },
          {
            role: "user",
            content: promptText
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.3
      }, { signal: controller.signal });
      
      clearTimeout(timeoutId);
      
      // Parse the JSON response
      const result = JSON.parse(response.choices[0].message.content);
      
      // Process the questions to add IDs and default AI options
      if (result.questions && Array.isArray(result.questions)) {
        // Convert question numbers to question IDs in dependsOn
        const questionIdMap = {};
        
        // First pass: generate IDs
        result.questions = result.questions.map(q => {
          const id = uuidv4();
          questionIdMap[q.number] = id;
          
          return {
            ...q,
            id,
            aiOption: 'no_ai',
            customPrompt: ''
          };
        });
        
        // Second pass: convert dependsOn from numbers to IDs
        result.questions = result.questions.map(q => {
          let dependsOn = [];
          
          if (q.dependsOn && Array.isArray(q.dependsOn) && q.dependsOn.length > 0) {
            dependsOn = q.dependsOn
              .map(num => questionIdMap[num])
              .filter(id => id); // Remove any undefined values
          }
          
          return {
            ...q,
            dependsOn
          };
        });
      }
      
      // Cache the result
      parseCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error parsing assignment with AI:', error);
      // Return a fallback simple structure if API fails
      return {
        title: "Parsed Assignment",
        globalInstructions: "Please complete all questions in this assignment.",
        questions: [
          {
            id: uuidv4(),
            number: 1,
            text: "Sample Question 1: Explain the key concepts covered in this document.",
            aiOption: 'no_ai',
            customPrompt: '',
            dependsOn: [],
            requiredForNext: false
          },
          {
            id: uuidv4(),
            number: 2,
            text: "Sample Question 2: Analyze the main arguments presented.",
            aiOption: 'no_ai',
            customPrompt: '',
            dependsOn: [],
            requiredForNext: false
          }
        ]
      };
    }
  }
  
  /**
   * Clear the parsing cache
   */
  clearCache() {
    parseCache.flushAll();
    console.log('Parser cache cleared');
  }
}

module.exports = new AssignmentParserService();
EOL

# Create AI controller file
cat > server/controllers/aiController.js << 'EOL'
const enhancedAIService = require('../services/aiService');

/**
 * AI Controller - Handles all AI-related API endpoints
 */
class AIController {
  
  /**
   * Generate AI response based on the question type and student request
   */
  async generateResponse(req, res) {
    try {
      const {
        assignmentId,
        questionId,
        questionText,
        studentInput,
        customPrompt,
        aiOption,
        userPrompt,
        globalInstructions,
        dependencies
      } = req.body;
      
      console.log(`AI request for question ${questionId}, type: ${aiOption}`);
      
      // Validate required fields
      if (!questionId || !questionText || !aiOption) {
        return res.status(400).json({ 
          error: 'Missing required fields for AI generation'
        });
      }
      
      // Process dependency answers
      let dependencyAnswers = {};
      if (dependencies && dependencies.length > 0) {
        // In a real application, you would fetch these from a database
        // Here we're assuming they're passed in the request
        dependencyAnswers = dependencies.reduce((acc, dep) => {
          acc[dep.questionId] = {
            questionText: dep.questionText,
            content: dep.studentAnswer
          };
          return acc;
        }, {});
      }
      
      // Generate the AI response
      const aiResponse = await enhancedAIService.generateResponse({
        questionId,
        questionText,
        aiOption,
        userPrompt,
        customPrompt,
        studentInput,
        globalInstructions,
        dependencyAnswers
      });
      
      // Return the response
      res.json({ aiResponse });
      
    } catch (error) {
      console.error('Error in AI controller:', error);
      res.status(500).json({ 
        error: 'Failed to generate AI response',
        details: error.message 
      });
    }
  }
  
  /**
   * Save student-AI interaction for analysis and context building
   */
  async saveInteraction(req, res) {
    try {
      const {
        assignmentId,
        questionId,
        studentId,
        prompt,
        response,
        timestamp
      } = req.body;
      
      // In a real implementation, this would be saved to a database
      console.log(`Saving AI interaction: ${questionId}, ${prompt.substring(0, 30)}...`);
      
      // For now, just acknowledge the save
      res.json({ success: true });
      
    } catch (error) {
      console.error('Error saving AI interaction:', error);
      res.status(500).json({ error: 'Failed to save interaction' });
    }
  }
}

module.exports = new AIController();
EOL

# Create API routes file
cat > server/routes/api.js << 'EOL'
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// AI routes
router.post('/ai/generate', aiController.generateResponse);
router.post('/ai/interaction', aiController.saveInteraction);

// TODO: Add other routes for assignment management here

module.exports = router;
EOL

echo "Files created successfully in the server directory!"