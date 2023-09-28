// check what is the if of a current displaying data lineage
const currentDataLineageId = Number(window.location.href.split('/').slice(-1)[0].split('?')[0])

// get data about data lineage documents by making a http request
fetch('/data_lineage/get_data', {
    method: 'get',
    headers: new Headers({
        'Content-Type': 'application/json'
    })
})
.then(response => response.json())
.then(json => {
    const width = 928
    const height = 600
    let links = []
    let nodes = []
    for (let document of json){
        if (document.dataLineageId == currentDataLineageId){
            nodes = document.nodes
            for (let node1 of nodes){
                for (let node2 of nodes){
                    if (node1.linkedTo.includes(node2.value)) links.push({source: node1.value, target: node2.value})
                }
            }
        }
    }

    const types = Array.from(new Set(nodes.map(d => d.type)))

    const color = d3.scaleOrdinal(types, d3.schemeCategory10)

    const simulation = d3
        .forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.value).strength(0))
        .force("charge", d3.forceManyBody().strength(0))

    const svg = d3
        .create("svg")
            .attr("viewBox", [-width / 2, -height / 2, width, height])
            .attr("width", width)
            .attr("height", height)
            .attr("style", "max-width: 100%; height: auto; font: 12px sans-serif;")

    // define style for arrows (markers)
    svg
        .append("defs")
        .append("marker")
            .attr("id", 'arrow')
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 5)
            .attr("refY", -0.5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
        .append("path")
            .attr("fill", 'black')
            .attr("d", "M0,-5L10,0L0,5")

    // links between nodes
    const link = svg
        .append("g")
            .attr("fill", "none")
            .attr("stroke-width", 1.5)
        .selectAll("path")
        .data(links)
        .join("path")
            .attr("stroke", 'black')
            .attr("marker-end", d => `url(${new URL(`#arrow`, location)})`)

    // nodes with names of tables, systems, scripts etc
    const node = svg
        .append("g")
            .attr("fill", "currentColor")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .classed('node', true)
        .call(drag(simulation))

    // we add rectangles as a background for a text
    node
        .append("rect")
            .attr("fill", d => color(d.type))
            .attr("x", 5)
            .attr("y", "-0.9em")
            .classed('background', true)

    // adding text to the nodes
    node
        .append("text")
            .attr("x", 8)
            .attr("y", "0.3em")
            .style("font-size", "1.5em")
        .text(d => d.value)
        .classed('nodeText', true)

    // adding the 'X' for the buttons for removing nodes
    node
        .append('text')
            .attr("y", "0.3em")
            .style("font-size", "1.5em")
        .text('X')
        .classed('closeBtnText', true)

    // adding a rectangle as a button for removing nodes
    node
        .append("rect")
            .attr("y", "-0.8em")
            .attr('width', 20)
            .attr('fill', 'transparent')
            .attr('stroke', 'black')
            .attr('stroke-width', '1px')
        .classed('closeBtn', true)

    // change position of nodes and shape of arrows connecting them when user is dragging nodes
    simulation.on("tick", () => {
        link.attr("d", linkArc)
        node.attr("transform", d => `translate(${d.x},${d.y})`)
    })

    // add the graph with nodes to the website
    const graph = Object.assign(svg.node(), {scales: {color}})
    const dataLineageGraph = document.querySelector('#dataLineageGraph')
    dataLineageGraph.appendChild(graph)

    // add to the nodes data attribute called 'bbox' with info about the text element size 
    // so we can make rectangles have the same size
    node
        .selectAll(".nodeText")
        .each(function(d) { 
            d.bbox = this.getBBox()
        })

    // resize rectangles so they match the text size
    node
        .selectAll(".background")
            .attr('width', d => 1.1 * d.bbox.width)
            .attr('height', d => 1.1 * d.bbox.height)

    // resize a button for removing node and add event listener for removing a node
    node
        .selectAll(".closeBtn")
            .attr("x", d => d.bbox.width + 10)
            .attr('height', d => d.bbox.height)
        .on('click', (event, data) => {
            fetch(`/data_lineage/delete_node`, {
                method: 'post',
                body: JSON.stringify(data),
                headers: new Headers({
                    'Content-Type': 'application/json'
                })
            })
        })
        
    node
        .selectAll('.closeBtnText')
            .attr("x", d => d.bbox.width + 14)
})




// function for changing arrows shape when user is dragging nodes
function linkArc(d) {
    const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y)
    return `
        M${d.source.x + d.source.bbox.width + 30},${d.source.y}
        A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
    `
}

// function for changing coordinates x and y of nodes when user is dragging them
function drag(simulation) {

    function dragstarted(event, d){
        if (!event.active) simulation.alphaTarget(0.3).restart()
    }

    function dragged(event, d) {
        d.x = event.x
        d.y = event.y
    }

    function dragended(event, d) {
        // check if a node was dragged over another node, that means that user wants to link them
        // or remove existing link

        // get data about nodes and links from given document by making a http request
        fetch('/data_lineage/get_data', {
            method: 'get',
            headers: new Headers({
                'Content-Type': 'application/json'
            })
        })
        .then(response => response.json())
        .then(json => {
            // load data for currently displayed data lineage document
            let displayedDocument
            for (let document of json){
                if (document.dataLineageId == currentDataLineageId){
                    displayedDocument = document
                }
            }
            
            // check if some node is close to the dragged node, if yes then link them
            for (let node of displayedDocument.nodes){
                if (node._id != d._id & Math.abs(node.x - d.x) < 50 & Math.abs(node.y - d.y) < 20){
                    // check if nodes are already linked, if yes then remove that link
                    // if not then create a new link between those nodes
                    if (d.linkedTo.includes(node.value)) d.linkedTo = d.linkedTo.filter((x) => {return x != node.value})
                    else if (!node.linkedTo.includes(d.value)) d.linkedTo.push(node.value)

                    // move the dragged node back to his old position
                    for (let [index, node] of displayedDocument.nodes.entries()){
                        if (node._id == d._id) {
                            d.x = displayedDocument.nodes[index].x
                            d.y = displayedDocument.nodes[index].y
                        }
                    }
                }
            }

            // update info about the node's position in a database
            fetch(`/data_lineage/save_data`, {
                    method: 'post',
                    body: JSON.stringify(d),
                    headers: new Headers({
                        'Content-Type': 'application/json'
                    })
                })

            location.reload()
        })
    }

    return d3.drag()
        .on('start', dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
}