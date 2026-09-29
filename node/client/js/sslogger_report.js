const API_URL = 'http://v5lqar4433.cenbo.nl:3000/sslogger/report';
const periode = getPeriodFromQuery();

//document.getElementById('start').setCustomValidity(' ');

function getPeriodFromQuery() {
  const parts = window.location.search.match(/\?start=(\d{4}-\d{2})/);
  if (parts) {
    return parts[1].replace(/-/, '');
  } else {
    const datum = new Date();
    if (datum.getMonth() === 0) {
      //return `${(datum.getFullYear()-1)}11`;
      return `${(datum.getFullYear() - 1)}12`;
    } else if (datum.getMonth() < 10) {
      // temp hack => -1 niet vergeten :-)
      return (datum.getFullYear() + "0" + (datum.getMonth()));
    } else {
      return `${datum.getFullYear()}${datum.getMonth()}`;
    }
    //return datum.getMonth() < 10 ? (datum.getFullYear() + "0" + datum.getMonth()) : `${datum.getFullYear()}${datum.getMonth()}`;
  }
}

//const form = document.forms.periodeform;
//form.addEventListener('submit', getMonth);

function setUp(url, periode) {
  fetch(`${url}/${periode}`)
    .then(res => res.json())
    .then(data => {
      //vulDatumSelectie();
      populateGroepNamen(data[0]);
      createTable(data[0]);
      stackGrafiek(data[0]);
      onChange(data[0]);
      //genChart(1); // "js/sslogger_mon.csv"
      //console.log(data[0]);

      //const parsedData = parseData(data[1]);
      //drawChart(parsedData);
      //genChart();
      //const toChart = genStats(data[0]);
      //console.log(toChart);
      //drawStats(toChart[0]);
      //tekenGraf(data[0]);
    })
    .catch(err => console.error(err.message));
}

function cutText(string, lengte = 30) {
  if (string) {
    return string.length < lengte ? string : string.substring(0, lengte) + '...';
  }
}

