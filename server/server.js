const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const pdfjsLib = require('pdfjs-dist');
require('dotenv').config();

// Import OpenAI
const { OpenAI } = require('openai');

// Add caching for better performance
const NodeCache = require('node-cache');
const apiCache = new NodeCache({ stdTTL: 7200 }); // Cache for 2 hours

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Import our new services and routes
const assignmentParserService = require('./services/assignmentParserService');
const apiRoutes = require('./routes/api');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 9000;

// Middleware - Make sure all middleware is defined at the top
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Apply API routes
app.use('/api', apiRoutes);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads directory:', uploadDir);
}

// Set up file storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
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
    console.log('Checking file type:', file.mimetype);
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      console.log('Rejected file type:', file.mimetype);
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit
  }
});

// In-memory storage for assignments (would be a database in production)
const assignments = {};

// In-memory storage for student progress (would be a database in production)
const studentProgress = {};

async function extractTextFromPDF(pdfPath) {
  try {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    
    // Process only the first 10 pages for performance
    const pagesToProcess = Math.min(pdf.numPages, 10);
    let result = {
      text: '',
      tables: []
    };
    
    // Extract text and attempt to identify tables from each page
    for (let i = 1; i <= pagesToProcess; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Get more detailed content including positions
      const items = textContent.items;
      const pageText = items.map(item => item.str).join(' ') + '\n';
      result.text += pageText;
      
      // Basic table detection heuristic
      const possibleTables = detectTables(items, page.view);
      if (possibleTables.length > 0) {
        result.tables = result.tables.concat(possibleTables.map(t => ({
          page: i,
          content: t,
        })));
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}
// Add this helper function to detect tables
function detectTables(textItems, pageView) {
  // Group items by vertical position (potential rows)
  const rows = {};
  const yThreshold = 5; // pixels threshold for same row

  textItems.forEach(item => {
    const y = Math.round(item.transform[5]);
    const x = item.transform[4];
    const text = item.str.trim();
    
    // Skip empty items
    if (!text) return;
    
    // Find nearest row within threshold
    let rowY = y;
    Object.keys(rows).forEach(existingY => {
      if (Math.abs(y - parseInt(existingY)) < yThreshold) {
        rowY = parseInt(existingY);
      }
    });
    
    if (!rows[rowY]) {
      rows[rowY] = [];
    }
    
    rows[rowY].push({
      text,
      x
    });
  });
  
  // Sort rows by Y position (top to bottom)
  const sortedYPositions = Object.keys(rows).map(Number).sort((a, b) => b - a);
  
  // Detect potential tables
  const tables = [];
  let tableRows = [];
  let consistentColumns = false;
  let columnCount = 0;
  
  for (let i = 0; i < sortedYPositions.length; i++) {
    const y = sortedYPositions[i];
    const rowItems = rows[y].sort((a, b) => a.x - b.x);
    
    // Check if this row has table-like characteristics
    const isTableRow = 
      // Has numbers or currency
      rowItems.some(item => /(\$|€|£|\d+(\.\d+)?%?)/.test(item.text)) ||
      // Year or dates
      rowItems.some(item => /(\b(19|20)\d{2}\b|Year|Date)/.test(item.text)) ||
      // Headers
      rowItems.some(item => /(Total|Sum|Average|Mean|Company|Name|Rate|Value)/.test(item.text));
    
    if (isTableRow) {
      // If this is a new table
      if (tableRows.length === 0) {
        columnCount = rowItems.length;
      }
      
      // Check if column count is consistent (within 1)
      consistentColumns = Math.abs(rowItems.length - columnCount) <= 1;
      
      if (consistentColumns || tableRows.length === 0) {
        tableRows.push(rowItems.map(item => item.text));
        columnCount = Math.max(columnCount, rowItems.length);
      } else if (tableRows.length > 0) {
        // End of table, save it if it has at least 2 rows
        if (tableRows.length >= 2) {
          tables.push(normalizeTable(tableRows));
        }
        
        // Start a new table
        tableRows = [rowItems.map(item => item.text)];
        columnCount = rowItems.length;
      }
    } else if (tableRows.length > 0) {
      // Non-table row encountered after table rows
      // Save the table if it has at least 2 rows
      if (tableRows.length >= 2) {
        tables.push(normalizeTable(tableRows));
      }
      tableRows = [];
    }
  }
  
  // Add the last table if there is one
  if (tableRows.length >= 2) {
    tables.push(normalizeTable(tableRows));
  }
  
  return tables;
}

// Helper to normalize table structure
function normalizeTable(tableRows) {
  // Find the maximum number of columns
  const maxColumns = Math.max(...tableRows.map(row => row.length));
  
  // Normalize all rows to have the same number of columns
  return {
    rows: tableRows.map(row => {
      const normalizedRow = [...row];
      while (normalizedRow.length < maxColumns) {
        normalizedRow.push(''); // Fill with empty cells
      }
      return normalizedRow;
    })
  };
}

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
async function generateAIHint(userPrompt, customPrompt, questionText) {
  if (!userPrompt || userPrompt.trim().length < 3) {
    return "Please provide more details in your request for a hint.";
  }

  // Create cache key
  const cacheKey = `hint-${Buffer.from(questionText.substring(0, 100) + userPrompt.substring(0, 50) + customPrompt.substring(0, 50)).toString('base64')}`;
  
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
        { role: "user", content: `Question: ${questionText}\n\nStudent request: ${userPrompt}` }
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
async function generateAIGuidance(userPrompt, customPrompt, questionText) {
  if (!userPrompt || userPrompt.trim().length < 3) {
    return "Please provide more details in your request for guidance.";
  }

  // Create cache key 
  const cacheKey = `guidance-${Buffer.from(questionText.substring(0, 100) + userPrompt.substring(0, 50) + customPrompt.substring(0, 50)).toString('base64')}`;
  
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
        { role: "user", content: `Question: ${questionText}\n\nStudent request: ${userPrompt}` }
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

// Function to generate example using OpenAI (without solving the problem)
async function generateAIExamples(userPrompt, customPrompt, questionText) {
  if (!userPrompt || userPrompt.trim().length < 3) {
    return "Please provide more details about the type of examples you need.";
  }

  // Create cache key
  const cacheKey = `examples-${Buffer.from(questionText.substring(0, 100) + userPrompt.substring(0, 50) + customPrompt.substring(0, 50)).toString('base64')}`;
  
  // Check cache
  const cachedResponse = apiCache.get(cacheKey);
  if (cachedResponse) {
    console.log('Using cached AI examples');
    return cachedResponse;
  }
  
  try {
    console.log('Generating AI examples...');
    // Set timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    
    let systemPrompt = "You are an AI tutor that provides helpful examples related to the student's question without solving their specific problem. The examples should be relevant but different enough that the student can't simply copy them.";
    
    if (customPrompt) {
      systemPrompt += ` Instructor guidelines: ${customPrompt}`;
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Question: ${questionText}\n\nStudent request: ${userPrompt}` }
      ],
      max_tokens: 500
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
    console.error('Error generating AI examples:', error);
    return "There was an error generating examples. Please try again.";
  }
}

// Function to generate step-by-step framework using OpenAI
async function generateAIStepFramework(userPrompt, customPrompt, questionText) {
  if (!userPrompt || userPrompt.trim().length < 3) {
    return "Please provide more details about the framework you're looking for.";
  }

  // Create cache key
  const cacheKey = `framework-${Buffer.from(questionText.substring(0, 100) + userPrompt.substring(0, 50) + customPrompt.substring(0, 50)).toString('base64')}`;
  
  // Check cache
  const cachedResponse = apiCache.get(cacheKey);
  if (cachedResponse) {
    console.log('Using cached AI framework');
    return cachedResponse;
  }
  
  try {
    console.log('Generating AI step framework...');
    // Set timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    
    let systemPrompt = "You are an AI tutor that provides step-by-step frameworks for solving problems without giving away the solution. Format your response with clear numbered steps (Step 1:, Step 2:, etc.) that guide the student through the process.";
    
    if (customPrompt) {
      systemPrompt += ` Instructor guidelines: ${customPrompt}`;
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Question: ${questionText}\n\nStudent request: ${userPrompt}` }
      ],
      max_tokens: 500
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
    console.error('Error generating AI framework:', error);
    return "There was an error generating the framework. Please try again.";
  }
}

// Function to generate Socratic questions using OpenAI
async function generateAISocraticMethod(userPrompt, customPrompt, questionText) {
  if (!userPrompt || userPrompt.trim().length < 3) {
    return "Please share more about your understanding so I can ask guiding questions.";
  }

  // Create cache key
  const cacheKey = `socratic-${Buffer.from(questionText.substring(0, 100) + userPrompt.substring(0, 50) + customPrompt.substring(0, 50)).toString('base64')}`;
  
  // Check cache
  const cachedResponse = apiCache.get(cacheKey);
  if (cachedResponse) {
    console.log('Using cached Socratic questions');
    return cachedResponse;
  }
  
  try {
    console.log('Generating Socratic questions...');
    // Set timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    
    let systemPrompt = "You are an AI tutor using the Socratic method to guide students toward discovering answers themselves. Ask thoughtful questions that lead the student to insights rather than providing direct answers. Include 3-5 thought-provoking questions that build upon the student's current understanding.";
    
    if (customPrompt) {
      systemPrompt += ` Instructor guidelines: ${customPrompt}`;
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Question: ${questionText}\n\nStudent input: ${userPrompt}` }
      ],
      max_tokens: 500
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
    console.error('Error generating Socratic questions:', error);
    return "There was an error generating questions. Please try again.";
  }
}

// Function to generate error detection feedback using OpenAI
async function generateAIErrorDetection(userPrompt, customPrompt, questionText) {
  if (!userPrompt || userPrompt.trim().length < 10) {
    return "Please provide your work for me to review and identify potential errors.";
  }

  // Create cache key
  const cacheKey = `error-${Buffer.from(questionText.substring(0, 100) + userPrompt.substring(0, 100) + customPrompt.substring(0, 50)).toString('base64')}`;
  
  // Check cache
  const cachedResponse = apiCache.get(cacheKey);
  if (cachedResponse) {
    console.log('Using cached error detection');
    return cachedResponse;
  }
  
  try {
    console.log('Generating error detection feedback...');
    // Set timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    
    let systemPrompt = "You are an AI tutor that reviews student work and identifies potential errors or areas for improvement without providing solutions. Format your response as a numbered list of points (1., 2., etc.), focusing only on what might be wrong, vague, or incomplete, but never providing the correct answer.";
    
    if (customPrompt) {
      systemPrompt += ` Instructor guidelines: ${customPrompt}`;
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Question: ${questionText}\n\nStudent work to review: ${userPrompt}` }
      ],
      max_tokens: 500
    }, { signal: controller.signal });
    
    clearTimeout(timeoutId);
    const result = response.choices[0].message.content;
    
    // Cache result
    apiCache.set(cacheKey, result);
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      return "Request timed out. Please try with a simpler submission.";
    }
    console.error('Error generating error detection:', error);
    return "There was an error analyzing your work. Please try again.";
  }
}

