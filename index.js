require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const validUrl = require('valid-url');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;
const uri = "mongodb+srv://ibz1536:MongoPass@cluster0.mng7f2d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(uri)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});


const urlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true,
    unique: true,
  },
  short_url: {
    type: Number,
    required: true,
    unique: true,
  },
});

const Url = mongoose.model('Url', urlSchema);

app.post('/api/shorturl', async (req, res) => {
  const { url: original_url } = req.body;
  console.log("Request body:", req.body);
  console.log('Original URL:', original_url);

  if (!validUrl.isUri(original_url)) {
    return res.status(400).json({ error: 'invalid url' });
  }

  try {
    // Check if the URL already exists
    let url = await Url.findOne({ original_url });
    if (url) {
      return res.json({
        original_url: url.original_url,
        short_url: url.short_url,
      });
    }

    // Create new short URL
    const short_url = Math.floor(Math.random() * 10000); // or implement your own logic to generate a unique ID

    url = new Url({ original_url, short_url });
    await url.save();

    res.json({
      original_url: url.original_url,
      short_url: url.short_url,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Redirect to original URL
app.get('/api/shorturl/:short_url', async (req, res) => {
  const { short_url } = req.params;

  try {
    const url = await Url.findOne({ short_url });
    if (!url) {
      return res.status(404).json({ error: 'No URL found for this short URL' });
    }

    res.redirect(url.original_url);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});



app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
