/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for t`he specific language governing permissions and
 * limitations under the License.
 */
'use strict';
import {PythonShell} from 'python-shell';//SHAWNsss


const functions = require('firebase-functions');
const mkdirp = require('mkdirp-promise');
const admin = require('firebase-admin');
admin.initializeApp();
const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpeg_static = require('ffmpeg-static');
const extractFrames = require('ffmpeg-extract-frames')

// Max height and width of the thumbnail in pixels.
const THUMB_MAX_HEIGHT = 200;
const THUMB_MAX_WIDTH = 200;
// Thumbnail prefix added to file names.
const THUMB_PREFIX = 'thumb_';

/**
 * When an image is uploaded in the Storage bucket We generate a thumbnail automatically using
 * ImageMagick.
 * After the thumbnail has been generated and uploaded to Cloud Storage,
 * we write the public URL to the Firebase Realtime Database.
 */
exports.generateThumbnail = functions.storage.object().onFinalize(async (object) => {
	
  // File and directory paths.
  const filePath = object.name;
  console.log('filePath', filePath);
  const contentType = object.contentType; // This is the image MIME type
  console.log('contentType', contentType);
  const fileDir = path.dirname(filePath);
  console.log('fileDir', fileDir);
  const fileName = path.basename(filePath);
  console.log('fileName', fileName);
  const thumbFilePath = path.normalize(path.join(fileDir, `${THUMB_PREFIX}${fileName}`));  
  console.log('thumbFilePath', thumbFilePath);
  const tempLocalFile = path.join(os.tmpdir(), filePath);
  console.log('tempLocalFile', tempLocalFile);
  const tempLocalDir = path.dirname(tempLocalFile);
  console.log('tempLocalDir', tempLocalDir);
  const tempLocalThumbFile = path.join(os.tmpdir(), thumbFilePath);
  console.log('tempLocalThumbFile', tempLocalThumbFile);

  // Cloud Storage files.
  const bucket = admin.storage().bucket(object.bucket);
  const file = bucket.file(filePath);
  const thumbFile = bucket.file(thumbFilePath);
  const metadata = {
    contentType: contentType,
    // To enable Client-side caching you can set the Cache-Control headers here. Uncomment below.
    // 'Cache-Control': 'public,max-age=3600',
  };
  
  
  // Create the temp directory where the storage file will be downloaded.
  await mkdirp(tempLocalDir)
  

  
  console.log('success');
  
  // Download file from bucket.
  await file.download({destination: tempLocalFile});
  console.log('The file has been downloaded to', tempLocalFile);
  
   //const filereplace = 'videos/userIntro.3gp';
  
  
  const tempHossam = '/tmp/videos/userIntro.jpg';
  /*
  var proc = new ffmpeg(tempLocalFile)
  .takeScreenshots({
      count: 1,
      timemarks: [ '2' ] // number of seconds
    }, tempHossam, function(err) {
    console.log('screenshots were saved')
  });
  */
  
  
  await extractFrames({
	  input: tempLocalFile,
	  output: tempHossam,
	  offsets: [
		2000,
	  ]
  }) 
  
  
    console.log('successv2');
  // Uploading the jpg.
  await bucket.upload(tempHossam, {destination: 'videos/userIntro.jpg'});
  console.log('Thumbnail uploaded to Storage at', '/');
  
  //python call - SHAWN
  
  let options = {
  mode: 'text',
  pythonPath: 'path/to/python',//
  pythonOptions: ['-u'], // get print results in real-time
  //scriptPath: 'path/to/my/scripts',
  args: ['value1', 'value2', 'value3']//TO-DO: Path to the picture,other arguements
  };

	PythonShell.run('my_script.py', options, function (err, results) {
	  if (err) throw err;
	  // results is an array consisting of messages collected during execution
	  console.log('results: %j', results);
	});


  
  // Once the image has been uploaded delete the local files to free up disk space.
  fs.unlinkSync(tempLocalFile);
  fs.unlinkSync(tempLocalThumbFile);
  
  

  
  
  // Get the Signed URLs for the thumbnail and original image.
  const config = {
    action: 'read',
    expires: '03-01-2500',
  };
  const results = await Promise.all([
    thumbFile.getSignedUrl(config),
    file.getSignedUrl(config),
  ]);
  console.log('Got Signed URLs.');
  const thumbResult = results[0];
  const originalResult = results[1];
  const thumbFileUrl = thumbResult[0];
  const fileUrl = originalResult[0];
  // Add the URLs to the Database
  await admin.database().ref('images').push({path: fileUrl, thumbnail: thumbFileUrl});
  return console.log('Thumbnail URLs saved to database.');
});