function onChange(data) {
  document.getElementById('groepnamen').addEventListener('change', (e) => {
    e.preventDefault;
    const groepnaam = e.target.value;
    groepnaam === 'Ongefilterd' ? stackGrafiek(data, 'Groep') : stackGrafiek(data, 'Account', groepnaam);
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

  if (groepnaam) {
    data = data.filter(dat => dat.Groep === groepnaam);
    metric = 'Account';
    margin = { top: 35, right: 20, bottom: 25, left: 50 };
  } else {
    margin = { top: 35, right: 20, bottom: 25, left: 118 };
  }

  const maand = d3.timeParse("%d-%m-%Y")(data[0].Datum);

  let gesorteerd = reduceer(data, metric);

  //function onClick() {
  //  const eenheid = this.dataset.name;
  //  stackGrafiek(data, eenheid);
  //  window.scrollTo(0,0);
  //}

  d3.selectAll('button').on('click', function() {
    d3.event.preventDefault();
    const eenheid = this.dataset.name;
    stackGrafiek(data, eenheid);
    window.scrollTo(0, 0);
  });

  const seriesKeys = Object.keys(gesorteerd[0]).slice(1, Object.keys(gesorteerd[0]).length);

  const stackedData = d3.stack()
    .keys(seriesKeys)(gesorteerd);

  //const margin = {top: 35, right: 20, bottom: 25, left: 118};
  const width = 900 - margin.left - margin.right;
  //const height = 500 - margin.top - margin.bottom;
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

  header.append('tspan').text(`Sslogger overzicht van ${maand.toLocaleString('nl-NL', { year: 'numeric', month: 'long' })}`).attr('dy', '0.3em');;

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
      tip.select('h3').html(`${barData.groep}`);
      tip.select('h4').html(`${total}`);
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

function vulDatumSelectie() {
  const datum = new Date();
  for (jaar = datum.getFullYear(); jaar >= 2019; jaar--) {
    const optn = document.createElement("OPTION");
    optn.text = jaar;
    optn.value = jaar;
    document.getElementById('jaar').options.add(optn);
  }

  const maandArray = new Array();
  maandArray[0] = "Jan";
  maandArray[1] = "Feb";
  maandArray[2] = "Mrt";
  maandArray[3] = "Apr";
  maandArray[4] = "Mei";
  maandArray[5] = "Jun";
  maandArray[6] = "Jul";
  maandArray[7] = "Aug";
  maandArray[8] = "Sep";
  maandArray[9] = "Okt";
  maandArray[10] = "Nov";
  maandArray[11] = "Dec";

  for (maand = 0; maand <= 11; maand++) {
    var optn = document.createElement("OPTION");
    optn.text = maandArray[maand];
    if (maand < 9) {
      optn.value = `0${maand + 1}`;
    } else {
      optn.value = (maand + 1);
    }
    if (maand === datum.getMonth()) {
      optn.selected = true;
    }
    document.getElementById('maand').options.add(optn);
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
}

function reduceer(data, metric) {
  const output = data.reduce((acc, line) => {
    let ja = 0;
    let nee = 0;

    //(!line.Reden.match(/\d{6,}/) || line.Reden.match(/[0|1|9]{5,}|010101|-\d{5,}/)) ? nee++ : ja++;
    (!line.Reden.match(/\d{5,}/) || line.Reden.match(/\D0{4,}|1{4,}|2{4,}|3{4,}|4{4,}|5{4,}|6{4,}|7{4,}|8{4,}|9{5,}|1234|010101/)) ? nee++ : ja++;
    //line.Reden.match(/\d{6,}/) ? ja++ : nee++;

    // TODO: naam 'groep' wijzigen in 'eenheid'
    // groep in deze context betekent de gekozen metric (Groep, Account, Server)
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

  // retourneer max 25 items
  //return sorted.filter((d,i) => i < 25);
  return sorted;
}

const randomHexColorCode = () => {
  return "#" + Math.random().toString(16).slice(2, 8)
};

function tekenGraf(data) {
  const maand = d3.timeParse("%d-%m-%Y")(data[0].Datum);

  function makeDataMap(data) {
    return d3.nest()
      .key(function(d) { return d[metric]; })
      .rollup(function(v) { return v.length; })
      .entries(data);
  }

  let metric = 'Groep';

  function onClick() {
    let filt = this.dataset.filt;
    metric = this.dataset.name;
    let dataMap;

    switch (filt) {
      case 'totaal':
        dataMap = makeDataMap(data);
        break;
      case 'ipwc':
        var uData = data.filter(d => d.Reden.match(/\d{5,}/));
        dataMap = makeDataMap(uData);
        break;
      case 'gipwc':
        var uData = data.filter(d => !d.Reden.match(/\d{5,}/));
        dataMap = makeDataMap(uData);
        break;
      default:
    }

    const barChartData = dataMap.slice().sort((a, b) => d3.descending(a.value, b.value)).filter((d, i) => i < 25);

    update(barChartData);
  }

  const dataMap = d3.nest()
    .key(function(d) { return d[metric]; })
    .rollup(function(v) { return v.length; })
    .entries(data);

  const barChartData = dataMap.slice().sort((a, b) => d3.descending(a.value, b.value));


  const svgWidth = 1500;
  const svgHeight = 600;
  const margin = { top: 100, right: 20, bottom: 50, left: 300 };
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  // Scales
  const xMax = d3.max(barChartData, d => d.value);

  const xScale = d3.scaleLinear()
    .range([0, width]);

  const yScale = d3.scaleBand()
    .rangeRound([0, height])
    .paddingInner(0.20);


  // Draw base
  const svg = d3.select('div.month-chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // Draw header
  const header = svg.append('g')
    .attr('class', 'bar-header')
    .attr('transform', `translate(0, ${-margin.top / 2})`)
    .append('text');

  header.append('tspan').text(`Sslogger overzicht van ${maand.toLocaleString('nl-NL', { year: 'numeric', month: 'long' })}`);

  // Draw bars
  const bars = svg
    .append('g')
    .attr('class', 'bars');

  function update(data) {

    // Update Scales
    xScale.domain([0, d3.max(data, d => d.value)]);
    yScale.domain(data.map(d => d.key));

    const dur = 300;
    const t = d3.transition().duration(dur);

    // Update bars
    bars
      .selectAll('.bar')
      .data(data, d => d.key)
      .join(
        enter => {
          enter
            .append('rect')
            .attr('class', 'bar')
            .attr('y', d => yScale(d.key))
            .attr('height', yScale.bandwidth())
            .style('fill', 'lightcyan')
            .transition(t)
            .delay((d, i) => i * 20)
            .attr('width', d => xScale(d.value))
            .style('fill', 'dodgerblue')
        },

        update => {
          update
            .transition(t)
            .delay((d, i) => i * 10)
            .attr('y', d => yScale(d.key))
            .attr('width', d => xScale(d.value))
        },

        exit => {
          exit
            .transition()
            .duration(dur / 2)
            .style('fill-opacity', 0)
            .remove()
        }
      )
    // Update Axes
    xAxisDraw.transition(t).call(xAxis.scale(xScale));
    yAxisDraw.transition(t).call(yAxis.scale(yScale));

    yAxisDraw.selectAll('text').attr('dx', '-0.6em');

    // Add tooltip
    d3.selectAll('.bar')
      .on('mouseover', mouseover)
      .on('mousemove', mousemove)
      .on('mouseout', mouseout);

  }


  // Draw Axes
  const xAxis = d3.axisTop(xScale)
    .tickSizeInner(-height)
    .tickSizeOuter(0);

  const xAxisDraw = svg.append('g')
    .attr('class', 'x-axis');

  //xAxisDraw.selectAll('text').attr('dy', '-0.1em');

  const yAxis = d3.axisLeft(yScale).tickSize(0);

  const yAxisDraw = svg.append('g')
    .attr('class', 'y-axis');

  // Initial bar render
  update(barChartData);

  // Listen to click events
  d3.selectAll('button').on('click', onClick);

  // Tooltip handler
  function mouseover() {
    const barData = d3.select(this).data()[0];
    const tip = d3.select('.toeltip');

    tip
      .style('left', d3.event.clientX + 'px')
      .style('top', d3.event.clientY + 'px')
      .style('opacity', 0.98);

    tip.select('h3').html(`${barData.key}`);
    tip.select('h4').html(`${barData.value}`);
  }

  function mousemove() {
    d3.select('.toeltip')
      .style('left', `${d3.event.clientX + 15}px`)
      .style('top', `${d3.event.clientY}px`);
  }

  function mouseout() {
    d3.select('.toeltip')
      .style('opacity', 0);
  }

}

//function drawStats(data) {
//
//  var svgWidth = 1500, svgHeight = 600;
//  var margin = { top: 50, right: 20, bottom: 50, left: 300 };
//  var width = svgWidth - margin.left - margin.right;
//  var height = svgHeight - margin.top - margin.bottom;
//
//  const svg = d3.select('div.month-chart').append('svg')
//      .attr("width", svgWidth)
//      .attr("height", svgHeight);
//
//  const g = svg.append("g")
//      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
//
//  data.forEach(d => {
//    d.group = d.group,
//    d.value = +d.value;
//  });
//  data.sort(function(a,b) {
//    return b.value - a.value;
//  });
//
//  const xValue = d => d.value;
//  const yValue = d => d.group;
//  const innerWidth = width - margin.left - margin.right;
//  const innerHeight = height - margin.top - margin.bottom;
//
//  const xScale = d3.scaleLinear()
//    .domain([0, d3.max(data, xValue)])
//    .range([0, innerWidth]);
//
//  const yScale = d3.scaleBand()
//    .domain(data.map(yValue))
//    .range([0, innerHeight])
//    .padding(0.1);
//
//  g.append('g')
//    .call(d3.axisLeft(yScale));
//
//  g.append('g').call(d3.axisBottom(xScale))
//    .attr('transform', `translate(0,${innerHeight})`);
//
//  g.selectAll('rect').data(data)
//    .enter().append('rect')
//      .attr('y', d => yScale(yValue(d)))
//      .attr('width', d => xScale(xValue(d)))
//      .attr('height', yScale.bandwidth())
//      .on('mouseover', function() { tooltip.style('display', null); })
//      .on('mouseout', function() { tooltip.style('display', 'none'); })
//      .on('mousemove', function(data) {
//        var xPosition = d3.mouse(this)[0] + 320;
//        var yPosition = d3.mouse(this)[1] + 35;
//        tooltip.attr("transform", "translate(" + xPosition + "," + yPosition + ")");
//        tooltip.select('text').text(data.value);
//      });
//
//  g.append('text')
//        .attr('class', 'title')
//        .attr('y', -10)
//        .text(`Overzicht sslogger gebruik ${periode}`);
//
//  var tooltip = svg.append('g')
//    .attr('class', 'xtooltip')
//    .style('display', 'none');
//
//  tooltip.append('rect')
//    .attr('width', 30)
//    .attr('height', 30)
//    .attr('fill', 'white')
//    .style('opacity', 0.5);
//
//  tooltip.append('text')
//    .attr('x', 15)
//    .attr('dy', '1.2em')
//    .style('text-anchor', 'middle')
//    .attr('font-size', '12px')
//    .attr('font-weight', 'bold')
//    .style('color', 'white');
//}

function genStats(data) {
  let chartA = [[], [], [], []];
  let groepen = {};
  let kostenp = {};
  let accounts = {};
  let unverified = {};
  let finalG = [];
  let finalKp = [];
  let finalAc = [];
  let finalUn = [];
  //.match(/\d{6,}/)

  data.map(chrd => {
    chartA[0].push(chrd.Groep);
    if (chrd.KP) {
      chartA[1].push(chrd.KP);
    } else {
      chartA[1].push(chrd.Owner);
    }
    chartA[2].push(chrd.Account);
    if (chrd.Reden.match(/^((?!(\d{6,})).)*$/)) {
      chartA[3].push(chrd.Account);
    }
  });

  const chartGroups = transformA(chartA[0], groepen);
  const chartKp = transformA(chartA[1], kostenp);
  const chartAc = transformA(chartA[2], accounts);
  const chartUn = transformA(chartA[3], unverified);

  for (let i in chartGroups) {
    finalG.push({
      group: i,
      value: chartGroups[i]
    });
  }
  for (let i in chartKp) {
    finalKp.push({
      kp: i,
      value: chartKp[i]
    });
  }
  for (let i in chartAc) {
    finalAc.push({
      ac: i,
      value: chartAc[i]
    });
  }
  for (let i in chartUn) {
    finalUn.push({
      un: i,
      value: chartUn[i]
    });
  }
  return [finalG, finalKp, finalAc, finalUn];
}

function transformA(arr, obj) {
  for (let i = 0; i < arr.length; i++) {
    var num = arr[i];
    obj[num] = obj[num] ? obj[num] + 1 : 1;
  }
  return obj;
}

function getMonth() {
  const form = document.forms[0];
  let selectElement = form.querySelector('input[name="start"]');
  const selectedValue = selectElement.value.replace(/-/, '');

  //const jaar = document.periodeform.start.value;
  //const maand = document.getElementById('maand').value;
  //const periode = document.periodeform.start.value=`${jaar}${maand}`;
  //selectElement.value=`${jaar}${maand}`;
  //const selectedValue = selectElement.value.replace(/-/, '');
  return setUp(API_URL, periode);
}

function genChart(exponent) {
  d3.select('body').select('svg').remove();

  const width = 960;
  const height = 500;
  const margin = 5;
  const padding = 5;
  const adj = 38;
  // we are appending SVG first
  const svg = d3.select("div.grafiek").append('svg')
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "-"
      + adj + " -"
      + adj + " "
      + (width + adj * 3) + " "
      + (height + adj * 3))
    .style("padding", padding)
    .style("margin", margin)
    .classed("svg-content", true);

  //-----------------------------DATA-----------------------------//
  const timeConv = d3.timeParse("%Y-%m-%d");
  const dataset = d3.csv("js/sslogger_mon.csv");
  dataset.then(function(data) {
    var slices = data.columns.slice(1).map(function(id) {
      return {
        id: id,
        values: data.map(function(d) {
          return {
            date: timeConv(d.date),
            measurement: +d[id]
          };
        })
      };
    });

    //----------------------------SCALES----------------------------//
    const xScale = d3.scaleTime().range([0, width]);
    const yScale = d3.scalePow().rangeRound([height, 0]).exponent(exponent);
    xScale.domain(d3.extent(data, function(d) {
      return timeConv(d.date)
    }));
    yScale.domain([(0), d3.max(slices, function(c) {
      return d3.max(c.values, function(d) {
        return d.measurement + 4;
      });
    })
    ]);

    //-----------------------------AXES-----------------------------//
    const yaxis = d3.axisLeft()
      .ticks((slices[0].values).length)
      .scale(yScale);

    const xaxis = d3.axisBottom()
      .ticks(d3.timeMonth.every(3))
      .tickFormat(d3.timeFormat('%b %Y'))
      .scale(xScale);

    //----------------------------LINES-----------------------------//
    const line = d3.line()
      .x(function(d) {
        return xScale(d.date);
      })
      .y(function(d) {
        return yScale(d.measurement);
      })
      .curve(d3.curveMonotoneX);

    let id = 0;
    const ids = function() {
      return "line-" + id++;
    }
    //---------------------------TOOLTIP----------------------------//
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute");

    //-------------------------2. DRAWING---------------------------//
    //-----------------------------AXES-----------------------------//
    svg.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xaxis);

    svg.append("g")
      .attr("class", "axis")
      .call(yaxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("dy", ".75em")
      .attr("y", 6)
      .style("text-anchor", "end")
      .text("Aantal");

    //----------------------------LINES-----------------------------//
    const lines = svg.selectAll("lines")
      .data(slices)
      .enter()
      .append("g");

    lines.append("path")
      .attr("class", ids)
      .attr("d", function(d) { return line(d.values); });

    lines.append("text")
      .attr("class", "serie_label")
      .datum(function(d) {
        return {
          id: d.id,
          value: d.values[d.values.length - 1]
        };
      })
      .attr("transform", function(d) {
        return "translate(" + (xScale(d.value.date) + 10)
          + "," + (yScale(d.value.measurement) + 5) + ")";
      })
      .attr("x", 5)
      .text(function(d) { return d.id; });

    lines.selectAll("points")
      .data(function(d) { return d.values })
      .enter()
      .append("circle")
      .attr("cx", function(d) { return xScale(d.date); })
      .attr("cy", function(d) { return yScale(d.measurement); })
      .attr("r", 1)
      .attr("class", "point")
      .style("opacity", 1);

    //---------------------------EVENTS-----------------------------//
    lines.selectAll("circles")
      .data(function(d) { return (d.values); })
      .enter()
      .append("circle")
      .attr("cx", function(d) { return xScale(d.date); })
      .attr("cy", function(d) { return yScale(d.measurement); })
      .attr('r', 10)
      .style("opacity", 0)
      .on('mouseover', function(d) {
        tooltip.transition()
          .delay(30)
          .duration(200)
          .style("opacity", 1);
        tooltip.html(d.measurement)
          .style("left", (d3.event.pageX + 25) + "px")
          .style("top", (d3.event.pageY) + "px");
        const selection = d3.select(this).raise();
        selection
          .transition()
          .delay("20")
          .duration("200")
          .attr("r", 6)
          .style("opacity", 1)
          .style("fill", "#ed3700");
      })
      .on("mouseout", function(d) {
        tooltip.transition()
          .duration(100)
          .style("opacity", 0);
        const selection = d3.select(this);
        selection
          .transition()
          .delay("20")
          .duration("200")
          .attr("r", 10)
          .style("opacity", 0);
      });
  });
}

//function genChart() {
//  // Voorbereiding
//  const width = 960;
//  const height = 500;
//  const margin = 5;
//  const padding = 5;
//  const adj = 30;
//
//  const svg = d3.select('svg.line-chart')
//    //.attr('preserveAspectRatio', 'xMinYMin meet')
//    //.attr('viewbox', '-'
//    //    + adj + ' -'
//    //    + adj + ' '
//    //    + (width + adj *3) + ' '
//    //    + (height + adj*3))
//    .attr('width', width)
//    .attr('height', height)
//    .style('padding', padding)
//    .style('margin', margin)
//    .classed('svg-content', true);
//
//  // Data
//  const timeConv = d3.timeParse('%Y-%m-%d');
//  const dataset = d3.csv('js/sslogger_mon.csv');
//  dataset.then(data => {
//    const slices = data.columns.slice(1).map(id => {
//      return {
//        id: id,
//        values: data.map(d => {
//          return {
//            datum: timeConv(d.Datum),
//            aantal: +d[id]
//          };
//        })
//      };
//    });
//    //console.log('Column Headers', data.columns);
//    //console.log('Column Headers without date', data.columns.slice(1));
//    //console.log('Slices', slices);
//
//    // Scales
//    const xScale = d3.scaleTime().range([0, width]);
//    const yScale = d3.scaleLinear().rangeRound([height, 0]);
//    xScale.domain(d3.extent(data, function(d) {
//      return timeConv(d.Datum)}));
//    yScale.domain([(0), d3.max(slices, function(c) {
//      return d3.max(c.values, function(d) {
//        return d.aantal + 4; });
//        })
//      ]);
//
//    const yaxis = d3.axisLeft()
//      .ticks((slices[0].values).length)
//      .scale(yScale);
//    const xaxis = d3.axisBottom()
//      .ticks(d3.timeMonth.every(1))
//      .tickFormat(d3.timeFormat('%Y%m%d'))
//      .scale(xScale);
//
//    svg.append('g')
//      .attr('class', 'axis')
//      .attr('transform', "translate(0," + height + ")")
//      .call(xaxis);
//
//    svg.append('g')
//      .attr('class', 'axis')
//      .call(yaxis);
//  });
//}

function drawChart(data) {
  var svgWidth = 700, svgHeight = 300;
  var margin = { top: 20, right: 20, bottom: 50, left: 50 };
  var width = svgWidth - margin.left - margin.right;
  var height = svgHeight - margin.top - margin.bottom;

  var svg = d3.select('svg')
    .attr("width", svgWidth)
    .attr("height", svgHeight);

  var g = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3.scaleTime()
    .rangeRound([0, width]);

  var y = d3.scaleLinear()
    .rangeRound([height, 0]);

  var line = d3.line()
    .x(function(d) { return x(d.date) })
    .y(function(d) { return y(d.value) })
    .curve(d3.curveMonotoneX)
  x.domain(d3.extent(data, function(d) { return d.date }));
  y.domain([0, (d3.max(data, function(d) { return d.value }) + 50)]);

  g.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x)
      .tickFormat(d3.timeFormat("%b %y")))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-25)")

  g.append("g")
    .call(d3.axisLeft(y))
    .append("text")
    .attr("fill", "#000")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", "0.71em")
    .attr("text-anchor", "end")
    .text("Aantal");

  drawGridLines();

  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("stroke-width", 1.5)
    .attr("d", line);

  function drawGridLines() {
    var yGridLines = d3.axisLeft(y)
      .ticks(8)
      .tickFormat("")
      .tickSize(-width);

    var gridY = g.append("g")
      .attr("class", "grid")
      .call(yGridLines)
      ;

    yGridLines(gridY);


    var xGridLines = d3.axisBottom(x)
      .ticks(10)
      .tickFormat("")
      .tickSize(height);

    var gridX = g.append("g")
      .attr("class", "grid")
      .call(xGridLines)
      ;

    xGridLines(gridX);
  }

  data.forEach(function(point) {
    g.append("circle")
      .attr("fill", "steelblue")
      .attr("r", 3)
      .attr("cx", x(point.date))
      .attr("cy", y(point.value))
      .append("title")
      .text(point.value);
  });
}

function parseData(data) {
  var arr = [];
  for (let i in data.data) {
    arr.push({
      date: new Date(i),
      value: +data.data[i]
    });
  }
  return arr;
}

function createTable(data, groepnaam = undefined) {
  if (groepnaam) {
    data = data.filter(dat => dat.Groep === groepnaam);
  }
  const columnHeadings = [];
  columnHeadings[0] = 'Datum';
  columnHeadings[1] = 'Tijdstip';
  columnHeadings[2] = 'Server';
  columnHeadings[3] = 'SL';
  columnHeadings[4] = 'Account';
  columnHeadings[5] = 'Groep';
  columnHeadings[6] = 'IPWC';
  columnHeadings[7] = 'Reden';
  columnHeadings[8] = 'Owner';

  //const columnHeadings = Object.keys(data[0]);
  const columnCount = columnHeadings.length;
  const rowCount = data.length;
  var div = document.createElement('div');
  div.setAttribute('class', 'floot');
  var para = document.createElement('p');
  para.id = "totaal";
  para.innerText = `Totaal: ${rowCount}`;
  div.appendChild(para);
  div.innerHTML += `<input type="text" id="zoek">`;
  div.innerHTML += `<input type="button" id="export" value="CSV">`;
  document.getElementById('data-list').appendChild(div);
  var table = document.createElement('table');
  table.setAttribute('class', 'table table-bordered table-sm table-hover');
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

  //<td>${!slog.Reden.match(/\d{6,}/) ? 'X+' : ''}</td>
  //<td ${!slog.Reden.match(/\d{6,}/) ? 'class="rood"' : ''}>${cutText(slog.Reden, 35)}</td>

  var tBody = document.createElement('tbody');
  tBody.setAttribute('id', 'lichaam');
  table.appendChild(tBody);
  document.getElementById('lichaam').innerHTML += `
  ${data.map(slog => `
  <tr>
    <td>${slog.Datum}</td>
    <td>${slog.Tijdstip}</td>
    <td>${slog.Server}</td>
    <td>${slog.SL}</td>
    <td>${slog.Account}</td>
    <td>${slog.Groep}</td>
    ${(() => {
      //if (!slog.Reden.match(/\d{6,}/) || slog.Reden.match(/[0|9]{5,}|010101|11111|22222/)) {
      //if (!slog.Reden.match(/\d{6,}/) || slog.Reden.match(/[0|1|9]{5,}|010101|-\d{5,}/)) {
      if (!slog.Reden.match(/\d{5,}/) || slog.Reden.match(/\D0{4,}|1{4,}|2{4,}|3{4,}|4{4,}|5{4,}|6{4,}|7{4,}|8{4,}|9{5,}|1234|010101/)) {
        return `<td>X+</td><td class="rood">${cutText(slog.Reden, 35)}</td>`
      } else {
        return `<td></td><td>${cutText(slog.Reden, 35)}</td>`
      }
    })()}
    <td>${slog.Owner}</td>
  </tr>
  `).join('\n')}
  `

  //for (let i = 0; i < rowCount; i++) {
  //  row = tBody.insertRow(-1);
  //  for (let j = 0; j < columnCount; j++) {
  //    const cell = row.insertCell(-1);
  //    cell.setAttribute('data-label', columnHeadings[j].toUpperCase());
  //    const obj = data[i];
  //    if ( j == 8) {
  //      //if (!obj[columnHeadings[j]].match(/\d{6,}/)) {
  //      if (!obj[columnHeadings[j]].match(/\d{6,}/) || obj[columnHeadings[j]].match(/[0|9]{5,}|010101|1111111|-\d{5,}/)) {
  //        cell.style.color = 'red';
  //      }
  //    }
  //    cell.innerText = cutText(obj[columnHeadings[j]], 35);
  //  }
  //}

  const zoek = document.getElementById('zoek');
  zoek.addEventListener('keyup', searchTable);
  const csv = document.getElementById('export');
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  csv.addEventListener('click', function(e) {
    exportTableToCSV(`sslogger_report_${today}.csv`);
  }, false);
}

function exportTableToCSV(filename) {
  const csv = [];
  const rows = document.querySelectorAll('table tr');

  for (let i = 0; i < rows.length; i++) {
    const row = [], cols = rows[i].querySelectorAll("td, th");

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

setUp(API_URL, periode);
