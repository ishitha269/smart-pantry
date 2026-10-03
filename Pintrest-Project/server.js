require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const Pin = require('./models/Pin');

const app = express();
app.set('trust proxy', 1); // needed for secure cookies on Render

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/pins', require('./routes/pins'));
app.use('/api/boards', require('./routes/boards'));

// Adds sample pins the first time the app runs, so Explore is never empty.
async function seedPins() {
  const existing = await Pin.countDocuments({ user: null });
  if (existing > 0) return;

  const titles = [
    'Golden hour', 'Quiet corners', 'Weekend mood', 'Color story', 'Fresh start', 'Small joys',
    'Cozy home ideas', 'Slow mornings', 'Street style', 'Plant life', 'Dream trip', 'Soft light',
    'Minimal desk', 'Sunday reset', 'Garden notes', 'City walks', 'Coffee break', 'Autumn palette',
    'Travel diary', 'Fashion inspo', 'Home decor', 'Sweet treats', 'Art and craft', 'Beach days',
    'Mountain air', 'Evening glow', 'DIY project', 'Pretty details', 'Good vibes', 'Wanderlust',
  ];
  const heights = [560, 400, 640, 480, 600, 420, 520, 680, 450, 580];
  const docs = titles.map((title, i) => ({
    user: null,
    title,
    description: `Ideas and inspiration: ${title.toLowerCase()}`,
    imageUrl: `https://picsum.photos/seed/pinterest${i + 1}/400/${heights[i % heights.length]}`,
  }));
  await Pin.insertMany(docs);
  console.log('Added ' + docs.length + ' sample pins');
}

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await seedPins();
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err.message));