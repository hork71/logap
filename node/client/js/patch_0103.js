//const date = new Date();
//const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
//const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
////const eersteDag = firstDay.toISOString().slice(0,10);
//
//console.log(lastDay.toLocaleDateString('nl-NL'));
// https://stackoverflow.com/questions/40774697/how-to-group-an-array-of-objects-by-key
// antwoord van metakungfu

function cutText(string, lengte = 30) {
  if (string.length > 0) {
    return string.length < lengte ? string : string.substring(0, lengte) + '...';
  }
}

function createTable(data, patchdatum, kerneldatums) {
  const gepatched = data.filter(elem => elem.patchdates.includes(patchdatum)).length;
  const properties = Object.keys(data[0]).filter(item => ['server', 'own', 'sl', 'os', 'osr', 'lastpatch'].includes(item));
  properties.push('p', patchdatum);
  const columnHeadings = properties;
  const columnCount = columnHeadings.length;
  const rowCount = data.length;
  var div = document.createElement('div');
  div.setAttribute('class', 'floot');
  var para = document.createElement('p');
  para.id = "totaal";
  //para.innerText = `Totaal: ${rowCount} Gepatched: ${gepatched}`;
  para.innerText = `${gepatched} gepatched van ${rowCount}`;
  div.appendChild(para);
  div.innerHTML += `<input type="text" placeholder="Zoekterm" id="zoek">`;
  div.innerHTML += `<input type="button" id="export" value="CSV">`;
  //div.innerHTML += `<input type="radio" id="filter" name="aan" checked value="yes" onClick="on(event);">`;
  document.getElementById('data-list').appendChild(div);
  var table = document.createElement('table');
  table.setAttribute('class', 'sortable table table-bordered table-sm standaard tohide');
  table.id = "zoekTabel";
  document.getElementById('data-list').appendChild(table);

  var header = table.createTHead();
  header.setAttribute('class', 'thead-light standaard');
  var row = header.insertRow(-1);
  row.setAttribute('class', 'standaard');
  for (let i = 0; i < columnCount; i++) {
    let headerCell = document.createElement('th');
    headerCell.setAttribute('class', 'standaard');
    headerCell.innerText = columnHeadings[i].toUpperCase();
    row.appendChild(headerCell);
  }

  var tBody = document.createElement('tbody');
  tBody.setAttribute('class', 'standaard');
  table.appendChild(tBody);

  const meestrecent = kerneldatums.indexOf(patchdatum);

  for (let i = 0; i < rowCount; i++) {
    row = tBody.insertRow(-1);
    row.setAttribute('class', 'modal standaard');
    for (let j = 0; j < columnCount; j++) {
      const cell = row.insertCell(-1);
      cell.setAttribute('data-label', columnHeadings[j].toUpperCase());
      cell.setAttribute('class', 'standaard');
      const obj = data[i];
      if (j === 7) {
        cell.innerText = obj.kernels[0][columnHeadings[j]] ? obj.kernels[0][columnHeadings[j]][0] : '';
        if (obj.kernels[0][kerneldatums[meestrecent]] && obj.kernels[0][kerneldatums[meestrecent - 1]] && (obj.kernels[0][kerneldatums[meestrecent]][0] !== obj.kernels[0][kerneldatums[meestrecent - 1]][0])) {
          cell.setAttribute('class', 'verschil standaard');
          cell.previousSibling.innerText = 'X+';
        }
      } else {
        cell.innerText = obj[columnHeadings[j]] || '';
      }
    }
  }

  const rijen = document.querySelectorAll('.modal');
  [...rijen].forEach(rij => {
    rij.addEventListener('click', function(e) {
      e.preventDefault();
      const container = document.getElementById('modal1');
      const box = container.querySelector('.modalWindow');
      const tbody = document.getElementById('hist');
      const titel = document.getElementById('titel');
      tbody.innerHTML = '';

      const [server] = data.filter(element => element.server === rij.firstChild.innerText);
      const keys = Object.keys(server.kernels[0]);
      titel.innerText = server.server;

      tbody.innerHTML += `
      ${keys.map(key => `
      <tr>
        <td>${key}</td>
        ${(() => {
          const tempkey = keys.indexOf(key);
          if (server.kernels[0][keys[tempkey]] && server.kernels[0][keys[tempkey - 1]] && (server.kernels[0][keys[tempkey]][0] !== server.kernels[0][keys[tempkey - 1]][0])) {
            return `<td class="groen">${server.kernels[0][key][0]}</td>`
          } else {
            return `<td>${server.kernels[0][key][0]}</td>`
          }
        })()}
        <td>${server.kernels[0][key][1]}</td>
        <td>${server.kernels[0][key][2]}</td>
        <td>${server.kernels[0][key][3]}</td>
        <td>${server.kernels[0][key][4]}</td>
      </tr>
      `).join('\n')}
      `

      box.style.transition = 'none';
      box.style.transform = 'rotateY(-70deg)';

      requestAnimationFrame(function() {
        box.style.transition = 'all 0.2s ease';
        box.style.transform = 'rotateY(0deg)';
      });

      container.style.pointerEvents = 'auto';
      container.style.opacity = 1;
    });
  });

  const sluit = document.getElementById('sluit');
  sluit.addEventListener('click', function(e) {
    e.preventDefault();
    const container = document.getElementById('modal1');
    const tbody = document.getElementById('hist');
    container.style.opacity = 0;
    container.style.pointerEvents = 'none';
  });

  sorttable.makeSortable(table);
  const zoek = document.getElementById('zoek');
  zoek.addEventListener('keyup', searchTable);
  const csv = document.getElementById('export');
  const today = new Date().toISOString().slice(0, 19).replace(/-|:/g, '').replace(/T/g, '_');
  csv.addEventListener('click', function() {
    exportTableToCSV(`patchinfo_${today}.csv`);
  });
}

