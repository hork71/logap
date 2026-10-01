const API_URL = '/api/live';

async function setUp(url) {
  const data = fetch(url)
    .then(res => res.json())
    .then(data => {
      populateGroepNamen(data);
      createTable(data);
      stackGrafiek(data);
      onChange(data);
    })
    .catch(error => console.error('Error:', error));
}

function cutText(string, lengte = 30) {
  if (string) {
    return string.length < lengte ? string : string.substring(0, lengte) + '...';
  }
}

function onChange(data) {
  document.getElementById('groepnamen').addEventListener('change', (e) => {
    e.preventDefault();
    const groepnaam = e.target.value.trim();
    groepnaam === 'Ongefilterd' ? stackGrafiek(data, 'Groep') : stackGrafiek(data, 'User', groepnaam);
    toremove = document.getElementById('data-list');
    while (toremove.firstChild) {
      toremove.removeChild(toremove.lastChild);
    }
    groepnaam === 'Ongefilterd' ? createTable(data) : createTable(data, groepnaam);
  });
}

function stackGrafiek(data, eenheid = 'Groep', groepnaam = undefined) {
  d3.select('.month-chart').select('svg').remove();

  let metric = eenheid;
  let margin;

  if (groepnaam) {
    data = data.filter(dat => dat.Groep === groepnaam);
    metric = 'User';
    margin = { top: 35, right: 20, bottom: 25, left: 50 };
  } else {
    margin = { top: 35, right: 20, bottom: 25, left: 118 };
  }

  let gesorteerd = reduceer(data, metric);

  d3.selectAll('button').on('click', function() {
    d3.event.preventDefault();
    const eenheid = this.dataset.name;
    stackGrafiek(data, eenheid);
    window.scrollTo(0, 0);
  });

  const seriesKeys = Object.keys(gesorteerd[0]).slice(1, Object.keys(gesorteerd[0]).length);

  const stackedData = d3.stack()
    .keys(seriesKeys)(gesorteerd);

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

  header.append('tspan').text('Sslogger overzicht van de laatste 8 dagen').attr('dy', '0.3em');;

  const x = d3.scaleLinear()
    .domain([0, d3.max(stackedData, d => d3.max(d, d => d[1]))])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleBand()
    .domain(gesorteerd.map(d => cutText(d.groep)))
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
    .attr('y', (d, i) => y(cutText(d.data.groep)))
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
      const alles = (barData.verified + barData.unverified);
      tip.select('h3').html(`${barData.groep}`);
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

  function mouseover() {
    const barData = d3.select(this).data()[0];
    const tip = d3.select('.tooltip');

    tip
      .style('left', d3.event.clientX + 'px')
      .style('top', d3.event.clientY + 'px')
      .style('opacity', 0.98);

    total = parseInt(barData.data.verified) + parseInt(barData.data.unverified)
    tip.select('h3').html(`${barData.data.groep}`);
    tip.select('h4').html(`${total}`);
  }

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

function populateGroepNamen(data) {
  const selectList = document.getElementById('groepnamen');

  const filtered = data.reduce((acc, line) => {
    return acc.includes(line.Groep) ? acc : [...acc, line.Groep];
  }, []);

  filtered.map(groepnaam => {
    const option = document.createElement('option');
    option.textContent = groepnaam;
    option.value = groepnaam;
    selectList.appendChild(option);
  });

  //selectList.addEventListener('change',
}

function reduceer(data, metric) {
  const output = data.reduce((acc, line) => {
    let ja = 0;
    let nee = 0;

    (!line.Reden.match(/\d{5,}/) || line.Reden.match(/\s0{4,}|0{5,}|1{4,}|2{4,}|3{4,}|4{4,}|5{4,}|6{4,}|7{4,}|8{4,}|9{5,}|1234|010101/)) ? nee++ : ja++;

    const ndx = acc.findIndex(e => e.groep === line[metric]);

    if (ndx > -1) {
      acc[ndx].verified = (acc[ndx].verified || 0) + ja;
      acc[ndx].unverified = (acc[ndx].unverified || 0) + nee;
    } else {
      acc.push({
        groep: line[metric],
        verified: ja,
        unverified: nee
      });
    }

    return acc;
  }, []);
  const sorted = output.sort((a, b) => ((a.verified + a.unverified) < (b.verified + b.unverified)) ? 1 : (a.verified < b.verified) ? ((a.unverified < b.unverified) ? 1 : -1) : -1);

  return sorted;
}

function createTable(data, groepnaam = undefined) {
  if (groepnaam) {
    data = data.filter(dat => dat.Groep === groepnaam);
  }
  const columnHeadings = ['Datum', 'Tijd', 'Server', 'SL', 'User', 'Groep', 'Reden', 'Owner'];
  const columnCount = columnHeadings.length;
  const rowCount = data.length;
  var div = document.createElement('div');
  div.setAttribute('class', 'floot');
  var para = document.createElement('p');
  para.id = "totaal";
  para.innerText = `Totaal: ${rowCount}`;
  div.appendChild(para);
  div.innerHTML += `<input type="text" placeholder="Zoekterm" id="zoek">`;
  div.innerHTML += `<input type="button" id="export" value="CSV">`;
  document.getElementById('data-list').appendChild(div);
  var table = document.createElement('table');
  table.setAttribute('class', 'sortable table table-bordered table-sm');
  table.id = "zoekTabel";
  document.getElementById('data-list').appendChild(table);

  var header = table.createTHead();
  header.setAttribute('class', 'thead-light');
  var row = header.insertRow(-1);
  for (let i = 0; i < columnCount; i++) {
    let headerCell = document.createElement('th');
    headerCell.innerText = columnHeadings[i].toUpperCase();
    row.appendChild(headerCell);
  }

  var tBody = document.createElement('tbody');
  table.appendChild(tBody);

  for (let i = 0; i < rowCount; i++) {
    row = tBody.insertRow(-1);
    for (let j = 0; j < columnCount; j++) {
      const cell = row.insertCell(-1);
      cell.setAttribute('data-label', columnHeadings[j].toUpperCase());
      const obj = data[i];
      if (j == 6) {
        if (!obj[columnHeadings[j]].match(/\d{5,}/) || obj[columnHeadings[j]].match(/\s0{4,}|0{5,}|1{4,}|2{4,}|3{4,}|4{4,}|5{4,}|6{4,}|7{4,}|8{4,}|9{5,}|1234|010101/)) {
          cell.style.color = 'red';
        } else {
          cell.parentNode.classList.add('hide');
        }
      }
      cell.innerText = cutText(obj[columnHeadings[j]], 30);
    }
  }

  sorttable.makeSortable(table);
  const zoek = document.getElementById('zoek');
  zoek.addEventListener('keyup', searchTable);
  const csv = document.getElementById('export');
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  csv.addEventListener('click', function() {
    exportTableToCSV(`sslogger_live${today}.csv`);
  });
}

function exportTableToCSV(filename) {
  var csv = [];
  var rows = document.querySelectorAll('table tr');

  for (let i = 0; i < rows.length; i++) {
    var row = [], cols = rows[i].querySelectorAll("td, th");

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

function on(e) {
  const radio = document.getElementById('filter');
  const check = radio.getAttribute('checked');
  radio.setAttribute('checked', check === 'true' ? 'false' : 'true');
  document.querySelectorAll('.hide').forEach(function(row) {
    row.classList.toggle('filter');
  });
  e.preventDefault();
}

function searchTable(pageNum) {
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

setUp(API_URL);
