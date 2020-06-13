height=1000
width = 1200;

// color = {
//   const scale = d3.scaleOrdinal(d3.schemeCategory10)
  
//   const colors = d3.scaleOrdinal(['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00', '#ffff33','#a65628','#f781bf']);

//   return d => d.numCoworkers ? colors(d.department)  :'#8a8988';
// }

drag = simulation => {
  
  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }
  
  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    // d.fx = null;
    // d.fy = null;
  }
  
  return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
}

// nodeSize={
//   const scale = d3.scaleLog();
//   scale.domain(d3.extent(graph.nodes.map(n=>n.degree)));
//   scale.range([5,20]);
  
//   return d=>d.degree ? scale(d.degree) : 8;

// }

vis = {
  
  
  const links = graph.links; //.map(d => Object.create(d));
  const nodes = graph.nodes; //.map(d => Object.create(d));
  
    const impactScale = d3.scaleLinear();
  impactScale.range([5,18]);
  impactScale.domain(d3.extent(graph.nodes.map(n=>n.impactScore)));
    


  const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-300).distanceMax(500))
      .force("center", d3.forceCenter(width / 2, height / 2));

  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height]);

  const link = svg.append("g")
      .classed('link', true)
    .selectAll("line")
    .data(links)
    .join("line")
    .classed('mutual',d=>d.mutual);
      // .attr("stroke-width", d => Math.sqrt(d.value));

  //CST, OBT, CPTEC
  const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
    .selectAll("circle")
    .data(nodes)
    .join("circle")
      .attr("r", nodeSize )
      .attr("fill", color)
      .call(drag(simulation));
  
  svg.append("g")
  .attr('id', 'annotation')
  
  const button = svg.append('text')
  .attr('id','downloadButton')
  .text('Download Highlighted Nodes')
    .attr('x',width-400)
  .attr('y',height-100)

  

  // node.append("title")
  //     .text(d => d.name);

  simulation.on("tick", () => {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
  });

  invalidation.then(() => simulation.stop());

  return svg.node();
}

hover2 = {
  const svg = d3.select(vis);
  
  // used to test out interactivity in this cell
  circles.on("mouseover.hover2", function(d) {
      let me = d3.select(this);
      let div = d3.select("body").append("div");
   
    
      div.attr("id", "details");
      div.attr("class", "tooltip");
      let rows = div.append("table")
        .selectAll("tr")
        // .data(Object.keys(d))
      // .data(['name','orig_name','numCoworkers','degree','department','similarity'])
      .data(['name','orig_name','department','similarity'])
      
      // .data(['name','inst', 'dpt','impactScore'])
        .enter()
        .append("tr");
    
      rows.append("th").text(key => key);
      rows.append("td").text(key => d[key]);
    
      // show what we interacted with
      d3.select(status).text("hover: " + d.name);
    });

  circles.on("mousemove.hover2", function(d) {
      let div = d3.select("div#details");
      // get height of tooltip
      let bbox = div.node().getBoundingClientRect();
    
      div.style("left", d3.event.clientX + "px")
      div.style("top",  (d3.event.clientY - bbox.height) + "px");
    
    // console.log(div.style("left"),div.style("top"),bbox)
    
    });
  
  circles.on("mouseout.hover2", function(d) {
      d3.selectAll("div#details").remove();
      d3.select(status).text("hover: none");
    });
  
  return status;
}

 DOM.download(serialize({test:'testName'}), 'export', "Export Highlighted Nodes")

d3 = require("d3")


