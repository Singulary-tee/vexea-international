# GitHub Gist Integration Guide

This document explains how to read and write to a GitHub Gist using environment variables (`GIST_ID` and `GIST_ACCESS_TOKEN`).

## Reading a Gist

To fetch the contents of a Gist via the GitHub REST API using Node.js:

```javascript
const https = require('https');

let ref = process.env.GIST_ID;
// Extract 32-character Gist ID if a full URL or ID string is provided
const match = ref.match(/([0-9a-fA-F]{32})/);
const gistId = match ? match[1] : ref.split('/').pop();

const options = {
  hostname: 'api.github.com',
  path: '/gists/' + gistId,
  method: 'GET',
  headers: {
    'User-Agent': 'Vexea-App',
    'Accept': 'application/vnd.github+json',
    'Authorization': 'token ' + process.env.GIST_ACCESS_TOKEN
  }
};

https.get(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.files) {
        for (const [filename, fileObj] of Object.entries(json.files)) {
          console.log('File:', filename);
          console.log(fileObj.content);
        }
      }
    } catch (e) {
      console.error('Failed to parse response', e);
    }
  });
}).on('error', console.error);
```

## Writing to a Gist

To update or create files within an existing Gist using a `PATCH` request:

```javascript
const https = require('https');

let ref = process.env.GIST_ID;
const match = ref.match(/([0-9a-fA-F]{32})/);
const gistId = match ? match[1] : ref.split('/').pop();

const payload = JSON.stringify({
  description: 'Updated via script',
  files: {
    'md': {
      'content': 'Updated content goes here.'
    }
  }
});

const options = {
  hostname: 'api.github.com',
  path: '/gists/' + gistId,
  method: 'PATCH',
  headers: {
    'User-Agent': 'Vexea-App',
    'Accept': 'application/vnd.github+json',
    'Authorization': 'token ' + process.env.GIST_ACCESS_TOKEN,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
  });
});

req.on('error', console.error);
req.write(payload);
req.end();
```
