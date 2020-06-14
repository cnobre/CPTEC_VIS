let svgNode, circles, links, annotations;

drawVis = function (graph, divID) {

    nodeSize = function (d) {
        const scale = d3.scaleLog();
        scale.domain(d3.extent(graph.nodes.map(n => n.degree)));
        scale.range([5, 20]);

        return d.degree ? scale(d.degree) : (d.type == 'area' ? 20 :  8);
    }

    color = function (d) {
        const scale = d3.scaleOrdinal(d3.schemeCategory10)

        const colors = d3.scaleOrdinal()
            .range(['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf'])
            .domain([... new Set(graph.nodes.map(n => n.department))])
        // console.log((d.department))


        return d.numCoworkers ? colors(d.department) : 'blue'//'#8a8988';
    }

    vis(graph, divID);

    circles = d3.select(svgNode).selectAll(".node");

    links = d3.select(svgNode).selectAll(".link");

    annotations = d3.select(svgNode).select("g#annotation");

    highlight();
    tooltip();
    filterDpt();

    d3.select(svgNode).on('click', clearHighlights)


}

processGraph = function (data, temas_grouping) {

    console.log(temas_grouping)
    //create dictionary of temas:
    temas = {};
    temas_grouping.columns.map(tema => {
        temas[tema] = [];
    });
    temas_grouping.map(row => {
        temas_grouping.columns.map(tema => {
            temas[tema].push(row[tema]);
        });
    })

    temas_lookup = {}
    temas_grouping.map(row => {
        Object.keys(row).map(k => {
            temas_lookup[row[k]] = k;
        })
    })
    temas = (Object.entries(temas));

    temas = temas.map(t => {
        let obj =
        {
            type: 'area',
            name: t[0],
            subareas: t[1].filter(t=>t.length>2),
            id:Math.floor(Math.random() * Date.now()),
            neighbors:[],
            selected: false,
            selectedNeighbors: []
        }
        return obj;
    })


    let allPeople = [];
    let edges = [];

    let workingAreas = '1) Em quais temas você trabalha? Marque todos os temas que trabalha. Fique a vontade para adicionar ao final da lista aqueles temas que trabalha, mas que não constam nesta lista.';
    let aspiringWorkingAreas = '2) Em quais temas gostaria também de trabalhar ?';
    let missao_do_CPTEC = '5) Como você descreveria a Missão do CPTEC?';
    let papel_do_setor_na_missao_CPTEC = '6) Como você enxerga o papel da sua Divisão ou seu Setor para que o CPTEC atinja sua Missão?';
    let paper_pessoal_na_missao = '7) De que forma você vê seu trabalho para que o CPTEC atinja sua Missão?';

    //filter out people with no name;
    let rawData = data.filter(d => d['NOME:'].length > 1);
    console.log(rawData)
    //create map of all possible people from 'Pessoas com Quem vc trabalha"
    rawData.map(person => {
        let coWorkers = person['3) Com quais pessoas se relaciona no seu trabalho?'].split(',');
        person.numCoworkers = coWorkers.length;
        person.coWorkers = coWorkers.map(c => c.trim())
        coWorkers.map(c => {
            let sanitizedName = c.replace(':', '').trim();
            if (!allPeople.find(p => p.name == sanitizedName)) {
                let id = Math.floor(Math.random() * Date.now());
                allPeople.push({
                    type: 'person',
                    name: sanitizedName,
                    id,
                    neighbors: [],
                    selected: false,
                    selectedNeighbors: []
                });
            }

        })
    })

    //find most likely first name pased on similarity metric
    // let allPeople = Object.keys(peopleDict);
    let extraAreas=[];
    rawData.map(person => {
        let name = person['NOME:'];
        let similarities = allPeople.map(p => Math.round(similarity(name, p.name.slice(0, name.length)) * 10000) / 100)
        let maxSimilarity = Math.max(...similarities)
        let i = similarities.indexOf(maxSimilarity);
        person.standardName = allPeople[i].name;
        person.id = allPeople[i].id;


        person[workingAreas].split(',').map(a=>{
            a = a.trim()
            if (!temas_lookup[a]){
                extraAreas.push(a)
                console.log(a)
            }
        })
        //add info to allPeople
        allPeople[i].numCoworkers = person.numCoworkers;
        allPeople[i].orig_name = person['NOME:'];
        allPeople[i].department = person['DIVISÃO/SETOR:']
        allPeople[i].participant = person.numCoworkers;
        // allPeople[i].include = person.numCoworkers<40;
        allPeople[i].degree = 0;
        allPeople[i].similarity = maxSimilarity;
        allPeople[i].workingAreas = person[workingAreas].split(',').map(a=>a.trim());
        allPeople[i].aspiringWorkingAreas = person[aspiringWorkingAreas].split(',').map(a=>a.trim())
        allPeople[i].themes = allPeople[i].workingAreas.map(a=>temas_lookup[a])
        allPeople[i].aspiringThemes = [... new Set(allPeople[i].aspiringWorkingAreas.map(a=>temas_lookup[a]))]
    })

    console.log(allPeople.filter(p=>p.name && p.name.includes('Marilene Alves')))
    // console.log(extraAreas.map(a=>a.join("\n")))

    // let csvContent = "data:text/csv;charset=utf-8," 
    // + rows.map(e => e.join(",")).join("\n");

    //temporarily filter out people who did not fill out the form or who selected more than 100 coWorkers;
    allPeople = allPeople.filter(p => (p.numCoworkers < 100 && p.similarity > 60) || !p.numCoworkers);

    allPeople = allPeople.concat(temas)
    //Create works with edges between people;
    rawData.map(person => {
        person.coWorkers.map(coWorker => {
            let sourcePerson = allPeople.find(p => p.name === person.standardName)
            let targetPerson = allPeople.find(p => p.name === coWorker);

            if (sourcePerson && targetPerson) {
                let edge = { source: sourcePerson.id, target: targetPerson.id, type: sourcePerson.department == targetPerson.department ? 'internal' : 'external', mutual: false };
                //add to neighborList
                sourcePerson.neighbors.push(targetPerson);
                targetPerson.neighbors.push(sourcePerson);

                let existingEdge = edges.find(e => e.source === edge.target && e.target === edge.source)
                if (existingEdge) {
                    existingEdge.mutual = true;
                } else {
                    edges.push(edge);
                }

            }


        })
    })

    //create edges between people and their target areas
    allPeople.map(person => {
        if (person.themes){
            person.themes.map(theme => {
                let sourcePerson = person
                let targetArea = allPeople.find(t => t.name === theme);
    
                if (sourcePerson && targetArea) {
                    let edge = { source: sourcePerson.id, target: targetArea.id, type:'area', mutual: false };
                    //add to neighborList
                    sourcePerson.neighbors.push(targetArea);
                    targetArea.neighbors.push(sourcePerson);
                    edges.push(edge);
                }
                else {
                    console.log(sourcePerson,targetArea)
                }
    
    
            })
        }
     
    })

    //count degree of each node; 
    edges.map(e => {
        let sourcePerson = allPeople.find(p => p.id == e.source)
        let targetPerson = allPeople.find(p => p.id == e.target);

        sourcePerson.degree = sourcePerson.degree + 1;
        targetPerson.degree = targetPerson.degree + 1;
    })

    return { nodes: allPeople, links: edges }
}




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

