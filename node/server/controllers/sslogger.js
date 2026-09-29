const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cp = require('child_process');
const axios = require('axios');
var yaml = require('js-yaml');
const csv = require('csv-parser');

const slURL = 'https://server1.example.com:8081/pdb/query/v4/facts/servicelevel/';
const dir = '/etc/puppetlabs/code-staging/environments/production/hieradata/nodes';
const slogdataAdm = require(path.join(__dirname, '../data/sslogger', 'sslogger_adm.json'));

var results = [];

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  ca: fs.readFileSync('../../ssl/certs/ca.pem'),
  cert: fs.readFileSync('../../ssl/certs/server1.example.com.pem'),
  key: fs.readFileSync('../../ssl/private_keys/server1.example.com.pem')
});

function servOneA() {
  return axios.get(`${slURL}1A`, { httpsAgent });
}
function servOneB() {
  return axios.get(`${slURL}1B`, { httpsAgent });
}

function gitCommitList(command, opts) {
  opts || (opts = {});
  return new Promise((resolve, reject) => {
    exec(command, opts, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stdout);
    });
  });
}

function removeDuplicates(arr) {
  const map = new Map();

  for (const obj of arr) {
    if (obj.sslogger_begin == 'Niet gedefinieerd') {
      continue;
    }
    const existing = map.get(obj.sslogger_begin);

    if (!existing) {
      map.set(obj.sslogger_begin, obj);
    } else {
      if (obj.commit_datum < existing.commit_datum) {
        map.set(obj.sslogger_begin, obj);
      }
    }
  }

  return Array.from(map.values()).sort((b, a) => {
    return a.commit_datum.localeCompare(b.commit_datum);
  });
}

function processCommitList(stdout) {
  const results = [];
  const lines = stdout.toString().split('\n');
  lines.map((line) => {
    if (line) {
      results.push(line);
    }
  });
  return results;
}

async function getServicelevel(node) {
  const url = `https://server1.example.com:8081/pdb/query/v4/nodes/${node}/facts/servicelevel`
  let slevel;
  let level;
  try {
    slevel = await axios.get(url, { httpsAgent });
    level = slevel.data;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      level = [{
        'certname': node,
        'environment': 'onbekend',
        'name': 'servicelevel',
        'value': '404'
      }];
    }
  }
  return level[0];
}

function berekenEinddatum(begindatum, verschil) {
  const datum = new Date(begindatum);
  datum.setDate(datum.getDate() + verschil);
  return datum.toISOString().split('T')[0];
}

module.exports = {
  getAll() {
    const filepath = path.join(__dirname, '../lib', 'uit1.json');
    const groepData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

    const filepathclient = path.join(__dirname, '..', 'client.json');
    const slogadmindata = JSON.parse(fs.readFileSync(filepathclient, 'utf-8'));
    const todayDate = new Date().toISOString().slice(0, 10);

    slogdataAdm.data[todayDate] = slogadmindata.length;
    fs.writeFileSync(path.join(__dirname, "../data/sslogger", "sslogger_adm.json"), JSON.stringify(slogdataAdm));

    return Promise.resolve([groepData, slogadmindata, slogdataAdm]);
  },
  async getServer(server) {
    let dataPunten = [];
    const naam = server.split('.')[0];

    const twee_dagen = ['1a', '1A', '1b', '1B', '2', '1aroot', '1AROOT', '1broot', '1BROOT', '2root', '2ROOT'];
    const zes_weken = ['3', 'eol', 'EOL', '3root', '3ROOT', 'eolroot', 'EOL3'];

    const p_slevel = await getServicelevel(server);
    const delta = twee_dagen.includes(p_slevel.value) ? 2 : 42;

    const exec_options = {
      cwd: path.join(__dirname, '../data/sslogger/')
    };

    try {
      const tijdstippen = cp.execSync(`find . -name "*.csv" | xargs grep -awh ${naam} | sort -b -t- -k3n -k2n -k1n | /usr/bin/tac | awk -F";" 'BEGIN {OFS=";"}; {if (NF < 11) {print $1,$2,$3,$4,$6,$7,$9} else {print $1,$2,$3,$4,$6,$7,$10}}'`, exec_options);
      dataPunten = tijdstippen.toString().split('\n');
      let tmp = dataPunten.splice(-1, 1);
    } catch (err) {
    }

    // Mapping groep - datapunten

    const intermediateData = dataPunten.map(item => item.split(';'));

    const multiData = intermediateData.reduce((result, line) => {
      result[line[5]] = result[line[5]] || [];
      result[line[5]].push(`${line[0]} ${line[1]}`);
      return result;
    }, {});


    var datum, tijdstip, server, sl, account, groep, reden;

    const tableData = intermediateData.reduce((acc, line) => {
      acc.push({ datum: line[0], tijdstip: line[1], server: line[2], sl: line[3], account: line[4], groep: line[5], reden: line[6] });
      return acc;
    }, []);

    var yamlPad = `${server}.yaml`;
    var compleet = [];
    const command = {
      gList: `git pull >/dev/null 2>&1 && git log -G' [0-9]{7,}' --pretty='%h,%an,%ad,%s' --date=short --diff-filter=AMR --all --since=2021-01-01 -- nodes/${yamlPad}`
    };
    var cOPts = { cwd: '/home/users/v5a042x4/dev/hiera' };
    try {
      const res = await gitCommitList(command.gList, cOPts);
      if (!res.length > 0) {
        const out = {
          "naam": server,
          "owner": 'nvt',
          "groups": 'ApacheWebbeheerPam',
          "sslogger_begin": '20240101',
          "sslogger_until": '20241231',
          "commit": 'nvt',
          "commit_datum": 'nvt',
          "auteur": 'nvt',
          "onderwerp": 'nvt'
        };
        return Promise.resolve([[out], {}, []]);
      }
      const gitArray = processCommitList(res);
      const pol = await parseCommits(gitArray, server, p_slevel.value, delta);
      let flatArray = pol.reduce((accumulator, value) => accumulator.concat(value), []);
      const geendubbel = removeDuplicates(flatArray);
      return Promise.resolve([geendubbel, multiData, tableData]);
    } catch (e) {
      console.error(e);
      return Promise.resolve("Geen data");
    }
  },
  getReport(period, res) {
    const slogdataMon = require(path.join(__dirname, '../data/sslogger', 'sslogger_mon.json'));
    const results = [];

    fs.createReadStream(path.join(__dirname, '../data/sslogger', `${period}_sslogger.csv`))
      .pipe(csv({ separator: ';' }))
      .on('data', (chunk) => {
        results.push(chunk);
      })
      .on('end', () => {
        res.json([results, slogdataMon]);
      });
  },
  getLiveInfo(res) {
    const results = [];

    fs.createReadStream(path.join(__dirname, '../data/sslogger', 'slog_live.csv'))
      .pipe(csv({ headers: ['Datum', 'Tijd', 'Server', 'SL', 'Tag', 'User', 'Groep', 'Alias', 'Reden', 'Owner'], separator: ';' }))
      .on('data', (chunk) => {
        results.push(chunk);
      })
      .on('end', () => {
        res.json(results);
      });
  }
};

