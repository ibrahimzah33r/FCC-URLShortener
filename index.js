require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const validUrl = require('valid-url');
const cors = require('cors');
const dns = require('dns');
//const shortid = require('shortid');
const bodyParser = require('body-parser');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;
//Test credentials. No longer in use.
//const uri = "mongodb+srv://user:pass@cluster0.mng7f2d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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

  console.log('Received URL:', original_url);
  console.log('Request body:', req.body);

  // First, check if URL has a valid structure using valid-url
  if (!validUrl.isUri(original_url)) {
    return res.json({ error: 'invalid url' });
  }

  // Use dns.lookup to check if the domain is reachable
  const hostname = new URL(original_url).hostname; // Extract the domain from the URL

  dns.lookup(hostname, (err, addresses, family) => {
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    // If the domain is reachable, generate the short URL and save it to the database
    (async () => {
      try {
        // Check if URL already exists in the database
        let existingUrl = await Url.findOne({ original_url });
        if (existingUrl) {
          return res.json({
            original_url: existingUrl.original_url,
            short_url: existingUrl.short_url,
          });
        }

        // Generate a unique short URL
        const short_url = Math.floor(Math.random() * 10000);

        // Save the new URL to the database
        const newUrl = new Url({ original_url, short_url });
        await newUrl.save();

        // Return the response with the original URL and the short URL
        res.json({
          original_url: newUrl.original_url,
          short_url: newUrl.short_url,
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
      }
    })();
  });
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
