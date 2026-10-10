require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const PORT = process.env.PORT || 5000;
connectDB(process.env.MONGO_URI).then(() => {
    app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));
}).catch((error) => {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
});