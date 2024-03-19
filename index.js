require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require("body-parser");
const dns = require("dns");
const mongoose = require("mongoose");
const { Schema } = mongoose;

// Basic Configuration
const port = process.env.PORT || 3000;

mongoose.connect(process.env.DB_URI);

const urlSchema = new Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true }
});

const Url = mongoose.model("Url", urlSchema);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// POST endpoint for creating short URLs
app.post("/api/shorturl", async (req, res) => {
  const originalUrl = req.body.url;

  try {
    // Check if the original URL already exists in the database
    const existingUrl = await Url.findOne({ original_url: originalUrl });

    if (existingUrl) {
      res.json({
        original_url: existingUrl.original_url,
        short_url: existingUrl.short_url
      });
      return;
    }

    // If the original URL doesn't exist, proceed to save it
    const parsedUrl = new URL(originalUrl);
    const domain = parsedUrl.hostname;

    // Verify URL using dns.lookup()
    dns.lookup(domain, async (err) => {
      if (err) {
        res.json({ error: "invalid url" });
      } else {
        // Generate a unique short URL
        const shortUrl = Math.floor(Math.random() * 10000).toString();

        // Save the new URL
        const url = new Url({
          original_url: originalUrl,
          short_url: shortUrl
        });

        await url.save();

        res.json({
          original_url: url.original_url,
          short_url: url.short_url
        });
      }
    });
  } catch (error) {
    res.json({ error: 'Invalid URL' });
  }
});

app.get("/api/shorturl/:short_url", async (req, res) => {
  try {
    const url = await Url.findOne({ short_url: req.params.short_url });

    if (!url) {
      res.json({ error: 'Short URL not found' });
      return;
    }

    res.redirect(url.original_url);
  } catch (error) {
    console.log(error);
    res.json({ error: 'Internal server error' });
  }
});


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
