let selectedDataset = "Marketing";
let selectedVariables = [];
let method = "pearson";
let dateRange = [];
let group = "All";
let moderator = "";

//Dataset 목록 가져오는 함수
d3.json("/datasets").then(data => {
    const datasetSelect = document.getElementById("dataset-select");
    data.datasets.forEach(dataset => {
        const option = document.createElement("option");
        option.value = dataset;
        option.textContent = dataset;
        datasetSelect.appendChild(option);
    });
    loadVariables();
});

//데이터셋 변경 이벤트 처리 함수
//사용자가 데이터셋 드롭다운에서 값을 변경하면 호출
document.getElementById("dataset-select").addEventListener("change", (e) => {
    selectedDataset = e.target.value;
    loadVariables();
});

//변수 목록을 초기화하는 함수
function loadVariables() {
    //d3.json을 이용해 api를 요청하는 방법
    d3.json(`/variables?dataset=${selectedDataset}`).then(data => {
        const variablesDiv = document.getElementById("variables"); //기존 변수 목록 초기화
        variablesDiv.innerHTML = "";

        const moderatorSelect = document.getElementById("moderator-select");
        moderatorSelect.innerHTML = '<option value="">None</option>';

        //가져온 변수 목록을 순회하며 checkbox 태그를 생성하고 추가
        data.variables.forEach(variable => {
            const label = document.createElement("label");
            label.className = "checkbox-inline";
            label.innerHTML = `<input type="checkbox" value="${variable}" class="var-checkbox"> ${variable}`;
            variablesDiv.appendChild(label);

            const option = document.createElement("option");
            option.value = variable;
            option.textContent = variable;
            moderatorSelect.appendChild(option);
        });

        //날짜 범위 초기화
        document.getElementById("start-date").value = data.min_date;
        document.getElementById("end-date").value = data.max_date;
    });
}