vis = function (graph, divID) {

    console.log(graph)

    let height = 800
    let width = 1200;

    const links = graph.links; //.map(d => Object.create(d));
    const nodes = graph.nodes; //.map(d => Object.create(d));

    const impactScale = d3.scaleLinear();
    impactScale.range([5, 18]);
    impactScale.domain(d3.extent(graph.nodes.map(n => n.impactScore)));

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id))
        .force("charge", d3.forceManyBody().strength(-300).distanceMax(500))
        .force("center", d3.forceCenter(width / 2, height / 2));

    const svg_internal = d3.select(divID).append("svg")
        .attr('width', width)
        .attr('height', height)
    // .attr("viewBox", [0, 0, width, height]);

    const link = svg_internal.append("g")
        .classed('links', true)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr('class', 'link')
        .classed('mutual', d => d.mutual);

    // .attr("stroke-width", d => Math.sqrt(d.value));

    //CST, OBT, CPTEC
    const node = svg_internal.append("g")
        .classed('nodes', true)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", nodeSize)
        .attr("fill", color)
        .attr('class', d=>d.type)
        .classed('node',true)
        .call(drag(simulation));

    svg_internal.append("g")
        .attr('id', 'annotation')




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

    // invalidation.then(() => simulation.stop());

    svgNode = svg_internal.node();

}