async function parseCommits(array, server, slevel, delta) {
  var yamlPad = `${server}.yaml`;
  return await Promise.all(array.map(async com => {
    const regel = com.toString().split(",");
    return await buildObject(regel, server, yamlPad, slevel, delta).then(res => {
      return res;
    })
  }))
}

function convert(string) {
  return Number(string.replace(/\-/g, ""));
}

async function buildObject(regel, server, pad, slevel, delta) {
  var cOPts = { cwd: '/home/users/v5a042x4/dev/hiera' };
  let obj = {};
  try {
    const res = await gitCommitList(`git cat-file -p ${regel[0]}:./nodes/${pad}`, cOPts);
    const yamlFile = yaml.safeLoad(res);
    let begindatum;
    let begin = yamlFile.sslogger_begin;
    let until = yamlFile.sslogger_until;
    let owner = yamlFile.owner;
    let groups = yamlFile.sslogger_groups;
    let datumvorm = typeof (begin);
    if (datumvorm === 'object') {
      const uit = []
      for (const datum of begin) {
        let dict = {}
        begindatum = `${datum.toString().slice(0, 4)}-${datum.toString().slice(4, 6)}-${datum.toString().slice(-2)}`;
        dict = {
          "naam": server,
          "owner": owner,
          "groups": groups,
          "sslogger_begin": datum,
          "sslogger_until": berekenEinddatum(begindatum, delta).replace('-', '').replace('-', ''),
          "commit": regel[0],
          "commit_datum": regel[2],
          "auteur": regel[1],
          "onderwerp": regel[3]
        };
        uit.push(dict);
      }
      return uit;
    } else {
      begin = begin || "Niet gedefinieerd";
      until = until || "Niet gedefinieerd";
      owner = owner || "Niet gedefinieerd";
      groups = groups || ["Niet gedefinieerd"];
      if (begin > 20240430) {
        begindatum = `${begin.toString().slice(0, 4)}-${begin.toString().slice(4, 6)}-${begin.toString().slice(-2)}`;
        until = berekenEinddatum(begindatum, delta).replace('-', '').replace('-', '');
      }

      obj = {
        "naam": server,
        "owner": owner,
        "groups": groups,
        "sslogger_begin": begin,
        "sslogger_until": until,
        "commit": regel[0],
        "commit_datum": regel[2],
        "auteur": regel[1],
        "onderwerp": regel[3]
      };

      return obj;
    }
  } catch (e) {
    console.log(e);
  }
  return gitCommitList(`git cat-file -p ${regel[0]}:./nodes/${pad}`, cOPts).then(res => {
    if (!res) {
      console.log("res is leeg", res);
    }
    const regexBegin = /sslogger_begin:\s(\d{5,})/;
    const regexUntil = /sslogger_until:\s(\d{5,})/;
    const regexOw = /owner:\s([A-Za-z0-9]+)/;
    const regexGr = /^sslogger_groups:\n((?:^[ ].*\n?)*$)/m;

    let begin = res.match(regexBegin);
    let until = res.match(regexUntil);
    let owner = res.match(regexOw);
    let groups = res.match(regexGr);

    begin = begin ? begin[1] : "Niet gedefinieerd";
    until = until ? until[1] : "Niet gedefinieerd";
    owner = owner ? owner[1] : "Niet gedefinieerd";
    groups = groups ? groups[1].replace(/\n|\s/gm, "").split('-').filter(n => n) : ["Niet gedefinieerd"];

    const obj = {
      "naam": server,
      "owner": owner,
      "groups": groups,
      "sslogger_begin": begin,
      "sslogger_until": until,
      "commit": regel[0],
      "commit_datum": regel[2],
      "auteur": regel[1],
      "onderwerp": regel[3]
    };

    return obj;
  }).catch((err) => {
    console.log(err);
  });
}