function exportTableToCSV(filename) {
  var csv = [];
  var rows = document.querySelectorAll('table.standaard tr.standaard');

  for (let i = 0; i < rows.length; i++) {
    var row = [], cols = rows[i].querySelectorAll("td.standaard, th.standaard");

    for (let j = 0; j < cols.length; j++)
      row.push(cols[j].innerText.replace(/\r?\n|\r/g, ""));

    csv.push(row.join(";"));
  }
  downloadCSV(csv.join("\n"), filename);
}

function downloadCSV(csv, filename) {
  const csvFile = new Blob([csv], { type: "text/csv" });
  var downloadLink = document.createElement('a');

  downloadLink.download = filename;
  downloadLink.href = window.URL.createObjectURL(csvFile);
  downloadLink.style.display = "none";

  document.body.appendChild(downloadLink);

  downloadLink.click();
}

function searchTable() {
  var filter = document.getElementById('zoek').value.toUpperCase(),
    table = document.getElementById('zoekTabel');


  for (var i = 0; i < table.rows.length; i++) {
    var rowData = '';

    if (i == 0) {
      var tableColCount = table.rows.item(i).cells.length;
      continue;
    }

    for (var j = 0; j < tableColCount; j++) {
      if (!table.rows.item(i).cells.item(j)) {
        continue
      } else {
        rowData += table.rows.item(i).cells.item(j).textContent;
      }
    }

    if (rowData.toUpperCase().indexOf(filter) > -1) {
      table.rows.item(i).style.display = 'table-row';
    } else {
      table.rows.item(i).style.display = 'none';
    }
  }
}

async function loadData() {
  try {
    //const response = await fetch('./js/nieuw3004.json');
    const response = await fetch('./js/nieuw3108.json');
    const data = await response.json();
    return data;
  } catch (err) {
    console.log(err);
  }
}

function generateKernelDatums(data) {
  const keys = data.map(item => item.kernels).map(kernel => Object.keys(...kernel));
  return [].concat.apply([], keys).filter((v, i, a) => a.indexOf(v) === i);
}

