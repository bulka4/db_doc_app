// check what is the id of the currently displaying data lineage document
const currentDataLineageId = Number(window.location.href.split('/').slice(-1)[0].split('?')[0])
const dataLineageGraph = document.querySelector('#dataLineageGraph')

getData().then(dataLineageDocs => {
    createVisualization(dataLineageDocs)
})

// dataLineageDocs argument is created by getData function and it contains data about data lineage
// documentation needed for creating a visualization
async function createVisualization(dataLineageDocs){
    const width = 3000
    const height = 2000
    // links defines which nodes are connected with arrows
    let links = []
    let nodes = []
    let currentDocument
    for (let document of dataLineageDocs){
        if (document.dataLineageId == currentDataLineageId){
            currentDocument = document
            nodes = document.nodes
            for (let node1 of nodes){
                for (let node2 of nodes){
                    if (node1.linkedTo.includes(node2.value)) 
                        links.push({source: node1.value, target: node2.value})
                }
            }
        }
    }

    const simulation = d3
        .forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.value).strength(0))

    const svg = d3
        .create("svg")
            .attr("viewBox", [-width / 2, -height / 2, width, height])
            .attr("width", width)
            .attr("height", height)
            // .attr('width', '100vw')
            // .attr('height', '100vh')
            // .attr('overflow', 'auto')
            .attr("style", "font: 12px sans-serif; overflow: auto;")

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
            .attr("fill", d => {
                if (d.type == 'system') return 'blue'
                else if (d.type == 'table') return 'red'
                else if (d.type == 'script') return 'green'
            })
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
            .attr('color', 'white')
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

    // adding 'i' for buttons for showing more info about nodes
    node
        .append('text')
            .attr("y", "0.3em")
            .style("font-size", "1.5em")
        .text('i')
        .classed('infoBtnText', true)

    // adding a rectangle as a button for showing more info about nodes
    node
        .append("rect")
            .attr("y", "-0.8em")
            .attr('width', 20)
            .attr('fill', 'transparent')
            .attr('stroke', 'black')
            .attr('stroke-width', '1px')
        .classed('infoBtn', true)

    // change position of nodes and shape of arrows connecting them when user is dragging nodes
    simulation.on("tick", async () => {
        link.attr("d", linkArc)
        node.attr("transform", d => `translate(${d.x},${d.y})`)
    })

    // add the graph with nodes to the website
    // if there is already a graph then remove it before adding a new one
    const graph = Object.assign(svg.node())
    if (dataLineageGraph.childNodes.length > 0) {
        let oldGraph = dataLineageGraph.querySelector('svg')
        dataLineageGraph.removeChild(oldGraph)
    }
    dataLineageGraph.appendChild(graph)

    // we need to change sizes and positions of different elements of a visualization after appending it
    // to the page so we can check what are the sizes of different text elements
    adjustVisualization(node, link)
}

