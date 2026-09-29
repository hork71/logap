const sslogRouter = express.Router();

const controller = require('../controllers/sslogger');

sslogRouter.get('/', (req, res, next) => {
  controller
    .getAll()
    .then(data => {
      res.json(data);
    });
});

sslogRouter.get('/live', (req, res, next) => {
  controller
    .getLiveInfo(res)
});

sslogRouter.get('/:serverNaam', (req, res, next) => {
  controller
    .getServer(req.params.serverNaam)
    .then(data => {
      res.json(data);
    });
});

sslogRouter.get('/report/:yearMonth', (req, res, next) => {
  const period = req.params.yearMonth;
  controller
    .getReport(period, res)
});

module.exports = sslogRouter;