function populateDropDown(data, eenheid) {
  const selectList = document.getElementById('level1');

  selectList.innerHTML = '';

  const filterItems = ["Ongefilterd"];

  const filtered = data.reduce((acc, line) => {
    return acc.includes(line[eenheid]) ? acc : [...acc, line[eenheid]];
  }, []);

  Array.prototype.push.apply(filterItems, filtered);

  filterItems.map(kenmerk => {
    const option = document.createElement('option');
    option.textContent = kenmerk;
    option.value = kenmerk;
    selectList.appendChild(option);
  });
}

function populatePatchDatums(element, waarden) {
  const selectList = document.getElementById(element);

  selectList.innerHTML = '';
  selectList.innerHTML += '<option disabled value="" selected hidden>Datum</option>';

  waarden.map(kenmerk => {
    const option = document.createElement('option');
    option.textContent = kenmerk;
    option.value = kenmerk;
    selectList.appendChild(option);
  });
}

function selectOptionDynamic(selectedoption, subelement, data) {
  const sub = document.getElementById(subelement);
  sub.innerHTML = '';
  sub.innerHTML += '<option value="" disabled selected hidden>Kies</option>';

  switch (subelement) {
    case 'level1':
      data = ['sl', 'os', 'own'];
      data.map(kenmerk => {
        const option = document.createElement('option');
        option.textContent = kenmerk;
        option.value = kenmerk;
        sub.appendChild(option);
      });
      break;
    case 'level2':
      if (selectedoption.value !== 'os') {
        const sub3 = document.getElementById('level3');
        sub3.setAttribute('style', 'display:none');
        sub3.innerHTML = '';
      }
      const filtered = data.reduce((acc, line) => {
        return acc.includes(line[selectedoption.value]) ? acc : [...acc, line[selectedoption.value]];
      }, []);
      filtered.map(kenmerk => {
        const option = document.createElement('option');
        option.textContent = kenmerk;
        option.value = kenmerk;
        sub.appendChild(option);
      });
      break;
    case 'level3':
      const keuzes = ['SLES', 'Ubuntu', 'RedHat'];
      if (keuzes.includes(selectedoption.value)) {
        sub.setAttribute('style', 'display:inline');
        data = data.filter(item => item.os === selectedoption.value);
        const filtered = data.reduce((acc, line) => {
          return acc.includes(line.osr) ? acc : [...acc, line.osr];
        }, []).sort(function(a, b) { return a - b; });
        filtered.map(kenmerk => {
          const option = document.createElement('option');
          option.textContent = kenmerk;
          option.value = kenmerk;
          sub.appendChild(option);
        });
      }
      break;
    default:
      return;
  }
}