// dataLineageDocs argument is created by getData function and it contains data about data lineage
// documentation needed for creating a visualization
async function updateVisualization(dataLineageDocs){
    const width = 3000
    const height = 2000
    let links = []
    let nodes = []
    let currentDocument
    for (let document of dataLineageDocs){
        if (document.dataLineageId == currentDataLineageId){
            currentDocument = document
            nodes = document.nodes
            for (let node1 of nodes){
                for (let node2 of nodes){
                    if (node1.linkedTo.includes(node2.value)) links.push({source: node1.value, target: node2.value})
                }
            }
        }
    }

    const simulation = d3
        .forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.value).strength(0))

    // const svg = d3
    //     .select("svg")
    //         .attr("viewBox", [-width / 2, -height / 2, width, height])
    //         .attr("width", width)
    //         .attr("height", height)
    //         .attr("style", "max-width: 100%; height: auto; font: 12px sans-serif;")

    // define style for arrows (markers)
    // svg
    //     .append("defs")
    //     .append("marker")
    //         .attr("id", 'arrow')
    //         .attr("viewBox", "0 -5 10 10")
    //         .attr("refX", 5)
    //         .attr("refY", -0.5)
    //         .attr("markerWidth", 6)
    //         .attr("markerHeight", 6)
    //         .attr("orient", "auto")
    //     .append("path")
    //         .attr("fill", 'black')
    //         .attr("d", "M0,-5L10,0L0,5")

    // links between nodes
    const link = svg
        // .append("g")
        //     .attr("fill", "none")
        //     .attr("stroke-width", 1.5)
        .selectAll("path")
        .data(links)
        .join("path")
            .attr("stroke", 'black')
            .attr("marker-end", d => `url(${new URL(`#arrow`, location)})`)

    // nodes with names of tables, systems, scripts etc
    const node = svg
        // .append("g")
        //     .attr("fill", "currentColor")
        //     .attr("stroke-linecap", "round")
        //     .attr("stroke-linejoin", "round")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .classed('node', true)
        .call(drag(simulation))

    // we add rectangles as a background for a text
    // node
    //     .append("rect")
    //         .attr("fill", d => {
    //             if (d.type == 'system') return 'blue'
    //             else if (d.type == 'table') return 'red'
    //             else if (d.type == 'script') return 'green'
    //         })
    //         .attr("x", 5)
    //         .attr("y", "-0.9em")
    //         .classed('background', true)

    // adding text to the nodes
    // node
    //     .append("text")
    //         .attr("x", 8)
    //         .attr("y", "0.3em")
    //         .style("font-size", "1.5em")
    //     .text(d => d.value)
    //     .classed('nodeText', true)

    // adding the 'X' for the buttons for removing nodes
    // node
    //     .append('text')
    //         .attr("y", "0.3em")
    //         .style("font-size", "1.5em")
    //     .text('X')
    //     .classed('closeBtnText', true)

    // adding a rectangle as a button for removing nodes
    // node
    //     .append("rect")
    //         .attr("y", "-0.8em")
    //         .attr('width', 20)
    //         .attr('fill', 'transparent')
    //         .attr('stroke', 'black')
    //         .attr('stroke-width', '1px')
    //     .classed('closeBtn', true)

    // adding 'i' for buttons for showing more info about nodes
    // node
    //     .append('text')
    //         .attr("y", "0.3em")
    //         .style("font-size", "1.5em")
    //     .text('i')
    //     .classed('infoBtnText', true)

    // adding a rectangle as a button for showing more info about nodes
    // node
    //     .append("rect")
    //         .attr("y", "-0.8em")
    //         .attr('width', 20)
    //         .attr('fill', 'transparent')
    //         .attr('stroke', 'black')
    //         .attr('stroke-width', '1px')
    //     .classed('infoBtn', true)

    // add the graph with nodes to the website
    // const graph = Object.assign(svg.node())
    // const dataLineageGraph = document.querySelector('#dataLineageGraph')
    // dataLineageGraph.appendChild(graph)

    // we need to change sizes and positions of different elements of a visualization after appending it
    // to the page so we can check what are the sizes of different text elements
    // adjustVisualization(node, link)

    // return [simulation, node, link]
}

// function for changing sizes and positions of different elements of a visualization
function adjustVisualization(node, link){
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

    // resize and change position of a button for removing node and add event listener for removing a node
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
    
    // resize and change position of a 'X' in a button for removing node
    node
        .selectAll('.closeBtnText')
            .attr("x", d => d.bbox.width + 14)

    // resize and change position of a button for showing more info about node
    // and add event listener for displaying a pop up window with more info about node
    node
        .selectAll(".infoBtn")
            .attr("x", d => d.bbox.width + 30)
            .attr('height', d => d.bbox.height)
        .on('click', (event, nodeData) => {
            let popUpWindow
            if (nodeData.type == 'table'){
                popUpWindow = document.querySelector('#tableAdditionalInfo')
                popUpWindow.classList.add('show')
                popUpWindow.style.overflowY = 'auto'
                popUpWindow.style.display = 'block'
            }
        })
    
    // resize and change position of a 'i' in a button for showing more info about nodes
    node
        .selectAll('.infoBtnText')
            .attr("x", d => d.bbox.width + 38)
}

// function for changing arrows shape when user is dragging nodes
function linkArc(d) {
    const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y)
    return `
        M${d.source.x + d.source.bbox.width + 50},${d.source.y}
        A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
    `
}

async function getData(){
    const response = await fetch('/data_lineage/get_data', {
        method: 'get',
        headers: new Headers({
            'Content-Type': 'application/json'
        })
    })
    const dataLineageDocs = await response.json()
    
    return dataLineageDocs
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

    async function dragended(event, d) {
        // get data about nodes and links from given document by making a http request
        let dataLineageDocs = await getData()
        // load data for currently displayed data lineage document
        let displayedDocument
        for (let document of dataLineageDocs){
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
        }).then(async () => {
            dataLineageDocs = await getData()
            createVisualization(dataLineageDocs)
            // updateVisualization(dataLineageDocs)
        })
    }

    return d3.drag()
        .on('start', dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
}