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

// Σύνδεση στη βάση (με family: 4 για το πρόβλημα δικτύου)
mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ Connection error:", err));

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// URL Schema
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});
const Url = mongoose.model('Url', urlSchema);

// POST Endpoint: Create Short URL
app.post('/api/shorturl', function(req, res) {
  const bodyUrl = req.body.url;
  
  // 1. Έλεγχος μορφής URL
  let hostname;
  try {
    const urlObj = new URL(bodyUrl);
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return res.json({ error: 'invalid url' });
    }
    hostname = urlObj.hostname;
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  // 2. Έλεγχος DNS
  dns.lookup(hostname, async (err, address) => {
    if (err || !address) {
      return res.json({ error: 'invalid url' });
    }

    try {
      // 3. Ψάχνουμε στη βάση με AWAIT (όχι callback)
      const foundUrl = await Url.findOne({ original_url: bodyUrl });
      
      if (foundUrl) {
        // Αν υπάρχει, το επιστρέφουμε
        return res.json({ 
          original_url: foundUrl.original_url, 
          short_url: foundUrl.short_url 
        });
      } else {
        // Αν δεν υπάρχει, δημιουργούμε νέο
        const count = await Url.countDocuments({});
        
        const newUrl = new Url({
          original_url: bodyUrl,
          short_url: count + 1
        });

        const savedUrl = await newUrl.save(); // Await και εδώ
        return res.json({ 
          original_url: savedUrl.original_url, 
          short_url: savedUrl.short_url 
        });
      }
    } catch (dbErr) {
      console.error(dbErr);
      return res.status(500).json({ error: 'Server error' });
    }
  });
});

// GET Endpoint: Redirect
app.get('/api/shorturl/:id', async (req, res) => {
  const id = req.params.id;

  // Έλεγχος αν το id είναι αριθμός
  if (isNaN(id)) {
    return res.json({ error: "Wrong format" });
  }

  try {
    // Ψάχνουμε με AWAIT
    const data = await Url.findOne({ short_url: parseInt(id) });
    
    if (data) {
      return res.redirect(data.original_url);
    } else {
      return res.json({ error: "No short URL found" });
    }
  } catch (err) {
    console.error(err);
    return res.json({ error: "Database error" });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});