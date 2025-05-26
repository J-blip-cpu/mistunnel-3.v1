
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Create a file to stream archive data to
const output = fs.createWriteStream('website.zip');
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level
});

// Listen for all archive data to be written
output.on('close', function() {
  console.log('Website zip created successfully!');
  console.log('Total bytes: ' + archive.pointer());
  console.log('Download the website.zip file from the file explorer');
});

// Good practice to catch warnings (ie stat failures and other non-blocking errors)
archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn(err);
  } else {
    throw err;
  }
});

// Good practice to catch this error explicitly
archive.on('error', function(err) {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Add the entire project to the zip, excluding certain files/folders
archive.glob('**/*', {
  cwd: '.',
  ignore: [
    'node_modules/**',
    'dist/**',
    '.git/**',
    '*.zip',
    'create-zip.js',
    '.env*',
    'attached_assets/**'
  ]
});

// Finalize the archive
archive.finalize();
