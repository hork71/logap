const https = require('https');
const path = require('path');
const fs = require('fs');
const express = require('express');

const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieparser = require('cookie-parser');
const cron = require('node-cron');

require('dotenv').config();

const sslogRouter = require('./routes/sslogger');

const genList = require('./lib/slog_ses');

cron.schedule('20,50 * * * *', () => {
  genList.genLiveSlog();
});

const app = express();

const port = process.env.PORT || 3000;

app.use(morgan('common'));
app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ limit: '200mb', extended: 'false' }));
app.use(cors());

app.use('/sslogger', sslogRouter);

app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  res.status(res.statusCode || 500);
  res.json({
    message: err.message,
    stack: req.app.get('env') === 'development' ? err.stack : {}
  });
});

app.listen(port, () => {
  console.log('API server listening on port: ', port);
});
