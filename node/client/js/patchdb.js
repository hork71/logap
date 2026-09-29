//const date = new Date();
//const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
//const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
////const eersteDag = firstDay.toISOString().slice(0,10);
//
//console.log(lastDay.toLocaleDateString('nl-NL'));


function cutText(string, lengte = 30) {
  if (string.length > 0) {
    return string.length < lengte ? string : string.substring(0, lengte) + '...';
  }
}

function createTable(data) {
  const properties = Object.keys(data[0]).filter(item => ['server', 'own', 'sl', 'os', 'osr', 'lastpatch'].includes(item));
  const patchdatums = generateKernelDatums(data);
  const columnHeadings = [...properties, ...patchdatums];
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
  //div.innerHTML += `<input type="radio" id="filter" name="aan" checked value="yes" onClick="on(event);">`;
  document.getElementById('data-list').appendChild(div);
  var table = document.createElement('table');
  table.setAttribute('class', 'sortable table table-bordered table-sm');
  table.id = "zoekTabel";
  document.getElementById('data-list').appendChild(table);

  var header = table.createTHead();
  header.setAttribute('class', 'thead-light');
  var row = header.insertRow(-1);
  row.classList.add('header');
  for (let i = 0; i < columnCount; i++) {
    let headerCell = document.createElement('th');
    headerCell.innerText = columnHeadings[i].toUpperCase();
    row.appendChild(headerCell);
  }

  var tBody = document.createElement('tbody');
  table.appendChild(tBody);

  for (let i = 0; i < rowCount; i++) {
    row = tBody.insertRow(-1);
    row.classList.add('modal');
    for (let j = 0; j < columnCount; j++) {
      const cell = row.insertCell(-1);
      cell.setAttribute('data-label', columnHeadings[j].toUpperCase());
      const obj = data[i];
      if (j >= 6) {
        cell.innerText = obj.kernels[0][columnHeadings[j]] ? obj.kernels[0][columnHeadings[j]][0] : '';
        if (obj.kernels[0][columnHeadings[j]] && obj.kernels[0][columnHeadings[j - 1]] && (obj.kernels[0][columnHeadings[j]][0] !== obj.kernels[0][columnHeadings[j - 1]][0])) {
          cell.setAttribute('class', 'verschil');
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
      //keys.forEach(key => {
      //  console.log(server.kernels[0][key]);
      //});

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


  //sorttable.makeSortable(table);
  const zoek = document.getElementById('zoek');
  zoek.addEventListener('keyup', searchTable);
  const csv = document.getElementById('export');
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  csv.addEventListener('click', function() {
    exportTableToCSV(`patch_overzicht_${today}.csv`);
  });
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

function generateKernelDatums(data) {
  const keys = data.map(item => item.kernels).map(kernel => Object.keys(...kernel));
  return [].concat.apply([], keys).filter((v, i, a) => a.indexOf(v) === i);
}

async function loadData() {
  try {
    const response = await fetch('./js/nieuw3108.json');
    //const response = await fetch('./js/patchdb2702.json');
    const data = await response.json();
    return data;
  } catch (err) {
    console.log(err);
  }
}

function startPagination(tabelelement, zoekelement, aantalPerPagina) {
  let options = {
    numberPerPage: aantalPerPagina,
    pageCounter: true
  };
  let filterOptions = {
    el: zoekelement
  };
  paginate.init(tabelelement, options, filterOptions);
  const table = document.querySelector(tabelelement);
}

async function main() {
  // https://stackoverflow.com/questions/40774697/how-to-group-an-array-of-objects-by-key
  // antwoord van metakungfu
  const data = await loadData();
  globalThis.data1 = data;
  createTable(data);
  startPagination('#zoekTabel', '#zoek', 50);
}

main();