function stackGrafiek(data, datum) {
  d3.select('.month-chart').select('svg').remove();

  const maand = d3.timeParse("%Y-%m-%d")(datum);

  let gesorteerd = data;
  //const mapKenmerk = {
  //  sl: 'servicelevel',
  //  os: 'besturingssysteem',
  //  own: 'eigenaar',
  //  osr: 'os versie'
  //};

  const seriesKeys = Object.keys(gesorteerd[0]).slice(1, Object.keys(gesorteerd[0]).length);

  const stackedData = d3.stack()
    .keys(seriesKeys)(gesorteerd);

  const margin = { top: 35, right: 20, bottom: 25, left: 50 };
  const width = 900 - margin.left - margin.right;
  const height = gesorteerd.length * 28 + margin.top + margin.bottom;

  const svg = d3.select('.month-chart').append('svg')
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  const header = svg.append('g')
    .attr('class', 'bar-header')
    .attr('transform', `translate(${margin.left}, ${-margin.top / 3})`)
    .append('text');

  header.append('tspan').text(`Patchoverzicht 1 ${maand.toLocaleString('nl-NL', { year: 'numeric', month: 'long' })}`).attr('dy', '0.3em');;

  const x = d3.scaleLinear()
    .domain([0, d3.max(stackedData, d => d3.max(d, d => d[1]))])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleBand()
    .domain(gesorteerd.map(d => cutText(d.eenheid)))
    .rangeRound([margin.top, height - margin.bottom])
    .paddingInner(0.20);

  const color = d3.scaleOrdinal()
    .domain(stackedData.map(d => d.key))
    .range(['#778977', '#cd5c5c']);

  const xAxis = g => g
    .attr("transform", `translate(0,${margin.top})`)
    .call(d3.axisTop(x).tickSizeInner(0).tickSizeOuter(0))
    .call(g => g.selectAll('.domain').remove());

  const yAxis = g => g
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).tickSize(0))
    .call(g => g.selectAll('.domain').remove());

  const tip = d3.select('.tooltip');

  svg.append('g')
    .selectAll('g')
    .data(stackedData)
    .join('g')
    .attr('fill', d => color(d.key))
    .selectAll('rect')
    .data(d => d)
    .join('rect')
    .attr('x', d => x(d[0]))
    .attr('y', (d, i) => y(cutText(d.data.eenheid)))
    .attr('width', d => x(d[1]) - x(d[0]))
    .attr('height', y.bandwidth())
    .on('mouseover', d => {
      const barData = d.data;
      const tip = d3.select('.tooltip');

      tip
        .style('left', d3.event.clientX + 'px')
        .style('top', d3.event.clientY + 'px')
        .style('opacity', 0.98);

      const total = (d[1] - d[0]);
      const alles = (barData.gepatched + barData.ongepatched);
      tip.select('h3').html(`Kenmerk: ${barData.eenheid}`);
      tip.select('h4').html(`Aantal: ${total} van ${alles}`);
    })
    .on('mousemove', mousemove)
    .on('mouseout', mouseout);

  svg.append('g')
    .attr('class', 'x-axis')
    .call(xAxis)
    .selectAll('text').attr('dy', '-0.3em');

  svg.append('g')
    .attr('class', 'y-axis')
    .call(yAxis)
    .selectAll('text').attr('dx', '-0.6em');

  function mousemove() {
    d3.select('.tooltip')
      .style('left', `${d3.event.clientX + 15}px`)
      .style('top', `${d3.event.clientY}px`);
  }

  function mouseout() {
    d3.select('.tooltip')
      .style('opacity', 0);
  }
}

function filterUnique(keys) {
  return [].concat.apply([], keys).filter((v, i, a) => a.indexOf(v) === i);
}

function generateKernelDatums(data) {
  const keys = data.map(item => item.kernels).map(kernel => Object.keys(...kernel));
  return filterUnique(keys);
}

function removeTable(element) {
  toremove = document.getElementById(element);
  while (toremove.firstChild) {
    toremove.removeChild(toremove.lastChild);
  }
}

function sanitizeForm(formdata) {
  return [].concat.apply([], formdata).filter((elm, index) => index % 2 !== 0);
}