graph = { 
  let allPeople=[]; 
  let edges = [];
  
  //filter out people with no name;
  let rawData = data.filter(d=>d['NOME:'].length>1);
  //create map of all possible people from 'Pessoas com Quem vc trabalha"
  rawData.map(person=>{
    
  let coWorkers = person['3) Com quais pessoas se relaciona no seu trabalho?'].split(',');
    person.numCoworkers = coWorkers.length;
    person.coWorkers = coWorkers.map(c=>c.trim())
    coWorkers.map(c=>{
      let sanitizedName =  c.replace(':', '').trim();
      if (!allPeople.find(p=>p.name == sanitizedName)){
          let id = Math.floor(Math.random() * Date.now());
          allPeople.push({
            name:sanitizedName,
            id,
            neighbors:[],
            selected:false,
            selectedNeighbors:[]});
      }
   
    })
  })
  
    //find most likely first name pased on similarity metric
  // let allPeople = Object.keys(peopleDict);
  rawData.map(person=>{
  let name = person['NOME:'];
    let similarities = allPeople.map(p=>Math.round(similarity(name,p.name.slice(0,name.length))*10000)/100)
    let maxSimilarity = Math.max(...similarities)
    let i = similarities.indexOf(maxSimilarity);
    person.standardName = allPeople[i].name;
    person.id = allPeople[i].id;
    
    //add info to allPeople
       allPeople[i].numCoworkers = person.numCoworkers;
    allPeople[i].orig_name = person['NOME:'];
    allPeople[i].department = person['DIVISÃO/SETOR:']
    allPeople[i].participant = person.numCoworkers;
    // allPeople[i].include = person.numCoworkers<40;
    allPeople[i].degree = 0;
    allPeople[i].similarity = maxSimilarity;
  
   

  })
  
  //temporarily filter out people who did not fill out the form or who selected more than 100 coWorkers;
  allPeople = allPeople.filter(p=>(p.numCoworkers<100 && p.similarity>60) || !p.numCoworkers);
  
  //Create edges between people;
  rawData.map(person=>{
    person.coWorkers.map(coWorker=>{
      let sourcePerson = allPeople.find(p=>p.name === person.standardName)
      let targetPerson = allPeople.find(p=>p.name === coWorker);
      
      
      if (sourcePerson && targetPerson){
              let edge = {source:sourcePerson.id,target:targetPerson.id,type:sourcePerson.department == targetPerson.department ? 'internal' : 'external',mutual:false};
  
        //add to neighborList
        sourcePerson.neighbors.push(targetPerson);
        targetPerson.neighbors.push(sourcePerson);
        
        let existingEdge = edges.find(e=>e.source === edge.target && e.target === edge.source)
         if (existingEdge){ 
            existingEdge.mutual = true;
         } else {
          edges.push(edge);
         }
      
      }
     
     
})
  })
  
  //count degree of each node; 
   edges.map(e=>{
      let sourcePerson = allPeople.find(p=>p.id == e.source)
      let targetPerson = allPeople.find(p=>p.id == e.target);
     
     sourcePerson.degree = sourcePerson.degree +1;
     targetPerson.degree = targetPerson.degree +1;
   })
  
  return {nodes:allPeople, links:edges}
}

circles = d3.select(vis).selectAll("circle");

links = d3.select(vis).selectAll("line");

annotations = d3.select(vis).select("g#annotation");

highlight = {
  const svg = d3.select(vis);
  
  // used to test out interactivity in this cell
  const status = html`<code>highlight: none</code>`;
  
  // event.namespace allows us to add multiple functions for one event
  // only needed in examples like this where some events trigger multiple functions
  circles.on("mouseover.highlight", function(d) { 
      d3.select(this)
        .raise() // bring to front
        .classed('hovered', true);
    });

  circles.on("mouseout.highlight", function(d) {
      d3.select(this).classed('hovered', false);      
    });
  
  return status;
}

filterDpt = {
  const svg = d3.select(vis);
  
  
  // event.namespace allows us to add multiple functions for one event
  // only needed in examples like this where some events trigger multiple functions
  circles.on("click.filter", function(d) {
    
      d3.event.stopPropagation()  
    
    if (d3.event.shiftKey) {
      
      //clear all selected nodes and highlighted neighbors;
      circles.each(c=>{
      c.selected = false;
        c.selectedNeighbors = [];
      })
       links.classed('hide', l=> l.type === 'external' || l.source.department !== d.department);
       circles.classed('hide', c=> c.department !== d.department);
       
    } else {
      d.selected = !d.selected;
      d3.select(this).classed('selected',d.selected);
      
      //updated selected neighbors
      if (d.selected){
        d.neighbors.map(n=>{
        n.selectedNeighbors.push(d.id); 
        })
      } else {
        d.neighbors.map(n=>n.selectedNeighbors = n.selectedNeighbors.filter(ne=>ne !== d.id))
      }
      
      //only hide if there is at least one thing selected
      if (circles.filter(d=>d.selected).size()>0){
       circles.classed('hide', c=> !c.selected && c.selectedNeighbors.length == 0);
       links.classed('hide', l=> !l.source.selected  && !l.target.selected); 
          } else {
        clearHighlights();
      }
            
   
    }
  })
   
//   circles.on("mouseout.filter", function(d) {
//        circles.classed('hide',false);
//     links.classed('hide', false);
//     links.classed('bold', false);
//     links.classed('semiBold', false);
//     });
  
  return status;
}

{
  const svg = d3.select(vis);
    svg.on('click',clearHighlights)
  
  }

  function clearHighlights() {
  
    circles.each(c=>{
    c.selected = false;
    c.selectedNeighbors = [];})
   circles.classed('hide',false);
   circles.classed('selected',false);
    links.classed('hide', false);
    links.classed('bold', false);
    links.classed('semiBold', false);

}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  var costs = new Array();
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function similarity(s1, s2) {
  var longer = s1;
  var shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  var longerLength = longer.length;
  if (longerLength === 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

{var $str1="Marco Antonio Piñero Lopez";
var $str2="marco antonio Pineda lópez";

var perc=Math.round(similarity($str1,$str2)*10000)/100;
 
 return perc
}

function serialize (data) {
  let s = JSON.stringify(data);
  return new Blob([s], {type: "text/plain"}) 
 }