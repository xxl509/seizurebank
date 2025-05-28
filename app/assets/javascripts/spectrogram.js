function spectrogramTFDraw(matrix,fPlot,tPlot,channel_name){
    var margin = {top: 20, right: 20, bottom: 100, left: 100},
        width = 1260-margin.right-margin.left,
        width2 = width-100,
        height = 400-margin.top-margin.bottom,
        height2 = height-60;

    var svg = d3.select("#spectrogram_show").append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("margin-left", 0 + "px")
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("rect")
        .attr("class", "background")
        .attr("width", width2)
        .attr("height", height2)
        .style("fill","#fff");

    var numrows = matrix.length;
    var numcols = matrix[0].length;

    var values = matrix.map(function(elt) { return elt[1]; });
    var mat_min = Math.max.apply(null, values);
    var mat_max = Math.min.apply(null, values);

    var x = d3.scale.ordinal()
      .domain(d3.range(numcols))
      .rangeBands([0, width2]);

    var y = d3.scale.ordinal()
      .domain(d3.range(numrows))
      .rangeBands([0, height2]);

    var colorMap = d3.scaleLinear()
        .domain([mat_min, 0, mat_max])
        .range(["blue", "white", "yellow"]);    
        //.range(["red", "black", "green"]);
        //.range(["brown", "#ddd", "darkgreen"]);

    var row = svg.selectAll(".row")
        .data(matrix)
      .enter().append("g")
        .attr("class", "row")
        .attr("transform", function(d, i) { return "translate(0," + y(i) + ")"; });

    row.selectAll(".cell")
        .data(function(d) { return d; })
      .enter().append("rect")
        .attr("class", "cell")
        .attr("x", function(d, i) { return x(i); })
        .attr("width", x.rangeBand())
        .attr("height", y.rangeBand())
        .style("stroke-width", 0);

    row.append("line")
        .attr("x2", width);

    var xlabel_len = parseInt(x.domain().length/10)
    var xAxis = d3.axisBottom(x)
          .tickSize(-(height2+5),0,0)
          .tickValues(x.domain().filter(function(d, i) { return !(i % xlabel_len); }))
          .tickFormat(function(d) {return tPlot[d].toFixed(2);})
          .tickPadding(5);

    x_axis = svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis);
    x_axis.append("text")             
      .attr("transform","translate(" + (width2/2) + " ," + 35 + ")")
      .style("text-anchor", "middle")
      .text("Time (s)");

    var ylabel_len = parseInt(y.domain().length/10)
    var yAxis = d3.axisLeft(y)
          .ticks(1)
          .tickValues(y.domain().filter(function(d, i) { return !(i % ylabel_len); }))
          .tickFormat(function(d) { return fPlot[d].toFixed(2);});
      // Add the y-axis to the left
    y_axis = svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(-25,0)")
            .call(yAxis);
    y_axis.append("text")             
      .attr("transform","translate(" + (-55) + " ," + (height2/2) + ")rotate(-90)")
      .style("text-anchor", "middle")
      .text("Frequency (Hz)");

    var column = svg.selectAll(".column")
        .data(tPlot)
      .enter().append("g")
        .attr("class", "column")
        .attr("transform", function(d, i) { return "translate(" + x(i) + "," + height2 + ")"; });

    column.append("line")
        .attr("x1", -width);

    // column.append("text")
    //     .attr("x", 6)
    //     .attr("y", y.rangeBand() / 2)
    //     .attr("dy", ".32em")
    //     .attr("text-anchor", "start")
    //     .text(function(d, i) { return d; });

    row.selectAll(".cell")
        .data(function(d, i) { return matrix[i]; })
        .style("fill", colorMap);
  }



function spectrogramDraw(data,label,channel_name){
  var m = [20, 150, 80, 80]; // margins
  var w = 1260 - m[1] - m[3]; // width
  var h = 300 - m[0] - m[2]; // height
  // X scale will fit all values from data[] within pixels 0-w
  var x = d3.scaleLinear().domain([0, data.length-1]).range([0, w]);
  // Y scale will fit values from 0-10 within pixels h-0 (Note the inverted domain for the y-scale: bigger is up!)
  y_min = d3.min(data);
  y_max = d3.max(data);
  var y = d3.scaleLinear().domain([y_min, y_max]).range([h, 0]);
    // automatically determining max range can work something like this
    // var y = d3.scale.linear().domain([0, d3.max(data)]).range([h, 0]);
  // create a line function that can convert data[] into x and y points
  var line = d3.svg.line()
    // assign the X function to plot our line as we wish
    .x(function(d,i) { 
      // verbose logging to show what's actually being done
      return x(i); 
    })
    .y(function(d) { 
      // return the Y coordinate where we want to plot this datapoint
      return y(d); 
    })


    // Add an SVG element with the desired dimensions and margin.
  var graph = d3.select("#spectrogram_show").append("svg:svg")
        .attr("width", w + m[1] + m[3])
        .attr("height", h + m[0] + m[2])
        .attr("class","spectrogramGraph")
      .append("svg:g")
        .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

  // create yAxis
  var xAxis = d3.axisBottom(x)
        .tickSize(-(h+5),0,0)
        .tickValues(x.ticks(10).concat(x.domain()))
        .tickFormat(function(d) { console.log(d);return label[d].toFixed(2);})
        .tickPadding(5);
  // Add the x-axis.
  x_axis = graph.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + h + ")")
        .call(xAxis);
  x_axis.append("text")             
      .attr("transform","translate(" + (w/2) + " ," + 35 + ")")
      .style("text-anchor", "middle")
      .text("Frequency (Hz)");

  // create left yAxis
  var yAxisLeft = d3.axisLeft().scale(y);
  // Add the y-axis to the left
  graph.append("svg:g")
        .attr("class", "y axis")
        .attr("transform", "translate(-25,0)")
        .call(yAxisLeft);
  
    // Add the line by appending an svg:path element with the data line we created above
  // do this AFTER the axes above so that the line is above the tick-lines
  graph.append("svg:path")
        .attr("d", line(data))
        .style("fill","none")
        .style("stroke", "steelblue")
        .style("stroke-width","1.5");
}