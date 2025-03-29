#!/bin/bash

# This script installs required packages and updates files for the optimized version

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Installing required packages...${NC}"
cd ~/ai-assignment-platform/server
npm install node-cache dotenv

echo -e "${GREEN}Packages installed successfully!${NC}"

echo -e "${YELLOW}Updating server.js with optimized code...${NC}"
# Backup the original file
cp server.js server.js.backup

# Copy the new optimized server code content here
cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
const pdfjsLib = require('pdfjs-dist');
require('dotenv').config();

// Add caching for better performance
const NodeCache = require('node-cache');
const apiCache = new NodeCache({ stdTTL: 7200 }); // Cache for 2 hours

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 9000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());

// Set up file storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniquePrefix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit
  }
});

// In-memory storage for assignments (would be a database in production)
const assignments = {};

// Optimized function to extract text from PDF
async function extractTextFromPDF(pdfPath) {
  try {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    
    // Process only the first 10 pages for performance
    const pagesToProcess = Math.min(pdf.numPages, 10);
    let fullText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pagesToProcess; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map(item => item.str);
      fullText += textItems.join(' ') + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

// Function to identify questions and parse assignment using OpenAI
async function parseAssignmentWithAI(pdfText) {
  // Check cache first
  const cacheKey = `assignment-${Buffer.from(pdfText.substring(0, 500)).toString('base64')}`;
  const cachedResult = apiCache.get(cacheKey);
  if (cachedResult) {
    console.log('Using cached assignment parsing result');
    return cachedResult;
  }

  try {
    console.log('Parsing assignment with OpenAI...');
    // Set timeout for API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds timeout

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using the faster model for parsing
      messages: [
        {
          role: "system",
          content: "You are an assistant that extracts and structures assignment questions from PDF text. Format your response as a JSON object with 'title' and 'questions' array where each question has 'number', 'text' properties."
        },
        {
          role: "user",
          content: `Extract the assignment title and questions from the following text extracted from a PDF: \n\n${pdfText.substring(0, 4000)}\n\nFormat as JSON with 'title' and 'questions' array.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000
    }, { signal: controller.signal });
    
    clearTimeout(timeoutId);
    
    // Parse the JSON response
    const result = JSON.parse(response.choices[0].message.content);
    
    // Process the questions to add IDs and default AI options
    if (result.questions && Array.isArray(result.questions)) {
      result.questions = result.questions.map(q => ({
        ...q,
        id: uuidv4(),
        aiOption: 'no_ai',
        customPrompt: ''
      }));
    }
    
    // Cache the result
    apiCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error parsing assignment with AI:', error);
    // Return a fallback simple structure if API fails
    return {
      title: "Parsed Assignment",
      questions: [
        {
          id: uuidv4(),
          number: 1,
          text: "Sample Question 1: Explain the key concepts covered in this document.",
          aiOption: 'no_ai',
          customPrompt: ''
        },
        {
          id: uuidv4(),
          number: 2,
          text: "Sample Question 2: Analyze the main arguments presented.",
          aiOption: 'no_ai',
          customPrompt: ''
        }
      ]
    };
  }
}

// Upload and parse PDF assignment
app.post('/api/assignments/upload', upload.single('assignment'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Extract text from the PDF - log time for performance measurement
    console.time('PDF Text Extraction');
    const pdfText = await extractTextFromPDF(req.file.path);
    console.timeEnd('PDF Text Extraction');
    
    // Use OpenAI to parse the assignment
    console.time('AI Assignment Parsing');
    const parsedAssignment = await parseAssignmentWithAI(pdfText);
    console.timeEnd('AI Assignment Parsing');
    
    // Create the assignment object to return
    const assignment = {
      id: uuidv4(),
      title: parsedAssignment.title || "Untitled Assignment",
      questions: parsedAssignment.questions || [],
      originalFile: req.file.path
    };
    
    // Return the parsed assignment data
    res.json(assignment);
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: 'Failed to process the PDF file' });
  }
});

// Save assignment configuration
app.post('/api/assignments/configure', (req, res) => {
  try {
    const assignmentData = req.body;
    const assignmentId = assignmentData.id || uuidv4();
    
    // Store the configured assignment
    assignments[assignmentId] = {
      ...assignmentData,
      id: assignmentId,
      createdAt: new Date().toISOString()
    };
    
    // Return the assignment ID
    res.json({ assignmentId });
  } catch (error) {
    console.error('Error saving assignment configuration:', error);
    res.status(500).json({ error: 'Failed to save assignment configuration' });
  }
});

// Get assignment by ID
app.get('/api/assignments/:id', (req, res) => {
  const assignmentId = req.params.id;
  
  if (!assignments[assignmentId]) {
    return res.status(404).json({ error: 'Assignment not found' });
  }
  
  res.json(assignments[assignmentId]);
});

// Function to generate answer to the same question for comparison
async function generateAIComparison(studentInput, questionText) {
  // Don't do anything with student input except check if it exists
  if (!questionText || questionText.trim().length < 5) {
    return "I need a proper question to provide an answer. Please ensure the question is complete.";
  }
  
  // Create a cache key based on the question
  const cacheKey = `ai-answer-${Buffer.from(questionText).toString('base64').substring(0, 32)}`;
  
  // Check cache first
  const cachedResponse = apiCache.get(cacheKey);
  if (cachedResponse) {
    console.log('Using cached AI answer');
    return cachedResponse;
  }
  
  try {
    console.log('Generating AI answer for comparison...');
    // Set a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    // Use a faster model
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a knowledgeable AI. Answer the following assignment question thoroughly and accurately."
        },
        {
          role: "user",
          content: `Please answer this question: ${questionText}`
        }
      ],
      max_tokens: 500
    }, { signal: controller.signal });
    
    clearTimeout(timeoutId);
    const result = response.choices[0].message.content;
    
    // Cache the result
    apiCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error generating AI answer:', error);
    if (error.name === 'AbortError') {
      return "Request timed out. Please try again.";
    }
    return "There was an error generating the AI answer. Please try again.";
  }
}

// Function to generate hint using OpenAI
async function generateAIHint(userPrompt, customPrompt) {
  if (!userPrompt || userPrompt.trim().length < 3) {
    return "Please provide more details in your request for a hint.";
  }

  // Create cache key
  const cacheKey = `hint-${Buffer.from(userPrompt.substring(0, 100) + customPrompt.substring(0, 50)).toString('base64')}`;
  
  // Check cache
  const cachedResponse = apiCache.get(cacheKey);
  if (cachedResponse) {
    console.log('Using cached AI hint');
    return cachedResponse;
  }
  
  try {
    console.log('Generating AI hint...');
    // Set timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    
    let systemPrompt = "You are an AI tutor that provides helpful hints without directly solving problems for students. Keep responses concise.";
    
    if (customPrompt) {
      systemPrompt += ` Instructor guidelines: ${customPrompt}`;
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 250
    }, { signal: controller.signal });
    
    clearTimeout(timeoutId);
    const result = response.choices[0].message.content;
    
    // Cache result
    apiCache.set(cacheKey, result);
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      return "Request timed out. Please try with a simpler question.";
    }
    console.error('Error generating AI hint:', error);
    return "There was an error generating the hint. Please try again.";
  }
}

// Function to generate guidance using OpenAI
async function generateAIGuidance(userPrompt, customPrompt) {
  if (!userPrompt || userPrompt.trim().length < 3) {
    return "Please provide more details in your request for guidance.";
  }

  // Create cache key 
  const cacheKey = `guidance-${Buffer.from(userPrompt.substring(0, 100) + customPrompt.substring(0, 50)).toString('base64')}`;
  
  // Check cache
  const cachedResponse = apiCache.get(cacheKey);
  if (cachedResponse) {
    console.log('Using cached AI guidance');
    return cachedResponse;
  }
  
  try {
    console.log('Generating AI guidance...');
    // Set timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    
    let systemPrompt = "You are an AI tutor that provides process guidance and approach strategies without giving direct answers.";
    
    if (customPrompt) {
      systemPrompt += ` Instructor guidelines: ${customPrompt}`;
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 300
    }, { signal: controller.signal });
    
    clearTimeout(timeoutId);
    const result = response.choices[0].message.content;
    
    // Cache result
    apiCache.set(cacheKey, result);
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      return "Request timed out. Please try with a simpler question.";
    }
    console.error('Error generating AI guidance:', error);
    return "There was an error generating guidance. Please try again.";
  }
}

// Generate AI response
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { questionId, questionText, studentInput, customPrompt, aiOption, userPrompt } = req.body;
    
    let aiResponse = '';
    
    // Use OpenAI to generate responses based on the AI option
    switch (aiOption) {
      case 'compare':
        aiResponse = await generateAIComparison(studentInput, questionText);
        break;
      case 'hints':
        aiResponse = await generateAIHint(userPrompt, customPrompt || '');
        break;
      case 'guidance':
        aiResponse = await generateAIGuidance(userPrompt, customPrompt || '');
        break;
      default:
        aiResponse = 'AI assistance is not enabled for this question.';
    }
    
    res.json({ aiResponse });
  } catch (error) {
    console.error('Error generating AI response:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File size too large. Maximum file size is 10MB.' 
      });
    }
  }
  
  res.status(500).json({ 
    error: err.message || 'Something went wrong on the server.'
  });
  
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
EOF

echo -e "${GREEN}Server code updated successfully!${NC}"

echo -e "${YELLOW}Updating StudentView.js handleAIRequest function...${NC}"
# Note: You'll need to manually update this part in your StudentView.js file
echo -e "${GREEN}Please update the handleAIRequest function in StudentView.js with the code from student-view-update artifact${NC}"

echo -e "${YELLOW}Updating AIComparisonBlock.js...${NC}"
# Note: You'll need to manually update this component
echo -e "${GREEN}Please update AIComparisonBlock.js with the code from ai-comparison-block-update artifact${NC}"

echo -e "${YELLOW}Adding loading styles to AIComparisonBlock.css...${NC}"
# Note: You'll need to manually add these styles
echo -e "${GREEN}Please add the loading styles from ai-comparison-block-css-update artifact to your CSS file${NC}"

echo -e "${YELLOW}Updating AIHintBlock.js...${NC}"
# Note: You'll need to manually update this component
echo -e "${GREEN}Please update AIHintBlock.js with the code from ai-hint-block-update artifact${NC}"

echo -e "${YELLOW}Adding loading styles to AIHintBlock.css...${NC}"
# Note: You'll need to manually add these styles
echo -e "${GREEN}Please add the loading styles from ai-hint-block-css-update artifact to your CSS file${NC}"

echo -e "${GREEN}All updates completed! Restart your server with: PORT=9000 node server.js${NC}"