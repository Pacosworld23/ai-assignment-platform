const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello, Express is working!');
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
