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
            links = document.links
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

    node
        .append("text")
            .attr("x", 8)
            .attr("y", "0.3em")
            .style("font-size", "1.5em")
        .text(d => d.value)

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
        .selectAll("text")
        .each(function(d) { 
            d.bbox = this.getBBox()
        })

    // resize rectangles so they match the text size
    node
        .selectAll("rect")
        .attr('width', d => 1.1 * d.bbox.width)
        .attr('height', d => 1.1 * d.bbox.height)
})


// function for changing arrows shape when user is dragging nodes
// as 'd' argument we will pass our 'links' variable
function linkArc(d) {
    const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y)
    return `
        M${d.source.x + d.source.bbox.width},${d.source.y}
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
                    let nodesLinked = false
                    for (let [index, link] of displayedDocument.links.entries()){
                        if (link.source == d.value & link.target == node.value) {
                            nodesLinked = true
                            displayedDocument.links.splice(index, 1)
                            break
                        }
                    }
                    if (!nodesLinked) {
                        displayedDocument.links.push({source: d.value, target: node.value})
                    }
                }
            }

            // update info about the node's position in a database
            for (let [index, node] of displayedDocument.nodes.entries()){
                if (node._id == d._id) {
                    displayedDocument.nodes[index] = d
            }

            // save in the database info about new position of a node
            fetch(`/data_lineage/${currentDataLineageId}/save_data`, {
                method: 'post',
                body: JSON.stringify(displayedDocument),
                headers: new Headers({
                    'Content-Type': 'application/json'
                })
            })

            // location.reload()
        })
    }

    return d3.drag()
        .on('start', dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
}