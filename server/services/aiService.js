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

    console.log("Processing AI option:", aiOption);

    // Different handling based on AI option
    switch(aiOption) {
      case 'compare':
        return await this.generateComparison(questionText, studentInput, globalInstructions);
      case 'hints':
        return await this.generateHint(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers);
      case 'guidance':
        return await this.generateGuidance(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers);
      case 'examples':
        return await this.generateExamples(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers);
      case 'step_framework':
        return await this.generateStepFramework(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers);
      case 'socratic':
        return await this.generateSocraticQuestions(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers);
      case 'error_detection':
        return await this.generateErrorDetection(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers);
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
   * Generate examples for the student
   */
  async generateExamples(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers) {
    if (!userPrompt || userPrompt.trim().length < 3) {
      return "Please provide more details for what kind of examples you need.";
    }

    // Create cache key
    const cacheKey = `examples-${Buffer.from(questionText + userPrompt + JSON.stringify(dependencyAnswers || {})).toString('base64').substring(0, 64)}`;
    
    // Check cache
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Using cached AI examples');
      return cachedResponse;
    }
    
    try {
      console.log('Generating examples with context...');
      
      // Set timeout for API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Create system prompt with context
      let systemPrompt = "You are an AI tutor that provides clear examples to help students understand concepts and solve problems. Provide varied, relevant examples that illustrate the concept without directly solving the student's specific problem.";
      
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
          { role: "user", content: `Question: ${questionText}\n\nStudent's current work: ${studentInput || "Not started yet"}\n\nRequest for examples: ${userPrompt}` }
        ],
        max_tokens: 700,
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
      console.error('Error generating examples:', error);
      return "There was an error generating examples. Please try again.";
    }
  }

  /**
   * Generate step-by-step framework for solving a problem
   */
  async generateStepFramework(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers) {
    // Create cache key
    const cacheKey = `stepframework-${Buffer.from(questionText + (userPrompt || "") + JSON.stringify(dependencyAnswers || {})).toString('base64').substring(0, 64)}`;
    
    // Check cache
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Using cached step framework');
      return cachedResponse;
    }
    
    try {
      console.log('Generating step framework...');
      
      // Set timeout for API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Create system prompt
      let systemPrompt = "You are an AI tutor that helps students understand how to approach complex problems. Provide a methodical step-by-step framework for solving the problem without giving the actual solution. Your goal is to teach the process, not provide the answer.";
      
      if (globalInstructions) {
        systemPrompt += `\n\nAssignment Instructions: ${globalInstructions}`;
      }
      
      if (customPrompt) {
        systemPrompt += `\n\nInstructor Guidelines: ${customPrompt}`;
      }
      
      const promptText = userPrompt 
        ? `The student is asking: ${userPrompt}\n\nThe question is: ${questionText}`
        : `Please provide a step-by-step framework for solving this problem: ${questionText}`;
        
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptText }
        ],
        max_tokens: 800,
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
      console.error('Error generating step framework:', error);
      return "There was an error generating a step-by-step framework. Please try again.";
    }
  }

  /**
   * Generate Socratic questions to guide student thinking
   */
  async generateSocraticQuestions(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers) {
    // Create cache key
    const cacheKey = `socratic-${Buffer.from(questionText + (userPrompt || "") + (studentInput || "") + JSON.stringify(dependencyAnswers || {})).toString('base64').substring(0, 64)}`;
    
    // Check cache
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Using cached Socratic questions');
      return cachedResponse;
    }
    
    try {
      console.log('Generating Socratic questions...');
      
      // Set timeout for API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Create system prompt
      let systemPrompt = "You are an AI tutor that uses the Socratic method to help students think critically and discover solutions on their own. Ask thoughtful, guiding questions that lead the student toward understanding without directly providing answers.";
      
      if (globalInstructions) {
        systemPrompt += `\n\nAssignment Instructions: ${globalInstructions}`;
      }
      
      if (customPrompt) {
        systemPrompt += `\n\nInstructor Guidelines: ${customPrompt}`;
      }
      
      const userContent = `Question: ${questionText}\n\n${studentInput ? `Student's current work: ${studentInput}\n\n` : ''}${userPrompt ? `Student's request: ${userPrompt}` : 'Please provide Socratic questions to help the student think through this problem.'}`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        max_tokens: 600,
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
      console.error('Error generating Socratic questions:', error);
      return "There was an error generating Socratic questions. Please try again.";
    }
  }

  /**
   * Generate error detection and correction help
   */
  async generateErrorDetection(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers) {
    if (!studentInput || studentInput.trim().length < 5) {
      return "Please provide your work first so I can help identify potential errors.";
    }

    // Create cache key
    const cacheKey = `errordetection-${Buffer.from(questionText + studentInput + (userPrompt || "")).toString('base64').substring(0, 64)}`;
    
    // Check cache
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Using cached error detection');
      return cachedResponse;
    }
    
    try {
      console.log('Generating error detection analysis...');
      
      // Set timeout for API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Create system prompt
      let systemPrompt = "You are an AI tutor that helps students identify potential errors in their work without directly solving the problem for them. Point out possible mistakes, misconceptions, or areas for improvement while encouraging the student to correct their own work.";
      
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
          { role: "user", content: `Question: ${questionText}\n\nMy work: ${studentInput}\n\n${userPrompt ? `Additional request: ${userPrompt}` : 'Please help me identify any errors or areas for improvement in my work.'}` }
        ],
        max_tokens: 750,
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
      console.error('Error generating error detection:', error);
      return "There was an error analyzing your work. Please try again.";
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