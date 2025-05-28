function montageDraw(){
  var margin = 15,
    w = 300+margin * 2,
    h = 300,
    radius = h/2-20,
    strokeWidth = 4;

  var svg = d3.select("#montage-pic").append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("id","montage_svg");

  svg.append("g")
    .attr("transform", "translate(" + (h/2-5) + "," + 10 + ")")
  .append("path")
    .attr("transform", "scale(0.006)")
    .attr("d","M1683 1331l-166 165q-19 19-45 19t-45-19l-531-531-531 531q-19 19-45 19t-45-19l-166-165q-19-19-19-45.5t19-45.5l742-741q19-19 45-19t45 19l742 741q19 19 19 45.5t-19 45.5z")
    .attr("stroke","black");

  svg.append("g")
    .attr("transform", "translate(" + h/2 + "," + h/2 + ")")
  .append("circle")
    .attr("r",radius)
    .attr("fill","none")
    .attr("stroke-width","1.5")
    .attr("stroke","black");

  // first layer
  svg.append("text")
    .attr("transform", "translate(" + 108 + "," + 40 + ")")
    .style("cursor", "pointer")
    .text("Fp1")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 139 + "," + 40 + ")")
    .style("cursor", "pointer")
    .text("FpZ")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 170 + "," + 40 + ")")
    .style("cursor", "pointer")
    .text("Fp2")
    .on("click",addMontageToList);


  // second layer
  svg.append("text")
    .attr("transform", "translate(" + 50 + "," + 85 + ")")
    .style("cursor", "pointer")
    .text("F7")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 95 + "," + 90 + ")")
    .style("cursor", "pointer")
    .text("F3")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 143 + "," + 95 + ")")
    .style("cursor", "pointer")
    .text("FZ")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 191 + "," + 90 + ")")
    .style("cursor", "pointer")
    .text("F4")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 236 + "," + 85 + ")")
    .style("cursor", "pointer")
    .text("F8")
    .on("click",addMontageToList);


  // third layer
  svg.append("text")
    .attr("transform", "translate(" + 0 + "," + h/2 + ")")
    .style("cursor", "pointer")
    .text("A1")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 30 + "," + h/2 + ")")
    .style("cursor", "pointer")
    .text("T7")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 87 + "," + h/2 + ")")
    .style("cursor", "pointer")
    .text("C3")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 143 + "," + h/2 + ")")
    .style("cursor", "pointer")
    .text("CZ")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 199 + "," + h/2 + ")")
    .style("cursor", "pointer")
    .text("C4")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 256 + "," + h/2 + ")")
    .style("cursor", "pointer")
    .text("T8")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 286 + "," + h/2 + ")")
    .style("cursor", "pointer")
    .text("A2")
    .on("click",addMontageToList);


  // forth layer
  svg.append("text")
    .attr("transform", "translate(" + 50 + "," + (h/2+73) + ")")
    .style("cursor", "pointer")
    .text("P7")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 95 + "," + (h/2+55) + ")")
    .style("cursor", "pointer")
    .text("P3")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 143 + "," + (h/2+65) + ")")
    .style("cursor", "pointer")
    .text("PZ")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 191 + "," + (h/2+55) + ")")
    .style("cursor", "pointer")
    .text("P4")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 236 + "," + (h/2+73) + ")")
    .style("cursor", "pointer")
    .text("P8")
    .on("click",addMontageToList);


  //fifth
  svg.append("text")
    .attr("transform", "translate(" + 108 + "," + (h/2+115) + ")")
    .style("cursor", "pointer")
    .text("O1")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 143 + "," + (h/2+125) + ")")
    .style("cursor", "pointer")
    .text("OZ")
    .on("click",addMontageToList);

  svg.append("text")
    .attr("transform", "translate(" + 178 + "," + (h/2+115) + ")")
    .style("cursor", "pointer")
    .text("O2")
    .on("click",addMontageToList);


  function addMontageToList(){
    chan = d3.select(this).text().toLowerCase();
    chan1 = $("#montage_chan1").html().toLowerCase();
    chan2 = $("#montage_chan2").html().toLowerCase();
    if(chan1 == ""){
      var exists = false;
      $('#sig_chan1 option').each(function(){
          if (this.value == chan) {
              exists = true;
              return false;
          }
      });
      if(exists){
        $("#montage_chan1").html(chan);
        $("#sig_chan1").val(chan);
      }
    }
    else if(chan2 == ""){
      var exists = false;
      $('#sig_chan1 option').each(function(){
          if (this.value == chan) {
              exists = true;
              return false;
          }
      });
      if(exists){
        $("#montage_chan2").html(chan);
        $("#sig_chan2").val(chan);
      }
    }
    else{
      $("#montage_chan1").html("");
      $("#montage_chan2").html("");
      var exists = false;
      $('#sig_chan1 option').each(function(){
          if (this.value == chan) {
              exists = true;
              return false;
          }
      });
      if(exists){
        $("#montage_chan1").html(chan);
        $("#sig_chan1").val(chan);
      }
    }
    chan1 = $("#montage_chan1").html().toLowerCase();
    chan2 = $("#montage_chan2").html().toLowerCase();
    if(chan1 != "" && chan2 != ""){
      montageToAdd = chan1.trim()+"—"+chan2.trim();
      var exists = false;
      $('#montage_add option').each(function(){
          if (this.value == montageToAdd) {
              exists = true;
              return false;
          }
      });
      if(!exists)
        $("#montage_add").append($("<option>"+ montageToAdd+"</option>"));
    }

  }
}