require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');
const urlparser = require('url');

// Basic Configuration
const port = process.env.PORT || 3000;

// Mongoose connect
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors());

// Middleware for reading data from form (POST)
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// URL Shorten

//1. schema
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});
const Url = mongoose.model('Url', urlSchema);

// 2. POST endpoint: Create Short URL
app.post('/api/shorturl', (req, res) => {
  const bodyUrl = req.body.url;

  // adding URL format check
  let hostname;
  try {
    const urlObj = new URL(bodyUrl);
    // check if http / https
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return res.json({ error: 'invalid url' });
    }
    hostname = urlObj.hostname;
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  // check if url is corrent (must start from http/https)
  dns.lookup(hostname, (err, address) => {
    if (err || !address) {
      res.json({ error: 'invalid url' });
    } else {
      // if valid, it is saved
      Url.findOne({ original_url: bodyUrl }, (err, foundUrl) => {
        if (foundUrl) {
          res.json({ original_url: foundUrl.original_url, short_url: foundUrl.short_url });
        } else {
          // create short url 
          Url.countDocuments({}, (err, count) => {
            const newUrl = new Url({
              original_url: bodyUrl,
              short_url: count + 1
            });
            newUrl.save((err, data) => {
              res.json({ original_url: data.original_url, short_url: data.short_url });
            });
          });
        }
      });
    }
  });
});

// 3. GET endpoint: Redirect to initial URL
app.get('/api/shorturl/:id', (req, res) => {
  const id = req.params.id;

  // convert id to Number so db can find it
  Url.findOne({ short_url: parseInt(id) }, (err, data) => {
    if (err || !data) {
      res.json({ error: "No short URL found" });
    } else {
      res.redirect(data.original_url);
    }
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