function reduceData(data, formdata) {
  const [datum, ...formulier] = formdata;
  const formLength = formulier.length;
  data = data.filter(obj => obj.kernels[0].hasOwnProperty(datum));

  let metric, output;
  if (formLength === 1) {
    // 1 -> [eenheid]
    //   |-> ['sl']
    metric = formulier[0];
    output = data.reduce((acc, line) => {
      let ja = 0;
      let nee = 0;

      line.patchdates.includes(datum) ? ja++ : nee++;

      const ndx = acc.findIndex(e => e.eenheid === line[metric]);

      if (ndx > -1) {
        acc[ndx].gepatched = (acc[ndx].gepatched || 0) + ja;
        acc[ndx].ongepatched = (acc[ndx].ongepatched || 0) + nee;
      } else {
        acc.push({
          eenheid: line[metric],
          gepatched: ja,
          ongepatched: nee
        });
      }

      return acc;
    }, []);
  } else if (formLength === 2) {
    // 2 -> [identifier, eenheid]
    if (formulier[0] === 'os') {
      //  |-> ['os', 'SLES'] -> filter eenheid -> reduce 'osr'
      data = data.filter(obj => obj[formulier[0]] === formulier[1]);
      metric = 'osr';
      output = data.reduce((acc, line) => {
        let ja = 0;
        let nee = 0;

        line.patchdates.includes(datum) ? ja++ : nee++;

        const ndx = acc.findIndex(e => e.eenheid === line[metric]);

        if (ndx > -1) {
          acc[ndx].gepatched = (acc[ndx].gepatched || 0) + ja;
          acc[ndx].ongepatched = (acc[ndx].ongepatched || 0) + nee;
        } else {
          acc.push({
            eenheid: line[metric],
            gepatched: ja,
            ongepatched: nee
          });
        }

        return acc;
      }, []);
    } else {
      // |-> ['sl', '1A'] -> reduce identifier -> filter eenheid
      metric = formulier[0];
      output = data.reduce((acc, line) => {
        let ja = 0;
        let nee = 0;

        line.patchdates.includes(datum) ? ja++ : nee++;

        const ndx = acc.findIndex(e => e.eenheid === line[metric]);

        if (ndx > -1) {
          acc[ndx].gepatched = (acc[ndx].gepatched || 0) + ja;
          acc[ndx].ongepatched = (acc[ndx].ongepatched || 0) + nee;
        } else {
          acc.push({
            eenheid: line[metric],
            gepatched: ja,
            ongepatched: nee
          });
        }

        return acc;
      }, []).filter(item => item.eenheid === formulier[1]);
      data = data.filter(obj => obj[metric] === formulier[1]);
    }
  } else if (formLength === 3) {
    // 3 -> [identifier, sub, eenheid]
    //   ->   ['os', 'SLES', '11.4'] -> filter sub -> reduce 'osr' -> filter eenheid
    data = data.filter(obj => obj[formulier[0]] === formulier[1]);
    metric = 'osr';
    output = data.reduce((acc, line) => {
      let ja = 0;
      let nee = 0;

      line.patchdates.includes(datum) ? ja++ : nee++;

      const ndx = acc.findIndex(e => e.eenheid === line[metric]);

      if (ndx > -1) {
        acc[ndx].gepatched = (acc[ndx].gepatched || 0) + ja;
        acc[ndx].ongepatched = (acc[ndx].ongepatched || 0) + nee;
      } else {
        acc.push({
          eenheid: line[metric],
          gepatched: ja,
          ongepatched: nee
        });
      }

      return acc;
    }, []).filter(item => item.eenheid === formulier[2]);
    data = data.filter(obj => obj.osr === formulier[2]);
  }
  const sorted = output.sort((a, b) => ((a.gepatched + a.ongepatched) < (b.gepatched + b.ongepatched)) ? 1 : (a.gepatched < b.gepatched) ? ((a.ongepatched < b.ongepatched) ? 1 : -1) : -1);

  return [data, sorted, datum];
}

async function main() {
  const data = await loadData();
  const patchdatums = generateKernelDatums(data);
  const meestRecent = patchdatums.slice(-1);
  const gefilterd = data.filter(obj => obj.kernels[0].hasOwnProperty(meestRecent));

  populatePatchDatums('datum', patchdatums.slice(1));

  document.getElementById('datum').addEventListener('change', function() {
    selectOptionDynamic(this, 'level1', data);
  });

  document.getElementById('level1').addEventListener('change', function() {
    selectOptionDynamic(this, 'level2', data);
  });

  document.getElementById('level2').addEventListener('change', function() {
    selectOptionDynamic(this, 'level3', data);
  });

  document.getElementById('knop').addEventListener('click', (e) => {
    e.preventDefault();
    const form = new FormData(document.forms[0]);
    const formdata = [...form.entries()];

    if (formdata.length <= 1) {
      return alert('Maak een keuze');
    }

    const sanitizedFormData = sanitizeForm(formdata);
    const [tabelData, grafiekData, datum] = reduceData(data, sanitizedFormData);
    stackGrafiek(grafiekData, datum);
    removeTable('data-list');
    createTable(tabelData, datum, patchdatums);
  });

  //const pworker = new Worker('./js/pworker.js');
  //
  //pworker.addEventListener('message', function(e) {
  //  console.log(e.data);
  //});

}

main();
