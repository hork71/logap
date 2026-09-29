const fs = require('fs');
const os = require('os');
const path = require('path');
const { Client } = require("pg");

require('dotenv').config();

function omgekeerd(str) {
  const tmp = str.split('-');
  return `${tmp[2]}-${tmp[1]}-${tmp[0]}`;
}

module.exports = {
  genLiveSlog() {
    const prodlist = fs.readFileSync(path.join(__dirname, '../prod_owner.txt')).toString().split('\n');
    const accounts = fs.readFileSync(path.join(__dirname, '../accounts.txt')).toString().split('\n');
    const dt = new Date();
    const cur_year = dt.getFullYear();
    const cur_month = dt.getMonth() + 1;

    const slogfile = path.join(__dirname, '../data/sslogger/', 'slog_testlive.csv');
    const slog_output = new Set();

    const config = {
      user: process.env.DB_USER,
      password: process.env.DB_PW,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
    };

    const client = new Client(config);
    const query = "SELECT devicereportedtime,syslogtag,fromhost,message FROM systemevents where (syslogtag = 'sslogger' OR syslogtag = 'sslogger:') AND message ~ 'as:root' ORDER BY devicereportedtime DESC";

    client
      .connect()
      .then(() => {
        client.query(query, (err, result) => {
          if (err) throw err;

          if (result.rows.length > 0) {
            result.rows.forEach((ses) => {
              if (prodlist.findIndex(el => el.startsWith(ses.fromhost)) > -1) {
                const row = [];
                const message = ses.message.split('; ');
                const tempDatum = ses.devicereportedtime.toISOString().slice(0, 10);
                const datum = omgekeerd(tempDatum);
                const tijd = ses.devicereportedtime.toLocaleTimeString('nl-NL', { hour12: false });
                const tag = ses.syslogtag;
                const acc = accounts.findIndex(el => el.includes(message[0].split(":")[1]));
                const group = (acc > -1) ? accounts[acc].split("\t")[1] : 'onbekend';
                const month = new Date(ses.devicereportedtime).getMonth() + 1;
                const ser_id = prodlist.findIndex(el => el.startsWith(ses.fromhost));
                const sl = prodlist[ser_id].split(",")[1];
                const owner = prodlist[ser_id].split(",")[2];

                row.push(datum);
                row.push(tijd);
                row.push(ses.fromhost);
                row.push(sl);
                row.push(tag);
                row.push(message[0].split(":")[1]);
                row.push(group);
                row.push(message[1].replace(/^\s/g, ''));
                row.push(message[message.length - 1].replace(/^\s|,|"|;/g, ''));
                row.push(owner);

                slog_output.add(row.join(';'));
              }
            });
            fs.writeFileSync(slogfile, [...slog_output].join(os.EOL));
          }

          client
            .end()
            .then(() => {
            })
            .catch((err) => {
              throw err;
            });
        });
      })
      .catch((err) => {
        throw err;
      });
  }
};