// API Routes

// Generate AI response - Add support for all AI modes
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { questionId, questionText, studentInput, customPrompt, aiOption, userPrompt } = req.body;
    console.log('AI generate request received:', aiOption, 'for question:', questionId);
    
    let aiResponse = '';
    
    // Add basic validation
    if (!aiOption) {
      console.error('Missing aiOption in request');
      return res.status(400).json({ error: 'Missing AI option' });
    }
    
    try {
      // Use OpenAI to generate responses based on the AI option
      switch (aiOption) {
        case 'compare':
          console.log('Generating comparison...');
          aiResponse = await generateAIComparison(studentInput, questionText);
          break;
        case 'hints':
          console.log('Generating hints...');
          aiResponse = await generateAIHint(userPrompt, customPrompt || '', questionText);
          break;
        case 'guidance':
          console.log('Generating guidance...');
          aiResponse = await generateAIGuidance(userPrompt, customPrompt || '', questionText);
          break;
        case 'examples':
          console.log('Generating examples...');
          aiResponse = await generateAIExamples(userPrompt, customPrompt || '', questionText);
          break;
        case 'step_framework':
          console.log('Generating step framework...');
          aiResponse = await generateAIStepFramework(userPrompt, customPrompt || '', questionText);
          break;
        case 'socratic':
          console.log('Generating socratic questions...');
          aiResponse = await generateAISocraticMethod(userPrompt, customPrompt || '', questionText);
          break;
        case 'error_detection':
          console.log('Generating error detection...');
          aiResponse = await generateAIErrorDetection(userPrompt, customPrompt || '', questionText);
          break;
        default:
          console.log('No matching AI option:', aiOption);
          aiResponse = 'AI assistance is not enabled for this question.';
      }
    } catch (innerError) {
      console.error('Error in AI generation functions:', innerError);
      return res.status(500).json({ error: 'Error generating AI response', details: innerError.message });
    }
    
    console.log('AI response generated successfully');
    res.json({ aiResponse });
  } catch (error) {
    console.error('Outer error in AI generate endpoint:', error);
    res.status(500).json({ error: 'Failed to generate AI response', details: error.message });
  }
});

