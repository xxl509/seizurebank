function signal_draw_traditional_stand_alone(fs,units,start_rec_time,data){
  // d3.selectAll("svg > *").remove();
  var channel_num = units.length
  var channel_num_max = 5;
  var margin = {top: 30, right: 350, bottom: 150, left: 130},
    margin2 = { top: 430, right: 10, bottom: 20, left: 40 }, // for x-axis bar brush
    margin3 = {top: margin2.bottom+11, right: 10, bottom: 20, left: -105}, // for y-axis bar brush
    width = 1400 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom,
    height2 = 500 - margin2.top - margin2.bottom,
    heightOffset = height - (550 - margin.top - margin.bottom)-10;

  var length_limit = 90 // means 30sec

  var line_width = 0.6; // line width

  var duration_set = 700;

  var live_sign = false;

  var live_on = false;

  var live_on_pre = live_on;

  var anno_num_max = 7;

  var move_step = fs;

  var hover_point_show_limit = 30 // means 30sec

  var canvas_y = 440;

  var specificView = false;

  var eachPerRow = 23;

  var yAmplify = 10;

  var y_min_value = 0.01;

  var parseDate1 = d3.timeParse("%H:%M:%S");
  var parseDate = d3.timeParse("%H:%M:%S").parse;
  var bisectDate = d3.bisector(function(d) { return d.index; }).left;

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

  var legendScale_speed = d3.scaleLinear()
      .range([14, 110])
      .clamp(true);

  // 40 Custom DDV colors 

  var color_set = d3.schemeCategory20b;

  var color = d3.scaleOrdinal().range(color_set);
  // var color = d3.scaleLinear().domain([1, 20])
  //       .range(['#19B5FE', '#003171'])
  //       .interpolate(d3.interpolateHcl);

  var color_anno = d3.scaleOrdinal().range(["#ff0000","#0000ff","#3498db","#34495e","#9b59b6","#f1c40f","#e67e22","#c0392b","#bdc3c7","#7f8c8d"]);

  // var color = d3.scaleOrdinal().range(["#FF0000","#00FF00","#0000FF","#6F532A","#FF00FF","#000000","#00FFFF","#1abc9c","#2ecc71","#3498db","#34495e","#9b59b6","#f1c40f","#e67e22","#c0392b","#bdc3c7","#7f8c8d"]);  

  var EEGchannel = ["fp1","fp2","f3","f4","c3","c4","p3","p4","o1","o2","f7","f8","t7","t8","p7","p8","ft9","ft10","fz","cz","pz","sp1","sp2","a1","a2"];
  var EKGchannel = ["EKG1","EKG2","EKG3","EKG4"];

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

  var liveSpeedDrage = d3.drag()
        .on("start.interrupt", liveSpeedDragInt)
        .on("drag", liveSpeedDrageFun);

  var annotationArea = d3.svg.area() 
        .interpolate("monotone")
        .x(function(d) {return xScale(d.index);})
        .y0(height) 
        .y1(0)
        .defined(function(d) { return parseInt(d.annovalues);});

  var maxY;
  var minY;  // Defined later to update yAxis

  maxY = 0.1;
  minY = 0.1;


  var svg = d3.select("#signal_show").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom) //height + margin.top + margin.bottom
      .attr("id","signal_svg")
      .style("position","absolute")
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      

  d3.select("#signal_show").append("canvas")
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

  // d3.csv(input_file_path, function(error, data) { 

  color.domain(d3.keys(data[0]).filter(function(key) { 
    return key !== "index" && !key.includes("Annotation"); 
  }));

  var annotationList = d3.keys(data[0]).filter(function(key) { 
    return key.includes("AllChannels"); 
  });

  signalGroups = [];
  var categories = color.domain().map(function(name,i) { // Nest the data into an array of objects with new keys
    //////// set group of each channel/////////////////////////////////
    group = "";
    if(EEGchannel.includes(name.split("—")[0].trim()))
      group = "EEG";
    else if(EKGchannel.includes(name.split("—")[0].trim()))
      group = "EKG";
    else
      group = name;
    if(!signalGroups.includes(group))
      signalGroups.push(group);
    /////////////////////////////////////////
    return {
      name: name, // "name": the csv headers except date
      values: data.map(function(d) { // "values": which has an array of the dates and ratings
        // if(d[name] == "")
        //   d[name] = NaN;
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

  var annotations = [];
  ii = 0;
  var annotation_names = [];
  annotationList.forEach(function (c){
    if (c.includes("AllChannels") ){
      array = [];
      annotation_each = data.map(function (d,i){
        return {index: d.index,annovalues: d[c]};
      });
      annotations[ii] = annotation_each;
      annotation_names[ii] = c.split("_")[1];
      ii = ii+1;
    }
  });


  var anno_start_index_all_categories = [];
  var anno_draw_all_categories = [];
  var anno_dy_rec_all_categories = [];

  annotations.forEach(function (anno,i){ 
    c_index = i;
    anno_start_index = [];
    anno_draw = [];
    anno_dy_rec = [];
    if(anno[0].annovalues == "1"){
      anno_start_index.push(anno[0].index);
      j_ind = 0
      anno_draw_temp = [];
      while(j_ind < anno.length && anno[j_ind].annovalues == "1"){
        anno_draw_temp.push(anno[j_ind]);
        j_ind = j_ind + 1; 
      }
      anno_draw.push(anno_draw_temp);
    }

    for( ind = 1; ind < anno.length; ind++){
      if((parseInt(anno[ind].annovalues) - parseInt(anno[ind-1].annovalues)) > 0){
        anno_start_index.push(anno[ind].index);
        j_ind = ind;
        anno_draw_temp = [];
        while(j_ind < anno.length && anno[j_ind].annovalues == "1"){
          anno_draw_temp.push(anno[j_ind]);
          j_ind = j_ind + 1; 
        }
        anno_draw.push(anno_draw_temp);  
      }
    }

    anno_start_index_all_categories.push(anno_start_index);
    anno_draw_all_categories.push(anno_draw);
    anno_dy_rec_all_categories.push(anno_dy_rec);
  });


  color.domain(signalGroups);

  color_anno.domain(annotationList);

  xScale.domain(d3.extent(data, function(d) { return d.index; }));// extent = highest and lowest points, domain is data, range is bouding box
  // console.log(xScale.domain());
  var y_min = d3.min(categories, function(c) { return d3.min(c.values, function(v) { return v.rating; })});
  var y_max = d3.max(categories, function(c) { return d3.max(c.values, function(v) { return v.rating; });});

  // y_min = -y_min_value;
  // y_max = y_min_value;

  if(y_min == 0 && y_max == 0){
    y_min = -y_min_value;
    y_max = y_min_value;
  }
  // yScale.domain([y_min-Math.abs(y_min)*yAmplify, y_max+Math.abs(y_max)*yAmplify]);
  // yScale.domain([-2,2]);
  y_selcect = d3.max([Math.abs(y_min),Math.abs(y_max)]);
  yScale.domain([y_selcect*-1*yAmplify,y_selcect*yAmplify]);
  var maxScale = yScale.domain()[1] - yScale.domain()[0];
  xScale2.domain(xScale.domain());
  yScale2.domain(xScale.domain()); // for area
  yScale3.domain(yScale.domain()); 
  yScale_rec.domain(yScale3.domain());
  yPreview.domain([y_min-Math.abs(y_min)*0.1, y_max+Math.abs(y_max)*0.1]);// for yaxis-2
   // Setting a duplicate xdomain for brushing reference later
 //for slider part---------------------------------------------------------------------------------

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
      live_on_pre = live_on;
      live_on_switch(false);
      live_on = live_on_pre;
      Xbrushed(live_on);
    })
    .handleSize([0.3]) ;

  y_min = d3.min(categories, function(c) { return d3.min(c.values, function(v) { return v.rating; })});
  y_max = d3.max(categories, function(c) { return d3.max(c.values, function(v) { return v.rating; });});

  // y_min = -y_min_value;
  // y_max = y_min_value;

  if(y_min == 0 && y_max == 0){
    y_min = -y_min_value;
    y_max = y_min_value;
  }
  yPreview.domain([y_min-Math.abs(y_min)*0.1, y_max+Math.abs(y_max)*0.1]);
  ctx.translate(margin.left,canvas_y+heightOffset+5);

  annotations.forEach(function(d,i){
    var c_index = i;
    index_rec = anno_start_index_all_categories[c_index];
    anno_draw = anno_draw_all_categories[c_index];
    anno_name = annotation_names[c_index];

    color_anno_index = annotationList[c_index];
    index_rec.forEach(function(irec,anno_draw_i){
      plot_anno = anno_draw[anno_draw_i];
      plot_anno = [plot_anno[0],plot_anno[plot_anno.length-1]];
      x1 = xScale2(plot_anno[0].index);
      x2 = xScale2(plot_anno[1].index);
      ctx.beginPath();
      ctx.rect(x1,-5,x2-x1,height2);
      ctx.fillStyle = color_anno(color_anno_index);
      ctx.fill();
      ctx.lineWidth = 0.001;
      ctx.stroke();
    });
  });

  categories.forEach(function(d){
    ctx.beginPath();
    line_canvas(d.values);
    ctx.lineWidth = 1;
    ctx.strokeStyle = d.sigColor;
    ctx.stroke();
  });


  var interval = height/(categories.length+4);
  // yScale.range([height,0]);

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

  context.append("text")
    .attr("transform", "translate(-27," + (height2+45+heightOffset) + ")")
    .attr("class","preview_all")
    .text("All")
    .attr("fill", "#000")
    .style("font-size","12px")
    .style("cursor", "pointer")
    .on("click", function(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      y_min = d3.min(categories, function(c) { return d3.min(c.values, function(v) { return v.rating; })});
      y_max = d3.max(categories, function(c) { return d3.max(c.values, function(v) { return v.rating; });});
      // y_min = -y_min_value;
      // y_max = y_min_value;
      yPreview.domain([y_min-Math.abs(y_min)*0.1, y_max+Math.abs(y_max)*0.1]);
      categories.forEach(function(d){
        ctx.beginPath();
        line_canvas(d.values);
        ctx.lineWidth = 1;
        ctx.strokeStyle = d.sigColor;
        ctx.stroke();
      });
    });
    // .on("mouseover", function(){
    //   d3.select(this).style("font-weight","");
    // })
    // .on("mouseout",function(d){
    //   d3.select(this).style("font-weight","");
    // });
  
  var preview_ctl = d3.select(".context").selectAll(".issue-ctl")
      .data(categories) // Select nested data and append to new svg group elements
      .enter()
      .append("g")
        .attr("class", "preview-ctl")
        .attr("id","preview-control")
        .attr("transform", "translate(0," + (height2+45+heightOffset) + ")");

  if(channel_num < channel_num_max){
    preview_ctl.append("text")
      .attr("class","preview_text")
      .attr("id",function(d){return "previewlabel-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");})
      .attr("x", function(d,i){ return rect_x_position[i]}) 
      .text(function(d){return d.name})
      .attr("fill", function(d){return d.sigColor})
      .style("font-size","12px")
      .style("cursor", "pointer")
      .on("click", function(d){
        y_min = d3.min(d.values, function(v) { return v.rating;});
        y_max = d3.max(d.values, function(v) { return v.rating;});
        // y_min = -y_min_value;
        // y_max = y_min_value;
        if(y_min == 0 && y_max == 0){
          y_min = -y_min_value;
          y_max = y_min_value;
        }
        yPreview.domain([y_min-Math.abs(y_min)*0.1, y_max+Math.abs(y_max)*0.1]);
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.beginPath();
        line_canvas(d.values);
        ctx.lineWidth = 1;
        ctx.strokeStyle = d.sigColor;
        ctx.stroke();
      })
      .on("mouseover", function(){
        d3.select(this).style("font-weight","bold");
      })
      .on("mouseout",function(d){
        d3.select(this).style("font-weight","");
      });
  }
  else{

    // var start_cir = -1;
    // preview_ctl.append("text")
    //   .attr("class","preview_text")
    //   .attr("id",function(d){return "previewlabel-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");})
    //   .attr("x", function(d,i){
    //     if(rect_x_position[i]+3 > width){
    //       if(start_cir == -1)
    //         start_cir = i;
    //       return (i-start_cir)*20
    //     }
    //     else
    //       return rect_x_position[i];
    //   }) 
    //   .attr("y",function(d,i){
    //     if(rect_x_position[i]+3 > width){
    //       return 18;
    //     }
    //     else
    //       return -12;
    //   })
    //   .attr("fill", function(d){return d.sigColor})
    //   .style("font-size","12px")
    //   .style("cursor", "pointer")
    //   .style("display","none");


    var pre_cir_div = d3.select("body").append("div") 
      .attr("class", "previewcircle-tooltip")       
      .style("opacity", 0);

    var start_cir = -1;
    preview_ctl.append("circle")
      .attr("r",5)
      .attr("class","preview_circle")
      .attr("id",function(d){return "previewcircle-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");})
      .attr("cx", function(d,i){
        if(rect_x_position[i]+3 > width){
          if(start_cir == -1)
            start_cir = i;
          return (i-start_cir)*20+3
        }
        else
          return rect_x_position[i]+3;
      }) 
      .attr("cy",function(d,i){
        if(rect_x_position[i]+3 > width){
          return 10;
        }
        else
          return -5;
      })
      .attr("fill", function(d){return d.sigColor})
      .style("cursor", "pointer")
      .on("click", function(d){
        y_min = d3.min(d.values, function(v) { return v.rating;});
        y_max = d3.max(d.values, function(v) { return v.rating;});
        if(y_min == 0 && y_max == 0){
          y_min = -y_min_value;
          y_max = y_min_value;
        }
        yPreview.domain([y_min-Math.abs(y_min)*0.1, y_max+Math.abs(y_max)*0.1]);
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.beginPath();
        line_canvas(d.values);
        ctx.lineWidth = 1;
        ctx.strokeStyle = d.sigColor;
        ctx.stroke();
      })
      .on("mouseover", function(d) {    
          pre_cir_div.transition()    
              .duration(200)    
              .style("opacity", .9);    
          pre_cir_div.html(d.name)  
              .style("left", (d3.event.pageX + 12) + "px")   
              .style("top", (d3.event.pageY + 6) + "px");  
          })          
      .on("mouseout", function(d) {   
          pre_cir_div.transition()    
              .duration(500)    
              .style("opacity", 0); 
      });

      // .on("mouseover", function(d){
      //   d3.select("#previewlabel-"+d.name.replace(/[^0-9^A-Za-z-]/g,"")).style("display", "");
      //   d3.select("#previewlabel-"+d.name.replace(/[^0-9^A-Za-z-]/g,"")).text(function(d){return d.name});
      // })
      // .on("mouseout",function(d){
      //   d3.select("#previewlabel-"+d.name.replace(/[^0-9^A-Za-z-]/g,"")).style("display", "none");
      //   d3.select("#previewlabel-"+d.name.replace(/[^0-9^A-Za-z-]/g,"")).text(function(d){return d.name.charAt(0)});
      // });
  }

  var live_ctrl_btn = context.append("g")
        .attr("class","live_ctrl_btn")
        .attr("transform", "translate(" + (margin3.left+15) + "," + (margin3.top-54 + heightOffset) + ")")
        .style("cursor", "pointer")
        .on("click", function(){

          if(!live_sign){
            live_sign = true;
            live_on = false;
          }

          if(live_on){
            live_on_switch(false);
          }
          else{
            d3.selectAll(".y-brush")
              .call(ybrush.move,null);
            live_on_switch(true);
          }
        });

  var slider = live_ctrl_btn.append("g")
      .attr("class", "slider-spped")
      .attr("transform", "translate(9,2)");

  slider.append("line")
    .attr("class", "track")
    .attr("y1", legendScale_speed.range()[0])
    .attr("y2", legendScale_speed.range()[1])
    .style('stroke-width', "6px")
    .select(function() { 
      return this.parentNode.appendChild(this.cloneNode(true)); 
    })
    .attr("class", "track-inset")
    .select(function() { 
      return this.parentNode.appendChild(this.cloneNode(true)); 
    })
    .attr("class", "track-overlay")
    .call(liveSpeedDrage);

  // var handle = slider.insert("rect", ".track-overlay")
  //     .attr("class", "handle")
  //     .attr("id","handle-live-speed")
  //     .attr("width", 3)
  //     .attr("height", 20) 
  //     .attr("ry", 3)
  //     .attr("transform", "translate(" + -1.6 + ","+ 15 + ")")
  //     .attr("y", (parseFloat(duration_set)/11.5)-15);

  var handle = slider.insert("path", ".track-overlay")
      .attr("class", "handle-live-speed")
      .attr("id","play_btn_path")
      .attr("transform", "translate(" + (-8.9) + ","+ (parseFloat(duration_set)/11.5-15) + ")," + "scale(0.01)")
      .attr("d","M1312 896q0 37-32 55l-544 320q-15 9-32 9-16 0-32-8-32-19-32-56v-640q0-37 32-56 33-18 64 1l544 320q32 18 32 55zm128 0q0-148-73-273t-198-198-273-73-273 73-198 198-73 273 73 273 198 198 273 73 273-73 198-198 73-273zm224 0q0 209-103 385.5t-279.5 279.5-385.5 103-385.5-103-279.5-279.5-103-385.5 103-385.5 279.5-279.5 385.5-103 385.5 103 279.5 279.5 103 385.5z")
      .style("fill","#000");

  live_ctrl_btn.append("g")
    .attr("class","live_ctrl_fontawesome")
    .attr("transform", "translate(3.6,2)")
    .append("path")
      .attr("transform", "scale(0.006)")
      .attr("d","M1600 736v192q0 40-28 68t-68 28h-416v416q0 40-28 68t-68 28h-192q-40 0-68-28t-28-68v-416h-416q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h416v-416q0-40 28-68t68-28h192q40 0 68 28t28 68v416h416q40 0 68 28t28 68z");

  live_ctrl_btn.append("g")
    .attr("class","live_ctrl_fontawesome")
    .attr("transform", "translate(3.6,113)")
    .append("path")
      .attr("transform", "scale(0.006)")
      .attr("d","M1600 736v192q0 40-28 68t-68 28h-1216q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h1216q40 0 68 28t28 68z");
  

  // //append the brush for the selection of subsection  
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
        live_on_switch(false);
        return Ybrushed(d)
      })
      .handleSize([0.3]);

  ///////// y axis1 and y brush ///////////////////////////////

  context.append("g") // Create brushing yAxis
    .attr("class", "y axis1")
    .attr("id","y-axis1")
    .attr("transform", "translate(" + (margin3.left+25) + "," + -(height-heightOffset+margin3.top) + ")")
    .call(yAxis2);

  context.append("g")
    .attr("class", "y brush")
    .attr("id", "y-brush")
    .attr("transform", "translate(" + (margin3.left+25) + ","+ -(height-heightOffset+margin3.top) + ")")
    .call(ybrush)
    .selectAll("rect")
    .attr("width", height2/2) // Make brush rects same height 
      .attr("fill", "#1abc9c"); 

  ////////end slider part-----------------------------------------------------------------------------------

  //////////// annotation g element ///////////////////////////////////////////////
  svg.append("g")
    .attr("class","g-anno");

  //////////// draw the xRuler ///////////////////////////////////////////////
  rulerHeight = yScale.range()[0]-100;

  //// y axis ruler
  var rulerY = d3.scaleLinear()
    .range([0, rulerHeight]);

  var rulerX = d3.scaleLinear()
      .range([0, 25]);

  var rulerDrag = d3.drag()
    .on("drag", rulerDragged);
  
  ruler = svg.append("g")
        .attr("clip-path", "url(#clip)")
      .append("g")
        .attr("id","ruler")
        .attr("transform", "translate(" + 0 + "," + 0 + ")")
        .style("display","none")
        .call(rulerDrag)
        .on("dblclick",function(){
          d3.select("#ruler").style("display","none");
        });

  ruler.append("rect")
      .attr("class", "ruler-background")
      .attr('y', 0)
      .attr("width", 45)
      .attr("height", rulerHeight)
      .attr("opacity","0.6");

  var fakeAxisGroup = ruler.append("g");
  var realAxisGroup = ruler.append("g");
  
  ///// x axis ruler
  var xRulerX = d3.scaleLinear()
    .range([0, rulerHeight]);

  var xRulerY = d3.scaleLinear()
      .range([0, 25]);

  ruler.append("rect")
      .attr("class", "ruler-background")
      .attr('y', -45)
      .attr("width", rulerHeight)
      .attr("height", 45)
      .attr("opacity","0.6");

  var xRulerfakeAxisGroup = ruler.append("g");
  var xRulerrealAxisGroup = ruler.append("g");

  ////////////////////////////////////////////////////////////////////////////

  // draw line graph
  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (height+5) + ")")
    .call(xAxis.tickValues(xAxisValue(fs,xScale.domain())));

  ////// plot y axis //////////////////////////////////
  svg.append("g")
      .attr("class", "y axis")
      .attr("id","y-axis")
      .attr("transform","translate(0,0)")
      .style("display","none")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("x", -10)
      .attr("dy", ".71em")
      .style("text-anchor", "end");
  ////////////////////////////////////////////////////////////////////

  var issue = svg.append("g").attr("class","issue-all")
        .selectAll(".issue")
          .data(categories) // Select nested data and append to new svg group elements
        .enter().append("g")
          .attr("class", "issue")
      // .attr("transform",function(d,i){
      //     return "translate(0," + i*interval + ")";}
      //   )
      .attr("id",function(d){return "issue-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");}); 
  var f = d3.format("07f");

  issue.append("g")
      .attr("class","g_line")
      .attr("clip-path", "url(#clip)")//use clip path to make irrelevant part invisible
    .append("path")
      .attr("class","line")
      .attr("transform",function(d,i){
        return "translate(0," + ((i-categories.length/2)*interval) + ")";
      })
      .style("pointer-events", "none") // Stop line interferring with cursor
      .attr("id", function(d) {
        return "line-" + d.name.replace(/[^0-9^A-Za-z-]/g,""); // Give line id of line-(insert issue name, with any spaces replaced with no spaces)
      })
      .attr("d", function(d) { 
        x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
        if(x_len > length_limit){
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
          d3.selectAll(".g-anno").selectAll("*").remove();
          annotationDraw(); 
          return d.visible ? line(d.values) : null; 
        }
      })
      .style("stroke", function(d) { return d.sigColor; })
      .style("stroke-width", line_width);

  //////// draw channel legend ////////////////////////////////////////////////////
  var legendAll = svg.append("g").attr("class","legend-all");
  var legend = legendAll.selectAll(".legend")
          .data(categories) // Select nested data and append to new svg group elements
          .enter().append("g")
            .attr("class", "legend")
            .attr("id",function(d){return "legend-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");});

  var legendSpace = 25;
  legend.append("rect")
    .attr("width", 10)
    .attr("height", 10)
    .attr("id",function(d){return "controlrect-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");})                                    
    .attr("x", function (d,i){
        return 48 + width + (margin.right/5+30)*Math.floor(i/eachPerRow)}
      ) 
    .attr("y", function (d, i) { 
        return (i%eachPerRow)*(legendSpace)+2; 
      })
    .attr("fill",function(d) {
      return d.visible ? d.sigColor : "#F1F1F2"; // If array key "visible" = true then color rect, if not then make it grey 
    })
    .attr("class", "legend-box")
    .on("click", function(d,i_d){ // On click make d.visible 
      d.visible = !d.visible; // If array key for this data selection is "visible" = true then make it false, if false then make it true

      // y_min = d3.min(categories, function(c) { 
      //   if(c.visible) 
      //     return d3.min(c.values, function(v) { return v.rating; }); 
      //   else 
      //     return Number.MAX_VALUE;
      // });
      // y_max = d3.max(categories, function(c) { 
      //   if(c.visible) 
      //     return d3.max(c.values, function(v) { return v.rating; });
      //   else
      //     return  Number.MIN_VALUE;
      // });

      // y_min = -y_min_value;
      // y_max = y_min_value;

      if(y_min == 0 && y_max == 0){
        y_min = -y_min_value;
        y_max = y_min_value;
      }

      yPreview.domain([y_min-Math.abs(y_min)*0.1, y_max+Math.abs(y_max)*0.1]);
      
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

      issue.select("#line-"+d.name.replace(/[^0-9^A-Za-z-]/g,""))
        .transition()
        .attr("transform","translate(0," + ((i_d-categories.length/2)*interval) + ")")
        .attr("d", function(){
          if(d.visible){
            x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
            if(x_len > length_limit){
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
              return line(plot_data);
            }else
              return line(d.values); 
          }
          else{
            return null;
          }
        });

      issue.select("rect")
        .transition()
        .attr("fill", function(d) {
          return d.visible ? d.sigColor : "#F1F1F2";
        });

      if(!d.visible){
        specificViewCancel(d,i);
      }
    })
    .on("mouseover", function(d,i){
      if(specificView)
        return ;

      d3.select(this)
        .transition()
        .attr("fill", function(d) { return d.sigColor; });

      resetRendering();

      if (d.visible){
        specificViewDraw(d,i);
        specificView = false;
      } 
    })

    .on("mouseout", function(d,i){
      if(specificView)
        return

      d3.select(this)
        .transition()
        .attr("fill", function(d) {
        return d.visible ? d.sigColor : "#F1F1F2";});

      specificViewCancel(d,i);
    });

      
  legend.append("text")
    .attr("class","legend-text")
    .attr("x", function (d,i){
        return 60 + width + (margin.right/5+30)*Math.floor(i/eachPerRow)}
      ) 
    .attr("y", function (d, i) { 
        return (10)+(i%eachPerRow)*(legendSpace)+2; 
      })
    .attr("id",function(d){return "controltext-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");})
    .attr("flag","false")
    // .text(function(d) { return (d.name.split("-")[0])+" (" + d.unit + ")"; })
    .text(function(d) { return (d.name.split("-")[0])+" (" + d.unit + ")"; })
    .style("font-size","12px")
    .style("fill",function(d){return d.sigColor})
    .style("cursor", "pointer")
    .on("dblclick", function (d,i){
      if (d.visible){
        resetRendering();
        specificViewDraw(d,i);
        d3.select(this).attr("flag","true");  
      }
      current_color = d3.select(this).style("fill");
      current_color = rgb2hex(current_color);
    })
    .on("click",function(d,i){
      if (d.visible){

        flag = d3.select(this).attr("flag");

        resetRendering();
        
        d3.select(this).attr("flag",flag);
        
        if(flag == "false"){
          specificViewDraw(d,i);
          d3.select(this).attr("flag","true");  
        }
        else{
          specificViewCancel(d,i);
          d3.select(this).attr("flag","false");
        }
      }
    })
    .on("mouseover", function(d,i){
      d3.select(this).style("font-size","14px");
    })
    .on("mouseout",function(d,i){
      d3.select(this).style("font-size","12px");
    });

  // legend.append("text")
  //   .attr("class","legend-text")
  //   .attr('font-family', 'FontAwesome')
  //   .attr('font-size',"13px")
  //   .attr("x", function (d,i){
  //       return 65 + (d.name.length+4)*7 + width + (margin.right/5+30)*Math.floor(i/eachPerRow)}
  //     ) 
  //   .attr("y", function (d, i) { 
  //       return (10)+(i%eachPerRow)*(legendSpace)+2; 
  //     })
  //   .text("\uf0a9")
  //   .style("cursor","pointer")
  //   .on("click",function(d,i){
  //     selectSpectrogram(d.name);
  //   });

  // signalSubGroups = ["All"].concat(signalGroups.slice(0,2));

  signalSubGroups = ["All"]

  legendGroup = legendAll.selectAll(".legend-all")
      .data(signalSubGroups)
      .enter().append("g")
        .attr("class", "legend-group")
        .attr("id",function(d){return "legend-group-"+d.replace(/[^0-9^A-Za-z-]/g,"");});

  legendGroup.append("rect")
    .attr("width", 10)
    .attr("height", 10)
    .attr("id",function(d){return "controlrect-"+d.replace(/[^0-9^A-Za-z-]/g,"");})
    .attr("x", function (d,i){
        return 48 + width + (margin.right/5+10)*Math.floor(i/1)}
      ) 
    .attr("y", function (d, i) { 
        return -20; 
      })
    .attr("fill",function(d) {
      return color(d); // If array key "visible" = true then color rect, if not then make it grey 
    })
    .attr("class", "legend-box")
    .on("click", function(g){ // On click make d.visible 
      for(i_d = 0; i_d < categories.length; i_d++){
        d = categories[i_d];
        if(d.specific){
          specificViewCancel(d,i_d);
        }
      }

      resetRendering();

      ctx.clearRect(0,0,canvas.width,canvas.height);
      color_temp = d3.select("#controlrect-"+g.replace(/[^0-9^A-Za-z-]/g,"")).attr("fill");

      for(i_d = 0; i_d < categories.length; i_d++){
        d = categories[i_d];

        if(g != "All" && d.group != g)
          continue;

        if(g == "All"){
          if(color_temp.toUpperCase() != "#F1F1F2" && color_temp != "rgb(241, 241, 242)")
            d.visible = false;
          else
            d.visible = true;
        }
        else
          d.visible = !d.visible; // If array key for this data selection is "visible" = true then make it false, if false then make it true
      }

      for(i_d = 0; i_d < categories.length; i_d++){
        d = categories[i_d];

        // y_min = d3.min(categories, function(c) { 
        //   if(c.visible) 
        //     return d3.min(c.values, function(v) { return v.rating; }); 
        //   else 
        //     return Number.MAX_VALUE;
        // });
        // y_max = d3.max(categories, function(c) { 
        //   if(c.visible) 
        //     return d3.max(c.values, function(v) { return v.rating; });
        //   else
        //     return  Number.MIN_VALUE;
        // });

        // y_min = -y_min_value;
        // y_max = y_min_value;

        if(y_min == 0 && y_max == 0){
          y_min = -y_min_value;
          y_max = y_min_value;
        }

        yPreview.domain([y_min-Math.abs(y_min)*0.1, y_max+Math.abs(y_max)*0.1]);
      
        if(d.visible){
          ctx.beginPath();
          line_canvas(d.values);
          ctx.lineWidth = 1;
          ctx.strokeStyle = d.sigColor;
          ctx.stroke();
        }      

        issue.select("#line-"+d.name.replace(/[^0-9^A-Za-z-]/g,""))
          .transition()
          .attr("transform","translate(0," + ((i_d-categories.length/2)*interval) + ")")
          .attr("d", function(){
            if(d.visible){
              x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
              if(x_len > length_limit){
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
                return line(plot_data);
              }else
                return line(d.values); 
            }
            else{
              return null;
            }
          });
        
        legend.select("#controlrect-" + d.name.replace(/[^0-9^A-Za-z-]/g,""))
          .attr("fill", function(){
            return d.visible ? d.sigColor : "#F1F1F2";
          });
      };

      if(true){
        signalSubGroups.forEach(function(gg){
          d3.select("#controlrect-" + gg.replace(/[^0-9^A-Za-z-]/g,""))
            .transition()
            .attr("fill", function() {
              visible = false;
              for(i_d = 0; i_d < categories.length; i_d++){
                d = categories[i_d];
                if(gg != "All" && d.group != gg)
                  continue;

                if(d.visible){
                  visible = true;
                  break;
                }
              }  
              return visible ? color(gg) : "#F1F1F2";
            });
        });
      }
    });

  legendGroup.append("text")
    .attr("class","legend-group-text")
    .attr("x", function (d,i){
        return 60 + width + (margin.right/5+10)*Math.floor(i/1)}
      ) 
    .attr("y", function (d, i) { 
        return -10; 
      })
    .attr("id",function(d){return "controltext-"+d;})
    .attr("flag","false")
    .text(function(d){return d;})
    .style("font-size","12px")
    .style("fill",function(d){return d.sigColor});
    // .style("cursor", "pointer")
  /////////////////////////////////////////////////////////////////////////////

  //////////////////// annotation legend //////////////////////////////////////
  anno_circle_x_position = [0];
  annoLegend = context.append("g")
    .attr("class","anno-legend")
    .attr("transform","translate(0," + (-(height-heightOffset+margin3.top+10)) + ")");

  if (annotations.length > 0 && annotations.length <= anno_num_max){
    annotations.forEach( function(anno,a_i) {
      anno_name = annotation_names[a_i];
      color_anno_index = annotationList[a_i];

      anno_circle_x_position[a_i+1] = anno_name.length*7.8 + anno_circle_x_position[a_i] + 18;
      annoLegend.append("circle")
        .attr("r", 5)
        .attr("class","anno-circle")
        .attr("id", "annocircle---"+ anno_name.replace(/[^0-9^A-Za-z-]/g,"")+"---"+a_i)
        .attr("cx",anno_circle_x_position[a_i]+3)
        .attr("cy",-10)
        .attr("fill","#F1F1F2")// If array key "visible" = true then color rect, if not then make it grey 
        .style("cursor","pointer")
        .on("mouseover", function(){
          annoCircleMouseOver(this);
        })
        .on("mouseout", function(){
          annoCircleMouseOut(this);
        })
        .on("click", function(){
          annoCircleClick(this);
        });

      annoLegend.append("text")
        .attr("id", "annolegendtext---"+ anno_name.replace(/[^0-9^A-Za-z-]/g,"")+"---"+a_i)
        .attr("x",anno_circle_x_position[a_i]+13)
        .attr("y",-5)
        .style("fill",color_anno(color_anno_index))
        .text(anno_name)
        .style("font-size","12px")
        .style("cursor", "pointer")
        .on("click", function (){
          name = d3.select(this).text();
        })
        .on("mouseover", function(d,i){
          d3.select(this).style("font-size","14px");
        })
        .on("mouseout",function(d,i){
          d3.select(this).style("font-size","12px");
        }); // end of issue_need.append("text")
    }); // end of d.annotation.forEach
  }// end of if (d.annotation.length > 0)
  else if(annotations.length > anno_num_max){
    var div = d3.select("body").append("div")
        .attr("class", "anno-tooltip")
        .style("opacity", 0);

    annotations.forEach( function(anno,a_i) {
      anno_name = annotation_names[a_i];
      color_anno_index = annotationList[a_i];

      anno_circle_x_position[a_i+1] = anno_circle_x_position[a_i] + 15;

      annoLegend.append("circle")
        .attr("r", 5)
        .attr("class","anno-circle")
        .attr("id", "annocircle---"+ anno_name.replace(/[^0-9^A-Za-z-]/g,"")+"---"+a_i)
        .attr("cx",anno_circle_x_position[a_i]+3)
        .attr("cy",-10)
        .attr("fill","#F1F1F2")// If array key "visible" = true then color rect, if not then make it grey 
        .style("cursor","pointer")
        .on("click", function(){
          annoCircleClick(this);
        })
        .on("mouseover",function(){
          annoCircleMouseOver(this);
          div.transition()    
            .duration(200)
            .style("opacity", 0.9);
          div.html(annotation_names[d_index])
            .style("left", (d3.event.pageX+9) + "px")
            .style("top", (d3.event.pageY+6) + "px");  
        })
        .on("mouseout", function(d) {  
          annoCircleMouseOut(this);
          div.transition()
            .duration(500)
            .style("opacity", 0);
        });
    });
  }

  d3.select("#mouse-tracker") // select chart plot background rect #mouse-tracker
    .on("click", mouseTrackerClick); // on mousemove activate mousemove function defined below
    // .on("mouseout", mouseTrackerMouseout);

  //////////// set ruler scale /////////////////////////////////////////
  yRulerScale = Math.abs(yScale.domain()[0]-yScale.domain()[1])*(rulerY.range()[1]/yScale.range()[0]);
  yRulerSliderChange(yRulerScale);
  xRulerScale = (Math.abs(xScale.domain()[1]-xScale.domain()[0])/(fs))*(xRulerX.range()[1]/xScale.range()[1]);
  xRulerSliderChange(xRulerScale);
  ///////////////////////////////////////////////////////////////////////////

  $("#set-chan-color").click(function(){
    color_no = $("#chan-color").val();
    name = $("#chan-name").text()
    find_c_index = parseInt($("#chan-id").text());
    d = categories[find_c_index];
    d3.select("#label-"+name.replace(/[^0-9^A-Za-z-]/g,"")).style("fill",color_no);
    d3.select("#unitlabel-"+name.replace(/[^0-9^A-Za-z-]/g,"")).style("fill",color_no);
    d3.select("#controltext-"+name.replace(/[^0-9^A-Za-z-]/g,"")).style("fill",color_no);
    if(d.visible)
      d3.select("#controlrect-"+name.replace(/[^0-9^A-Za-z-]/g,"")).attr("fill",color_no);
    d3.select("#line-"+name.replace(/[^0-9^A-Za-z-]/g,"")).style("stroke",color_no);
    d3.select("#previewlabel-"+name.replace(/[^0-9^A-Za-z-]/g,"")).style("stroke",color_no);
    d3.select("#previewcircle-"+name.replace(/[^0-9^A-Za-z-]/g,"")).attr("fill",color_no);
    
    d.sigColor = color_no;
    drawCanvas(d);
  });

  ////// for ruler ////////////////////////////////////////////////////////
  function rulerDragged(d) {
    dd = [];
    dd[0] = d3.event.x, dd[1] = d3.event.y;
    d3.select(this).attr("transform", "translate(" + dd + ")");
  };

  function yRulerSliderChange(v) {
    // d3.select('label').text(v);
    rulerY.domain([0, v]);
    yRulerRedraw();
  };

  function yRulerRedraw() {
    fakeAxisGroup
      .attr("class", "ruler")
      .attr("transform", "translate(0," + rulerHeight + ")")
      .call(d3.axisRight().scale(rulerY).ticks(20))
      .selectAll(".tick")
      .select('line')
      .attr('y1', function (d, i) {
        if ((i + 1) % 4)
          return -25;
        else
          return 0;
      })
      .attr('y2', function (d, i) {
        if ((i + 1) % 2)
          return -18;
        if ((i + 1) % 4)
          return 10;
        else
          return 0;
      })
      .style("display","none");

    realAxisGroup
      .attr("class", "ruler-axis")
      .attr("transform", "translate(0,0)")
      .call(d3.axisRight().scale(rulerY).ticks(10).tickSize(15));
  };

  function xRulerSliderChange(v) {
    // d3.select('label').text(v);
    xRulerX.domain([0, v]);
    xRulerRedraw();
  };

  function xRulerRedraw() {
    xRulerfakeAxisGroup
      .attr("class", "ruler")
      .attr("transform", "translate(0," + rulerHeight + ")")
      .call(d3.axisTop().scale(xRulerX).ticks(8))
      .selectAll(".tick")
      .select('line')
      .attr('y1', function (d, i) {
        if ((i + 1) % 4)
          return -25;
        else
          return 0;
      })
      .attr('y2', function (d, i) {
        if ((i + 1) % 2)
          return -18;
        if ((i + 1) % 4)
          return 10;
        else
          return 0;
      })
      .style("display","none");

    xRulerrealAxisGroup
      .attr("class", "ruler-axis")
      .attr("transform", "translate(0,0)")
      .call(d3.axisTop().scale(xRulerX).ticks(8).tickSize(15));
  };
  ////////////////////////////////////////////////////////

  ///// for brusher of the slider bar at the bottom ///////////////////////////
  function Xbrushed(live_on) {

    if(!specificView){
      resetRendering();
      // d3.select("#ruler").style("display","none");
    }

    // specificView = false;

    s = d3.event.selection || xScale2.range();
    xScale.domain(s.map(xScale2.invert, xScale2));
    x_len = Math.floor(parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs));
    if(x_len > length_limit){
      s_id = Math.ceil(xScale.domain()[0]);
      e_id = s_id + length_limit*fs;
      xScale.domain([s_id,e_id]);
      context.select(".x-brush").call(xbrush.move, [xScale2(s_id),xScale2(e_id)]);
      x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
    }else{
        xScale.domain(s.map(xScale2.invert, xScale2)); // If brush is empty then reset the Xscale domain to default, if not then make it the brush extent 
    }

    if(live_sign){
      svg.selectAll(".x.axis") // replot xAxis with transition when brush used
        .transition()
        .call(xAxis.tickValues(xScale.ticks(6)));
    }
    else{
      svg.select(".x.axis") // replot xAxis with transition when brush used
        .transition()
        .call(xAxis.tickValues(xAxisValue(fs,xScale.domain())));
        // .call(xAxis.tickValues(xScale.ticks(6).concat(xScale.domain())));
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
      .attr("transform",function(d,i){
        if(specificView)
          return 'translate(' + xScale(xScale.domain()[0]) + ')'
        else
          return "translate(" + xScale(xScale.domain()[0]) + "," + ((i-categories.length/2)*interval) + ")";
      });

    if(live_on)
      live_on_switch(true); 

    //////// annotation for all channel ///////////////////////////////////////
    d3.selectAll(".anno-circle")
      .attr("fill","#F1F1F2");

    d3.selectAll(".g-anno").selectAll("*").remove();

    annotationDraw();
    ///////////////////////////////////////////////////////////////////////////
    xRulerScale = (Math.abs(xScale.domain()[1]-xScale.domain()[0])/(fs))*(xRulerX.range()[1]/xScale.range()[1]);
    xRulerSliderChange(xRulerScale);
  };   

  function Ybrushed() {

    if(!specificView){
      resetRendering();
      // d3.select("#ruler").style("display","none");
    }

    // specificView = false;

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
        if(specificView)
          return 'translate(' + xScale(xScale.domain()[0]) + ')'
        else
          return "translate(" + xScale(xScale.domain()[0]) + "," + ((i-categories.length/2)*interval) + ")";
      });

    rulerScale = Math.abs(yScale.domain()[0]-yScale.domain()[1])*(rulerY.range()[1]/yScale.range()[0]);
    yRulerSliderChange(rulerScale);
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

  //// for live chart /////////////////////////////////////////
  function tick() {

    if(!live_sign){
      return;
    }

    live_on = true;

    if(!specificView){
      resetRendering();
      // d3.select("#ruler").style("display","none");
    }

    var s_id, e_id;
    
    // minY = d3.min(minY_categories);
    // maxY = d3.max(maxY_categories);
    // minY = minY-Math.abs(minY)*yAmplify;
    // maxY = maxY+Math.abs(maxY)*yAmplify;
    // if(minY == 0 && maxY == 0){
    //   minY = -0.01;
    //   maxY = 0.01;
    // }
    // yScale.domain([minY,maxY]);


    s_id = Math.ceil(xScale.domain()[0]);
    e_id = Math.ceil(xScale.domain()[1]);

    if(e_id >= xScale2.domain()[1]){
      live_on_switch(false);
      live_sign = false;
      return ;
    }

    e_id = e_id + move_step;

    xscale_move_step = move_step;

    if(e_id > xScale2.domain()[1]){
      e_id = xScale2.domain()[1];
      xscale_move_step = e_id - xScale.domain()[1];
    }


    categories.forEach(function(d,i){
      c_index = i;
      if(d.visible){
        plot_data = [];
        ratio = parseFloat(data.length)/parseFloat(d.values.length);
        i_s = Math.ceil(parseFloat(xScale.domain()[0]-d.values[0].index)/parseFloat(ratio));
        // e_id = e_id + move_step;
        // if(e_id > xScale2.domain()[1]){
        //   return ;
        // }
        i_e = Math.ceil(parseFloat(e_id-d.values[0].index)/parseFloat(ratio));
        plot_data = d.values.slice(i_s, i_e+1);
        d3.select("#line-"+ d.name.replace(/[^0-9^A-Za-z-]/g,""))
          .attr("transform",function(){
            if(specificView)
              return null;
            else
              return "translate(" + 0 + "," + ((c_index-categories.length/2)*interval) + ")";
          })
          .attr("d", function(){
            return line(plot_data);
          })
          .transition()
            .duration(duration_set)
            .ease(d3.easeLinear)
            .attr("transform",function(){
                if(specificView)
                  return 'translate(' + xScale(xScale.domain()[0]-xscale_move_step) + ')';
                else
                  return 'translate(' + xScale(xScale.domain()[0]-xscale_move_step) + "," + ((c_index-categories.length/2)*interval) + ')';
              });
          if(specificView)
             d3.select("#line-"+ d.name.replace(/[^0-9^A-Za-z-]/g,""))
                .style("stroke-width","1.2");
        plot_data = [];
      }
    });
    
    d3.select(".y.axis")
      .transition()
      .duration(duration_set)
      .call(yAxis);

    //////// annotation for all channel ///////////////////////////////////////
    d3.selectAll(".g-anno").selectAll("*").remove();
    annotationDraw();

    d3.selectAll(".annotations")
      .attr("transform",null)
      .transition()
        .duration(duration_set)
        .ease(d3.easeLinear)
        .attr('transform', 'translate(' + xScale(xScale.domain()[0]-move_step) + ')');
    ///////////////////////////////////////////////////////////////////////////
    
    s_id = xScale.domain()[0];
    e_id = xScale.domain()[1];

    s_id = Math.ceil(xScale.domain()[0]);
    e_id = Math.ceil(xScale.domain()[1]);

    xscale_move_step = move_step;

    if(e_id+move_step > xScale2.domain()[1]){
      xscale_move_step = xScale2.domain()[1] - e_id;
    }

    selection_width = d3.select(".x.brush.x-brush").select(".selection").attr("width");

    console.log(xScale2(s_id+xscale_move_step));
    d3.select(".x.brush.x-brush").select(".selection")
      .transition()
      .duration(duration_set)
      .ease(d3.easeLinear)
      .attr("x",xScale2(s_id+xscale_move_step));

    d3.select(".x.brush.x-brush").select(".handle--w")
      .transition()
      .duration(duration_set)
      .ease(d3.easeLinear)
      .attr("x",xScale2(s_id+xscale_move_step));

    d3.select(".x.brush.x-brush").select(".handle--e")
      .transition()
      .duration(duration_set)
      .ease(d3.easeLinear)
      .attr("x",xScale2(s_id+xscale_move_step)+parseFloat(selection_width));

    xScale.domain([s_id+xscale_move_step,e_id+xscale_move_step]);

    d3.select(".x.axis")
      .transition()
      .duration(duration_set)
      .ease(d3.easeLinear)
      .call(xAxis.tickValues(xScale.ticks(6)));
    
    d3.select(".x.brush").transition()
      .duration(duration_set)
      .on('end', tick);
  };

  function live_on_switch(s){
    if(!live_sign){
      return ;
    }

    if(!s){
      d3.select(".x.brush").interrupt();
      live_on = false; 
      d3.select("#play_btn_path").attr("d","M1312 896q0 37-32 55l-544 320q-15 9-32 9-16 0-32-8-32-19-32-56v-640q0-37 32-56 33-18 64 1l544 320q32 18 32 55zm128 0q0-148-73-273t-198-198-273-73-273 73-198 198-73 273 73 273 198 198 273 73 273-73 198-198 73-273zm224 0q0 209-103 385.5t-279.5 279.5-385.5 103-385.5-103-279.5-279.5-103-385.5 103-385.5 279.5-279.5 385.5-103 385.5 103 279.5 279.5 103 385.5z");
    }
    else{
      live_on = true;
      // d3.select("#y-brush")
      //   .call(ybrush.move,null);
      d3.select("#play_btn_path").attr("d","M896 128q209 0 385.5 103t279.5 279.5 103 385.5-103 385.5-279.5 279.5-385.5 103-385.5-103-279.5-279.5-103-385.5 103-385.5 279.5-279.5 385.5-103zm0 1312q148 0 273-73t198-198 73-273-73-273-198-198-273-73-273 73-198 198-73 273 73 273 198 198 273 73zm96-224q-14 0-23-9t-9-23v-576q0-14 9-23t23-9h192q14 0 23 9t9 23v576q0 14-9 23t-23 9h-192zm-384 0q-14 0-23-9t-9-23v-576q0-14 9-23t23-9h192q14 0 23 9t9 23v576q0 14-9 23t-23 9h-192z");
      tick();
    }
  };

  ///// for rendering specific signal /////////////////////////////////////////
  function resetRendering(){

    yScale3.domain(yScale_rec.domain());

    d3.select("#y-axis1")
      .call(yAxis2);

    d3.selectAll('.line')
      .style("opacity","1")
      .style("stroke-width","0.6");
          
    issue.select("path") // Redraw lines based on brush xAxis scale and 
      .attr("transform",function(d,i){
        return "translate(" + xScale(xScale.domain()[0]) + "," + ((i-categories.length/2)*interval) + ")";
      });

    d3.selectAll(".legend-text")
      .attr("flag","false");

    d3.select("#y-axis").style("display","none");
  } 

  function specificViewDraw(d,i){
    d3.selectAll('.line')
      .style("display","none");
    d3.select("#line-" + d.name.replace(/[^0-9^A-Za-z-]/g,""))
      .style("display","");
    d3.select("#line-" + d.name.replace(/[^0-9^A-Za-z-]/g,""))
      .transition()
      .attr("transform","translate(0,0)");
    d3.select("#line-" + d.name.replace(/[^0-9^A-Za-z-]/g,"")).style("stroke-width","1.2");
    d3.select("#y-axis").style("display","");
    specificView = true;
    d.specific = true;

    y_min = d3.min(d.values, function(v) { return v.rating; }); 
    y_max = d3.max(d.values, function(v) { return v.rating; });

    // y_min = -y_min_value;
    // y_max = y_min_value;

    if(y_min == 0 && y_max == 0){
      y_min = -y_min_value;
      y_max = y_min_value;
    }
    s_id = y_max * 1.1;
    e_id = y_min * 1.1;
    yScale3.domain([y_min*4, y_max*4]);
    d3.select("#y-axis1")
      .call(yAxis2);
    context.select("#y-brush").call(ybrush.move, [yScale3(s_id),yScale3(e_id)]);
  };

  function specificViewCancel(d,i){
    d3.selectAll('.line')
      .style("display","");
    d3.select("#line-" + d.name.replace(/[^0-9^A-Za-z-]/g,""))
      .attr("transform","translate(0," + ((i-categories.length/2)*interval) + ")");
    d3.select("#line-" + d.name.replace(/[^0-9^A-Za-z-]/g,"")).style("stroke-width","0.6");
    d3.select("#y-axis").style("display","none");
    specificView = false;
    yScale3.domain(yScale_rec.domain());
    d3.select("#y-axis1")
      .call(yAxis2);
    s_id = yScale3.domain()[0];
    e_id = yScale3.domain()[1];
    context.select("#y-brush").call(ybrush.move, null);
    d.specific = false;
  };

  ////// for drawing annotation /////////////////////////////////////////
  function annotationDraw(){
    var issue_need = d3.selectAll(".g-anno");
    annotations.forEach(function(d,i){
      var c_index = i;
      index_rec = anno_start_index_all_categories[c_index];
      anno_draw = anno_draw_all_categories[c_index];
      anno_name = annotation_names[c_index];

      // color_anno_index = "Annotation_" + anno_name + "_" + d.name.replace(/[^0-9^A-Za-z-]/g,"");
      color_anno_index = annotationList[c_index];
      index_rec.forEach(function(irec,anno_draw_i){
        issue_need.append("g")
          .attr("class","g_area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
          .attr("clip-path", "url(#clip)")
          .append("path") // Path is created using svg.area details
            .attr("class", "annotations annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
            .attr("id","id-annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
            .attr("d", function(d){ 
              plot_anno = anno_draw[anno_draw_i];
              plot_anno = [plot_anno[0],plot_anno[plot_anno.length-1]];
              return annotationArea(plot_anno);
            })
            .attr("fill", color_anno(color_anno_index))
            .attr("transform","translate(0,0)")
            // .attr("clip-path", "url(#clip" + d.name.replace(/[^0-9^A-Za-z-]/g,"")+ ")" )
            .style("opacity","0.4")
            .style("cursor", "pointer")
            .on("click", mouseTrackerClick);
            // .on("mousemove",function(d,i){
            //     x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
            //     plot_data = [];
            //     s_id = Math.ceil(xScale.domain()[0]);
            //     e_id = Math.ceil(xScale.domain()[1]);
            //     dd = Object.assign({},d);
            //     ratio = parseFloat(data.length)/parseFloat(d.values.length);
            //     i_s = Math.ceil(parseFloat(xScale.domain()[0]-d.values[0].index)/parseFloat(ratio));
            //     if(x_len>length_limit)
            //       i_e = i_s+parseFloat(length_limit)*parseFloat(fs)/parseFloat(ratio);
            //     else
            //       i_e = Math.ceil(parseFloat(xScale.domain()[1]-d.values[0].index)/parseFloat(ratio));
            //     for(i=i_s; i<=i_e; i++){
            //       if(d.values[i] != undefined)
            //         plot_data.push(d.values[i]);
            //     }
            //     dd.values = plot_data;
            //     hoverlinemousemove(dd);
            //   })
            // .on("mouseout",function(d){
            //   hoverlinemouseout();
            //   }); // end of issue_need.append("path") 

        issue_need.append("text") // annotation name in area
          .attr("class", "annotation-area-text annotation-area-text-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
          .attr("id","id-annotation-area-text-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
          .attr("clip-path", "url(#clip" + anno_name.replace(/[^0-9^A-Za-z-]/g,"")+ ")" )
          .attr("x",xScale(irec))
          .attr("y",12)
          .attr("fill",color_anno(color_anno_index))
          .style("font-size","12px")
          .style("font-weight","bold")
          .style("opacity","0.4")
          // .text(d.annotation_name[a_i]);
      });

    });
  };

  ///// for ruler activation by clicking ////////////////////////////////////////
  function mouseTrackerClick() { 

    scaleThr = (maxScale-(yScale.domain()[1]-yScale.domain()[0]));
    if(scaleThr > 0.01)
      scaleThr = scaleThr*0.0003/0.98+0.0005;
    else
      scaleThr = maxScale/height*3;
    if(live_on && x_len <= hover_point_show_limit && (yScale.domain()[1]-yScale.domain()[0])<0.25)
      live_on_switch(false);
    Yoffset = 0;
    // hoverLineXOffset = 175;
    // hoverLineYOffset = 90;
    hoverLineXOffset = $("#mouse-tracker").offset().left;
    hoverLineYOffset = $("#mouse-tracker").offset().top;
    var mouseX = event.pageX-hoverLineXOffset;
    var mouseY = event.pageY-hoverLineYOffset;
    if(mouseX >= 0 && mouseX <= 715+121 && mouseY >= 0 && mouseY <= 450) {
      // show the ruler
      d3.select("#ruler")
        .attr("transform", "translate(" + mouseX + "," + mouseY + ")")
        .style("display","");

    } else {
      // proactively act as if we've left the area since we're out of the bounds we want
      d3.select("#ruler").style("display","none");
    }
  }; 


  ///// for annotation legend actions /////////////////////////////////////////
  function annoCircleMouseOver(thisElement){
    str_need = d3.select(thisElement).attr("id");
    d_name = str_need.split("---")[1];

    d3.select(thisElement)
        .transition()
        .style("font-size","11px");

    d3.selectAll(".annotations")
      .transition()
      .style("opacity","0.1");

    d3.selectAll(".annotation-area-" + d_name)
      .transition()
      .style("opacity","0.65"); 
  };

  function annoCircleMouseOut(thisElement){
    str_need = d3.select(thisElement).attr("id");
    d_name = str_need.split("---")[1];
    d_index = str_need.split("---")[2];

    d3.select(thisElement)
        .transition()
        .style("font-size","10px");

    var flag = true;

    for(a_i = 0; a_i < annotation_names.length; a_i++){
      anno_name = annotation_names[a_i];
      color_temp = d3.select("#annocircle---" + anno_name.replace(/[^0-9^A-Za-z-]/g,"") + "---" + a_i).attr("fill");
      if(color_temp.toUpperCase() != "#F1F1F2" && color_temp != "rgb(241, 241, 242)"){
        flag = false;
        break;
      }
    };

    if(flag){
      d3.selectAll(".annotations")
        .transition()
        .style("opacity","0.4");
    }
    else{
      annotation_names.forEach( function(anno_name,a_i) {
        color_temp = d3.select("#annocircle---" + anno_name.replace(/[^0-9^A-Za-z-]/g,"") + "---" + a_i).attr("fill");
  
        if(color_temp.toUpperCase() == "#F1F1F2" || color_temp == "rgb(241, 241, 242)"){
          d3.selectAll(".annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
            .transition()
            .style("opacity","0.1");
        }
        else{
          d3.selectAll(".annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
            .transition()
            .style("opacity","0.65");
        }
      });
    }
  };

  function annoCircleClick(thisElement){
    color_now = d3.select(thisElement).attr("fill");
    str_need = d3.select(thisElement).attr("id");
    d_name = str_need.split("---")[1];
    d_index = str_need.split("---")[2];

    if(color_now.toUpperCase() == "#F1F1F2" || color_now == "rgb(241, 241, 242)"){
      color_text = color_anno(annotationList[d_index]);

      d3.select(thisElement)
        .transition()
        .attr("fill", color_text);
      

      d3.selectAll(".annotation-area-" + d_name)
        .transition()
        .style("opacity","0.65");

      annotation_names.forEach( function(anno_name,a_i) {
        if(anno_name.replace(/[^0-9^A-Za-z-]/g,"") != d_name){ 
          color_temp = d3.select("#annocircle---" + anno_name.replace(/[^0-9^A-Za-z-]/g,"") + "---" + a_i).attr("fill");
          if(color_temp.toUpperCase() == "#F1F1F2" || color_temp == "rgb(241, 241, 242)"){
            d3.selectAll(".annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
              .transition()
              .style("opacity","0.1");
          }
        }
      });
      // d3.selectAll("#annotation-area-text-" + d_name + d_annotation_name)
      //   .transition()
      //   .style("font-size","12px")
      //   .style("opacity","1")
      //   .attr("fill","#000");     
    }
    else{
      d3.select(thisElement)
      .transition()
      .attr("fill", "#F1F1F2");

      var flag = true;

      for(a_i = 0; a_i < annotation_names.length; a_i++){
        anno_name = annotation_names[a_i];
        if(anno_name.replace(/[^0-9^A-Za-z-]/g,"") != d_name){
          color_temp = d3.select("#annocircle---" + anno_name.replace(/[^0-9^A-Za-z-]/g,"") + "---" + a_i).attr("fill");
          if(color_temp.toUpperCase() != "#F1F1F2" && color_temp != "rgb(241, 241, 242)"){
            flag = false;
            break;
          }
        }
      };

      if(flag){
        d3.selectAll(".annotations")
          .transition()
          .style("opacity","0.4");
      }
      else{
        annotation_names.forEach( function(anno_name,a_i) {
          if(anno_name.replace(/[^0-9^A-Za-z-]/g,"") != d_name){
            color_temp = d3.select("#annocircle---" + anno_name.replace(/[^0-9^A-Za-z-]/g,"") + "---" + a_i).attr("fill");
      
            if(color_temp.toUpperCase() == "#F1F1F2" || color_temp == "rgb(241, 241, 242)"){
              d3.selectAll(".annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
                .transition()
                .style("opacity","0.1");
            }
            else{
              d3.selectAll(".annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
                .transition()
                .style("opacity","0.65");
            }
          }
          d3.selectAll(".annotation-area-" + d_name)
            .transition()
            .style("opacity","0.1");
        });
      } 
    }
  };

  // }); // End Data callback function
    
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

  function liveSpeedDrageFun(d){
    dy = legendScale_speed(legendScale_speed.invert(d3.event.y));
    duration_set_pre = (dy-15)*11.5;
    if(duration_set_pre < 10)
      duration_set_pre = 10;
    if(duration_set_pre > 5000)
      duration_set_pre = 5000;
    duration_set = duration_set_pre;
    // handle_height = d3.select("#handle-live-speed").attr("height");
    handle_height = 16;
    slider_height = legendScale_speed.range()[1];
    if(dy > slider_height-handle_height)
      dy = slider_height-handle_height;
    // d3.select("#handle-live-speed").attr("y", dy-15); 
    current_translate = d3.transform(d3.select(".handle-live-speed").attr("transform")).translate;
    dx = current_translate[0]
    d3.select(".handle-live-speed")
      .attr("transform", "translate(" + dx + ","+ (dy-1) + ")," + "scale(0.01)")
  };

  function liveSpeedDragInt(d){
    d3.select(".slider-spped").interrupt();
  };
}














function signal_draw_traditional(fs,units,start_rec_time,data){
  // d3.selectAll("svg > *").remove();
  var channel_num = units.length
  var channel_num_max = 5;
  var margin = {top: 30, right: 350, bottom: 150, left: 130},
    margin2 = { top: 430, right: 10, bottom: 20, left: 40 }, // for x-axis bar brush
    margin3 = {top: margin2.bottom+11, right: 10, bottom: 20, left: -105}, // for y-axis bar brush
    width = 1260 - margin.left - margin.right,
    height = 530 - margin.top - margin.bottom,
    height2 = 500 - margin2.top - margin2.bottom,
    heightOffset = height - (550 - margin.top - margin.bottom)-10;

  var length_limit = 60 // means 30sec

  var line_width = 0.6; // line width

  var duration_set = 700;

  var live_sign = false;

  var live_on = false;

  var live_on_pre = live_on;

  var anno_num_max = 7;

  var move_step = fs;

  var hover_point_show_limit = 30 // means 30sec

  var canvas_y = 440;

  var specificView = false;

  var eachPerRow = 23;

  var yAmplify = 10;

  var parseDate1 = d3.timeParse("%H:%M:%S");
  var parseDate = d3.timeParse("%H:%M:%S").parse;
  var bisectDate = d3.bisector(function(d) { return d.index; }).left;

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

  var legendScale_speed = d3.scaleLinear()
      .range([14, 110])
      .clamp(true);

  // 40 Custom DDV colors 

  var color_set = d3.schemeCategory20b;

  var color = d3.scaleOrdinal().range(color_set);

  var color_anno = d3.scaleOrdinal().range(["#1abc9c","#2ecc71","#3498db","#34495e","#9b59b6","#f1c40f","#e67e22","#c0392b","#bdc3c7","#7f8c8d"]);

  // var color = d3.scaleOrdinal().range(["#FF0000","#00FF00","#0000FF","#6F532A","#FF00FF","#000000","#00FFFF","#1abc9c","#2ecc71","#3498db","#34495e","#9b59b6","#f1c40f","#e67e22","#c0392b","#bdc3c7","#7f8c8d"]);  

  var EEGchannel = ["Fp1","Fp2","F3","F4","C3","C4","P3","P4","O1","O2","F7","F8","T7","T8","P7","P8","FT9","FT10","Fz","Cz","Pz","SP1","SP2","A1","A2"];
  var EKGchannel = ["EKG1","EKG2","EKG3","EKG4"];

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

  var liveSpeedDrage = d3.drag()
        .on("start.interrupt", liveSpeedDragInt)
        .on("drag", liveSpeedDrageFun);

  var annotationArea = d3.svg.area() 
        .interpolate("monotone")
        .x(function(d) {return xScale(d.index);})
        .y0(height) 
        .y1(0)
        .defined(function(d) { return parseInt(d.annovalues);});

  var maxY;
  var minY;  // Defined later to update yAxis

  var svg = d3.select("#signal_show").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom) //height + margin.top + margin.bottom
      .attr("id","signal_svg")
      .style("position","absolute")
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      

  d3.select("#signal_show").append("canvas")
        .attr("id","mycanvas")
        .attr("width", 1160)
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

  // d3.csv(input_file_path, function(error, data) { 

  color.domain(d3.keys(data[0]).filter(function(key) { 
    return key !== "index" && !key.includes("Annotation"); 
  }));

  var annotationList = d3.keys(data[0]).filter(function(key) { 
    return key.includes("AllChannels"); 
  });

  signalGroups = [];
  var categories = color.domain().map(function(name,i) { // Nest the data into an array of objects with new keys
    //////// set group of each channel/////////////////////////////////
    group = "";
    if(EEGchannel.includes(name.split("—")[0].trim()))
      group = "EEG";
    else if(EKGchannel.includes(name.split("—")[0].trim()))
      group = "EKG";
    else
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

  var annotations = [];
  ii = 0;
  var annotation_names = [];
  annotationList.forEach(function (c){
    if (c.includes("AllChannels") ){
      array = [];
      annotation_each = data.map(function (d,i){
        return {index: d.index,annovalues: d[c]};
      });
      annotations[ii] = annotation_each;
      annotation_names[ii] = c.split("_")[1];
      ii = ii+1;
    }
  });

  var anno_start_index_all_categories = [];
  var anno_draw_all_categories = [];
  var anno_dy_rec_all_categories = [];

  annotations.forEach(function (anno,i){ 
    c_index = i;
    anno_start_index = [];
    anno_draw = [];
    anno_dy_rec = [];
    if(anno[0].annovalues == "1"){
      anno_start_index.push(anno[0].index);
      j_ind = 0
      anno_draw_temp = [];
      while(j_ind < anno.length && anno[j_ind].annovalues == "1"){
        anno_draw_temp.push(anno[j_ind]);
        j_ind = j_ind + 1; 
      }
      anno_draw.push(anno_draw_temp);
    }

    for( ind = 1; ind < anno.length; ind++){
      if((parseInt(anno[ind].annovalues) - parseInt(anno[ind-1].annovalues)) > 0){
        anno_start_index.push(anno[ind].index);
        j_ind = ind;
        anno_draw_temp = [];
        while(j_ind < anno.length && anno[j_ind].annovalues == "1"){
          anno_draw_temp.push(anno[j_ind]);
          j_ind = j_ind + 1; 
        }
        anno_draw.push(anno_draw_temp);  
      }
    }

    anno_start_index_all_categories.push(anno_start_index);
    anno_draw_all_categories.push(anno_draw);
    anno_dy_rec_all_categories.push(anno_dy_rec);
  });

  color.domain(signalGroups);

  color_anno.domain(annotationList);

  xScale.domain(d3.extent(data, function(d) { return d.index; }));// extent = highest and lowest points, domain is data, range is bouding box
  // console.log(xScale.domain());
  var y_min = d3.min(categories, function(c) { return d3.min(c.values, function(v) { return v.rating; })});
  var y_max = d3.max(categories, function(c) { return d3.max(c.values, function(v) { return v.rating; });});
  if(y_min == 0 && y_max == 0){
    y_min = -y_min_value;
    y_max = y_min_value;
  }
  // yScale.domain([y_min-Math.abs(y_min)*yAmplify, y_max+Math.abs(y_max)*yAmplify]);
  // yScale.domain([-2,2]);
  y_selcect = d3.max([Math.abs(y_min),Math.abs(y_max)]);
  yScale.domain([y_selcect*-1*yAmplify,y_selcect*yAmplify]);
  var maxScale = yScale.domain()[1] - yScale.domain()[0];
  xScale2.domain(xScale.domain());
  yScale2.domain(xScale.domain()); // for area
  yScale3.domain(yScale.domain()); 
  yScale_rec.domain(yScale3.domain());
  yPreview.domain([y_min-Math.abs(y_min)*0.1, y_max+Math.abs(y_max)*0.1]);// for yaxis-2
   // Setting a duplicate xdomain for brushing reference later
 //for slider part---------------------------------------------------------------------------------

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
      live_on_pre = live_on;
      live_on_switch(false);
      live_on = live_on_pre;
      Xbrushed(live_on);
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


  var interval = height/(categories.length+4);
  // yScale.range([height,0]);

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
    minY_categories.push(minY);
    maxY_categories.push(maxY);

    if (channel_num < channel_num_max)
      rect_x_position[i+1] = d.name.length*7.8 + rect_x_position[i] + 10;
    else
      rect_x_position[i+1] = rect_x_position[i] + 20;
  });

  context.append("text")
    .attr("transform", "translate(-27," + (height2+45+heightOffset) + ")")
    .attr("class","preview_all")
    .text("All")
    .attr("fill", "#000")
    .style("font-size","12px")
    .style("cursor", "pointer")
    .on("click", function(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      y_min = d3.min(categories, function(c) { return d3.min(c.values, function(v) { return v.rating; })});
      y_max = d3.max(categories, function(c) { return d3.max(c.values, function(v) { return v.rating; });});
      yPreview.domain([y_min-Math.abs(y_min)*0.1, y_max+Math.abs(y_max)*0.1]);
      categories.forEach(function(d){
        ctx.beginPath();
        line_canvas(d.values);
        ctx.lineWidth = 1;
        ctx.strokeStyle = d.sigColor;
        ctx.stroke();
      });
    });
    // .on("mouseover", function(){
    //   d3.select(this).style("font-weight","");
    // })
    // .on("mouseout",function(d){
    //   d3.select(this).style("font-weight","");
    // });
  
  var preview_ctl = d3.select(".context").selectAll(".issue-ctl")
      .data(categories) // Select nested data and append to new svg group elements
      .enter()
      .append("g")
        .attr("class", "preview-ctl")
        .attr("id","preview-control")
        .attr("transform", "translate(0," + (height2+45+heightOffset) + ")");

  if(channel_num < channel_num_max){
    preview_ctl.append("text")
      .attr("class","preview_text")
      .attr("id",function(d){return "previewlabel-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");})
      .attr("x", function(d,i){ return rect_x_position[i]}) 
      .text(function(d){return d.name})
      .attr("fill", function(d){return d.sigColor})
      .style("font-size","12px")
      .style("cursor", "pointer")
      .on("click", function(d){
        y_min = d3.min(d.values, function(v) { return v.rating;});
        y_max = d3.max(d.values, function(v) { return v.rating;});
        if(y_min == 0 && y_max == 0){
          y_min = -y_min_value;
          y_max = y_min_value;
        }
        yPreview.domain([y_min-Math.abs(y_min)*0.1, y_max+Math.abs(y_max)*0.1]);
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.beginPath();
        line_canvas(d.values);
        ctx.lineWidth = 1;
        ctx.strokeStyle = d.sigColor;
        ctx.stroke();
      })
      .on("mouseover", function(){
        d3.select(this).style("font-weight","bold");
      })
      .on("mouseout",function(d){
        d3.select(this).style("font-weight","");
      });
  }
  else{

    // var start_cir = -1;
    // preview_ctl.append("text")
    //   .attr("class","preview_text")
    //   .attr("id",function(d){return "previewlabel-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");})
    //   .attr("x", function(d,i){
    //     if(rect_x_position[i]+3 > width){
    //       if(start_cir == -1)
    //         start_cir = i;
    //       return (i-start_cir)*20
    //     }
    //     else
    //       return rect_x_position[i];
    //   }) 
    //   .attr("y",function(d,i){
    //     if(rect_x_position[i]+3 > width){
    //       return 18;
    //     }
    //     else
    //       return -12;
    //   })
    //   .attr("fill", function(d){return d.sigColor})
    //   .style("font-size","12px")
    //   .style("cursor", "pointer")
    //   .style("display","none");


    var pre_cir_div = d3.select("body").append("div") 
      .attr("class", "previewcircle-tooltip")       
      .style("opacity", 0);

    var start_cir = -1;
    preview_ctl.append("circle")
      .attr("r",5)
      .attr("class","preview_circle")
      .attr("id",function(d){return "previewcircle-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");})
      .attr("cx", function(d,i){
        if(rect_x_position[i]+3 > width){
          if(start_cir == -1)
            start_cir = i;
          return (i-start_cir)*20+3
        }
        else
          return rect_x_position[i]+3;
      }) 
      .attr("cy",function(d,i){
        if(rect_x_position[i]+3 > width){
          return 10;
        }
        else
          return -5;
      })
      .attr("fill", function(d){return d.sigColor})
      .style("cursor", "pointer")
      .on("click", function(d){
        y_min = d3.min(d.values, function(v) { return v.rating;});
        y_max = d3.max(d.values, function(v) { return v.rating;});
        if(y_min == 0 && y_max == 0){
          y_min = -y_min_value;
          y_max = y_min_value;
        }
        yPreview.domain([y_min-Math.abs(y_min)*0.1, y_max+Math.abs(y_max)*0.1]);
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.beginPath();
        line_canvas(d.values);
        ctx.lineWidth = 1;
        ctx.strokeStyle = d.sigColor;
        ctx.stroke();
      })
      .on("mouseover", function(d) {    
          pre_cir_div.transition()    
              .duration(200)    
              .style("opacity", .9);    
          pre_cir_div.html(d.name)  
              .style("left", (d3.event.pageX + 12) + "px")   
              .style("top", (d3.event.pageY + 6) + "px");  
          })          
      .on("mouseout", function(d) {   
          pre_cir_div.transition()    
              .duration(500)    
              .style("opacity", 0); 
      });

      // .on("mouseover", function(d){
      //   d3.select("#previewlabel-"+d.name.replace(/[^0-9^A-Za-z-]/g,"")).style("display", "");
      //   d3.select("#previewlabel-"+d.name.replace(/[^0-9^A-Za-z-]/g,"")).text(function(d){return d.name});
      // })
      // .on("mouseout",function(d){
      //   d3.select("#previewlabel-"+d.name.replace(/[^0-9^A-Za-z-]/g,"")).style("display", "none");
      //   d3.select("#previewlabel-"+d.name.replace(/[^0-9^A-Za-z-]/g,"")).text(function(d){return d.name.charAt(0)});
      // });
  }

  var live_ctrl_btn = context.append("g")
        .attr("class","live_ctrl_btn")
        .attr("transform", "translate(" + (margin3.left+15) + "," + (margin3.top-54 + heightOffset) + ")")
        .style("cursor", "pointer")
        .on("click", function(){

          if(!live_sign){
            live_sign = true;
            live_on = false;
          }

          if(live_on){
            live_on_switch(false);
          }
          else{
            d3.selectAll(".y-brush")
              .call(ybrush.move,null);
            live_on_switch(true);
          }
        });

  var slider = live_ctrl_btn.append("g")
      .attr("class", "slider-spped")
      .attr("transform", "translate(9,2)");

  slider.append("line")
    .attr("class", "track")
    .attr("y1", legendScale_speed.range()[0])
    .attr("y2", legendScale_speed.range()[1])
    .style('stroke-width', "6px")
    .select(function() { 
      return this.parentNode.appendChild(this.cloneNode(true)); 
    })
    .attr("class", "track-inset")
    .select(function() { 
      return this.parentNode.appendChild(this.cloneNode(true)); 
    })
    .attr("class", "track-overlay")
    .call(liveSpeedDrage);

  // var handle = slider.insert("rect", ".track-overlay")
  //     .attr("class", "handle")
  //     .attr("id","handle-live-speed")
  //     .attr("width", 3)
  //     .attr("height", 20) 
  //     .attr("ry", 3)
  //     .attr("transform", "translate(" + -1.6 + ","+ 15 + ")")
  //     .attr("y", (parseFloat(duration_set)/11.5)-15);

  var handle = slider.insert("path", ".track-overlay")
      .attr("class", "handle-live-speed")
      .attr("id","play_btn_path")
      .attr("transform", "translate(" + (-8.9) + ","+ (parseFloat(duration_set)/11.5-15) + ")," + "scale(0.01)")
      .attr("d","M1312 896q0 37-32 55l-544 320q-15 9-32 9-16 0-32-8-32-19-32-56v-640q0-37 32-56 33-18 64 1l544 320q32 18 32 55zm128 0q0-148-73-273t-198-198-273-73-273 73-198 198-73 273 73 273 198 198 273 73 273-73 198-198 73-273zm224 0q0 209-103 385.5t-279.5 279.5-385.5 103-385.5-103-279.5-279.5-103-385.5 103-385.5 279.5-279.5 385.5-103 385.5 103 279.5 279.5 103 385.5z")
      .style("fill","#000");

  live_ctrl_btn.append("g")
    .attr("class","live_ctrl_fontawesome")
    .attr("transform", "translate(3.6,2)")
    .append("path")
      .attr("transform", "scale(0.006)")
      .attr("d","M1600 736v192q0 40-28 68t-68 28h-416v416q0 40-28 68t-68 28h-192q-40 0-68-28t-28-68v-416h-416q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h416v-416q0-40 28-68t68-28h192q40 0 68 28t28 68v416h416q40 0 68 28t28 68z");

  live_ctrl_btn.append("g")
    .attr("class","live_ctrl_fontawesome")
    .attr("transform", "translate(3.6,113)")
    .append("path")
      .attr("transform", "scale(0.006)")
      .attr("d","M1600 736v192q0 40-28 68t-68 28h-1216q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h1216q40 0 68 28t28 68z");
  

  // //append the brush for the selection of subsection  
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
        live_on_switch(false);
        return Ybrushed(d)
      })
      .handleSize([0.3]);

  ///////// y axis1 and y brush ///////////////////////////////

  context.append("g") // Create brushing yAxis
    .attr("class", "y axis1")
    .attr("id","y-axis1")
    .attr("transform", "translate(" + (margin3.left+25) + "," + -(height-heightOffset+margin3.top) + ")")
    .call(yAxis2);

  context.append("g")
    .attr("class", "y brush")
    .attr("id", "y-brush")
    .attr("transform", "translate(" + (margin3.left+25) + ","+ -(height-heightOffset+margin3.top) + ")")
    .call(ybrush)
    .selectAll("rect")
    .attr("width", height2/2) // Make brush rects same height 
      .attr("fill", "#1abc9c"); 

  ////////end slider part-----------------------------------------------------------------------------------

  //////////// annotation g element ///////////////////////////////////////////////
  svg.append("g")
    .attr("class","g-anno");

  //////////// draw the xRuler ///////////////////////////////////////////////
  rulerHeight = yScale.range()[0]-100;

  //// y axis ruler
  var rulerY = d3.scaleLinear()
    .range([0, rulerHeight]);

  var rulerX = d3.scaleLinear()
      .range([0, 25]);

  var rulerDrag = d3.drag()
    .on("drag", rulerDragged);
  
  ruler = svg.append("g")
        .attr("clip-path", "url(#clip)")
      .append("g")
        .attr("id","ruler")
        .attr("transform", "translate(" + 0 + "," + 0 + ")")
        .style("display","none")
        .call(rulerDrag)
        .on("dblclick",function(){
          d3.select("#ruler").style("display","none");
        });

  ruler.append("rect")
      .attr("class", "ruler-background")
      .attr('y', 0)
      .attr("width", 45)
      .attr("height", rulerHeight)
      .attr("opacity","0.6");

  var fakeAxisGroup = ruler.append("g");
  var realAxisGroup = ruler.append("g");
  
  ///// x axis ruler
  var xRulerX = d3.scaleLinear()
    .range([0, rulerHeight]);

  var xRulerY = d3.scaleLinear()
      .range([0, 25]);

  ruler.append("rect")
      .attr("class", "ruler-background")
      .attr('y', -45)
      .attr("width", rulerHeight)
      .attr("height", 45)
      .attr("opacity","0.6");

  var xRulerfakeAxisGroup = ruler.append("g");
  var xRulerrealAxisGroup = ruler.append("g");

  ////////////////////////////////////////////////////////////////////////////

  // draw line graph
  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (height+5) + ")")
    .call(xAxis.tickValues(xAxisValue(fs,xScale.domain())));

  ////// plot y axis //////////////////////////////////
  svg.append("g")
      .attr("class", "y axis")
      .attr("id","y-axis")
      .attr("transform","translate(0,0)")
      .style("display","none")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("x", -10)
      .attr("dy", ".71em")
      .style("text-anchor", "end");
  ////////////////////////////////////////////////////////////////////

  var issue = svg.append("g").attr("class","issue-all")
        .selectAll(".issue")
          .data(categories) // Select nested data and append to new svg group elements
        .enter().append("g")
          .attr("class", "issue")
      // .attr("transform",function(d,i){
      //     return "translate(0," + i*interval + ")";}
      //   )
      .attr("id",function(d){return "issue-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");}); 
  var f = d3.format("07f");

  issue.append("g")
      .attr("class","g_line")
      .attr("clip-path", "url(#clip)")//use clip path to make irrelevant part invisible
    .append("path")
      .attr("class","line")
      .attr("transform",function(d,i){
        return "translate(0," + ((i-categories.length/2)*interval) + ")";
      })
      .style("pointer-events", "none") // Stop line interferring with cursor
      .attr("id", function(d) {
        return "line-" + d.name.replace(/[^0-9^A-Za-z-]/g,""); // Give line id of line-(insert issue name, with any spaces replaced with no spaces)
      })
      .attr("d", function(d) { 
        x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
        if(x_len > length_limit){
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
          d3.selectAll(".g-anno").selectAll("*").remove();
          annotationDraw(); 
          return d.visible ? line(d.values) : null; 
        }
      })
      .style("stroke", function(d) { return d.sigColor; })
      .style("stroke-width", line_width);

  //////// draw channel legend ////////////////////////////////////////////////////
  var legendAll = svg.append("g").attr("class","legend-all");
  var legend = legendAll.selectAll(".legend")
          .data(categories) // Select nested data and append to new svg group elements
          .enter().append("g")
            .attr("class", "legend")
            .attr("id",function(d){return "legend-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");});

  var legendSpace = 25;
  legend.append("rect")
    .attr("width", 10)
    .attr("height", 10)
    .attr("id",function(d){return "controlrect-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");})                                    
    .attr("x", function (d,i){
        return 48 + width + (margin.right/5+30)*Math.floor(i/eachPerRow)}
      ) 
    .attr("y", function (d, i) { 
        return (i%eachPerRow)*(legendSpace)+2; 
      })
    .attr("fill",function(d) {
      return d.visible ? d.sigColor : "#F1F1F2"; // If array key "visible" = true then color rect, if not then make it grey 
    })
    .attr("class", "legend-box")
    .on("click", function(d,i_d){ // On click make d.visible 
      d.visible = !d.visible; // If array key for this data selection is "visible" = true then make it false, if false then make it true

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

      if(y_min == 0 && y_max == 0){
        y_min = -y_min_value;
        y_max = y_min_value;
      }

      yPreview.domain([y_min-Math.abs(y_min)*0.1, y_max+Math.abs(y_max)*0.1]);
      
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

      issue.select("#line-"+d.name.replace(/[^0-9^A-Za-z-]/g,""))
        .transition()
        .attr("transform","translate(0," + ((i_d-categories.length/2)*interval) + ")")
        .attr("d", function(){
          if(d.visible){
            x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
            if(x_len > length_limit){
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
              return line(plot_data);
            }else
              return line(d.values); 
          }
          else{
            return null;
          }
        });

      issue.select("rect")
        .transition()
        .attr("fill", function(d) {
          return d.visible ? d.sigColor : "#F1F1F2";
        });

      if(!d.visible){
        specificViewCancel(d,i);
      }
    })
    .on("mouseover", function(d,i){
      if(specificView)
        return ;

      d3.select(this)
        .transition()
        .attr("fill", function(d) { return d.sigColor; });

      resetRendering();

      if (d.visible){
        specificViewDraw(d,i);
        specificView = false;
      } 
    })

    .on("mouseout", function(d,i){
      if(specificView)
        return

      d3.select(this)
        .transition()
        .attr("fill", function(d) {
        return d.visible ? d.sigColor : "#F1F1F2";});

      specificViewCancel(d,i);
    });

      
  legend.append("text")
    .attr("class","legend-text")
    .attr("x", function (d,i){
        return 60 + width + (margin.right/5+30)*Math.floor(i/eachPerRow)}
      ) 
    .attr("y", function (d, i) { 
        return (10)+(i%eachPerRow)*(legendSpace)+2; 
      })
    .attr("id",function(d){return "controltext-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");})
    .attr("flag","false")
    .text(function(d) { return (d.name.split("-")[0])+" (" + d.unit + ")"; })
    .style("font-size","12px")
    .style("fill",function(d){return d.sigColor})
    .style("cursor", "pointer")
    .on("dblclick", function (d,i){
      if (d.visible){
        resetRendering();
        specificViewDraw(d,i);
        d3.select(this).attr("flag","true");  
      }
      current_color = d3.select(this).style("fill");
      current_color = rgb2hex(current_color);
    })
    .on("click",function(d,i){
      if (d.visible){

        flag = d3.select(this).attr("flag");

        resetRendering();
        
        d3.select(this).attr("flag",flag);
        
        if(flag == "false"){
          specificViewDraw(d,i);
          d3.select(this).attr("flag","true");  
        }
        else{
          specificViewCancel(d,i);
          d3.select(this).attr("flag","false");
        }
      }
    })
    .on("mouseover", function(d,i){
      d3.select(this).style("font-size","14px");
    })
    .on("mouseout",function(d,i){
      d3.select(this).style("font-size","12px");
    });

  legend.append("text")
    .attr("class","legend-text")
    .attr('font-family', 'FontAwesome')
    .attr('font-size',"13px")
    .attr("x", function (d,i){
        return 65 + (d.name.length+4)*7 + width + (margin.right/5+30)*Math.floor(i/eachPerRow)}
      ) 
    .attr("y", function (d, i) { 
        return (10)+(i%eachPerRow)*(legendSpace)+2; 
      })
    .text("\uf0a9")
    .style("cursor","pointer")
    .on("click",function(d,i){
      selectSpectrogram(d.name);
    });

  // signalSubGroups = ["All"].concat(signalGroups.slice(0,2));

  signalSubGroups = ["All"]

  legendGroup = legendAll.selectAll(".legend-all")
      .data(signalSubGroups)
      .enter().append("g")
        .attr("class", "legend-group")
        .attr("id",function(d){return "legend-group-"+d.replace(/[^0-9^A-Za-z-]/g,"");});

  legendGroup.append("rect")
    .attr("width", 10)
    .attr("height", 10)
    .attr("id",function(d){return "controlrect-"+d.replace(/[^0-9^A-Za-z-]/g,"");})
    .attr("x", function (d,i){
        return 48 + width + (margin.right/5+10)*Math.floor(i/1)}
      ) 
    .attr("y", function (d, i) { 
        return -20; 
      })
    .attr("fill",function(d) {
      return color(d); // If array key "visible" = true then color rect, if not then make it grey 
    })
    .attr("class", "legend-box")
    .on("click", function(g){ // On click make d.visible 
      for(i_d = 0; i_d < categories.length; i_d++){
        d = categories[i_d];
        if(d.specific){
          specificViewCancel(d,i_d);
        }
      }

      resetRendering();

      ctx.clearRect(0,0,canvas.width,canvas.height);
      color_temp = d3.select("#controlrect-"+g.replace(/[^0-9^A-Za-z-]/g,"")).attr("fill");

      for(i_d = 0; i_d < categories.length; i_d++){
        d = categories[i_d];

        if(g != "All" && d.group != g)
          continue;

        if(g == "All"){
          if(color_temp.toUpperCase() != "#F1F1F2" && color_temp != "rgb(241, 241, 242)")
            d.visible = false;
          else
            d.visible = true;
        }
        else
          d.visible = !d.visible; // If array key for this data selection is "visible" = true then make it false, if false then make it true
      }

      for(i_d = 0; i_d < categories.length; i_d++){
        d = categories[i_d];

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

        if(y_min == 0 && y_max == 0){
          y_min = -y_min_value;
          y_max = y_min_value;
        }

        yPreview.domain([y_min-Math.abs(y_min)*0.1, y_max+Math.abs(y_max)*0.1]);
      
        if(d.visible){
          ctx.beginPath();
          line_canvas(d.values);
          ctx.lineWidth = 1;
          ctx.strokeStyle = d.sigColor;
          ctx.stroke();
        }      

        issue.select("#line-"+d.name.replace(/[^0-9^A-Za-z-]/g,""))
          .transition()
          .attr("transform","translate(0," + ((i_d-categories.length/2)*interval) + ")")
          .attr("d", function(){
            if(d.visible){
              x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
              if(x_len > length_limit){
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
                return line(plot_data);
              }else
                return line(d.values); 
            }
            else{
              return null;
            }
          });
        
        legend.select("#controlrect-" + d.name.replace(/[^0-9^A-Za-z-]/g,""))
          .attr("fill", function(){
            return d.visible ? d.sigColor : "#F1F1F2";
          });
      };

      if(true){
        signalSubGroups.forEach(function(gg){
          d3.select("#controlrect-" + gg.replace(/[^0-9^A-Za-z-]/g,""))
            .transition()
            .attr("fill", function() {
              visible = false;
              for(i_d = 0; i_d < categories.length; i_d++){
                d = categories[i_d];
                if(gg != "All" && d.group != gg)
                  continue;

                if(d.visible){
                  visible = true;
                  break;
                }
              }  
              return visible ? color(gg) : "#F1F1F2";
            });
        });
      }
    });

  legendGroup.append("text")
    .attr("class","legend-group-text")
    .attr("x", function (d,i){
        return 60 + width + (margin.right/5+10)*Math.floor(i/1)}
      ) 
    .attr("y", function (d, i) { 
        return -10; 
      })
    .attr("id",function(d){return "controltext-"+d;})
    .attr("flag","false")
    .text(function(d){return d;})
    .style("font-size","12px")
    .style("fill",function(d){return d.sigColor});
    // .style("cursor", "pointer")
  /////////////////////////////////////////////////////////////////////////////

  //////////////////// annotation legend //////////////////////////////////////
  anno_circle_x_position = [0];
  annoLegend = context.append("g")
    .attr("class","anno-legend")
    .attr("transform","translate(0," + (-(height-heightOffset+margin3.top+10)) + ")");

  if (annotations.length > 0 && annotations.length <= anno_num_max){
    annotations.forEach( function(anno,a_i) {
      anno_name = annotation_names[a_i];
      color_anno_index = annotationList[a_i];

      anno_circle_x_position[a_i+1] = anno_name.length*7.8 + anno_circle_x_position[a_i] + 18;
      annoLegend.append("circle")
        .attr("r", 5)
        .attr("class","anno-circle")
        .attr("id", "annocircle---"+ anno_name.replace(/[^0-9^A-Za-z-]/g,"")+"---"+a_i)
        .attr("cx",anno_circle_x_position[a_i]+3)
        .attr("cy",-10)
        .attr("fill","#F1F1F2")// If array key "visible" = true then color rect, if not then make it grey 
        .style("cursor","pointer")
        .on("mouseover", function(){
          annoCircleMouseOver(this);
        })
        .on("mouseout", function(){
          annoCircleMouseOut(this);
        })
        .on("click", function(){
          annoCircleClick(this);
        });

      annoLegend.append("text")
        .attr("id", "annolegendtext---"+ anno_name.replace(/[^0-9^A-Za-z-]/g,"")+"---"+a_i)
        .attr("x",anno_circle_x_position[a_i]+13)
        .attr("y",-5)
        .style("fill",color_anno(color_anno_index))
        .text(anno_name)
        .style("font-size","12px")
        .style("cursor", "pointer")
        .on("click", function (){
          name = d3.select(this).text();
        })
        .on("mouseover", function(d,i){
          d3.select(this).style("font-size","14px");
        })
        .on("mouseout",function(d,i){
          d3.select(this).style("font-size","12px");
        }); // end of issue_need.append("text")
    }); // end of d.annotation.forEach
  }// end of if (d.annotation.length > 0)
  else if(annotations.length > anno_num_max){
    var div = d3.select("body").append("div")
        .attr("class", "anno-tooltip")
        .style("opacity", 0);

    annotations.forEach( function(anno,a_i) {
      anno_name = annotation_names[a_i];
      color_anno_index = annotationList[a_i];

      anno_circle_x_position[a_i+1] = anno_circle_x_position[a_i] + 15;

      annoLegend.append("circle")
        .attr("r", 5)
        .attr("class","anno-circle")
        .attr("id", "annocircle---"+ anno_name.replace(/[^0-9^A-Za-z-]/g,"")+"---"+a_i)
        .attr("cx",anno_circle_x_position[a_i]+3)
        .attr("cy",-10)
        .attr("fill","#F1F1F2")// If array key "visible" = true then color rect, if not then make it grey 
        .style("cursor","pointer")
        .on("click", function(){
          annoCircleClick(this);
        })
        .on("mouseover",function(){
          annoCircleMouseOver(this);
          div.transition()    
            .duration(200)
            .style("opacity", 0.9);
          div.html(annotation_names[d_index])
            .style("left", (d3.event.pageX+9) + "px")
            .style("top", (d3.event.pageY+6) + "px");  
        })
        .on("mouseout", function(d) {  
          annoCircleMouseOut(this);
          div.transition()
            .duration(500)
            .style("opacity", 0);
        });
    });
  }

  d3.select("#mouse-tracker") // select chart plot background rect #mouse-tracker
    .on("click", mouseTrackerClick); // on mousemove activate mousemove function defined below
    // .on("mouseout", mouseTrackerMouseout);

  //////////// set ruler scale /////////////////////////////////////////
  yRulerScale = Math.abs(yScale.domain()[0]-yScale.domain()[1])*(rulerY.range()[1]/yScale.range()[0]);
  yRulerSliderChange(yRulerScale);
  xRulerScale = (Math.abs(xScale.domain()[1]-xScale.domain()[0])/(fs))*(xRulerX.range()[1]/xScale.range()[1]);
  xRulerSliderChange(xRulerScale);
  ///////////////////////////////////////////////////////////////////////////

  // //////////////// Hover line //////////////////////////////////////////// 
  // var hoverLineGroup = svg.append("g") 
  //       .attr("class", "hover-line");

  // var hoverLine = hoverLineGroup // Create line with basic attributes
  //     .append("line")
  //       .attr("id", "hover-line")
  //       .attr("x1", 10).attr("x2", 10) 
  //       .attr("y1", 0).attr("y2", height + 10)
  //       .style("pointer-events", "none") // Stop line interferring with cursor
  //       .style("opacity", 1e-6); // Set opacity to zero 

  // guideLineGroup = svg.append("g")
  //     .attr("class", "guide-line")
  //     .attr("transform","translate(0,0)");
  // // add the line to the group
  // guideLine = guideLineGroup
  //   .append("svg:line")
  //     .attr("x1", 0).attr("x2", 690+121) // vertical line so same value on each
  //     .attr("y1", 0).attr("y2", 30); 

  // guidetext = guideLineGroup
  //   .append("svg:text")
  //     .attr("x", 3) // vertical line so same value on each
  //     .attr("y", 0)
  //     .style("font-size","12px")
  //     .text("");// top to bottom  
      
  // // hide it by default
  // guideLine.classed("hide", true);
  // guidetext.classed("hide", true);

  // d3.select("#mouse-tracker") // select chart plot background rect #mouse-tracker
  //   .on("mousemove", mouseTrackerMousemove) // on mousemove activate mousemove function defined below
  //   .on("mouseout", mouseTrackerMouseout);


  // function mouseTrackerMouseout(){
  //    guideLine.classed("hide", true);
  //    guidetext.classed("hide", true);
  //    svg.selectAll(".circle-guidline").remove();
  //    svg.selectAll(".circle-text").remove();
  // };

  // function mouseTrackerMousemove() { 
  //   scaleThr = (maxScale-(yScale.domain()[1]-yScale.domain()[0]));
  //   if(scaleThr > 0.01)
  //     scaleThr = scaleThr*0.0003/0.98+0.0005;
  //   else
  //     scaleThr = maxScale/height*3;
  //   if(live_on && x_len <= hover_point_show_limit && (yScale.domain()[1]-yScale.domain()[0])<0.25)
  //     live_on_switch(false);
  //   Yoffset = 0;
  //   hoverLineXOffset = $(this).offset().left;
  //   hoverLineYOffset = $(this).offset().top;
  //   var mouseX = event.pageX-hoverLineXOffset;
  //   var mouseY = event.pageY-hoverLineYOffset;
  //   if(mouseX >= 0 && mouseX <= 715+121 && mouseY >= 0 && mouseY <= 380) {
  //     // show the hover line
  //     guideLine.classed("hide", false);
  //     guidetext.classed("hide", false);
  //     // set position of hoverLine
  //     guideLine.attr("y1", mouseY+Yoffset).attr("y2", mouseY+Yoffset);
  //     guidetext.attr("y", mouseY+Yoffset).text(d3.format('0.4f')(yScale.invert(mouseY)));
  //     x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
  //     if(x_len <= hover_point_show_limit && !live_on){
  //       categories.forEach(function(d){
  //         if(d.visible){
  //           x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
  //           plot_data = [];
  //           s_id = Math.ceil(xScale.domain()[0]);
  //           e_id = Math.ceil(xScale.domain()[1]);
  //           ratio = parseFloat(data.length)/parseFloat(d.values.length);
  //           i_s = Math.ceil(parseFloat(xScale.domain()[0]-d.values[0].index)/parseFloat(ratio));
  //           if(x_len>length_limit)
  //             i_e = i_s+parseFloat(length_limit)*parseFloat(fs)/parseFloat(ratio);
  //           else
  //             i_e = Math.ceil(parseFloat(xScale.domain()[1]-d.values[0].index)/parseFloat(ratio));
  //           for(i=i_s; i<=i_e; i++){
  //             if(d.values[i] != undefined)
  //               plot_data.push(d.values[i]);
  //           }
  //           V = plot_data;
  //           V.forEach(function(c){
  //             x_show = xScale(c.index);
  //             yscale_text = yScale.domain()[1]-yScale.domain()[0];
  //             if(Math.abs(yScale.invert(mouseY)-c.rating) < scaleThr && yScale.invert(mouseY) > c.rating && x_show > 0 && x_show < 710+121){
  //               svg.append("circle")
  //                 .attr("class","circle-guidline")
  //                 .attr("id", "circle"+ xScale(c.index).toString().replace(".", "").replace("-", "")+ yScale(c.rating).toString().replace(".", "").replace("-", ""))
  //                 .attr("cx", xScale(c.index))
  //                 .attr("cy", yScale(c.rating))
  //                 .attr("r", 3)
  //                 .style("fill",color(d.name)); 
  //               if(yscale_text<0.25)
  //                 svg.append("text")
  //                   .attr("class","circle-text")
  //                   .attr("id", "circleText"+ xScale(c.index).toString().replace(".", "").replace("-", "")+ yScale(c.rating).toString().replace(".", "").replace("-", ""))
  //                   .attr("transform", "translate("+ (xScale(c.index)+5) + "," + (yScale(c.rating)-5) + ") rotate(-55)")
  //                   // 
  //                   .text(d3.format('0.4f')(c.rating))
  //                   .style("fill",color(d.name));
  //             }
  //             else{
  //               svg.select("#circle"+xScale(c.index).toString().replace(".", "").replace("-", "")+ yScale(c.rating).toString().replace(".", "").replace("-", "")).remove();

  //               svg.select("#circleText"+ xScale(c.index).toString().replace(".", "").replace("-", "")+ yScale(c.rating).toString().replace(".", "").replace("-", "")).remove();
  //             }
  //           });
  //         }
  //       });
  //     }
  //   } else {
  //     // proactively act as if we've left the area since we're out of the bounds we want
  //     guideLine.classed("hide", true);
  //     guidetext.classed("hide", true);
  //     svg.selectAll(".circle-guidline").remove();
  //     svg.selectAll(".circle-text").remove();
  //   }
  // }; 

  ///////////////////////////////////////////////////////////////////////////

  $("#set-chan-color").click(function(){
    color_no = $("#chan-color").val();
    name = $("#chan-name").text()
    find_c_index = parseInt($("#chan-id").text());
    d = categories[find_c_index];
    d3.select("#label-"+name.replace(/[^0-9^A-Za-z-]/g,"")).style("fill",color_no);
    d3.select("#unitlabel-"+name.replace(/[^0-9^A-Za-z-]/g,"")).style("fill",color_no);
    d3.select("#controltext-"+name.replace(/[^0-9^A-Za-z-]/g,"")).style("fill",color_no);
    if(d.visible)
      d3.select("#controlrect-"+name.replace(/[^0-9^A-Za-z-]/g,"")).attr("fill",color_no);
    d3.select("#line-"+name.replace(/[^0-9^A-Za-z-]/g,"")).style("stroke",color_no);
    d3.select("#previewlabel-"+name.replace(/[^0-9^A-Za-z-]/g,"")).style("stroke",color_no);
    d3.select("#previewcircle-"+name.replace(/[^0-9^A-Za-z-]/g,"")).attr("fill",color_no);
    
    d.sigColor = color_no;
    drawCanvas(d);
  });

  ////// for ruler ////////////////////////////////////////////////////////
  function rulerDragged(d) {
    dd = [];
    dd[0] = d3.event.x, dd[1] = d3.event.y;
    d3.select(this).attr("transform", "translate(" + dd + ")");
  };

  function yRulerSliderChange(v) {
    // d3.select('label').text(v);
    rulerY.domain([0, v]);
    yRulerRedraw();
  };

  function yRulerRedraw() {
    fakeAxisGroup
      .attr("class", "ruler")
      .attr("transform", "translate(0," + rulerHeight + ")")
      .call(d3.axisRight().scale(rulerY).ticks(20))
      .selectAll(".tick")
      .select('line')
      .attr('y1', function (d, i) {
        if ((i + 1) % 4)
          return -25;
        else
          return 0;
      })
      .attr('y2', function (d, i) {
        if ((i + 1) % 2)
          return -18;
        if ((i + 1) % 4)
          return 10;
        else
          return 0;
      })
      .style("display","none");

    realAxisGroup
      .attr("class", "ruler-axis")
      .attr("transform", "translate(0,0)")
      .call(d3.axisRight().scale(rulerY).ticks(10).tickSize(15));
  };

  function xRulerSliderChange(v) {
    // d3.select('label').text(v);
    xRulerX.domain([0, v]);
    xRulerRedraw();
  };

  function xRulerRedraw() {
    xRulerfakeAxisGroup
      .attr("class", "ruler")
      .attr("transform", "translate(0," + rulerHeight + ")")
      .call(d3.axisTop().scale(xRulerX).ticks(8))
      .selectAll(".tick")
      .select('line')
      .attr('y1', function (d, i) {
        if ((i + 1) % 4)
          return -25;
        else
          return 0;
      })
      .attr('y2', function (d, i) {
        if ((i + 1) % 2)
          return -18;
        if ((i + 1) % 4)
          return 10;
        else
          return 0;
      })
      .style("display","none");

    xRulerrealAxisGroup
      .attr("class", "ruler-axis")
      .attr("transform", "translate(0,0)")
      .call(d3.axisTop().scale(xRulerX).ticks(8).tickSize(15));
  };
  ////////////////////////////////////////////////////////

  ///// for brusher of the slider bar at the bottom ///////////////////////////
  function Xbrushed(live_on) {

    if(!specificView){
      resetRendering();
      // d3.select("#ruler").style("display","none");
    }

    // specificView = false;

    s = d3.event.selection || xScale2.range();
    xScale.domain(s.map(xScale2.invert, xScale2));
    x_len = Math.floor(parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs));
    if(x_len > length_limit){
      s_id = Math.ceil(xScale.domain()[0]);
      e_id = s_id + length_limit*fs;
      xScale.domain([s_id,e_id]);
      context.select(".x-brush").call(xbrush.move, [xScale2(s_id),xScale2(e_id)]);
      x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
    }else{
        xScale.domain(s.map(xScale2.invert, xScale2)); // If brush is empty then reset the Xscale domain to default, if not then make it the brush extent 
    }

    if(live_sign){
      svg.selectAll(".x.axis") // replot xAxis with transition when brush used
        .transition()
        .call(xAxis.tickValues(xScale.ticks(6)));
    }
    else{
      svg.select(".x.axis") // replot xAxis with transition when brush used
        .transition()
        .call(xAxis.tickValues(xAxisValue(fs,xScale.domain())));
        // .call(xAxis.tickValues(xScale.ticks(6).concat(xScale.domain())));
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
      .attr("transform",function(d,i){
        if(specificView)
          return 'translate(' + xScale(xScale.domain()[0]) + ')'
        else
          return "translate(" + xScale(xScale.domain()[0]) + "," + ((i-categories.length/2)*interval) + ")";
      });

    if(live_on)
      live_on_switch(true); 

    //////// annotation for all channel ///////////////////////////////////////
    d3.selectAll(".anno-circle")
      .attr("fill","#F1F1F2");

    d3.selectAll(".g-anno").selectAll("*").remove();

    annotationDraw();
    ///////////////////////////////////////////////////////////////////////////
    xRulerScale = (Math.abs(xScale.domain()[1]-xScale.domain()[0])/(fs))*(xRulerX.range()[1]/xScale.range()[1]);
    xRulerSliderChange(xRulerScale);
  };   

  function Ybrushed() {

    if(!specificView){
      resetRendering();
      // d3.select("#ruler").style("display","none");
    }

    // specificView = false;

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
        if(specificView)
          return 'translate(' + xScale(xScale.domain()[0]) + ')'
        else
          return "translate(" + xScale(xScale.domain()[0]) + "," + ((i-categories.length/2)*interval) + ")";
      });

    rulerScale = Math.abs(yScale.domain()[0]-yScale.domain()[1])*(rulerY.range()[1]/yScale.range()[0]);
    yRulerSliderChange(rulerScale);
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

  //// for live chart /////////////////////////////////////////
  function tick() {

    if(!live_sign){
      return;
    }

    live_on = true;

    if(!specificView){
      resetRendering();
      // d3.select("#ruler").style("display","none");
    }

    var s_id, e_id;
    
    // minY = d3.min(minY_categories);
    // maxY = d3.max(maxY_categories);
    // minY = minY-Math.abs(minY)*yAmplify;
    // maxY = maxY+Math.abs(maxY)*yAmplify;
    // if(minY == 0 && maxY == 0){
    //   minY = -0.01;
    //   maxY = 0.01;
    // }
    // yScale.domain([minY,maxY]);


    s_id = Math.ceil(xScale.domain()[0]);
    e_id = Math.ceil(xScale.domain()[1]);

    if(e_id >= xScale2.domain()[1]){
      live_on_switch(false);
      live_sign = false;
      return ;
    }

    e_id = e_id + move_step;

    xscale_move_step = move_step;

    if(e_id > xScale2.domain()[1]){
      e_id = xScale2.domain()[1];
      xscale_move_step = e_id - xScale.domain()[1];
    }


    categories.forEach(function(d,i){
      c_index = i;
      if(d.visible){
        plot_data = [];
        ratio = parseFloat(data.length)/parseFloat(d.values.length);
        i_s = Math.ceil(parseFloat(xScale.domain()[0]-d.values[0].index)/parseFloat(ratio));
        // e_id = e_id + move_step;
        // if(e_id > xScale2.domain()[1]){
        //   return ;
        // }
        i_e = Math.ceil(parseFloat(e_id-d.values[0].index)/parseFloat(ratio));
        plot_data = d.values.slice(i_s, i_e+1);
        d3.select("#line-"+ d.name.replace(/[^0-9^A-Za-z-]/g,""))
          .attr("transform",function(){
            if(specificView)
              return null;
            else
              return "translate(" + 0 + "," + ((c_index-categories.length/2)*interval) + ")";
          })
          .attr("d", function(){
            return line(plot_data);
          })
          .transition()
            .duration(duration_set)
            .ease(d3.easeLinear)
            .attr("transform",function(){
                if(specificView)
                  return 'translate(' + xScale(xScale.domain()[0]-xscale_move_step) + ')';
                else
                  return 'translate(' + xScale(xScale.domain()[0]-xscale_move_step) + "," + ((c_index-categories.length/2)*interval) + ')';
              });
          if(specificView)
             d3.select("#line-"+ d.name.replace(/[^0-9^A-Za-z-]/g,""))
                .style("stroke-width","1.2");
        plot_data = [];
      }
    });
    
    d3.select(".y.axis")
      .transition()
      .duration(duration_set)
      .call(yAxis);

    //////// annotation for all channel ///////////////////////////////////////
    d3.selectAll(".g-anno").selectAll("*").remove();
    annotationDraw();

    d3.selectAll(".annotations")
      .attr("transform",null)
      .transition()
        .duration(duration_set)
        .ease(d3.easeLinear)
        .attr('transform', 'translate(' + xScale(xScale.domain()[0]-move_step) + ')');
    ///////////////////////////////////////////////////////////////////////////
    
    s_id = xScale.domain()[0];
    e_id = xScale.domain()[1];

    s_id = Math.ceil(xScale.domain()[0]);
    e_id = Math.ceil(xScale.domain()[1]);

    xscale_move_step = move_step;

    if(e_id+move_step > xScale2.domain()[1]){
      xscale_move_step = xScale2.domain()[1] - e_id;
    }

    selection_width = d3.select(".x.brush.x-brush").select(".selection").attr("width");

    console.log(xScale2(s_id+xscale_move_step));
    d3.select(".x.brush.x-brush").select(".selection")
      .transition()
      .duration(duration_set)
      .ease(d3.easeLinear)
      .attr("x",xScale2(s_id+xscale_move_step));

    d3.select(".x.brush.x-brush").select(".handle--w")
      .transition()
      .duration(duration_set)
      .ease(d3.easeLinear)
      .attr("x",xScale2(s_id+xscale_move_step));

    d3.select(".x.brush.x-brush").select(".handle--e")
      .transition()
      .duration(duration_set)
      .ease(d3.easeLinear)
      .attr("x",xScale2(s_id+xscale_move_step)+parseFloat(selection_width));

    xScale.domain([s_id+xscale_move_step,e_id+xscale_move_step]);

    d3.select(".x.axis")
      .transition()
      .duration(duration_set)
      .ease(d3.easeLinear)
      .call(xAxis.tickValues(xScale.ticks(6)));
    
    d3.select(".x.brush").transition()
      .duration(duration_set)
      .on('end', tick);
  };

  function live_on_switch(s){
    if(!live_sign){
      return ;
    }

    if(!s){
      d3.select(".x.brush").interrupt();
      live_on = false; 
      d3.select("#play_btn_path").attr("d","M1312 896q0 37-32 55l-544 320q-15 9-32 9-16 0-32-8-32-19-32-56v-640q0-37 32-56 33-18 64 1l544 320q32 18 32 55zm128 0q0-148-73-273t-198-198-273-73-273 73-198 198-73 273 73 273 198 198 273 73 273-73 198-198 73-273zm224 0q0 209-103 385.5t-279.5 279.5-385.5 103-385.5-103-279.5-279.5-103-385.5 103-385.5 279.5-279.5 385.5-103 385.5 103 279.5 279.5 103 385.5z");
    }
    else{
      live_on = true;
      // d3.select("#y-brush")
      //   .call(ybrush.move,null);
      d3.select("#play_btn_path").attr("d","M896 128q209 0 385.5 103t279.5 279.5 103 385.5-103 385.5-279.5 279.5-385.5 103-385.5-103-279.5-279.5-103-385.5 103-385.5 279.5-279.5 385.5-103zm0 1312q148 0 273-73t198-198 73-273-73-273-198-198-273-73-273 73-198 198-73 273 73 273 198 198 273 73zm96-224q-14 0-23-9t-9-23v-576q0-14 9-23t23-9h192q14 0 23 9t9 23v576q0 14-9 23t-23 9h-192zm-384 0q-14 0-23-9t-9-23v-576q0-14 9-23t23-9h192q14 0 23 9t9 23v576q0 14-9 23t-23 9h-192z");
      tick();
    }
  };

  ///// for rendering specific signal /////////////////////////////////////////
  function resetRendering(){

    yScale3.domain(yScale_rec.domain());

    d3.select("#y-axis1")
      .call(yAxis2);

    d3.selectAll('.line')
      .style("opacity","1")
      .style("stroke-width","0.6");
          
    issue.select("path") // Redraw lines based on brush xAxis scale and 
      .attr("transform",function(d,i){
        return "translate(" + xScale(xScale.domain()[0]) + "," + ((i-categories.length/2)*interval) + ")";
      });

    d3.selectAll(".legend-text")
      .attr("flag","false");

    d3.select("#y-axis").style("display","none");
  } 

  function specificViewDraw(d,i){
    d3.selectAll('.line')
      .style("display","none");
    d3.select("#line-" + d.name.replace(/[^0-9^A-Za-z-]/g,""))
      .style("display","");
    d3.select("#line-" + d.name.replace(/[^0-9^A-Za-z-]/g,""))
      .transition()
      .attr("transform","translate(0,0)");
    d3.select("#line-" + d.name.replace(/[^0-9^A-Za-z-]/g,"")).style("stroke-width","1.2");
    d3.select("#y-axis").style("display","");
    specificView = true;
    d.specific = true;

    y_min = d3.min(d.values, function(v) { return v.rating; }); 
    y_max = d3.max(d.values, function(v) { return v.rating; });

    if(y_min == 0 && y_max == 0){
      y_min = -y_min_value;
      y_max = y_min_value;
    }
    s_id = y_max * 1.1;
    e_id = y_min * 1.1;
    yScale3.domain([y_min*4, y_max*4]);
    d3.select("#y-axis1")
      .call(yAxis2);
    context.select("#y-brush").call(ybrush.move, [yScale3(s_id),yScale3(e_id)]);
  };

  function specificViewCancel(d,i){
    d3.selectAll('.line')
      .style("display","");
    d3.select("#line-" + d.name.replace(/[^0-9^A-Za-z-]/g,""))
      .attr("transform","translate(0," + ((i-categories.length/2)*interval) + ")");
    d3.select("#line-" + d.name.replace(/[^0-9^A-Za-z-]/g,"")).style("stroke-width","0.6");
    d3.select("#y-axis").style("display","none");
    specificView = false;
    yScale3.domain(yScale_rec.domain());
    d3.select("#y-axis1")
      .call(yAxis2);
    s_id = yScale3.domain()[0];
    e_id = yScale3.domain()[1];
    context.select("#y-brush").call(ybrush.move, null);
    d.specific = false;
  };

  ////// for drawing annotation /////////////////////////////////////////
  function annotationDraw(){
    var issue_need = d3.selectAll(".g-anno");
    annotations.forEach(function(d,i){
      var c_index = i;
      index_rec = anno_start_index_all_categories[c_index];
      anno_draw = anno_draw_all_categories[c_index];
      anno_name = annotation_names[c_index];

      // color_anno_index = "Annotation_" + anno_name + "_" + d.name.replace(/[^0-9^A-Za-z-]/g,"");
      color_anno_index = annotationList[c_index];
      index_rec.forEach(function(irec,anno_draw_i){
        issue_need.append("g")
          .attr("class","g_area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
          .attr("clip-path", "url(#clip)")
          .append("path") // Path is created using svg.area details
            .attr("class", "annotations annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
            .attr("id","id-annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
            .attr("d", function(d){ 
              plot_anno = anno_draw[anno_draw_i];
              plot_anno = [plot_anno[0],plot_anno[plot_anno.length-1]];
              return annotationArea(plot_anno);
            })
            .attr("fill", color_anno(color_anno_index))
            .attr("transform","translate(0,0)")
            // .attr("clip-path", "url(#clip" + d.name.replace(/[^0-9^A-Za-z-]/g,"")+ ")" )
            .style("opacity","0.4")
            .style("cursor", "pointer")
            .on("click", mouseTrackerClick);
            // .on("mousemove",function(d,i){
            //     x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
            //     plot_data = [];
            //     s_id = Math.ceil(xScale.domain()[0]);
            //     e_id = Math.ceil(xScale.domain()[1]);
            //     dd = Object.assign({},d);
            //     ratio = parseFloat(data.length)/parseFloat(d.values.length);
            //     i_s = Math.ceil(parseFloat(xScale.domain()[0]-d.values[0].index)/parseFloat(ratio));
            //     if(x_len>length_limit)
            //       i_e = i_s+parseFloat(length_limit)*parseFloat(fs)/parseFloat(ratio);
            //     else
            //       i_e = Math.ceil(parseFloat(xScale.domain()[1]-d.values[0].index)/parseFloat(ratio));
            //     for(i=i_s; i<=i_e; i++){
            //       if(d.values[i] != undefined)
            //         plot_data.push(d.values[i]);
            //     }
            //     dd.values = plot_data;
            //     hoverlinemousemove(dd);
            //   })
            // .on("mouseout",function(d){
            //   hoverlinemouseout();
            //   }); // end of issue_need.append("path") 

        issue_need.append("text") // annotation name in area
          .attr("class", "annotation-area-text annotation-area-text-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
          .attr("id","id-annotation-area-text-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
          .attr("clip-path", "url(#clip" + anno_name.replace(/[^0-9^A-Za-z-]/g,"")+ ")" )
          .attr("x",xScale(irec))
          .attr("y",12)
          .attr("fill",color_anno(color_anno_index))
          .style("font-size","12px")
          .style("font-weight","bold")
          .style("opacity","0.4")
          // .text(d.annotation_name[a_i]);
      });

    });
  };

  ///// for ruler activation by clicking ////////////////////////////////////////
  function mouseTrackerClick() { 

    scaleThr = (maxScale-(yScale.domain()[1]-yScale.domain()[0]));
    if(scaleThr > 0.01)
      scaleThr = scaleThr*0.0003/0.98+0.0005;
    else
      scaleThr = maxScale/height*3;
    if(live_on && x_len <= hover_point_show_limit && (yScale.domain()[1]-yScale.domain()[0])<0.25)
      live_on_switch(false);
    Yoffset = 0;
    // hoverLineXOffset = 175;
    // hoverLineYOffset = 90;
    hoverLineXOffset = $("#mouse-tracker").offset().left;
    hoverLineYOffset = $("#mouse-tracker").offset().top;
    var mouseX = event.pageX-hoverLineXOffset;
    var mouseY = event.pageY-hoverLineYOffset;
    if(mouseX >= 0 && mouseX <= 715+121 && mouseY >= 0 && mouseY <= 450) {
      // show the ruler
      d3.select("#ruler")
        .attr("transform", "translate(" + mouseX + "," + mouseY + ")")
        .style("display","");

    } else {
      // proactively act as if we've left the area since we're out of the bounds we want
      d3.select("#ruler").style("display","none");
    }
  }; 


  ///// for annotation legend actions /////////////////////////////////////////
  function annoCircleMouseOver(thisElement){
    str_need = d3.select(thisElement).attr("id");
    d_name = str_need.split("---")[1];

    d3.select(thisElement)
        .transition()
        .style("font-size","11px");

    d3.selectAll(".annotations")
      .transition()
      .style("opacity","0.1");

    d3.selectAll(".annotation-area-" + d_name)
      .transition()
      .style("opacity","0.65"); 
  };

  function annoCircleMouseOut(thisElement){
    str_need = d3.select(thisElement).attr("id");
    d_name = str_need.split("---")[1];
    d_index = str_need.split("---")[2];

    d3.select(thisElement)
        .transition()
        .style("font-size","10px");

    var flag = true;

    for(a_i = 0; a_i < annotation_names.length; a_i++){
      anno_name = annotation_names[a_i];
      color_temp = d3.select("#annocircle---" + anno_name.replace(/[^0-9^A-Za-z-]/g,"") + "---" + a_i).attr("fill");
      if(color_temp.toUpperCase() != "#F1F1F2" && color_temp != "rgb(241, 241, 242)"){
        flag = false;
        break;
      }
    };

    if(flag){
      d3.selectAll(".annotations")
        .transition()
        .style("opacity","0.4");
    }
    else{
      annotation_names.forEach( function(anno_name,a_i) {
        color_temp = d3.select("#annocircle---" + anno_name.replace(/[^0-9^A-Za-z-]/g,"") + "---" + a_i).attr("fill");
  
        if(color_temp.toUpperCase() == "#F1F1F2" || color_temp == "rgb(241, 241, 242)"){
          d3.selectAll(".annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
            .transition()
            .style("opacity","0.1");
        }
        else{
          d3.selectAll(".annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
            .transition()
            .style("opacity","0.65");
        }
      });
    }
  };

  function annoCircleClick(thisElement){
    color_now = d3.select(thisElement).attr("fill");
    str_need = d3.select(thisElement).attr("id");
    d_name = str_need.split("---")[1];
    d_index = str_need.split("---")[2];

    if(color_now.toUpperCase() == "#F1F1F2" || color_now == "rgb(241, 241, 242)"){
      color_text = color_anno(annotationList[d_index]);

      d3.select(thisElement)
        .transition()
        .attr("fill", color_text);
      

      d3.selectAll(".annotation-area-" + d_name)
        .transition()
        .style("opacity","0.65");

      annotation_names.forEach( function(anno_name,a_i) {
        if(anno_name.replace(/[^0-9^A-Za-z-]/g,"") != d_name){ 
          color_temp = d3.select("#annocircle---" + anno_name.replace(/[^0-9^A-Za-z-]/g,"") + "---" + a_i).attr("fill");
          if(color_temp.toUpperCase() == "#F1F1F2" || color_temp == "rgb(241, 241, 242)"){
            d3.selectAll(".annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
              .transition()
              .style("opacity","0.1");
          }
        }
      });
      // d3.selectAll("#annotation-area-text-" + d_name + d_annotation_name)
      //   .transition()
      //   .style("font-size","12px")
      //   .style("opacity","1")
      //   .attr("fill","#000");     
    }
    else{
      d3.select(thisElement)
      .transition()
      .attr("fill", "#F1F1F2");

      var flag = true;

      for(a_i = 0; a_i < annotation_names.length; a_i++){
        anno_name = annotation_names[a_i];
        if(anno_name.replace(/[^0-9^A-Za-z-]/g,"") != d_name){
          color_temp = d3.select("#annocircle---" + anno_name.replace(/[^0-9^A-Za-z-]/g,"") + "---" + a_i).attr("fill");
          if(color_temp.toUpperCase() != "#F1F1F2" && color_temp != "rgb(241, 241, 242)"){
            flag = false;
            break;
          }
        }
      };

      if(flag){
        d3.selectAll(".annotations")
          .transition()
          .style("opacity","0.4");
      }
      else{
        annotation_names.forEach( function(anno_name,a_i) {
          if(anno_name.replace(/[^0-9^A-Za-z-]/g,"") != d_name){
            color_temp = d3.select("#annocircle---" + anno_name.replace(/[^0-9^A-Za-z-]/g,"") + "---" + a_i).attr("fill");
      
            if(color_temp.toUpperCase() == "#F1F1F2" || color_temp == "rgb(241, 241, 242)"){
              d3.selectAll(".annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
                .transition()
                .style("opacity","0.1");
            }
            else{
              d3.selectAll(".annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
                .transition()
                .style("opacity","0.65");
            }
          }
          d3.selectAll(".annotation-area-" + d_name)
            .transition()
            .style("opacity","0.1");
        });
      } 
    }
  };

  // }); // End Data callback function
    
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

  function liveSpeedDrageFun(d){
    dy = legendScale_speed(legendScale_speed.invert(d3.event.y));
    duration_set_pre = (dy-15)*11.5;
    if(duration_set_pre < 10)
      duration_set_pre = 10;
    if(duration_set_pre > 5000)
      duration_set_pre = 5000;
    duration_set = duration_set_pre;
    // handle_height = d3.select("#handle-live-speed").attr("height");
    handle_height = 16;
    slider_height = legendScale_speed.range()[1];
    if(dy > slider_height-handle_height)
      dy = slider_height-handle_height;
    // d3.select("#handle-live-speed").attr("y", dy-15); 
    current_translate = d3.transform(d3.select(".handle-live-speed").attr("transform")).translate;
    dx = current_translate[0]
    d3.select(".handle-live-speed")
      .attr("transform", "translate(" + dx + ","+ (dy-1) + ")," + "scale(0.01)")
  };

  function liveSpeedDragInt(d){
    d3.select(".slider-spped").interrupt();
  };
}













function signal_draw_traditional_pges(fs,units,start_rec_time,data){
  // d3.selectAll("svg > *").remove();
  var channel_num = units.length
  var channel_num_max = 5;
  var margin = {top: 30, right: 350, bottom: 150, left: 130},
    margin2 = { top: 430, right: 10, bottom: 20, left: 40 }, // for x-axis bar brush
    margin3 = {top: margin2.bottom+11, right: 10, bottom: 20, left: -105}, // for y-axis bar brush
    width = 1400 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom,
    height2 = 500 - margin2.top - margin2.bottom,
    heightOffset = height - (550 - margin.top - margin.bottom)-10;

  var length_limit = 15 // means 30sec

  var line_width = 0.6; // line width

  var duration_set = 2000;

  var live_sign = false;

  var live_on = false;

  var live_on_pre = live_on;

  var anno_num_max = 7;

  var move_step = fs;

  var hover_point_show_limit = 30 // means 30sec

  var canvas_y = 450;

  var specificView = false;

  var eachPerRow = 23;

  var yAmplify = 5.01;

  var y_min_value = 10;

  var y_label_min = -3;

  var y_label_max = 3;

  var label_line_width = 2;

  var parseDate1 = d3.timeParse("%H:%M:%S");
  var parseDate = d3.timeParse("%H:%M:%S").parse;
  var bisectDate = d3.bisector(function(d) { return d.index; }).left;

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

  var legendScale_speed = d3.scaleLinear()
      .range([14, 110])
      .clamp(true);

  // 40 Custom DDV colors 

  // var color_set = d3.schemeCategory20b;

  // var color = d3.scaleOrdinal().range(color_set);
  // var color = d3.scaleLinear().domain([1, 20])
  //       .range(['#19B5FE', '#003171'])
  //       .interpolate(d3.interpolateHcl);

  var color = d3.scaleOrdinal().range(["#000000","#736AFF","#0000A0","#ff0000","#34495e","#9b59b6","#f1c40f","#e67e22","#c0392b","#bdc3c7","#7f8c8d"]);
  // var color = d3.scaleOrdinal().range(["#000000"]);

  var color_anno = d3.scaleOrdinal().range(["#0000ff","#ff0000","#3498db","#34495e","#9b59b6","#f1c40f","#e67e22","#c0392b","#bdc3c7","#7f8c8d"]);

  // var color = d3.scaleOrdinal().range(["#FF0000","#00FF00","#0000FF","#6F532A","#FF00FF","#000000","#00FFFF","#1abc9c","#2ecc71","#3498db","#34495e","#9b59b6","#f1c40f","#e67e22","#c0392b","#bdc3c7","#7f8c8d"]);  

  var EEGchannel = ["fp1","fp2","f3","f4","c3","c4","p3","p4","o1","o2","f7","f8","t7","t8","p7","p8","ft9","ft10","fz","cz","pz","sp1","sp2","a1","a2"];
  var EKGchannel = ["EKG1","EKG2","EKG3","EKG4"];

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

  var liveSpeedDrage = d3.drag()
        .on("start.interrupt", liveSpeedDragInt)
        .on("drag", liveSpeedDrageFun);

  var annotationArea = d3.svg.area() 
        .interpolate("monotone")
        .x(function(d) {return xScale(d.index);})
        .y0(height) 
        .y1(0)
        .defined(function(d) { return parseInt(d.annovalues);});

  var maxY;
  var minY;  // Defined later to update yAxis

  maxY = 0.1;
  minY = 0.1;


  var svg = d3.select("#signal_show").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom) //height + margin.top + margin.bottom
      .attr("id","signal_svg")
      .style("position","absolute")
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      

  d3.select("#signal_show").append("canvas")
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

  // d3.csv(input_file_path, function(error, data) { 

  color.domain(d3.keys(data[0]).filter(function(key) { 
    return key !== "index" && !key.includes("Annotation"); 
  }));

  var annotationList = d3.keys(data[0]).filter(function(key) { 
    return key.includes("AllChannels"); 
  });

  signalGroups = [];
  var categories = color.domain().map(function(name,i) { // Nest the data into an array of objects with new keys
    //////// set group of each channel/////////////////////////////////
    group = "";
    labels = false;
    visible = true;
    if(EEGchannel.includes(name.split("—")[0].trim()) || EEGchannel.includes(name.split("-")[0].trim()))
      group = "EEG";
    else if(EKGchannel.includes(name.split("—")[0].trim()) || EKGchannel.includes(name.split("-")[0].trim()))
      group = "EKG"; 
    else
      group = name;
    if (name.includes("detected") || name.includes("label")){
      labels = true;
    }
    if(!signalGroups.includes(group))
      signalGroups.push(group);
    /////////////////////////////////////////
    return {
      name: name, // "name": the csv headers except date
      values: data.map(function(d) { // "values": which has an array of the dates and ratings
        // if(d[name] == "")
        //   d[name] = NaN;
        return {
          index: d.index, 
          rating: +(d[name]),
          };
      }),
      group: group,
      labels:labels,
      sigColor: null,
      unit: units[i],
      visible: visible,
      specific: false // "visible": all false except for economy which is true.
    };
  });

  var annotations = [];
  ii = 0;
  var annotation_names = [];
  annotationList.forEach(function (c){
    if (c.includes("AllChannels") ){
      array = [];
      annotation_each = data.map(function (d,i){
        return {index: d.index,annovalues: d[c]};
      });
      annotations[ii] = annotation_each;
      annotation_names[ii] = c.split("_")[1];
      ii = ii+1;
    }
  });


  var anno_start_index_all_categories = [];
  var anno_draw_all_categories = [];
  var anno_dy_rec_all_categories = [];

  annotations.forEach(function (anno,i){ 
    c_index = i;
    anno_start_index = [];
    anno_draw = [];
    anno_dy_rec = [];
    if(anno[0].annovalues == "1"){
      anno_start_index.push(anno[0].index);
      j_ind = 0
      anno_draw_temp = [];
      while(j_ind < anno.length && anno[j_ind].annovalues == "1"){
        anno_draw_temp.push(anno[j_ind]);
        j_ind = j_ind + 1; 
      }
      anno_draw.push(anno_draw_temp);
    }

    for( ind = 1; ind < anno.length; ind++){
      if((parseInt(anno[ind].annovalues) - parseInt(anno[ind-1].annovalues)) > 0){
        anno_start_index.push(anno[ind].index);
        j_ind = ind;
        anno_draw_temp = [];
        while(j_ind < anno.length && anno[j_ind].annovalues == "1"){
          anno_draw_temp.push(anno[j_ind]);
          j_ind = j_ind + 1; 
        }
        anno_draw.push(anno_draw_temp);  
      }
    }

    anno_start_index_all_categories.push(anno_start_index);
    anno_draw_all_categories.push(anno_draw);
    anno_dy_rec_all_categories.push(anno_dy_rec);
  });


  color.domain(signalGroups);

  color_anno.domain(annotationList);

  xScale.domain(d3.extent(data, function(d) { return d.index; }));// extent = highest and lowest points, domain is data, range is bouding box
  // console.log(xScale.domain());
  var y_min = d3.min(categories, function(c) { return d3.min(c.values, function(v) { return v.rating; })});
  var y_max = d3.max(categories, function(c) { return d3.max(c.values, function(v) { return v.rating; });});

  // y_min = -y_min_value;
  // y_max = y_min_value;

  if(y_min == 0 && y_max == 0){
    y_min = -y_min_value;
    y_max = y_min_value;
  }
  // yScale.domain([y_min-Math.abs(y_min)*yAmplify, y_max+Math.abs(y_max)*yAmplify]);
  // yScale.domain([-2,2]);
  y_selcect = d3.max([Math.abs(y_min),Math.abs(y_max)]);
  yScale.domain([y_selcect*-1*yAmplify,y_selcect*yAmplify]);
  var maxScale = yScale.domain()[1] - yScale.domain()[0];
  xScale2.domain(xScale.domain());
  yScale2.domain(xScale.domain()); // for area
  yScale3.domain(yScale.domain()); 
  yScale_rec.domain(yScale3.domain());
  yPreview.domain([0-Math.abs(1)*0.1, 1+Math.abs(1)*0.1]);// for yaxis-2
   // Setting a duplicate xdomain for brushing reference later
 //for slider part---------------------------------------------------------------------------------

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
    .extent([[0, 0], [width, height2+20]])//for slider bar at the bottom
    .on("end", function(){
      live_on_pre = live_on;
      live_on_switch(false);
      live_on = live_on_pre;
      Xbrushed(live_on);
    })
    .handleSize([0.3]) ;

  y_min = d3.min(categories, function(c) { return d3.min(c.values, function(v) { return v.rating; })});
  y_max = d3.max(categories, function(c) { return d3.max(c.values, function(v) { return v.rating; });});

  // y_min = -y_min_value;
  // y_max = y_min_value;

  if(y_min == 0 && y_max == 0){
    y_min = -y_min_value;
    y_max = y_min_value;
  }

  ctx.translate(margin.left,canvas_y+heightOffset+5);

  annotations.forEach(function(d,i){
    var c_index = i;
    index_rec = anno_start_index_all_categories[c_index];
    anno_draw = anno_draw_all_categories[c_index];
    anno_name = annotation_names[c_index];

    color_anno_index = annotationList[c_index];
    index_rec.forEach(function(irec,anno_draw_i){
      plot_anno = anno_draw[anno_draw_i];
      plot_anno = [plot_anno[0],plot_anno[plot_anno.length-1]];
      x1 = xScale2(plot_anno[0].index);
      x2 = xScale2(plot_anno[1].index);
      ctx.beginPath();
      ctx.rect(x1,-5,x2-x1,height2);
      ctx.fillStyle = color_anno(color_anno_index);
      ctx.fill();
      ctx.lineWidth = 0.001;
      ctx.stroke();
    });
  });

  categories.forEach(function(d){
    if(d.labels){
      ctx.beginPath();
      line_canvas(d.values);
      ctx.lineWidth = 1;
      ctx.strokeStyle = d.sigColor;
      ctx.stroke();
    }
  });


  var interval = height/(categories.length-2+4);
  // yScale.range([height,0]);

  context.append("g") // Create brushing xAxis
    .attr("class", "x axis1")
    .attr("transform", "translate(0," + (height2 + heightOffset + 20) + ")")
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

  var live_ctrl_btn = context.append("g")
        .attr("class","live_ctrl_btn")
        .attr("transform", "translate(" + (margin3.left+15) + "," + (margin3.top-54 + heightOffset) + ")")
        .style("cursor", "pointer")
        .on("click", function(){

          if(!live_sign){
            live_sign = true;
            live_on = false;
          }

          if(live_on){
            live_on_switch(false);
          }
          else{
            d3.selectAll(".y-brush")
              .call(ybrush.move,null);
            live_on_switch(true);
          }
        });

  var slider = live_ctrl_btn.append("g")
      .attr("class", "slider-spped")
      .attr("transform", "translate(9,2)");

  slider.append("line")
    .attr("class", "track")
    .attr("y1", legendScale_speed.range()[0])
    .attr("y2", legendScale_speed.range()[1])
    .style('stroke-width', "6px")
    .select(function() { 
      return this.parentNode.appendChild(this.cloneNode(true)); 
    })
    .attr("class", "track-inset")
    .select(function() { 
      return this.parentNode.appendChild(this.cloneNode(true)); 
    })
    .attr("class", "track-overlay")
    .call(liveSpeedDrage);

  // var handle = slider.insert("rect", ".track-overlay")
  //     .attr("class", "handle")
  //     .attr("id","handle-live-speed")
  //     .attr("width", 3)
  //     .attr("height", 20) 
  //     .attr("ry", 3)
  //     .attr("transform", "translate(" + -1.6 + ","+ 15 + ")")
  //     .attr("y", (parseFloat(duration_set)/11.5)-15);

  var handle = slider.insert("path", ".track-overlay")
      .attr("class", "handle-live-speed")
      .attr("id","play_btn_path")
      .attr("transform", "translate(" + (-8.9) + ","+ (parseFloat(duration_set)/20-15) + ")," + "scale(0.01)")
      .attr("d","M1312 896q0 37-32 55l-544 320q-15 9-32 9-16 0-32-8-32-19-32-56v-640q0-37 32-56 33-18 64 1l544 320q32 18 32 55zm128 0q0-148-73-273t-198-198-273-73-273 73-198 198-73 273 73 273 198 198 273 73 273-73 198-198 73-273zm224 0q0 209-103 385.5t-279.5 279.5-385.5 103-385.5-103-279.5-279.5-103-385.5 103-385.5 279.5-279.5 385.5-103 385.5 103 279.5 279.5 103 385.5z")
      .style("fill","#000");

  live_ctrl_btn.append("g")
    .attr("class","live_ctrl_fontawesome")
    .attr("transform", "translate(3.6,2)")
    .append("path")
      .attr("transform", "scale(0.006)")
      .attr("d","M1600 736v192q0 40-28 68t-68 28h-416v416q0 40-28 68t-68 28h-192q-40 0-68-28t-28-68v-416h-416q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h416v-416q0-40 28-68t68-28h192q40 0 68 28t28 68v416h416q40 0 68 28t28 68z");

  live_ctrl_btn.append("g")
    .attr("class","live_ctrl_fontawesome")
    .attr("transform", "translate(3.6,113)")
    .append("path")
      .attr("transform", "scale(0.006)")
      .attr("d","M1600 736v192q0 40-28 68t-68 28h-1216q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h1216q40 0 68 28t28 68z");
  

  // //append the brush for the selection of subsection  
  var x_brush = context.append("g")
      .attr("class", "x brush x-brush")
      .call(xbrush)
      .selectAll("rect")
      .attr("height", height2 + 20) // Make brush rects same height 
      .attr("fill", "#1abc9c")
      .attr("transform","translate(0," + heightOffset + ")");

  var ybrush = d3.brushY()//for slider bar at the bottom
      .extent([[0, 0], [height2/2, height]])
      .on("brush end", function(d){
        live_on_switch(false);
        return Ybrushed(d)
      })
      .handleSize([0.3]);

  ///////// y axis1 and y brush ///////////////////////////////

  context.append("g") // Create brushing yAxis
    .attr("class", "y axis1")
    .attr("id","y-axis1")
    .attr("transform", "translate(" + (margin3.left+25) + "," + -(height-heightOffset+margin3.top) + ")")
    .call(yAxis2);

  context.append("g")
    .attr("class", "y brush")
    .attr("id", "y-brush")
    .attr("transform", "translate(" + (margin3.left+25) + ","+ -(height-heightOffset+margin3.top) + ")")
    .call(ybrush)
    .selectAll("rect")
    .attr("width", height2/2) // Make brush rects same height 
      .attr("fill", "#1abc9c"); 

  ////////end slider part-----------------------------------------------------------------------------------

  //////////// annotation g element ///////////////////////////////////////////////
  svg.append("g")
    .attr("class","g-anno");

  //////////// draw the xRuler ///////////////////////////////////////////////
  rulerHeight = yScale.range()[0]-100;

  //// y axis ruler
  var rulerY = d3.scaleLinear()
    .range([0, rulerHeight]);

  var rulerX = d3.scaleLinear()
      .range([0, 25]);

  var rulerDrag = d3.drag()
    .on("drag", rulerDragged);
  
  ruler = svg.append("g")
        .attr("clip-path", "url(#clip)")
      .append("g")
        .attr("id","ruler")
        .attr("transform", "translate(" + 0 + "," + 0 + ")")
        .style("display","none")
        .call(rulerDrag)
        .on("dblclick",function(){
          d3.select("#ruler").style("display","none");
        });

  ruler.append("rect")
      .attr("class", "ruler-background")
      .attr('y', 0)
      .attr("width", 45)
      .attr("height", rulerHeight)
      .attr("opacity","0.6");

  var fakeAxisGroup = ruler.append("g");
  var realAxisGroup = ruler.append("g");
  
  ///// x axis ruler
  var xRulerX = d3.scaleLinear()
    .range([0, rulerHeight]);

  var xRulerY = d3.scaleLinear()
      .range([0, 25]);

  ruler.append("rect")
      .attr("class", "ruler-background")
      .attr('y', -45)
      .attr("width", rulerHeight)
      .attr("height", 45)
      .attr("opacity","0.6");

  var xRulerfakeAxisGroup = ruler.append("g");
  var xRulerrealAxisGroup = ruler.append("g");

  ////////////////////////////////////////////////////////////////////////////

  // draw line graph
  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (height+5) + ")")
    .call(xAxis.tickValues(xAxisValue(fs,xScale.domain())));

  ////// plot y axis //////////////////////////////////
  svg.append("g")
      .attr("class", "y axis")
      .attr("id","y-axis")
      .attr("transform","translate(0,0)")
      .style("display","none")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("x", -10)
      .attr("dy", ".71em")
      .style("text-anchor", "end");
  ////////////////////////////////////////////////////////////////////

  var issue = svg.append("g").attr("class","issue-all")
        .selectAll(".issue")
          .data(categories) // Select nested data and append to new svg group elements
        .enter().append("g")
          .attr("class", "issue")
      // .attr("transform",function(d,i){
      //     return "translate(0," + i*interval + ")";}
      //   )
      .attr("id",function(d){return "issue-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");}); 
  var f = d3.format("07f");

  domain_rec_1 = yScale.domain()

  issue.append("g")
      .attr("class","g_line")
      .attr("clip-path", "url(#clip)")//use clip path to make irrelevant part invisible
    .append("path")
      .attr("class","line")
      .attr("transform",function(d,i){
        if(d.labels)
          return "translate(0," + ((channel_num+1-categories.length/2)*interval-3) + ")";
        else
          return "translate(0," + ((i+1-categories.length/2)*interval) + ")";
      })
      .style("pointer-events", "none") // Stop line interferring with cursor
      .attr("id", function(d) {
        return "line-" + d.name.replace(/[^0-9^A-Za-z-]/g,""); // Give line id of line-(insert issue name, with any spaces replaced with no spaces)
      })
      .style("opacity", function(d) {
        if(d.name.includes("expert")) 
          return 0.7; 
        else 
          return 1;
      })
      .attr("d", function(d) { 
        x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
        if(d.labels){
          yScale.domain([y_label_min,y_label_max]);
        }else{
          yScale.domain(domain_rec_1);
        } 
        if(x_len > length_limit){
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
          d3.selectAll(".g-anno").selectAll("*").remove();
          annotationDraw(); 
          return d.visible ? line(d.values) : null; 
        }
      })
      .style("stroke", function(d) { return d.sigColor; })
      .style("stroke-width", function(d) {if(d.labels) return label_line_width; else return line_width;});
      

  yScale.domain(domain_rec_1);

  // context.select("#y-brush").call(ybrush.move, [yScale3(700),yScale3(-700)]);
  y_display = yScale3.domain()
  if(Math.abs(y_display[0]) < 100)
    context.select("#y-brush").call(ybrush.move, null);
  else
     context.select("#y-brush").call(ybrush.move, [yScale3(300),yScale3(-300)]);

  //////// draw channel legend ////////////////////////////////////////////////////
  var legendAll = svg.append("g").attr("class","legend-all");
  var legend = legendAll.selectAll(".legend")
          .data(categories) // Select nested data and append to new svg group elements
          .enter().append("g")
            .attr("class", "legend")
            .attr("id",function(d){return "legend-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");});

  var legendSpace = 25;

  domain_rec_2 = yScale.domain()
  legend.append("rect")
    .attr("width", 10)
    .attr("height", 10)
    .attr("id",function(d){return "controlrect-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");})                                    
    .attr("x", function (d,i){
        return 48 + width + (margin.right/5+30)*Math.floor(i/eachPerRow)}
      ) 
    .attr("y", function (d, i) { 
        return (i%eachPerRow)*(legendSpace)+2; 
      })
    .attr("fill",function(d) {
      return d.visible ? d.sigColor : "#F1F1F2"; // If array key "visible" = true then color rect, if not then make it grey 
    })
    .attr("class", "legend-box")
    // .on("click", function(d,i_d){ // On click make d.visible 
    //   d.visible = !d.visible; // If array key for this data selection is "visible" = true then make it false, if false then make it true
    //   issue.select("rect")
    //     .transition()
    //     .attr("fill", function(d) {
    //       return d.visible ? d.sigColor : "#F1F1F2";
    //     });
    //   issue.select("#line-"+d.name.replace(/[^0-9^A-Za-z-]/g,""))
    //     .transition()
    //     .attr("transform","translate(0," + ((i_d-categories.length/2)*interval) + ")")
    //     .attr("d", function(){
    //       if(d.visible){
    //         if(d.labels){
    //           yScale.domain([y_label_min,y_label_max]);
    //         }else{
    //           yScale.domain(domain_rec_2);
    //         }
    //         x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
    //         if(x_len > length_limit){
    //           s_id = Math.ceil(xScale.domain()[0]);
    //           e_id = s_id + length_limit*fs;
    //           xScale.domain([s_id,e_id]);
    //           context.select(".x-brush").call(xbrush.move, [xScale2(s_id),xScale2(e_id)]);
    //           // xbrush.extent([s_id,e_id]);
    //           svg.selectAll(".x.axis")
    //             .transition()
    //             .call(xAxis.tickValues(xAxisValue(fs,xScale.domain())));
    //           ratio = parseFloat(data.length)/parseFloat(d.values.length);
    //           i_s = Math.ceil(parseFloat(xScale.domain()[0]-d.values[0].index)/parseFloat(ratio));
    //           i_e = i_s+parseFloat(length_limit)*parseFloat(fs)/parseFloat(ratio);
    //           plot_data = [];
    //           for(i=i_s; i<=i_e; i++){
    //             if(d.values[i] != undefined)
    //               plot_data.push(d.values[i]);
    //           }
    //           return line(plot_data);
    //         }else
    //           return line(d.values); 
    //       }
    //       else{
    //         return null;
    //       }
    //     });
    //   if(!d.visible){
    //     specificViewCancel(d,i);
    //   }
    //   yScale.domain(domain_rec_2);
    // })
    // .on("mouseover", function(d,i){
    //   if(specificView)
    //     return ;

    //   d3.select(this)
    //     .transition()
    //     .attr("fill", function(d) { return d.sigColor; });

    //   resetRendering();

    //   if (d.visible){
    //     specificViewDraw(d,i);
    //     specificView = false;
    //   } 
    // })
    // .on("mouseout", function(d,i){
    //   if(specificView)
    //     return

    //   d3.select(this)
    //     .transition()
    //     .attr("fill", function(d) {
    //     return d.visible ? d.sigColor : "#F1F1F2";});

    //   specificViewCancel(d,i);
    // });

      
  legend.append("text")
    .attr("class","legend-text")
    .attr("x", function (d,i){
        return 60 + width + (margin.right/5+30)*Math.floor(i/eachPerRow)}
      ) 
    .attr("y", function (d, i) { 
        return (10)+(i%eachPerRow)*(legendSpace)+2; 
      })
    .attr("id",function(d){return "controltext-"+d.name.replace(/[^0-9^A-Za-z-]/g,"");})
    .attr("flag","false")
    // .text(function(d) { return (d.name.split("-")[0])+" (" + d.unit + ")"; })
    .text(function(d) { 
      if(d.labels)
        return d.name
      else
        return (d.name)+" (" + d.unit + ")"; 
    })
    .style("font-size","12px")
    .style("fill",function(d){return d.sigColor})
    // .style("cursor", "pointer")
    // // .on("dblclick", function (d,i){
    // //   if (d.visible){
    // //     resetRendering();
    // //     specificViewDraw(d,i);
    // //     d3.select(this).attr("flag","true");  
    // //   }
    // //   current_color = d3.select(this).style("fill");
    // //   current_color = rgb2hex(current_color);
    // // })
    // // .on("click",function(d,i){
    // //   if (d.visible){

    // //     flag = d3.select(this).attr("flag");

    // //     resetRendering();
        
    // //     d3.select(this).attr("flag",flag);
        
    // //     if(flag == "false"){
    // //       specificViewDraw(d,i);
    // //       d3.select(this).attr("flag","true");  
    // //     }
    // //     else{
    // //       specificViewCancel(d,i);
    // //       d3.select(this).attr("flag","false");
    // //     }
    // //   }
    // // })
    // // .on("mouseover", function(d,i){
    // //   d3.select(this).style("font-size","14px");
    // // })
    // // .on("mouseout",function(d,i){
    // //   d3.select(this).style("font-size","12px");
    // // });

  // legend.append("text")
  //   .attr("class","legend-text")
  //   .attr('font-family', 'FontAwesome')
  //   .attr('font-size',"13px")
  //   .attr("x", function (d,i){
  //       return 65 + (d.name.length+4)*7 + width + (margin.right/5+30)*Math.floor(i/eachPerRow)}
  //     ) 
  //   .attr("y", function (d, i) { 
  //       return (10)+(i%eachPerRow)*(legendSpace)+2; 
  //     })
  //   .text("\uf0a9")
  //   .style("cursor","pointer")
  //   .on("click",function(d,i){
  //     selectSpectrogram(d.name);
  //   });

  
  label_legend = d3.select(".issue-all").append("g").attr("class","label_legend");

  label_legend.append("g")
      .attr("id",function(d){return "legend-label";})
      .attr("transform",function(){
        // lineHeight = d3.select("#line-expert-label")).node().getBoundingClientRect().height;
        return "translate(-20," + (height-83) + ")";
      })
    .append("text")
      .text("1.0")
      .style("font-size","12px")
      .style("font-weight","bold");

  label_legend.append("g")
      .attr("id",function(d){return "legend-label";})
      .attr("transform",function(){
        // lineHeight = d3.select("#line-expert-label")).node().getBoundingClientRect().height;
        return "translate(-20," + (height+3) + ")";
      })
    .append("text")
      .text("0.0")
      .style("font-size","12px")
      .style("font-weight","bold");;

  // label_legend.append("text")
  //     .attr("class","legend-text")
  //     .attr("transform","translate(0,0)")
  //     .attr("flag","false")
  //     .text("0")
  //     .style("font-size","12px")

  signalSubGroups = ["All"]

  // legendGroup = legendAll.selectAll(".legend-all")
  //     .data(signalSubGroups)
  //     .enter().append("g")
  //       .attr("class", "legend-group")
  //       .attr("id",function(d){return "legend-group-"+d.replace(/[^0-9^A-Za-z-]/g,"");});

  // // legendGroup.append("rect")
  // //   .attr("width", 10)
  // //   .attr("height", 10)
  // //   .attr("id",function(d){return "controlrect-"+d.replace(/[^0-9^A-Za-z-]/g,"");})
  // //   .attr("x", function (d,i){
  // //       return 48 + width + (margin.right/5+10)*Math.floor(i/1)}
  // //     ) 
  // //   .attr("y", function (d, i) { 
  // //       return -20; 
  // //     })
  // //   .attr("fill",function(d) {
  // //     return color(d); // If array key "visible" = true then color rect, if not then make it grey 
  // //   })
  // //   .attr("class", "legend-box")
  // //   .on("click", function(g){ // On click make d.visible 
  // //     for(i_d = 0; i_d < categories.length; i_d++){
  // //       d = categories[i_d];
  // //       if(d.specific){
  // //         specificViewCancel(d,i_d);
  // //       }
  // //     }

  // //     resetRendering();

  // //     ctx.clearRect(0,0,canvas.width,canvas.height);
  // //     color_temp = d3.select("#controlrect-"+g.replace(/[^0-9^A-Za-z-]/g,"")).attr("fill");

  // //     for(i_d = 0; i_d < categories.length; i_d++){
  // //       d = categories[i_d];

  // //       if(g != "All" && d.group != g)
  // //         continue;

  // //       if(g == "All"){
  // //         if(color_temp.toUpperCase() != "#F1F1F2" && color_temp != "rgb(241, 241, 242)")
  // //           d.visible = false;
  // //         else
  // //           d.visible = true;
  // //       }
  // //       else
  // //         d.visible = !d.visible; // If array key for this data selection is "visible" = true then make it false, if false then make it true
  // //     }

  // //     for(i_d = 0; i_d < categories.length; i_d++){
  // //       d = categories[i_d];

  // //       // y_min = d3.min(categories, function(c) { 
  // //       //   if(c.visible) 
  // //       //     return d3.min(c.values, function(v) { return v.rating; }); 
  // //       //   else 
  // //       //     return Number.MAX_VALUE;
  // //       // });
  // //       // y_max = d3.max(categories, function(c) { 
  // //       //   if(c.visible) 
  // //       //     return d3.max(c.values, function(v) { return v.rating; });
  // //       //   else
  // //       //     return  Number.MIN_VALUE;
  // //       // });

  // //       // y_min = -y_min_value;
  // //       // y_max = y_min_value;

  // //       if(y_min == 0 && y_max == 0){
  // //         y_min = -y_min_value;
  // //         y_max = y_min_value;
  // //       }

  // //       // yPreview.domain([y_min-Math.abs(y_min)*0.1, y_max+Math.abs(y_max)*0.1]);
      
  // //       // if(d.visible){
  // //       //   ctx.beginPath();
  // //       //   line_canvas(d.values);
  // //       //   ctx.lineWidth = 1;
  // //       //   ctx.strokeStyle = d.sigColor;
  // //       //   ctx.stroke();
  // //       // }      

  // //       issue.select("#line-"+d.name.replace(/[^0-9^A-Za-z-]/g,""))
  // //         .transition()
  // //         .attr("transform","translate(0," + ((i_d-categories.length/2)*interval) + ")")
  // //         .attr("d", function(){
  // //           if(d.visible){
  // //             domain_rec = yScale.domain()
  // //             if(d.labels){
  // //               yScale.domain([y_label_min,y_label_max]);
  // //             }else{
  // //               yScale.domain(domain_rec);
  // //             }
  // //             x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
  // //             if(x_len > length_limit){
  // //               s_id = Math.ceil(xScale.domain()[0]);
  // //               e_id = s_id + length_limit*fs;
  // //               xScale.domain([s_id,e_id]);
  // //               context.select(".x-brush").call(xbrush.move, [xScale2(s_id),xScale2(e_id)]);
  // //               // xbrush.extent([s_id,e_id]);
  // //               svg.selectAll(".x.axis")
  // //                 .transition()
  // //                 .call(xAxis.tickValues(xAxisValue(fs,xScale.domain())));
  // //               ratio = parseFloat(data.length)/parseFloat(d.values.length);
  // //               i_s = Math.ceil(parseFloat(xScale.domain()[0]-d.values[0].index)/parseFloat(ratio));
  // //               i_e = i_s+parseFloat(length_limit)*parseFloat(fs)/parseFloat(ratio);
  // //               plot_data = [];
  // //               for(i=i_s; i<=i_e; i++){
  // //                 if(d.values[i] != undefined)
  // //                   plot_data.push(d.values[i]);
  // //               }
  // //               return line(plot_data);
  // //             }else
  // //               return line(d.values); 
  // //           }
  // //           else{
  // //             return null;
  // //           }
  // //         });
        
  // //       legend.select("#controlrect-" + d.name.replace(/[^0-9^A-Za-z-]/g,""))
  // //         .attr("fill", function(){
  // //           return d.visible ? d.sigColor : "#F1F1F2";
  // //         });
  // //     };

  // //     if(true){
  // //       signalSubGroups.forEach(function(gg){
  // //         d3.select("#controlrect-" + gg.replace(/[^0-9^A-Za-z-]/g,""))
  // //           .transition()
  // //           .attr("fill", function() {
  // //             visible = false;
  // //             for(i_d = 0; i_d < categories.length; i_d++){
  // //               d = categories[i_d];
  // //               if(gg != "All" && d.group != gg)
  // //                 continue;

  // //               if(d.visible){
  // //                 visible = true;
  // //                 break;
  // //               }
  // //             }  
  // //             return visible ? color(gg) : "#F1F1F2";
  // //           });
  // //       });
  // //     }
  // //   });

  // // legendGroup.append("text")
  // //   .attr("class","legend-group-text")
  // //   .attr("x", function (d,i){
  // //       return 60 + width + (margin.right/5+10)*Math.floor(i/1)}
  // //     ) 
  // //   .attr("y", function (d, i) { 
  // //       return -10; 
  // //     })
  // //   .attr("id",function(d){return "controltext-"+d;})
  // //   .attr("flag","false")
  // //   .text(function(d){return d;})
  // //   .style("font-size","12px")
  // //   .style("fill",function(d){return d.sigColor});
    // .style("cursor", "pointer")
  /////////////////////////////////////////////////////////////////////////////

  //////////////////// annotation legend //////////////////////////////////////
  anno_circle_x_position = [0];
  annoLegend = context.append("g")
    .attr("class","anno-legend")
    .attr("transform","translate(0," + (-(height-heightOffset+margin3.top+10)) + ")");

  if (annotations.length > 0 && annotations.length <= anno_num_max){
    annotations.forEach( function(anno,a_i) {
      anno_name = annotation_names[a_i];
      color_anno_index = annotationList[a_i];

      anno_circle_x_position[a_i+1] = anno_name.length*7.8 + anno_circle_x_position[a_i] + 18;
      annoLegend.append("circle")
        .attr("r", 5)
        .attr("class","anno-circle")
        .attr("id", "annocircle---"+ anno_name.replace(/[^0-9^A-Za-z-]/g,"")+"---"+a_i)
        .attr("cx",anno_circle_x_position[a_i]+3)
        .attr("cy",-10)
        .attr("fill","#F1F1F2")// If array key "visible" = true then color rect, if not then make it grey 
        .style("cursor","pointer")
        .on("mouseover", function(){
          annoCircleMouseOver(this);
        })
        .on("mouseout", function(){
          annoCircleMouseOut(this);
        })
        .on("click", function(){
          annoCircleClick(this);
        });

      annoLegend.append("text")
        .attr("id", "annolegendtext---"+ anno_name.replace(/[^0-9^A-Za-z-]/g,"")+"---"+a_i)
        .attr("x",anno_circle_x_position[a_i]+13)
        .attr("y",-5)
        .style("fill",color_anno(color_anno_index))
        .text(anno_name)
        .style("font-size","12px")
        .style("cursor", "pointer")
        .on("click", function (){
          name = d3.select(this).text();
        })
        .on("mouseover", function(d,i){
          d3.select(this).style("font-size","14px");
        })
        .on("mouseout",function(d,i){
          d3.select(this).style("font-size","12px");
        }); // end of issue_need.append("text")
    }); // end of d.annotation.forEach
  }// end of if (d.annotation.length > 0)
  else if(annotations.length > anno_num_max){
    var div = d3.select("body").append("div")
        .attr("class", "anno-tooltip")
        .style("opacity", 0);

    annotations.forEach( function(anno,a_i) {
      anno_name = annotation_names[a_i];
      color_anno_index = annotationList[a_i];

      anno_circle_x_position[a_i+1] = anno_circle_x_position[a_i] + 15;

      annoLegend.append("circle")
        .attr("r", 5)
        .attr("class","anno-circle")
        .attr("id", "annocircle---"+ anno_name.replace(/[^0-9^A-Za-z-]/g,"")+"---"+a_i)
        .attr("cx",anno_circle_x_position[a_i]+3)
        .attr("cy",-10)
        .attr("fill","#F1F1F2")// If array key "visible" = true then color rect, if not then make it grey 
        .style("cursor","pointer")
        .on("click", function(){
          annoCircleClick(this);
        })
        .on("mouseover",function(){
          annoCircleMouseOver(this);
          div.transition()    
            .duration(200)
            .style("opacity", 0.9);
          div.html(annotation_names[d_index])
            .style("left", (d3.event.pageX+9) + "px")
            .style("top", (d3.event.pageY+6) + "px");  
        })
        .on("mouseout", function(d) {  
          annoCircleMouseOut(this);
          div.transition()
            .duration(500)
            .style("opacity", 0);
        });
    });
  }

  d3.select("#mouse-tracker") // select chart plot background rect #mouse-tracker
    .on("click", mouseTrackerClick); // on mousemove activate mousemove function defined below
    // .on("mouseout", mouseTrackerMouseout);

  //////////// set ruler scale /////////////////////////////////////////
  yRulerScale = Math.abs(yScale.domain()[0]-yScale.domain()[1])*(rulerY.range()[1]/yScale.range()[0]);
  yRulerSliderChange(yRulerScale);
  xRulerScale = (Math.abs(xScale.domain()[1]-xScale.domain()[0])/(fs))*(xRulerX.range()[1]/xScale.range()[1]);
  xRulerSliderChange(xRulerScale);
  ///////////////////////////////////////////////////////////////////////////

  $("#set-chan-color").click(function(){
    color_no = $("#chan-color").val();
    name = $("#chan-name").text()
    find_c_index = parseInt($("#chan-id").text());
    d = categories[find_c_index];
    d3.select("#label-"+name.replace(/[^0-9^A-Za-z-]/g,"")).style("fill",color_no);
    d3.select("#unitlabel-"+name.replace(/[^0-9^A-Za-z-]/g,"")).style("fill",color_no);
    d3.select("#controltext-"+name.replace(/[^0-9^A-Za-z-]/g,"")).style("fill",color_no);
    if(d.visible)
      d3.select("#controlrect-"+name.replace(/[^0-9^A-Za-z-]/g,"")).attr("fill",color_no);
    d3.select("#line-"+name.replace(/[^0-9^A-Za-z-]/g,"")).style("stroke",color_no);
    d3.select("#previewlabel-"+name.replace(/[^0-9^A-Za-z-]/g,"")).style("stroke",color_no);
    d3.select("#previewcircle-"+name.replace(/[^0-9^A-Za-z-]/g,"")).attr("fill",color_no);
    
    d.sigColor = color_no;
    drawCanvas(d);
  });

  ////// for ruler ////////////////////////////////////////////////////////
  function rulerDragged(d) {
    dd = [];
    dd[0] = d3.event.x, dd[1] = d3.event.y;
    d3.select(this).attr("transform", "translate(" + dd + ")");
  };

  function yRulerSliderChange(v) {
    // d3.select('label').text(v);
    rulerY.domain([0, v]);
    yRulerRedraw();
  };

  function yRulerRedraw() {
    fakeAxisGroup
      .attr("class", "ruler")
      .attr("transform", "translate(0," + rulerHeight + ")")
      .call(d3.axisRight().scale(rulerY).ticks(20))
      .selectAll(".tick")
      .select('line')
      .attr('y1', function (d, i) {
        if ((i + 1) % 4)
          return -25;
        else
          return 0;
      })
      .attr('y2', function (d, i) {
        if ((i + 1) % 2)
          return -18;
        if ((i + 1) % 4)
          return 10;
        else
          return 0;
      })
      .style("display","none");

    realAxisGroup
      .attr("class", "ruler-axis")
      .attr("transform", "translate(0,0)")
      .call(d3.axisRight().scale(rulerY).ticks(10).tickSize(15));
  };

  function xRulerSliderChange(v) {
    // d3.select('label').text(v);
    xRulerX.domain([0, v]);
    xRulerRedraw();
  };

  function xRulerRedraw() {
    xRulerfakeAxisGroup
      .attr("class", "ruler")
      .attr("transform", "translate(0," + rulerHeight + ")")
      .call(d3.axisTop().scale(xRulerX).ticks(8))
      .selectAll(".tick")
      .select('line')
      .attr('y1', function (d, i) {
        if ((i + 1) % 4)
          return -25;
        else
          return 0;
      })
      .attr('y2', function (d, i) {
        if ((i + 1) % 2)
          return -18;
        if ((i + 1) % 4)
          return 10;
        else
          return 0;
      })
      .style("display","none");

    xRulerrealAxisGroup
      .attr("class", "ruler-axis")
      .attr("transform", "translate(0,0)")
      .call(d3.axisTop().scale(xRulerX).ticks(8).tickSize(15));
  };
  ////////////////////////////////////////////////////////

  ///// for brusher of the slider bar at the bottom ///////////////////////////
  function Xbrushed(live_on) {

    if(!specificView){
      resetRendering();
      // d3.select("#ruler").style("display","none");
    }

    // specificView = false;

    s = d3.event.selection || xScale2.range();
    xScale.domain(s.map(xScale2.invert, xScale2));
    x_len = Math.floor(parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs));
    if(x_len > length_limit){
      s_id = Math.ceil(xScale.domain()[0]);
      e_id = s_id + length_limit*fs;
      xScale.domain([s_id,e_id]);
      context.select(".x-brush").call(xbrush.move, [xScale2(s_id),xScale2(e_id)]);
      x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
    }else{
        xScale.domain(s.map(xScale2.invert, xScale2)); // If brush is empty then reset the Xscale domain to default, if not then make it the brush extent 
    }

    if(live_sign){
      svg.selectAll(".x.axis") // replot xAxis with transition when brush used
        .transition()
        .call(xAxis.tickValues(xScale.ticks(6)));
    }
    else{
      svg.select(".x.axis") // replot xAxis with transition when brush used
        .transition()
        .call(xAxis.tickValues(xAxisValue(fs,xScale.domain())));
        // .call(xAxis.tickValues(xScale.ticks(6).concat(xScale.domain())));
    } 

    domain_rec = yScale.domain()

    issue.select("path") // Redraw lines based on brush xAxis scale and domain
      .transition()
      .attr("d", function(d){
          plot_data = [];
          ratio = parseFloat(data.length)/parseFloat(d.values.length);
          i_s = Math.ceil(parseFloat(xScale.domain()[0]-d.values[0].index)/parseFloat(ratio));
          i_e = Math.ceil(parseFloat(xScale.domain()[1]-d.values[0].index)/parseFloat(ratio));
          for(i=i_s; i<=i_e; i++){
            if(d.values[i] != undefined)
              plot_data.push(d.values[i]);
          }
          if(d.labels){
            yScale.domain([y_label_min,y_label_max]);
          }else{
            yScale.domain(domain_rec);
          } 
          return d.visible ? line(plot_data) : null; 
      })
      .attr("transform",function(d,i){
        if(specificView)
          return 'translate(' + xScale(xScale.domain()[0]) + ')'
        else
          if(d.labels)
            return "translate(" + xScale(xScale.domain()[0]) + "," + ((channel_num+1-categories.length/2)*interval-3) + ")";
          else
            return "translate(" + xScale(xScale.domain()[0]) + "," + ((i+1-categories.length/2)*interval) + ")";
          
      });

    yScale.domain(domain_rec);

    if(live_on)
      live_on_switch(true); 

    //////// annotation for all channel ///////////////////////////////////////
    d3.selectAll(".anno-circle")
      .attr("fill","#F1F1F2");

    d3.selectAll(".g-anno").selectAll("*").remove();

    ///////////////////////////////////////////////////////////////////////////
    xRulerScale = (Math.abs(xScale.domain()[1]-xScale.domain()[0])/(fs))*(xRulerX.range()[1]/xScale.range()[1]);
    xRulerSliderChange(xRulerScale);
  };   

  function Ybrushed() {

    if(!specificView){
      resetRendering();
      // d3.select("#ruler").style("display","none");
    }

    // specificView = false;
    s = yScale3.range();

    console.log(d3.event)
    console.log(s)
    if(d3.event != null){
      s = d3.event.selection || yScale3.range();
      if(s[0] < s[1])
        s = [s[1],s[0]];
      yScale.domain(s.map(yScale3.invert, yScale3));
    }

    svg.select(".y.axis") // Redraw yAxis
      .transition()
      .call(yAxis);   

    domain_rec = yScale.domain()

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
          if(d.labels){
            yScale.domain([y_label_min,y_label_max]);
          }else{
            yScale.domain(domain_rec);
          }
          return d.visible ? line(plot_data) : null;
        }
      })
      .attr("transform",function(d,i){
        if(specificView)
          return 'translate(' + xScale(xScale.domain()[0]) + ')'
        else
          if(d.labels)
            return "translate(" + xScale(xScale.domain()[0]) + "," + ((channel_num+1-categories.length/2)*interval-3) + ")";
          else
            return "translate(" + xScale(xScale.domain()[0]) + "," + ((i+1-categories.length/2)*interval) + ")";       
      });

    yScale.domain(domain_rec);

    rulerScale = Math.abs(yScale.domain()[0]-yScale.domain()[1])*(rulerY.range()[1]/yScale.range()[0]);
    yRulerSliderChange(rulerScale);
  };   

  function drawCanvas(d){

  };

  //// for live chart /////////////////////////////////////////
  function tick() {

    if(!live_sign){
      return;
    }

    live_on = true;

    if(!specificView){
      resetRendering();
      // d3.select("#ruler").style("display","none");
    }

    var s_id, e_id;
    
    // minY = d3.min(minY_categories);
    // maxY = d3.max(maxY_categories);
    // minY = minY-Math.abs(minY)*yAmplify;
    // maxY = maxY+Math.abs(maxY)*yAmplify;
    // if(minY == 0 && maxY == 0){
    //   minY = -0.01;
    //   maxY = 0.01;
    // }
    // yScale.domain([minY,maxY]);


    s_id = Math.ceil(xScale.domain()[0]);
    e_id = Math.ceil(xScale.domain()[1]);

    if(e_id >= xScale2.domain()[1]){
      live_on_switch(false);
      live_sign = false;
      return ;
    }

    e_id = e_id + move_step;

    xscale_move_step = move_step;

    if(e_id > xScale2.domain()[1]){
      e_id = xScale2.domain()[1];
      xscale_move_step = e_id - xScale.domain()[1];
    }

    domain_rec = yScale.domain()

    categories.forEach(function(d,i){
      c_index = i+1;
      // if(d.labels)
      //   c_index = channel_num+1;
      if(d.visible){
        plot_data = [];
        ratio = parseFloat(data.length)/parseFloat(d.values.length);
        i_s = Math.ceil(parseFloat(xScale.domain()[0]-d.values[0].index)/parseFloat(ratio));
        i_e = Math.ceil(parseFloat(e_id-d.values[0].index)/parseFloat(ratio));
        plot_data = d.values.slice(i_s, i_e+1);
        d3.select("#line-"+ d.name.replace(/[^0-9^A-Za-z-]/g,""))
          .attr("transform",function(){
            if(specificView)
              return null;
            else if(d.labels)
              return "translate(" + 0 + "," + ((channel_num+1-categories.length/2)*interval-3) + ")";
            else
              return "translate(" + 0 + "," + ((c_index-categories.length/2)*interval) + ")";
          })
          .attr("d", function(){
            if(d.labels){
              yScale.domain([y_label_min,y_label_max]);
            }else{
              yScale.domain(domain_rec);
            }
            return line(plot_data);
          })
          .transition()
            .duration(duration_set)
            .ease(d3.easeLinear)
            .attr("transform",function(){
                if(specificView)
                  return 'translate(' + xScale(xScale.domain()[0]-xscale_move_step) + ')';
                else if(d.labels)
                  return 'translate(' + xScale(xScale.domain()[0]-xscale_move_step) + "," + ((c_index-categories.length/2)*interval) + ')';
                else
                  return 'translate(' + xScale(xScale.domain()[0]-xscale_move_step) + "," + ((channel_num+1-categories.length/2)*interval)-3 + ')';
              });
          if(specificView)
             d3.select("#line-"+ d.name.replace(/[^0-9^A-Za-z-]/g,""))
                .style("stroke-width","1.2");
        plot_data = [];
      }
    });

    yScale.domain(domain_rec);

    d3.select(".y.axis")
      .transition()
      .duration(duration_set)
      .call(yAxis);

    //////// annotation for all channel ///////////////////////////////////////
    d3.selectAll(".g-anno").selectAll("*").remove();
    annotationDraw();

    d3.selectAll(".annotations")
      .attr("transform",null)
      .transition()
        .duration(duration_set)
        .ease(d3.easeLinear)
        .attr('transform', 'translate(' + xScale(xScale.domain()[0]-move_step) + ')');
    ///////////////////////////////////////////////////////////////////////////
    
    s_id = xScale.domain()[0];
    e_id = xScale.domain()[1];

    s_id = Math.ceil(xScale.domain()[0]);
    e_id = Math.ceil(xScale.domain()[1]);

    xscale_move_step = move_step;

    if(e_id+move_step > xScale2.domain()[1]){
      xscale_move_step = xScale2.domain()[1] - e_id;
    }

    selection_width = d3.select(".x.brush.x-brush").select(".selection").attr("width");

    console.log(xScale2(s_id+xscale_move_step));
    d3.select(".x.brush.x-brush").select(".selection")
      .transition()
      .duration(duration_set)
      .ease(d3.easeLinear)
      .attr("x",xScale2(s_id+xscale_move_step));

    d3.select(".x.brush.x-brush").select(".handle--w")
      .transition()
      .duration(duration_set)
      .ease(d3.easeLinear)
      .attr("x",xScale2(s_id+xscale_move_step));

    d3.select(".x.brush.x-brush").select(".handle--e")
      .transition()
      .duration(duration_set)
      .ease(d3.easeLinear)
      .attr("x",xScale2(s_id+xscale_move_step)+parseFloat(selection_width));

    xScale.domain([s_id+xscale_move_step,e_id+xscale_move_step]);

    d3.select(".x.axis")
      .transition()
      .duration(duration_set)
      .ease(d3.easeLinear)
      .call(xAxis.tickValues(xScale.ticks(6)));
    
    d3.select(".x.brush")
      .transition()
      .duration(duration_set)
      .on('end', tick);
  };

  function live_on_switch(s){
    if(!live_sign){
      return ;
    }

    if(!s){
      d3.select(".x.brush").interrupt();
      live_on = false; 
      d3.select("#play_btn_path").attr("d","M1312 896q0 37-32 55l-544 320q-15 9-32 9-16 0-32-8-32-19-32-56v-640q0-37 32-56 33-18 64 1l544 320q32 18 32 55zm128 0q0-148-73-273t-198-198-273-73-273 73-198 198-73 273 73 273 198 198 273 73 273-73 198-198 73-273zm224 0q0 209-103 385.5t-279.5 279.5-385.5 103-385.5-103-279.5-279.5-103-385.5 103-385.5 279.5-279.5 385.5-103 385.5 103 279.5 279.5 103 385.5z");
    }
    else{
      live_on = true;
      // d3.select("#y-brush")
      //   .call(ybrush.move,null);
      d3.select("#play_btn_path").attr("d","M896 128q209 0 385.5 103t279.5 279.5 103 385.5-103 385.5-279.5 279.5-385.5 103-385.5-103-279.5-279.5-103-385.5 103-385.5 279.5-279.5 385.5-103zm0 1312q148 0 273-73t198-198 73-273-73-273-198-198-273-73-273 73-198 198-73 273 73 273 198 198 273 73zm96-224q-14 0-23-9t-9-23v-576q0-14 9-23t23-9h192q14 0 23 9t9 23v576q0 14-9 23t-23 9h-192zm-384 0q-14 0-23-9t-9-23v-576q0-14 9-23t23-9h192q14 0 23 9t9 23v576q0 14-9 23t-23 9h-192z");
      tick();
    }
  };

  ///// for rendering specific signal /////////////////////////////////////////
  function resetRendering(){

    yScale3.domain(yScale_rec.domain());

    d3.select("#y-axis1")
      .call(yAxis2);

    d3.selectAll('.line')
      .style("opacity", function(d) {
        if(d.name.includes("expert")) 
          return 0.7; 
        else 
          return 1;
      })
      .style("stroke-width",function(d){
        if(d.labels) 
          return label_line_width; 
        else 
          return line_width;
      });
          
    issue.select("path") // Redraw lines based on brush xAxis scale and 
      .attr("transform",function(d,i){
        return "translate(" + xScale(xScale.domain()[0]) + "," + ((i+1-categories.length/2)*interval) + ")";
      });

    d3.selectAll(".legend-text")
      .attr("flag","false");

    d3.select("#y-axis").style("display","none");
  } 

  function specificViewDraw(d,i){
    d3.selectAll('.line')
      .style("display","none");
    d3.select("#line-" + d.name.replace(/[^0-9^A-Za-z-]/g,""))
      .style("display","");
    d3.select("#line-" + d.name.replace(/[^0-9^A-Za-z-]/g,""))
      .transition()
      .attr("transform","translate(0,0)");
    d3.select("#line-" + d.name.replace(/[^0-9^A-Za-z-]/g,"")).style("stroke-width","1.2");
    d3.select("#y-axis").style("display","");
    specificView = true;
    d.specific = true;

    y_min = d3.min(d.values, function(v) { return v.rating; }); 
    y_max = d3.max(d.values, function(v) { return v.rating; });

    // y_min = -y_min_value;
    // y_max = y_min_value;

    if(y_min == 0 && y_max == 0){
      y_min = -y_min_value;
      y_max = y_min_value;
    }
    s_id = y_max * 1.1;
    e_id = y_min * 1.1;
    yScale3.domain([y_min*4, y_max*4]);
    d3.select("#y-axis1")
      .call(yAxis2);
    context.select("#y-brush").call(ybrush.move, [yScale3(s_id),yScale3(e_id)]);
  };

  function specificViewCancel(d,i){
    d3.selectAll('.line')
      .style("display","");
    d3.select("#line-" + d.name.replace(/[^0-9^A-Za-z-]/g,""))
      .attr("transform","translate(0," + ((i-categories.length/2)*interval) + ")");
    d3.select("#line-" + d.name.replace(/[^0-9^A-Za-z-]/g,"")).style("stroke-width","0.6");
    d3.select("#y-axis").style("display","none");
    specificView = false;
    yScale3.domain(yScale_rec.domain());
    d3.select("#y-axis1")
      .call(yAxis2);
    s_id = yScale3.domain()[0];
    e_id = yScale3.domain()[1];
    context.select("#y-brush").call(ybrush.move, null);
    d.specific = false;
  };

  ////// for drawing annotation /////////////////////////////////////////
  function annotationDraw(){
    var issue_need = d3.selectAll(".g-anno");
    annotations.forEach(function(d,i){
      var c_index = i;
      index_rec = anno_start_index_all_categories[c_index];
      anno_draw = anno_draw_all_categories[c_index];
      anno_name = annotation_names[c_index];

      // color_anno_index = "Annotation_" + anno_name + "_" + d.name.replace(/[^0-9^A-Za-z-]/g,"");
      color_anno_index = annotationList[c_index];
      index_rec.forEach(function(irec,anno_draw_i){
        issue_need.append("g")
          .attr("class","g_area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
          .attr("clip-path", "url(#clip)")
          .append("path") // Path is created using svg.area details
            .attr("class", "annotations annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
            .attr("id","id-annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
            .attr("d", function(d){ 
              plot_anno = anno_draw[anno_draw_i];
              plot_anno = [plot_anno[0],plot_anno[plot_anno.length-1]];
              return annotationArea(plot_anno);
            })
            .attr("fill", color_anno(color_anno_index))
            .attr("transform","translate(0,0)")
            // .attr("clip-path", "url(#clip" + d.name.replace(/[^0-9^A-Za-z-]/g,"")+ ")" )
            .style("opacity","0.4")
            .style("cursor", "pointer")
            .on("click", mouseTrackerClick);
            // .on("mousemove",function(d,i){
            //     x_len = parseFloat(xScale.domain()[1]-xScale.domain()[0]+1)/parseFloat(fs);
            //     plot_data = [];
            //     s_id = Math.ceil(xScale.domain()[0]);
            //     e_id = Math.ceil(xScale.domain()[1]);
            //     dd = Object.assign({},d);
            //     ratio = parseFloat(data.length)/parseFloat(d.values.length);
            //     i_s = Math.ceil(parseFloat(xScale.domain()[0]-d.values[0].index)/parseFloat(ratio));
            //     if(x_len>length_limit)
            //       i_e = i_s+parseFloat(length_limit)*parseFloat(fs)/parseFloat(ratio);
            //     else
            //       i_e = Math.ceil(parseFloat(xScale.domain()[1]-d.values[0].index)/parseFloat(ratio));
            //     for(i=i_s; i<=i_e; i++){
            //       if(d.values[i] != undefined)
            //         plot_data.push(d.values[i]);
            //     }
            //     dd.values = plot_data;
            //     hoverlinemousemove(dd);
            //   })
            // .on("mouseout",function(d){
            //   hoverlinemouseout();
            //   }); // end of issue_need.append("path") 

        issue_need.append("text") // annotation name in area
          .attr("class", "annotation-area-text annotation-area-text-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
          .attr("id","id-annotation-area-text-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
          .attr("clip-path", "url(#clip" + anno_name.replace(/[^0-9^A-Za-z-]/g,"")+ ")" )
          .attr("x",xScale(irec))
          .attr("y",12)
          .attr("fill",color_anno(color_anno_index))
          .style("font-size","12px")
          .style("font-weight","bold")
          .style("opacity","0.4")
          // .text(d.annotation_name[a_i]);
      });

    });
  };

  ///// for ruler activation by clicking ////////////////////////////////////////
  function mouseTrackerClick() { 

    scaleThr = (maxScale-(yScale.domain()[1]-yScale.domain()[0]));
    if(scaleThr > 0.01)
      scaleThr = scaleThr*0.0003/0.98+0.0005;
    else
      scaleThr = maxScale/height*3;
    if(live_on && x_len <= hover_point_show_limit && (yScale.domain()[1]-yScale.domain()[0])<0.25)
      live_on_switch(false);
    Yoffset = 0;
    // hoverLineXOffset = 175;
    // hoverLineYOffset = 90;
    hoverLineXOffset = $("#mouse-tracker").offset().left;
    hoverLineYOffset = $("#mouse-tracker").offset().top;
    var mouseX = event.pageX-hoverLineXOffset;
    var mouseY = event.pageY-hoverLineYOffset;
    if(mouseX >= 0 && mouseX <= 715+121 && mouseY >= 0 && mouseY <= 450) {
      // show the ruler
      d3.select("#ruler")
        .attr("transform", "translate(" + mouseX + "," + mouseY + ")")
        .style("display","");

    } else {
      // proactively act as if we've left the area since we're out of the bounds we want
      d3.select("#ruler").style("display","none");
    }
  }; 


  ///// for annotation legend actions /////////////////////////////////////////
  function annoCircleMouseOver(thisElement){
    str_need = d3.select(thisElement).attr("id");
    d_name = str_need.split("---")[1];

    d3.select(thisElement)
        .transition()
        .style("font-size","11px");

    d3.selectAll(".annotations")
      .transition()
      .style("opacity","0.1");

    d3.selectAll(".annotation-area-" + d_name)
      .transition()
      .style("opacity","0.65"); 
  };

  function annoCircleMouseOut(thisElement){
    str_need = d3.select(thisElement).attr("id");
    d_name = str_need.split("---")[1];
    d_index = str_need.split("---")[2];

    d3.select(thisElement)
        .transition()
        .style("font-size","10px");

    var flag = true;

    for(a_i = 0; a_i < annotation_names.length; a_i++){
      anno_name = annotation_names[a_i];
      color_temp = d3.select("#annocircle---" + anno_name.replace(/[^0-9^A-Za-z-]/g,"") + "---" + a_i).attr("fill");
      if(color_temp.toUpperCase() != "#F1F1F2" && color_temp != "rgb(241, 241, 242)"){
        flag = false;
        break;
      }
    };

    if(flag){
      d3.selectAll(".annotations")
        .transition()
        .style("opacity","0.4");
    }
    else{
      annotation_names.forEach( function(anno_name,a_i) {
        color_temp = d3.select("#annocircle---" + anno_name.replace(/[^0-9^A-Za-z-]/g,"") + "---" + a_i).attr("fill");
  
        if(color_temp.toUpperCase() == "#F1F1F2" || color_temp == "rgb(241, 241, 242)"){
          d3.selectAll(".annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
            .transition()
            .style("opacity","0.1");
        }
        else{
          d3.selectAll(".annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
            .transition()
            .style("opacity","0.65");
        }
      });
    }
  };

  function annoCircleClick(thisElement){
    color_now = d3.select(thisElement).attr("fill");
    str_need = d3.select(thisElement).attr("id");
    d_name = str_need.split("---")[1];
    d_index = str_need.split("---")[2];

    if(color_now.toUpperCase() == "#F1F1F2" || color_now == "rgb(241, 241, 242)"){
      color_text = color_anno(annotationList[d_index]);

      d3.select(thisElement)
        .transition()
        .attr("fill", color_text);
      

      d3.selectAll(".annotation-area-" + d_name)
        .transition()
        .style("opacity","0.65");

      annotation_names.forEach( function(anno_name,a_i) {
        if(anno_name.replace(/[^0-9^A-Za-z-]/g,"") != d_name){ 
          color_temp = d3.select("#annocircle---" + anno_name.replace(/[^0-9^A-Za-z-]/g,"") + "---" + a_i).attr("fill");
          if(color_temp.toUpperCase() == "#F1F1F2" || color_temp == "rgb(241, 241, 242)"){
            d3.selectAll(".annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
              .transition()
              .style("opacity","0.1");
          }
        }
      });
      // d3.selectAll("#annotation-area-text-" + d_name + d_annotation_name)
      //   .transition()
      //   .style("font-size","12px")
      //   .style("opacity","1")
      //   .attr("fill","#000");     
    }
    else{
      d3.select(thisElement)
      .transition()
      .attr("fill", "#F1F1F2");

      var flag = true;

      for(a_i = 0; a_i < annotation_names.length; a_i++){
        anno_name = annotation_names[a_i];
        if(anno_name.replace(/[^0-9^A-Za-z-]/g,"") != d_name){
          color_temp = d3.select("#annocircle---" + anno_name.replace(/[^0-9^A-Za-z-]/g,"") + "---" + a_i).attr("fill");
          if(color_temp.toUpperCase() != "#F1F1F2" && color_temp != "rgb(241, 241, 242)"){
            flag = false;
            break;
          }
        }
      };

      if(flag){
        d3.selectAll(".annotations")
          .transition()
          .style("opacity","0.4");
      }
      else{
        annotation_names.forEach( function(anno_name,a_i) {
          if(anno_name.replace(/[^0-9^A-Za-z-]/g,"") != d_name){
            color_temp = d3.select("#annocircle---" + anno_name.replace(/[^0-9^A-Za-z-]/g,"") + "---" + a_i).attr("fill");
      
            if(color_temp.toUpperCase() == "#F1F1F2" || color_temp == "rgb(241, 241, 242)"){
              d3.selectAll(".annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
                .transition()
                .style("opacity","0.1");
            }
            else{
              d3.selectAll(".annotation-area-" + anno_name.replace(/[^0-9^A-Za-z-]/g,""))
                .transition()
                .style("opacity","0.65");
            }
          }
          d3.selectAll(".annotation-area-" + d_name)
            .transition()
            .style("opacity","0.1");
        });
      } 
    }
  };

  // }); // End Data callback function
    
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
      var size = Math.floor(xValues.length/10);
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

  function liveSpeedDrageFun(d){
    dy = legendScale_speed(legendScale_speed.invert(d3.event.y));
    duration_set_pre = (dy-15)*20;
    if(duration_set_pre < 10)
      duration_set_pre = 10;
    if(duration_set_pre > 10000)
      duration_set_pre = 10000;
    duration_set = duration_set_pre;
    // handle_height = d3.select("#handle-live-speed").attr("height");
    handle_height = 16;
    slider_height = legendScale_speed.range()[1];
    if(dy > slider_height-handle_height)
      dy = slider_height-handle_height;
    // d3.select("#handle-live-speed").attr("y", dy-15); 
    current_translate = d3.transform(d3.select(".handle-live-speed").attr("transform")).translate;
    dx = current_translate[0]
    d3.select(".handle-live-speed")
      .attr("transform", "translate(" + dx + ","+ (dy-1) + ")," + "scale(0.01)")
  };

  function liveSpeedDragInt(d){
    d3.select(".slider-spped").interrupt();
  };
}








