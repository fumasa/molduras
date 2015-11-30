var express       = require('express');
var app           = express();
var session       = require('express-session');
var MongoDBStore  = require('connect-mongodb-session')(session);
var crypto        = require('crypto');
var fs            = require('fs');
var nconf         = require('nconf');
var multipart     = require('connect-multiparty');
var bodyParser    = require('body-parser');
var url           = require("url");
var path          = require("path");
var gcloud        = require('gcloud');
var assert        = require('assert');

var config_path = 'molduras-config.json';
var multipartMiddleware = multipart();

nconf.argv().env().file({ file: config_path });

nconf.defaults({
    'session': {
      'key': 's0m3S3ss10nK3y',
      'cookie': { 
        'maxAge': 1000 * 120/*60 * 60*/ 
      }
    },
    'http': {
      'host': '0.0.0.0',
      'port' : 3000
    },
    'mongodb': {
      'host': '192.168.99.100',
      'port': '32768',
      'database': 'molduras',
    },
    'gcloud': {
      'projectId': 'wakedown-org'
    },
    'cloudStorageBucket': 'molduras',
    'molduras': [
      { 
        'id' : 0,
        'fundo' : '/static/img/moldura-1.png', 
        'minifundo' : '/static/img/thumb-1.jpg', 
        'espacos': 2, 
        'posicoes': [ 
          { id: 0, 'x': 212, 'y': 99, 'w': 100, 'h': 70  },
          { id: 1, 'x': 404, 'y': 99, 'w': 100, 'h': 70  }
        ]
      },
      { 
        'id' : 1,
        'fundo' : '/static/img/moldura-2.png',  
        'minifundo' : '/static/img/thumb-2.jpg', 
        'espacos': 3, 
        'posicoes': [ 
          { id: 0, 'x': 121, 'y': 108, 'w': 100, 'h': 70  },
          { id: 1, 'x': 337, 'y': 108, 'w': 100, 'h': 70  },
          { id: 2, 'x': 521, 'y': 108, 'w': 100, 'h': 70  }
        ]
      },
      { 
        'id' : 2,
        'fundo' : '/static/img/moldura-3.png',  
        'minifundo' : '/static/img/thumb-3.jpg', 
        'espacos': 4, 
        'posicoes': [ 
          { id: 0, 'x': 49, 'y': 102, 'w': 100, 'h': 70  },
          { id: 1, 'x': 213, 'y': 102, 'w': 100, 'h': 70  },
          { id: 2, 'x': 398, 'y': 102, 'w': 100, 'h': 70  },
          { id: 3, 'x': 549, 'y': 102, 'w': 100, 'h': 70  }
        ]
      },
      { 
        'id' : 3,
        'fundo' : '/static/img/moldura-4.png',  
        'minifundo' : '/static/img/thumb-4.jpg', 
        'espacos': 5, 
        'posicoes': [ 
          { id: 0, 'x': 39, 'y': 120, 'w': 88, 'h': 63  },
          { id: 1, 'x': 178, 'y': 120, 'w': 88, 'h': 63  },
          { id: 2, 'x': 333, 'y': 120, 'w': 88, 'h': 63  },
          { id: 3, 'x': 474, 'y': 120, 'w': 88, 'h': 63  },
          { id: 4, 'x': 607, 'y': 120, 'w': 88, 'h': 63  }
        ]
      }
    ]
});

var storage = gcloud.storage(nconf.get('gcloud'));
var bucket = storage.bucket(nconf.get('cloudStorageBucket'));

var store = new MongoDBStore(
{ 
  uri: 'mongodb://' + nconf.get('mongodb:host') + ':' + nconf.get('mongodb:port') + '/' + nconf.get('mongodb:database'),
  collection: 'molduras-sessions'
});

store.on('error', function(error) {
  assert.ifError(error);
  assert.ok(false);
});

function sendUploadToGCS(req, resp, next) {
  if(!req.file) return next();

  var gcsname = Date.now() + req.file.originalname;
  var file = bucket.file(gcsname);
  var stream = file.createWriteStream();

  stream.on('error', function(err) {
    req.file.cloudStorageError = err;
    next(err);
  });

  stream.on('finish', function() {
    req.file.cloudStorageObject = gcsname;
    req.file.cloudStoragePublicUrl = 'https://storage.googleapis.com/' + nconf.get('cloudStorageBucket') + '/' + gcsname;
    next();
  });

  stream.end(req.file.buffer);
}
 
app.use(require('express-session')({
  secret: nconf.get('session:key'),
  saveUninitialized: false,
  resave: false,
  cookie: nconf.get('session:cookie'),
  store: store
}));
app.use(bodyParser.json());
app.use(function (req, res, next) {
  if (!req.session.username) {
    req.session.username = crypto.randomBytes(64).toString('hex');
    req.session.photos = [];
    console.log('[new session-ID=' + req.sessionID + ' ]' + req.session.photos.length);
  }
  next();
});

app.set('views', './views');
app.set('view engine', 'jade');

app.get('/', function (req, res, next) {
  var molduras = nconf.get('molduras');
  res.render('index', { molduras: molduras });
});

app.get('/files.json', function (req, res, next) {
  console.log('[files.json] ' + JSON.stringify(req.session.photos));
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ uploads: req.session.photos }));
});

app.get('/resetSession', function (req, res, next) {
  req.session.destroy();
  console.log('[session cleaned]');
  res.send('ok');
});

app.get('/upload', function (req, res, next) {
  res.render('upload');
});

app.post('/upload', multipartMiddleware, sendUploadToGCS, function (req, res, next) {
  try {
    var newImgPath = req.file.cloudStoragePublicUrl;
    console.log('[new file to save] ' + newImgPath);
    //fs.readFile(req.files.uploadFile.path, function (err, data) {
    //  fs.writeFile(__dirname + newImgPath, data, function (err) {
    //    if (err) 
    //      console.log('error: saving file[' + req.files.uploadFile.path + '|' + newImgPath + ']: ' + err);
        var molduras = nconf.get('molduras');
        var files = req.session.photos;
        var file = { posicao: molduras[req.body.molduraID].posicoes[req.body.posicaoID], file: newImgPath };
        files[req.body.posicaoID] = file;
        req.session.photos = files;
        req.session.save();
        res.redirect('/upload');
    //  });
    //});
  } catch (error) {
    console.log('error: ' + error);
  }
});

app.get('/_ah/health', function(req, res) {
  res.status(200).send('ok');
});

app.use('/static', express.static('static'));

var server = app.listen(nconf.get('http:port'), nconf.get('http:host'), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Listening at http://%s:%s', host, port);
});

nconf.save();