// Upload and parse PDF assignment
app.post('/api/assignments/upload', upload.single('assignment'), async (req, res) => {
  try {
    console.log('PDF upload request received');
    
    if (!req.file) {
      console.log('No file found in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('File received:', req.file.originalname, 'Size:', req.file.size, 'bytes');
    
    try {
      // Extract text from the PDF
      console.log('Extracting text from PDF...');
      const pdfText = await extractTextFromPDF(req.file.path);
      
      console.log('Extracted Text Preview:', pdfText.text?.slice(0, 300));
      console.log('PDF text extracted, full length:', pdfText.text?.length || 0);


      
      // Use our new parser service instead of the old function
      console.log('Parsing assignment with AI...');
      const parsedAssignment = await assignmentParserService.parseAssignment(pdfText);
      console.log('Parsed assignment tables:', parsedAssignment.tables?.length || 0);
      console.log('Parsed assignment sample table:', JSON.stringify(parsedAssignment.tables?.[0], null, 2));

      
      // Create the assignment object to return
      const assignment = {
        id: uuidv4(),
        title: parsedAssignment.title || "Untitled Assignment",
        globalInstructions: parsedAssignment.globalInstructions || "",
        questions: parsedAssignment.questions || [],
        tables: parsedAssignment.tables || [],
        originalFile: req.file.path
      };
      
      console.log('Assignment processed successfully');
      
      // Return the parsed assignment data
      res.json(assignment);
    } catch (parseError) {
      console.error('Error processing PDF:', parseError);
      
      // Fallback to a simple assignment if parsing fails
      const assignment = {
        id: uuidv4(),
        title: "New Assignment",
        globalInstructions: "Please complete all questions in this assignment.",
        tables: [],
        questions: [
          {
            id: uuidv4(),
            number: 1,
            text: "Question 1 - Please edit this question text.",
            aiOption: 'no_ai',
            customPrompt: '',
            dependsOn: [],
            requiredForNext: false
          },
          {
            id: uuidv4(),
            number: 2,
            text: "Question 2 - Please edit this question text.",
            aiOption: 'no_ai',
            customPrompt: '',
            dependsOn: [],
            requiredForNext: false
          }
        ],
        originalFile: req.file.path
      };
      
      console.log('Using fallback assignment structure');
      res.json(assignment);
    }
  } catch (error) {
    console.error('Error in upload handler:', error);
    res.status(500).json({ error: 'Failed to process the PDF file: ' + error.message });
  }
});

// Save assignment configuration
app.post('/api/assignments/configure', (req, res) => {
  try {
    console.log('Received configuration request');
    
    const assignmentData = req.body;
    
    // Log the data to see what we're receiving
    console.log('Assignment ID:', assignmentData.id);
    console.log('Number of questions:', assignmentData.questions?.length);
    
    // Validate that required fields exist
    if (!assignmentData || !assignmentData.questions) {
      console.error('Invalid assignment data - missing required fields');
      return res.status(400).json({ error: 'Invalid assignment data' });
    }
    
    const assignmentId = assignmentData.id || uuidv4();
    
    // Store the configured assignment
    assignments[assignmentId] = {
      ...assignmentData,
      id: assignmentId,
      createdAt: new Date().toISOString()
    };
    
    console.log('Successfully saved assignment configuration:', assignmentId);
    
    // Return the assignment ID
    res.json({ assignmentId });
  } catch (error) {
    console.error('Error saving assignment configuration:', error);
    res.status(500).json({ error: 'Failed to save assignment configuration' });
  }
});

// Enhanced: Get assignment by ID
app.get('/api/assignments/:id', (req, res) => {
  const assignmentId = req.params.id;
  
  if (!assignments[assignmentId]) {
    return res.status(404).json({ error: 'Assignment not found' });
  }
  
  // Get the assignment
  const assignment = assignments[assignmentId];
  
  // Build dependency map for the frontend
  const dependencyMap = {};
  
  if (assignment.questions) {
    assignment.questions.forEach(question => {
      dependencyMap[question.id] = {
        dependsOn: question.dependsOn || [],
        requiredForNext: !!question.requiredForNext
      };
    });
  }
  
  // Add dependency information
  const enhancedAssignment = {
    ...assignment,
    dependencyMap
  };
  
  res.json(enhancedAssignment);
});

// New: Get student progress
app.get('/api/assignments/:id/progress/:studentId', (req, res) => {
  const { id: assignmentId, studentId } = req.params;
  
  const progressKey = `${assignmentId}-${studentId}`;
  
  if (!studentProgress[progressKey]) {
    return res.json({
      assignmentId,
      studentId,
      answers: {},
      lastUpdated: new Date().toISOString()
    });
  }
  
  res.json(studentProgress[progressKey]);
});

// New: Save student progress
app.post('/api/assignments/:id/progress/:studentId', (req, res) => {
  const { id: assignmentId, studentId } = req.params;
  const { questionId, answer } = req.body;
  
  const progressKey = `${assignmentId}-${studentId}`;
  
  // Initialize progress if needed
  if (!studentProgress[progressKey]) {
    studentProgress[progressKey] = {
      assignmentId,
      studentId,
      answers: {},
      lastUpdated: new Date().toISOString()
    };
  }
  
  // Add the answer
  studentProgress[progressKey].answers[questionId] = {
    content: answer,
    lastUpdated: new Date().toISOString(),
    complete: true
  };
  
  // Update last updated timestamp
  studentProgress[progressKey].lastUpdated = new Date().toISOString();
  
  // Determine which questions are unlocked
  const unlockedQuestions = [];
  const assignment = assignments[assignmentId];
  
  if (assignment && assignment.questions) {
    assignment.questions.forEach(question => {
      if (question.dependsOn && question.dependsOn.length > 0) {
        // Check if all dependencies are complete
        const allDependenciesComplete = question.dependsOn.every(depId => 
          studentProgress[progressKey].answers[depId] && 
          studentProgress[progressKey].answers[depId].complete
        );
        
        if (allDependenciesComplete) {
          unlockedQuestions.push(question.id);
        }
      }
    });
  }
  
  res.json({ 
    success: true,
    message: 'Progress saved',
    unlockedQuestions
  });
});

// Submit assignment - marks the assignment as complete
app.post('/api/assignments/:id/submit', (req, res) => {
  const { id: assignmentId } = req.params;
  const { studentId } = req.body;
  
  const progressKey = `${assignmentId}-${studentId}`;
  
  if (studentProgress[progressKey]) {
    studentProgress[progressKey].submitted = true;
    studentProgress[progressKey].submittedAt = new Date().toISOString();
  }
  
  res.json({
    success: true,
    message: 'Assignment submitted successfully'
  });
});

// Simple test endpoint to verify the server is working
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running properly' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling middleware - must be last
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  
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