tooltip = function () {
    circles.on("mouseover.tooltip", function (d) {
        console.log(d)

        let div = d3.select("body").append("div");

        div.attr("id", "details");
        div.attr("class", "tooltip");
        let rows = div.append("table")
            .selectAll("tr")
            .data(d.type == 'person' ? ['name', 'orig_name', 'department', 'similarity'] : ['name','subareas'])
            .enter()
            .append("tr");

        rows.append("th").text(key => key);
        rows.append("td").text(key => d[key]);

    });

    circles.on("mousemove.hover2", function (d) {
        let div = d3.select("div#details");

        // get height of tooltip
        let bbox = div.node().getBoundingClientRect();

        div.style("left", d3.event.pageX + "px")
        div.style("top", (d3.event.pageY - bbox.height) + "px");

        // console.log(div.style("left"),div.style("top"),bbox)

    });

    circles.on("mouseout.tooltip", function (d) {
        d3.selectAll("div#details").remove();
    });

}

highlight = function () {

    circles.on("mouseover.highlight", function (d) {
        d3.select(this)
            .raise() // bring to front
            .classed('hovered', true);
    });

    circles.on("mouseout.highlight", function (d) {
        d3.select(this).classed('hovered', false);
    });

}


filterDpt = function () {

    // event.namespace allows us to add multiple functions for one event
    // only needed in examples like this where some events trigger multiple functions
    circles.on("click", function (d) {
        d3.event.stopPropagation()

        if (d3.event.shiftKey) {

            // clear all selected nodes and highlighted neighbors;
            circles.each(c => {
                c.selected = false;
                c.selectedNeighbors = [];
            })
            links.classed('hide', l => (l.type === 'external' || l.type == 'area' || l.source.department !== d.department));
            circles.classed('hide', c => c.department !== d.department);

        }
        else {
            d.selected = !d.selected;
            d3.select(this).classed('selected', d.selected);

            //updated selected neighbors
            if (d.selected) {
                d.neighbors.map(n => {
                    n.selectedNeighbors.push(d.id);
                })
            } else {
                d.neighbors.map(n => n.selectedNeighbors = n.selectedNeighbors.filter(ne => ne !== d.id))
            }

            //only hide if there is at least one thing selected
            if (circles.filter(d => d.selected).size() > 0) {
                circles.classed('hide', c => !c.selected && c.selectedNeighbors.length == 0);
                links.classed('hide', l => !l.source.selected && !l.target.selected);
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
}


function clearHighlights() {

    circles.each(c => {
        c.selected = false;
        c.selectedNeighbors = [];
    })
    circles.classed('hide', false);
    circles.classed('selected', false);
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

// {
//     var $str1 = "Marco Antonio Piñero Lopez";
//     var $str2 = "marco antonio Pineda lópez";

//     var perc = Math.round(similarity($str1, $str2) * 10000) / 100;

//     console.log(perc)
// }

function serialize(data) {
    let s = JSON.stringify(data);
    return new Blob([s], { type: "text/plain" })
}
