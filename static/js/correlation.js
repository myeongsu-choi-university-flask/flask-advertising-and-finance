document.getElementById("update-btn").addEventListener("click", () => {
    //checkbox중 체크된 값 (선택된 변수)만 가져와서 저장
    selectedVariables = Array.from(document.querySelectorAll(".var-checkbox:checked"))
        .map(input => input.value);
    method = document.getElementById("method-select").value; //상관관계 계산 방법
    dateRange = [
        document.getElementById("start-date").value,
        document.getElementById("end-date").value
    ];
    group = document.getElementById("group-select").value;
    moderator = document.getElementById("moderator-select").value;

    updateCorrelation();
});

//엔드포인트를 통해 상관관계를 계산하여 업데이트하는 함수
function updateCorrelation() {
    d3.json("/correlation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            dataset: selectedDataset,
            variables: selectedVariables,
            date_range: dateRange,
            group: group,
            method: method,
            moderator: moderator
        })
    }).then(data => {
        if (data.error) {
            alert(data.error);
            return;
        }
        drawCorrelationMatrix(data.correlation_matrix, selectedVariables); //선택 변수에 대한 correlation matrix 시각화
        listStrongCorrelations(data.strong_correlations); //강한 상관관계 리스트 표시

        //moderator 변수에 대한 조정된 상관계수 시각화
        if (data.adjusted_correlations) {
            document.getElementById("adjusted-correlation-container").style.display = "block";
            drawAdjustedCorrelations(data.adjusted_correlations, moderator, selectedVariables);
        } else {
            document.getElementById("adjusted-correlation-container").style.display = "none";
        }
    });
}

//Correlation matrix 생성 함수
function drawCorrelationMatrix(correlationMatrix, variables) {
    const container = d3.select("#correlation-chart");
    container.html("");

    const margin = { top: 50, right: 0, bottom: 100, left: 100 };
    const width = variables.length * 80;
    const height = variables.length * 80;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .range([0, width])
        .domain(variables)
        .padding(0.01);

    const y = d3.scaleBand()
        .range([height, 0])
        .domain(variables)
        .padding(0.01);

    //양수는 빨간색 계열, 음수는 파란색 계열을 반환하는 colorScale 함수 정의
    const colorScale = d3.scaleSequential(d3.interpolateRdBu).domain([-1, 1]);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSize(0))
        .select(".domain").remove();

    svg.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain").remove();

    const tooltip = createTooltip(); //마우스 올렸을 때 생성되는 툴팁 div

    //variables 배열의 모든 조합 (v1, v2)에 대해 객체 (v1, v2, value) 생성
    //flatMap 함수는 결과 배열을 1차원 배열로 변환
    const heatmapData = variables.flatMap(v1 => variables.map(v2 => ({ v1, v2, value: correlationMatrix[v1][v2] })));

    svg.selectAll()
        .data(heatmapData)
        .enter()
        .append("rect")
        .attr("x", d => x(d.v1))
        .attr("y", d => y(d.v2))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => colorScale(d.value))
        .on("mouseover", (event, d) => {
            //사용자가 히트맵 셀 위에 마우스를 올리면 툴팁 생성
            tooltip.style("visibility", "visible")
                .text(`${d.v1} & ${d.v2}: ${d.value.toFixed(2)}`);
        })
        .on("mousemove", event => {
            //툴팁의 위치를 마우스 커서 근처로 업데이트
            tooltip.style("top", `${event.pageY - 10}px`)
                .style("left", `${event.pageX + 10}px`);
        })
        .on("mouseout", () => tooltip.style("visibility", "hidden"));
        //마우스가 셀을 떠나면 툴팁 숨김
}

//moderator 변수에 대한 조정된 상관계수 시각화
function drawAdjustedCorrelations(adjustedCorrelations, moderator, variables) {
    const container = d3.select("#adjusted-correlation-chart");
    container.html("");

    const margin = { top: 50, right: 0, bottom: 50, left: 100 };
    const width = 400;
    const height = variables.length * 40;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand()
        .range([0, height])
        .domain(variables.filter(v => v !== moderator))
        .padding(0.1);

    const x = d3.scaleBand()
        .range([0, width])
        .domain([moderator])
        .padding(0.1);

    const colorScale = d3.scaleSequential(d3.interpolateRdBu).domain([-1, 1]);

    svg.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain").remove();

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSize(0))
        .select(".domain").remove();

    const data = Object.entries(adjustedCorrelations);

    svg.selectAll()
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(moderator))
        .attr("y", d => y(d[0]))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => colorScale(d[1]));

    svg.selectAll()
        .data(data)
        .enter()
        .append("text")
        .attr("x", d => x(moderator) + x.bandwidth() / 2)
        .attr("y", d => y(d[0]) + y.bandwidth() / 2)
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text(d => d[1].toFixed(2));
}

//강한 상관관계를 시각화하는 함수
function listStrongCorrelations(correlations) {
    const list = document.getElementById("strong-correlations");
    list.innerHTML = "";
    correlations.forEach(corr => {
        const li = document.createElement("li");
        //bootstrap css 정의
        li.className = "list-group-item d-flex justify-content-between align-items-center";
        li.style.backgroundColor = corr.value > 0 ? "rgba(255, 0, 0, 0.2)" : "rgba(0, 0, 255, 0.2)";
        li.innerHTML = `
            <span><strong>${corr.var1}</strong> & <strong>${corr.var2}</strong></span>
            <span class="badge bg-secondary rounded-pill">${corr.value.toFixed(2)}</span>
        `;
        li.addEventListener("click", () => {
            showDetailedAnalysis(corr.var1, corr.var2);
        });
        list.appendChild(li);
    });
}

// 툴팁 생성 코드
function createTooltip() {
    return d3.select("body").append("div")
        .attr("class", "d3-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "#f8f9fa")
        .style("border", "1px solid #6c757d")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("box-shadow", "0px 4px 8px rgba(0,0,0,0.1)");
}
