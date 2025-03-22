require('dotenv').config();
const app = require('./app');

// In server.js, add this (notice no hyphen):
app.get('/directtest', (req, res) => {
    console.log('Direct test route hit!');
    res.send('Direct test successful');
});
app.get('/', (req, res) => {
    console.log('Root route hit!');
    res.send('Server is working');
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});