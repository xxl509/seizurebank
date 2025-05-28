function signal_draw_traditional_basic(signal_visualization_dom_id,fs,units,start_rec_time,data){
  var channel_num = units.length
  var channel_num_max = 5;
  var margin = {top: 30, right: 350, bottom: 150, left: 160},
    margin2 = { top: 430, right: 10, bottom: 20, left: 40 }, // for x-axis bar brush
    margin3 = {top: margin2.bottom+11, right: 10, bottom: 20, left: -80}, // for y-axis bar brush
    width = 1400 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom,
    height2 = 500 - margin2.top - margin2.bottom,
    heightOffset = height - (550 - margin.top - margin.bottom)-10;

  var length_limit = 30 // means 30sec

  var line_width = 0.6; // line width

  var canvas_y = 440;

  var specificView = false;

  var eachPerRow = 23;

  var yAmplify = 0.5;

  var y_min_value = 0.01;

  var signal_position_offest = 30

  var xScale = d3.scaleLinear()
      .range([0, width]),

      xScale2 = d3.scaleLinear()
      .range([0, width]); // Duplicate xScale for brushing ref later

  var yScale = d3.scaleLinear()
      .range([height, 0]),

      yScale2 = d3.scaleLinear()
      .range([height, 0]),

      yScale3 = d3.scaleLinear()
      .range([height, 0]),

      yScale_rec = d3.scaleLinear()
      .range([height, 0]),

      yPreview = d3.scaleLinear()
      .range([height2-20, 0]);

  var color_set = d3.schemeCategory20b;

  var color = d3.scaleOrdinal().range(color_set);
 
  var xAxis = d3.axisBottom(xScale)
      .tickSize(-(height+5),0,0)
      .tickFormat(function(d) { return timetransform(d,fs);})
      .tickPadding(5),

      xAxis2 = d3.axisBottom(xScale2) // xAxis for brush slider
      .tickFormat(function(d) { return timetransform(d,fs);})
      .tickPadding(5);    

  var yAxis = d3.axisLeft()
      .scale(yScale),

      yAxis2 = d3.axisLeft()
      .scale(yScale3);

  var line = d3.line()
      .x(function(d) { return xScale(d.index); })
      .y(function(d) { return yScale(d.rating); });
      // .defined(function(d) { return d.rating; }); 

  var maxY;
  var minY;  // Defined later to update yAxis

  maxY = 0.1;
  minY = 0.1;


  var svg = d3.select("#"+signal_visualization_dom_id).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom) //height + margin.top + margin.bottom
      .attr("id","signal_svg")
      .style("position","absolute")
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      

  d3.select("#"+signal_visualization_dom_id).append("canvas")
        .attr("id","mycanvas")
        .attr("width", 1050)
        .attr("height", height + margin.top + margin.bottom);

  var canvas = document.getElementById("mycanvas");

  var canvasSVGContext = new CanvasSVG.Deferred();
  canvasSVGContext.wrapCanvas(document.querySelector("canvas"));
  var ctx = document.querySelector("canvas").getContext("2d");

  var line_canvas = d3.line()
        .x(function(d) { return xScale2(d.index); })
        .y(function(d) { return yPreview(d.rating); })
        .curve(d3.curveLinear)
        .context(ctx);

  // Create invisible rect for mouse tracking
  svg.append("rect")
      .attr("width", width)
      .attr("height", height)                                    
      .attr("x", 0) 
      .attr("y", 0)
      .attr("id", "mouse-tracker")
      .style("fill", "white"); 

  //for slider part-----------------------------------------------------------------------------------
    
  var context = svg.append("g") // Brushing context box container
      .attr("transform", "translate(" + 0 + "," + 410 + ")")
      .attr("class", "context");

  //append clip path for lines plotted, hiding those part out of bounds
  svg.append("defs")
    .append("clipPath") 
      .attr("id", "clip")
      .append("rect")
      .attr("width", width)
      .attr("height", height); 

  //end slider part----------------------------------------------------------------------------------- 

  color.domain(d3.keys(data[0]).filter(function(key) { 
    return key !== "index"
  }));

  signalGroups = [];
  var categories = color.domain().map(function(name,i) { // Nest the data into an array of objects with new keys
    //////// set group of each channel/////////////////////////////////
    group = name;
    if(!signalGroups.includes(group))
      signalGroups.push(group);
    /////////////////////////////////////////
    return {
      name: name, // "name": the csv headers except date
      values: data.map(function(d) { // "values": which has an array of the dates and ratings
        if(d[name] == "")
          d[name] = NaN;
        return {
          index: d.index, 
          rating: +(d[name]),
          };
      }),
      group: group,
      sigColor: null,
      unit: units[i],
      visible: true,
      specific: false // "visible": all false except for economy which is true.
    };
  });


  color.domain(signalGroups);

  xScale.domain(d3.extent(data, function(d) { return d.index; }));
  var y_min = d3.min(categories, function(c) { return d3.min(c.values, function(v) { return v.rating; })});
  var y_max = d3.max(categories, function(c) { return d3.max(c.values, function(v) { return v.rating; });});

  if(y_min == 0 && y_max == 0){
    y_min = -y_min_value;
    y_max = y_min_value;
  }

  y_selcect = d3.max([Math.abs(y_min),Math.abs(y_max)]);
  yScale.domain([y_min-Math.abs(y_min)*yAmplify,y_max+Math.abs(y_max)*yAmplify]);

  var maxScale = yScale.domain()[1] - yScale.domain()[0];

  xScale2.domain(xScale.domain());
  yScale2.domain(xScale.domain()); // for area
  yScale3.domain(yScale.domain()); 
  yScale_rec.domain(yScale3.domain());
  yPreview.domain([y_min-Math.abs(y_min)*0.1, y_max+Math.abs(y_max)*0.1]);

 //for slider bar part---------------------------------------------------------------------------------

  var f = d3.format("07f");
  categories.forEach(function(d){
    new_values = []
    d.values.forEach(function(n){
     if(!isNaN(n.rating)){
       new_values.push(n);
     }   
    });
    d.values = new_values;
    ratio = parseFloat(data.length)/parseFloat(d.values.length)
    start_index = d.values[0].index
    if (d.values.length < data.length){
      d.values.forEach(function(n){
        n.index = f((n.index-start_index)*ratio+parseInt(start_index));
      });
    } 
    d.sigColor = color(d.group);
  });

  var xbrush = d3.brushX()
    .extent([[0, 0], [width, height2]])//for slider bar at the bottom
    .on("end", function(){
      Xbrushed();
    })
    .handleSize([0.3]) ;

  y_min = d3.min(categories, function(c) { return d3.min(c.values, function(v) { return v.rating; })});
  y_max = d3.max(categories, function(c) { return d3.max(c.values, function(v) { return v.rating; });});

  if(y_min == 0 && y_max == 0){
    y_min = -y_min_value;
    y_max = y_min_value;
  }
  yPreview.domain([y_min-Math.abs(y_min)*0.1, y_max+Math.abs(y_max)*0.1]);
  ctx.translate(margin.left,canvas_y+heightOffset+5);

  categories.forEach(function(d){
    ctx.beginPath();
    line_canvas(d.values);
    ctx.lineWidth = 1;
    ctx.strokeStyle = d.sigColor;
    ctx.stroke();
  });


  var interval = height/(categories.length+2);

  context.append("g") // Create brushing xAxis
    .attr("class", "x axis1")
    .attr("transform", "translate(0," + (height2 + heightOffset) + ")")
    .call(xAxis2.tickValues(xAxisValue(fs,xScale.domain())));

  var rect_x_position = [0];
  var minY_categories = [];
  var maxY_categories = [];

  categories.forEach(function (d,i){ 

    minY = d3.min(d.values,function(v){return v.rating;});
    maxY = d3.max(d.values,function(v){return v.rating;});

    minY = -0.1;
    maxY = 0.1;

    minY_categories.push(minY);
    maxY_categories.push(maxY);

    if (channel_num < channel_num_max)
      rect_x_position[i+1] = d.name.length*7.8 + rect_x_position[i] + 10;
    else
      rect_x_position[i+1] = rect_x_position[i] + 20;
  });
  
  var x_brush = context.append("g")
      .attr("class", "x brush x-brush")
      .call(xbrush)
      .selectAll("rect")
      .attr("height", height2) // Make brush rects same height 
      .attr("fill", "#1abc9c")
      .attr("transform","translate(0," + heightOffset + ")");

  var ybrush = d3.brushY()//for slider bar at the bottom
      .extent([[0, 0], [height2/2, height]])
      .on("brush end", function(d){
        return Ybrushed(d)
      })
      .handleSize([0.3]);

  ///////// y axis1 and y brush ///////////////////////////////

  context.append("g") // Create brushing yAxis
    .attr("class", "y axis1")
    .attr("id","y-axis1")
    .attr("transform", "translate(" + (margin3.left) + "," + -(height-heightOffset+margin3.top) + ")")
    .call(yAxis2);

  context.append("g")
    .attr("class", "y brush")
    .attr("id", "y-brush")
    .attr("transform", "translate(" + (margin3.left) + ","+ -(height-heightOffset+margin3.top) + ")")
    .call(ybrush)
    .selectAll("rect")
    .attr("width", height2/2) // Make brush rects same height 
    .attr("fill", "#1abc9c"); 

  ////////end slider bar part-----------------------------------------------------------------------------------

  // draw line graph
  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (height+5) + ")")
    .call(xAxis.tickValues(xAxisValue(fs,xScale.domain())));

  ////// plot y axis //////////////////////////////////
  // svg.append("g")
  //     .attr("class", "y axis")
  //     .attr("id","y-axis")
  //     .attr("transform","translate(0,0)")
  //     .style("display","none")
  //     .call(yAxis)
  //   .append("text")
  //     .attr("transform", "rotate(-90)")
  //     .attr("y", 6)
  //     .attr("x", -10)
  //     .attr("dy", ".71em")
  //     .style("text-anchor", "end");
  ////////////////////////////////////////////////////////////////////

  var issue = svg.append("g").attr("class","issue-all")
        .selectAll(".issue")
          .data(categories) // Select nested data and append to new svg group elements
        .enter().append("g")
          .attr("class", "issue")
          .attr("id",function(d){return "issue-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");}); 
  var f = d3.format("07f");

  issue.append("g")
      .attr("class","g_line")
      .attr("clip-path", "url(#clip)")//use clip path to make irrelevant part invisible
    .append("path")
      .attr("class","line")
      .attr("transform",function(d,i){
        return "translate(0," + ((i-categories.length/2)*interval+signal_position_offest) + ")";
      })
      .style("pointer-events", "none") // Stop line interferring with cursor
      .attr("id", function(d) {
        return "line-" + d.name.replace(/[^0-9^A-Za-z-]/g,""); // Give line id of line-(insert issue name, with any spaces replaced with no spaces)
      })
      .attr("d", function(d) { 
        x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
        if(length_limit > 0 && x_len > length_limit){
          s_id = Math.ceil(xScale.domain()[0]);
          e_id = s_id + length_limit*fs;
          xScale.domain([s_id,e_id]);
          context.select(".x-brush").call(xbrush.move, [xScale2(s_id),xScale2(e_id)]);
          // xbrush.extent([s_id,e_id]);
          svg.selectAll(".x.axis")
            .transition()
            .call(xAxis.tickValues(xAxisValue(fs,xScale.domain())));
          ratio = parseFloat(data.length)/parseFloat(d.values.length);
          i_s = Math.ceil(parseFloat(xScale.domain()[0]-d.values[0].index)/parseFloat(ratio));
          i_e = i_s+parseFloat(length_limit)*parseFloat(fs)/parseFloat(ratio);
          plot_data = [];
          for(i=i_s; i<=i_e; i++){
            if(d.values[i] != undefined)
              plot_data.push(d.values[i]);
          }
          return d.visible ? line(plot_data) : null;
        }
        else{
          return d.visible ? line(d.values) : null; 
        }
      })
      .style("stroke", function(d) { return d.sigColor; })
      .style("stroke-width", line_width);

  var legendAll = d3.select(".issue-all").append("g").attr("class","legend-all");
  var legend = legendAll.selectAll(".legend")
        .data(categories) // Select nested data and append to new svg group elements
        .enter().append("g")
          .attr("class", "legend")
          .attr("id",function(d){return "legend-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");})
          .attr("transform",function(d,i){
            lineHeight = d3.select("#line-" + d.name.replace(/[^0-9^A-Za-z-]/g,"")).node().getBoundingClientRect().height;
            return "translate(0," + (height/2 + (i-(categories.length)/2)*interval+15) + ")";
            // return "translate(0," + (height/2+(i-(categories.length-1)/2.0)*interval) + ")";
            // return "translate(0," + (height/2-lineHeight-5 + (i-(categories.length-1)/2.0)*interval) + ")";
          });

  legend.append("text")
      .attr("class","legend-text")
      .attr("transform","translate(0,0)")
      .attr("id",function(d){return "controltext-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");})
      .attr("flag","false")
      .text(function(d) { return (d.name)+" (" + d.unit + ")"; })
      .style("font-size","12px")
      .style("fill",function(d){return d.sigColor})

  ///// for brusher of the slider bar at the bottom ///////////////////////////
  function Xbrushed() {

    // specificView = false;

    s = d3.event.selection || xScale2.range();
    xScale.domain(s.map(xScale2.invert, xScale2));
    x_len = Math.floor(parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs));
    if(length_limit > 0 && x_len > length_limit){
      s_id = Math.ceil(xScale.domain()[0]);
      e_id = s_id + length_limit*fs;
      xScale.domain([s_id,e_id]);
      context.select(".x-brush").call(xbrush.move, [xScale2(s_id),xScale2(e_id)]);
      x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
    }else{
        xScale.domain(s.map(xScale2.invert, xScale2)); // If brush is empty then reset the Xscale domain to default, if not then make it the brush extent 
    } 

    issue.select("path") // Redraw lines based on brush xAxis scale and domain
      // .transition()
      .attr("d", function(d){
          plot_data = [];
          ratio = parseFloat(data.length)/parseFloat(d.values.length);
          i_s = Math.ceil(parseFloat(xScale.domain()[0]-d.values[0].index)/parseFloat(ratio));
          i_e = Math.ceil(parseFloat(xScale.domain()[1]-d.values[0].index)/parseFloat(ratio));
          for(i=i_s; i<=i_e; i++){
            if(d.values[i] != undefined)
              plot_data.push(d.values[i]);
          } 
          return d.visible ? line(plot_data) : null; // If d.visible is true then draw line for this d selection
      })
  };   

  function Ybrushed() {

    s = d3.event.selection || yScale3.range();
    if(s[0] < s[1])
      s = [s[1],s[0]];
    yScale.domain(s.map(yScale3.invert, yScale3));   

    svg.select(".y.axis") // Redraw yAxis
      .transition()
      .call(yAxis);   

    issue.select("path") // Redraw lines based on brush xAxis scale and domain
      .transition()
      .attr("d", function(d){
        if(d.visible){
          x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
          plot_data = [];
  
          ratio = parseFloat(data.length)/parseFloat(d.values.length);
          i_s = Math.ceil(parseFloat(xScale.domain()[0]-d.values[0].index)/parseFloat(ratio));
          i_e = Math.ceil(parseFloat(xScale.domain()[1]-d.values[0].index)/parseFloat(ratio));
          for(i=i_s; i<=i_e; i++){
            if(d.values[i] != undefined)
              plot_data.push(d.values[i]);
          } 
          return d.visible ? line(plot_data) : null;
        }
      })
      .attr("transform",function(d,i){
        return "translate(" + xScale(xScale.domain()[0]) + "," + ((i-categories.length/2)*interval) + ")";
      });
  };   

  function drawCanvas(d){
    y_min = d3.min(categories, function(c) { 
        if(c.visible) 
          return d3.min(c.values, function(v) { return v.rating; }); 
        else 
          return Number.MAX_VALUE;
      });
    y_max = d3.max(categories, function(c) { 
      if(c.visible) 
        return d3.max(c.values, function(v) { return v.rating; });
      else
        return  Number.MIN_VALUE;
    });

    // y_min = -y_min_value;
    // y_max = y_min_value;

    if(y_min == 0 && y_max == 0){
      y_min = -y_min_value;
      y_max = y_min_value;
    }

    yPreview.domain([y_min-Math.abs(y_min)*0.02, y_max+Math.abs(y_max)*0.02]);
    
    ctx.clearRect(0,0,canvas.width,canvas.height);
    categories.forEach(function(dd){ 
      if(dd.visible){
        ctx.beginPath();
        line_canvas(dd.values);
        ctx.lineWidth = 1;
        ctx.strokeStyle = dd.sigColor;
        ctx.stroke();
      }      
    });
  };
    
  function findMaxY(data){  // Define function "findMaxY"
    var maxYValues = data.map(function(d) { 
      if (d.visible){
        return d3.max(d.values, function(value) { // Return max rating value
          return value.rating; })
      }
    });
    return d3.max(maxYValues);
  }

  function findMinY(data){  // Define function "findMaxY"
    var minYValues = data.map(function(d) { 
      if (d.visible){
        return d3.min(d.values, function(value) { // Return max rating value
          return value.rating; })
      }
    });
    return d3.min(minYValues);
  }

  function timetransform(d,fs) {
      var time_split = start_rec_time.split(":");
      var totalSec = parseInt(time_split[0])*3600+parseInt(time_split[1])*60+parseInt(time_split[2]) + d/fs
      var hours = parseInt( totalSec / 3600 ) % 24;
      var minutes = parseInt( totalSec / 60 ) % 60;
      var seconds = parseInt(totalSec % 60);

      var result = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds  < 10 ? "0" + seconds : seconds);
      return result;
  };

  function xAxisValue(fs,len) {
    var xValues = d3.range(len[0], len[1]+2, fs);
    if(xValues.length <= 5){
      xValues.forEach(function(d,i){
        if(i > 0)
          xValues[i] = Math.floor(parseFloat(d)/parseFloat(fs)) * fs;
      });
      return xValues;
    }
    else{
      var size = Math.floor(xValues.length/5);
      index = xValues.filter(function(_,i){ return !(i%size) })
      index[index.length-1] = index[index.length-1] - 0.000000001 
      index[0] = index[0] * 0.99999999999 
      index.forEach(function(d,i){
        if(i > 0)
          index[i] = Math.floor(parseFloat(d)/parseFloat(fs)) * fs;
      });
      return index
    }
  };

}