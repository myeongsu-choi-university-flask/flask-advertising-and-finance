function showDetailedAnalysis(var1, var2) {
    d3.json("/detailed_analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            dataset: selectedDataset,
            var1: var1,
            var2: var2,
            method: method
        })
    }).then(data => {
        if (data.error) {
            alert(data.error);
            return;
        }
        drawDetailedAnalysis(data.analysis_data, var1, var2);
    });
}

function drawDetailedAnalysis(data, var1, var2) {
    const container = d3.select("#detailed-analysis");
    container.html("");

    const margin = { top: 50, right: 50, bottom: 50, left: 60 },
        width = 800 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const parseDate = d3.timeParse("%Y-%m-%d");
    data.forEach(d => d.Date = parseDate(d.Date));

    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.Date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([-1, 1])
        .range([height, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %Y")));

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#6a5acd")
        .attr("stroke-width", 3)
        .attr("d", d3.line()
            .x(d => x(d.Date))
            .y(d => y(d.Rolling_Correlation))
        );

    const tooltip = createTooltip();

    svg.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.Date))
        .attr("cy", d => y(d.Rolling_Correlation))
        .attr("r", 4)
        .attr("fill", "#ff4500")
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible")
                .html(`
                    <strong>Date:</strong> ${d3.timeFormat("%Y-%m-%d")(d.Date)}<br>
                    <strong>Correlation:</strong> ${d.Rolling_Correlation.toFixed(2)}
                `);
        })
        .on("mousemove", event => {
            tooltip.style("top", `${event.pageY - 10}px`)
                .style("left", `${event.pageX + 10}px`);
        })
        .on("mouseout", () => tooltip.style("visibility", "hidden"));

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#495057")
        .text(`Rolling Correlation: ${var1} & ${var2}`);
}